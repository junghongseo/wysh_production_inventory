import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const serverApiKey = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    // 호출한 사람 확인: 로그인한 활성 계정 + 'AI 매니저' 권한(또는 관리자)만 허용
    const authClient = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const callerToken = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: callerData, error: callerErr } = await authClient.auth.getUser(callerToken);
    if (callerErr || !callerData?.user) {
      console.warn('ai-manager: caller token rejected:', callerErr?.message || 'no user');
      return new Response(JSON.stringify({ error: '로그인이 필요합니다.' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: callerProfile } = await authClient
      .from('profiles')
      .select('is_admin, is_active, permissions')
      .eq('id', callerData.user.id)
      .maybeSingle();
    const allowed = !!callerProfile?.is_active &&
      (callerProfile.is_admin || (callerProfile.permissions || []).includes('ai.manager'));
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'AI 매니저 사용 권한이 없습니다.' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { userMessage, type = "chat", sessionId, thinkingLevel, clientApiKey } = await req.json();
    const GEMINI_API_KEY = clientApiKey || serverApiKey;

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
    }

    // 사고 강도 결정 (기본값: chat은 'medium', briefing은 'high')
    let targetThinkingLevel = thinkingLevel;
    if (!targetThinkingLevel || !['low', 'medium', 'high'].includes(targetThinkingLevel)) {
      targetThinkingLevel = type === 'briefing' ? 'high' : 'medium';
    }

    // 업무 데이터·대화 기록은 호출한 사람의 토큰으로 조회·저장해서 DB 권한(RLS)이 그대로 적용된다.
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');
    const dataClient = SUPABASE_ANON_KEY
      ? createClient(SUPABASE_URL!, SUPABASE_ANON_KEY, {
          global: { headers: { Authorization: `Bearer ${callerToken}` } },
          auth: { autoRefreshToken: false, persistSession: false },
        })
      : null;
    if (!dataClient) {
      throw new Error("SUPABASE_ANON_KEY 환경 변수가 없어 호출자 권한으로 데이터를 조회할 수 없습니다.");
    }

    // 세션별 대화 기록 쿼리 준비 (최신 10개 조회 후 시간순 정렬)
    // 대화 기록도 호출자 토큰으로 조회 → RLS 로 본인 대화만 (2-B)
    let historyQuery = dataClient.from('chat_history').select('*');
    if (sessionId) {
      historyQuery = historyQuery.eq('session_id', sessionId);
    }
    historyQuery = historyQuery.order('created_at', { ascending: false }).limit(10);

    // 현재 상태 조회를 위해 필요한 데이터들을 병렬로 수집 (레시피, 계획, 재고, 리포트, 메모)
    const [
      { data: rawProducts },
      { data: recipes },
      { data: plans },
      { data: inventory },
      { data: reports },
      { data: events },
      { data: calendarNotes },
      { data: chatHistory }
    ] = await Promise.all([
      dataClient.from('products').select('*'),
      // 배합 데이터는 권한이 있는 사람에게만 RLS 가 돌려준다
      dataClient.from('product_recipes').select('*'),
      dataClient.from('plans').select('*'),
      dataClient.from('inventory').select('*'),
      dataClient.from('reports').select('*'),
      dataClient.from('events').select('*'),
      dataClient.from('calendar_notes').select('*').neq('date_str', '__banner_settings__'),
      historyQuery
    ]);

    // products 테이블의 배합 필드는 쓰지 않고, product_recipes 에서 받은 것만 붙인다
    // (2-B 전까지 products 에 남아 있는 비율이 권한 없는 사람의 AI 답변에 섞이지 않도록)
    const recipesById = new Map((recipes || []).map((r: any) => [r.product_id, r]));
    const products = (rawProducts || []).map((p: any) => {
      const { ingredients: _i, recipe_memo: _m, packaging: _p, ...rest } = p;
      const r = recipesById.get(p.id);
      return r ? { ...rest, ingredients: r.ingredients, recipe_memo: r.recipe_memo, packaging: r.packaging } : rest;
    });

    // 대한민국 표준시 (KST: UTC+9, Asia/Seoul) 정밀 시각 및 날짜 계산
    const now = new Date();
    const kstDateFormatter = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Seoul' });
    const todayStr = kstDateFormatter.format(now); // e.g. "2026-07-25"

    const yesterdayObj = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const yesterdayStr = kstDateFormatter.format(yesterdayObj); // e.g. "2026-07-24"

    const kstFullFormatter = new Intl.DateTimeFormat('ko-KR', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      weekday: 'long',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const fullKstStr = kstFullFormatter.format(now); // e.g. "2026년 7월 25일 토요일 오전 12:38:17"

    const dayOfWeekFormatter = new Intl.DateTimeFormat('ko-KR', { timeZone: 'Asia/Seoul', weekday: 'short' });
    const dayOfWeek = dayOfWeekFormatter.format(now); // e.g. "토"

    const contextSummary = `
[기준 시각: 대한민국 표준시 (KST, UTC+9)]
- 현재 실시간 한국 시각: ${fullKstStr}
- 오늘 날짜: ${todayStr} (${dayOfWeek}요일)
- 어제 날짜: ${yesterdayStr}

[제품 목록 및 레시피/배합표]
${JSON.stringify(products || [])}

[현재 생산 계획]
${JSON.stringify(plans || [])}

[현재 재고 상태 및 출고 이력 (outflowHistory 내역 포함)]
${JSON.stringify(inventory || [])}

[작업 리포트 (발효 및 유청분리 기록)]
${JSON.stringify(reports || [])}

[등록된 주요 이벤트/드랍 출시 일정]
${JSON.stringify(events || [])}

[달력 메모 및 일정 노트]
${JSON.stringify(calendarNotes || [])}
    `.trim();

    const systemInstruction = `
당신은 프리미엄 수제 요거트 브랜드 'WYSH'의 스마트한 **AI 생산매니저**입니다.
생산 관리자의 조력자로서 생산 일정, 출고/판매 추이, 드랍 제품 출시(월 2회 권장), 달력 이벤트를 종합적으로 분석하여 언제 어떤 제품을 얼마만큼 생산해야 할지 스마트하게 조언해야 합니다.

[🚨 대한민국 표준시 (KST) 실시간 시각 절대 기준 - REAL-TIME CLOCK OVERRIDE]
- **현재 실제 한국 시각 (KST)**: **${fullKstStr}**
- **오늘 날짜 (KST)**: **${todayStr} (${dayOfWeek}요일)**
- **어제 날짜 (KST)**: **${yesterdayStr}**

⚠️ 날짜 및 시각 응답 필수 규칙:
1. 사용자가 현재 시각, 날짜, "오늘", "어제"에 대해 질문하면, 이전 대화 기록에 남아있는 과거 일자나 예전 브리핑 텍스트(예: 7월 24일)에 절대로 영향을 받지 마세요.
2. 오직 위 **[현재 실제 한국 시각: ${fullKstStr}]** 을 유일한 절대 기준시로 사용하여 답변해야 합니다.
3. 자정이 지난 새벽 시각(00시~06시)이라면 이미 날짜가 바뀌어 **${todayStr} (${dayOfWeek}요일)** 이 되었음을 정확히 인지하여 답변하세요.
4. 사용자가 "어제"에 대해 물어보면 반드시 KST 어제 날짜인 **${yesterdayStr}** 에 작성된 출고/리포트 기록을 기반으로 답변하세요.

[작동 가이드라인]
1. 말투는 친절하고 전문적인 생산 관리 전문가 톤을 유지하세요.
2. 드랍 제품 출시는 한 달에 2회 정도 계획되는 점을 상기하고, 달력 이벤트(예: 프로모션, 드랍 출시)가 다가오면 여유 재고를 사전에 체크하여 브리핑하세요.
3. 재고 유통기한 및 출고 기한을 고려하여 안전 재고(Buffer)를 확보하도록 권유하세요.
4. 질문에 답할 때는 명확한 수치나 일정을 포함하여 추천 생산 계획을 제시하세요.
5. 전달받은 [현재 상황 데이터]를 기반으로 정확하게 분석하여 답변하세요.

[답변 서식 및 완결성 가이드라인]
1. 지저분한 특수기호(***, ###, ** 등)를 남발하지 말고, 카카오톡 메시지처럼 깨끗하고 가독성 높게 작성하세요.
2. 문장이나 제품 항목을 나열할 때 절대 줄글로 이어붙이지 말고, 항목마다 엔터(줄바꿈)를 확실하게 두어 문단을 나누세요.
3. 목록을 작성할 때는 깔끔한 불릿 기호(• )를 사용해 한 눈에 들어오도록 정리하세요.
4. 답변이 중간에 잘리지 않도록 핵심 내용 위주로 끝까지 온전하고 완결된 문장으로 마무리지으세요. (문장이 끊긴 채로 응답을 끝내면 절대로 안 됩니다.)
    `.trim();

    // 과거 대화 내역 구성 (최신 10개를 시간순으로 정렬)
    const contents: any[] = [];

    let currentPrompt = userMessage;
    if (type === 'briefing') {
      currentPrompt = "안녕하세요! 현재 제품 재고, 생산 일정, 다가오는 이벤트를 바탕으로 제가 지금 생각하고 준비해야 할 핵심 생산 관리 이슈 및 추천 계획을 브리핑해 주세요.";
    }

    if (chatHistory && chatHistory.length > 0) {
      const orderedHistory = [...chatHistory].reverse();
      orderedHistory.forEach((h: any, idx: number) => {
        // 클라이언트에서 방금 먼저 저장한 동일한 사용자 메시지가 마지막에 중복 포함되는 현상 방지
        if (idx === orderedHistory.length - 1 && h.role === 'user' && h.content === currentPrompt) {
          return;
        }
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      });
    }

    contents.push({
      role: 'user',
      parts: [{ text: `[현재 상황 데이터]\n${contextSummary}\n\n[관리자 질문]\n${currentPrompt}` }]
    });

    // Gemini 4 Hydrogen(빠른 모델) 우선, 실패하면 안정판 3.8 Flash 로 폴백
    const envModel = Deno.env.get('GEMINI_MODEL');
    const candidateModels = [
      ...(envModel ? [envModel] : []),
      'gemini-4-hydrogen',
      'gemini-3.8-flash'
    ];

    const thinkingBudgetMap: Record<string, number> = {
      low: 1024,
      medium: 4096,
      high: 8192
    };

    let geminiData: any = null;
    let usedModel = '';
    let lastErrorStatus = 500;
    let lastErrorText = '';

    for (const modelName of candidateModels) {
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${GEMINI_API_KEY}`;

      const generationConfig: Record<string, any> = {
        temperature: 0.7,
        // 사고(thinking) 토큰도 이 한도에 포함된다. 8192 일 때 '심층' 모드에서 답변이 잘렸다.
        maxOutputTokens: 32768,
      };

      if (modelName.startsWith('gemini-2.5')) {
        generationConfig.thinkingConfig = {
          thinkingBudget: thinkingBudgetMap[targetThinkingLevel] ?? 4096
        };
      } else if (modelName.startsWith('gemini-3') || modelName.startsWith('gemini-4')) {
        generationConfig.thinkingConfig = {
          thinkingLevel: targetThinkingLevel
        };
      }

      const response = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemInstruction }] },
          contents: contents,
          generationConfig
        })
      });

      if (response.ok) {
        geminiData = await response.json();
        usedModel = modelName;
        break;
      }

      lastErrorStatus = response.status;
      lastErrorText = await response.text();

      // 402(크레딧 소진), 401/403(API 키 권한 오류), 429(쿼터 초과)는 모델 변경으로 해결되지 않으므로 즉시 중단
      if ([401, 402, 403, 429].includes(response.status)) {
        break;
      }
    }

    if (!geminiData) {
      let parsedMessage = lastErrorText;
      try {
        const parsed = JSON.parse(lastErrorText);
        if (parsed?.error?.message) {
          parsedMessage = parsed.error.message;
        }
      } catch (_) {
        // ignore JSON parse error
      }

      if (lastErrorStatus === 402 || parsedMessage.includes('prepayment credits are depleted')) {
        throw new Error(
          `Google AI Studio 선불 크레딧(Prepayment Credits)이 모두 소진되었습니다 (HTTP 402). https://ai.studio/projects 에서 결제/크레딧을 충전하거나 새로운 GEMINI_API_KEY로 교체해 주세요.`
        );
      }
      if (lastErrorStatus === 429) {
        throw new Error(`Gemini API 호출 한도(Quota)를 초과했습니다 (HTTP 429). 잠시 후 다시 시도하거나 Google AI Studio 결제 플랜을 확인해 주세요.`);
      }
      throw new Error(`Gemini API Error (${lastErrorStatus}): ${parsedMessage}`);
    }

    const parts = geminiData.candidates?.[0]?.content?.parts || [];
    // 사고(thought) 블록을 제외한 실제 최종 답변 파트 추출
    const answerPart = parts.find((p: any) => !p.thought && p.text) || parts[parts.length - 1];
    let replyText = answerPart?.text || geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 생성하지 못했습니다.";
    if (geminiData.candidates?.[0]?.finishReason === 'MAX_TOKENS') {
      replyText += "\n\n⚠️ 답변이 길어 중간에 잘렸습니다. 기간이나 제품을 나눠서 다시 질문해 주세요.";
    }
    console.log(`ai-manager model=${usedModel} finish=${geminiData.candidates?.[0]?.finishReason} usage=${JSON.stringify(geminiData.usageMetadata || {})}`);

    // sessionId가 없는 레거시 호출일 때만 서버에서 직접 기록 (클라이언트에서 sessionId와 함께 저장하므로 중복 방지)
    if (!sessionId) {
      const userMsgId = 'msg-u-' + Date.now();
      const aiMsgId = 'msg-a-' + Date.now();

      // 호출자 토큰으로 저장 → user_id 가 호출자로 기록된다 (컬럼 기본값 auth.uid())
      await dataClient.from('chat_history').insert([
        { id: userMsgId, role: 'user', content: currentPrompt },
        { id: aiMsgId, role: 'model', content: replyText }
      ]);
    }

    return new Response(
      JSON.stringify({ reply: replyText, model: usedModel }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

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
    const GEMINI_API_KEY = Deno.env.get('GEMINI_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY가 설정되지 않았습니다.");
    }

    const { userMessage, type = "chat" } = await req.json();

    // Supabase DB 클라이언트 생성
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // 현재 상태 조회를 위해 필요한 데이터들을 병렬로 수집
    const [
      { data: products },
      { data: plans },
      { data: inventory },
      { data: events },
      { data: calendarNotes },
      { data: chatHistory }
    ] = await Promise.all([
      supabase.from('products').select('*'),
      supabase.from('plans').select('*'),
      supabase.from('inventory').select('*'),
      supabase.from('events').select('*'),
      supabase.from('calendar_notes').select('*'),
      supabase.from('chat_history').select('*').order('created_at', { ascending: true }).limit(20)
    ]);

    // 데이터 수집 요약 텍스트 구성 (RAG / Context Injection)
    const now = new Date().toISOString().split('T')[0];

    const contextSummary = `
[현재 시스템 날짜: ${now}]

[제품 목록]
${JSON.stringify(products || [], null, 2)}

[현재 생산 계획]
${JSON.stringify(plans || [], null, 2)}

[현재 재고 상태]
${JSON.stringify(inventory || [], null, 2)}

[등록된 주요 이벤트/드랍 출시 일정]
${JSON.stringify(events || [], null, 2)}

[달력 메모 및 일정 노트]
${JSON.stringify(calendarNotes || [], null, 2)}
    `.trim();

    const systemInstruction = `
당신은 프리미엄 수제 요거트 브랜드 'WYSH'의 스마트한 **AI 생산매니저**입니다.
생산 관리자의 조력자로서 생산 일정, 출고/판매 추이, 드랍 제품 출시(월 2회 권장), 달력 이벤트를 종합적으로 분석하여 언제 어떤 제품을 얼마만큼 생산해야 할지 스마트하게 조언해야 합니다.

[작동 가이드라인]
1. 말투는 친절하고 전문적인 생산 관리 전문가 톤을 유지하세요.
2. 드랍 제품 출시는 한 달에 2회 정도 계획되는 점을 상기하고, 달력 이벤트(예: 프로모션, 드랍 출시)가 다가오면 여유 재고를 사전에 체크하여 브리핑하세요.
3. 재고 유통기한 및 출고 기한을 고려하여 안전 재고(Buffer)를 확보하도록 권유하세요.
4. 질문에 답할 때는 명확한 수치나 일정을 포함하여 추천 생산 계획을 제시하세요.
5. 전달받은 [현재 상황 데이터]를 기반으로 정확하게 분석하여 답변하세요.
    `.trim();

    // 과거 대화 내역 구성
    const contents = [];

    // System context injection as first message or system_instruction
    if (chatHistory && chatHistory.length > 0) {
      chatHistory.forEach((h: any) => {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: h.content }]
        });
      });
    }

    let currentPrompt = userMessage;
    if (type === 'briefing') {
      currentPrompt = "안녕하세요! 현재 제품 재고, 생산 일정, 다가오는 이벤트를 바탕으로 제가 지금 생각하고 준비해야 할 핵심 생산 관리 이슈 및 추천 계획을 브리핑해 주세요.";
    }

    contents.push({
      role: 'user',
      parts: [{ text: `[현재 상황 데이터]\n${contextSummary}\n\n[관리자 질문]\n${currentPrompt}` }]
    });

    // 최신 Gemini 3.6 Flash 모델 사용 (고성능 추론)
    const MODEL_NAME = Deno.env.get('GEMINI_MODEL') || 'gemini-3.6-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
    
    const response = await fetch(geminiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemInstruction }] },
        contents: contents,
        generationConfig: {
          temperature: 0.7,
          maxOutputTokens: 4096,
        }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const geminiData = await response.json();
    const replyText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "답변을 생성하지 못했습니다.";

    // 사용자 대화 및 AI 답변을 DB 대화 기록에 저장
    const userMsgId = 'msg-u-' + Date.now();
    const aiMsgId = 'msg-a-' + Date.now();

    await supabase.from('chat_history').insert([
      { id: userMsgId, role: 'user', content: currentPrompt },
      { id: aiMsgId, role: 'model', content: replyText }
    ]);

    return new Response(
      JSON.stringify({ reply: replyText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

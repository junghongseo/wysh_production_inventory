// 관리자 전용 계정 관리 Edge Function
// - create:        새 계정 생성 (아이디/표시 이름/초기 비밀번호/권한)
// - resetPassword: 임시 비밀번호로 초기화 (다음 로그인 때 변경 강제)
// - setActive:     계정 비활성화 / 재활성화
// 권한 체크박스 수정은 클라이언트가 profiles 테이블을 직접 수정한다 (RLS: 관리자만).
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const LOGIN_EMAIL_DOMAIN = 'wysh.local';
const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;
const MIN_PASSWORD_LENGTH = 8;
const BAN_FOREVER = '876000h'; // 약 100년

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 호출한 사람이 활성 관리자인지 확인
    const token = (req.headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) {
      return json({ error: '로그인이 필요합니다.' }, 401);
    }
    const callerId = userData.user.id;
    const { data: caller } = await admin
      .from('profiles')
      .select('is_admin, is_active')
      .eq('id', callerId)
      .maybeSingle();
    if (!caller?.is_admin || !caller?.is_active) {
      return json({ error: '관리자만 사용할 수 있습니다.' }, 403);
    }

    const body = await req.json();
    const { action } = body;

    if (action === 'create') {
      const username = String(body.username || '').trim().toLowerCase();
      const displayName = String(body.displayName || '').trim();
      const password = String(body.password || '');
      const permissions = Array.isArray(body.permissions) ? body.permissions.map(String) : [];
      const isAdmin = !!body.isAdmin;

      if (!USERNAME_PATTERN.test(username)) {
        return json({ error: '아이디는 영문 소문자, 숫자, ".", "_" 로 3~20자여야 합니다.' }, 400);
      }
      if (!displayName) return json({ error: '표시 이름을 입력해 주세요.' }, 400);
      if (password.length < MIN_PASSWORD_LENGTH) {
        return json({ error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` }, 400);
      }

      const { data: existing } = await admin.from('profiles').select('id').eq('username', username).maybeSingle();
      if (existing) return json({ error: '이미 사용 중인 아이디입니다.' }, 409);

      const { data: created, error: createErr } = await admin.auth.admin.createUser({
        email: `${username}@${LOGIN_EMAIL_DOMAIN}`,
        password,
        email_confirm: true,
      });
      if (createErr || !created?.user) {
        return json({ error: `계정 생성 실패: ${createErr?.message || '알 수 없는 오류'}` }, 400);
      }

      const { error: profileErr } = await admin.from('profiles').insert({
        id: created.user.id,
        username,
        display_name: displayName,
        is_admin: isAdmin,
        permissions,
        must_change_password: true,
      });
      if (profileErr) {
        // 프로필 저장에 실패하면 고아 auth 계정을 남기지 않는다
        await admin.auth.admin.deleteUser(created.user.id);
        return json({ error: `프로필 저장 실패: ${profileErr.message}` }, 400);
      }
      return json({ ok: true, id: created.user.id });
    }

    if (action === 'resetPassword') {
      const userId = String(body.userId || '');
      const password = String(body.password || '');
      if (password.length < MIN_PASSWORD_LENGTH) {
        return json({ error: `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.` }, 400);
      }
      const { error: pwErr } = await admin.auth.admin.updateUserById(userId, { password });
      if (pwErr) return json({ error: `비밀번호 초기화 실패: ${pwErr.message}` }, 400);
      const { error: flagErr } = await admin.from('profiles').update({ must_change_password: true }).eq('id', userId);
      if (flagErr) return json({ error: flagErr.message }, 400);
      return json({ ok: true });
    }

    if (action === 'setActive') {
      const userId = String(body.userId || '');
      const active = !!body.active;
      if (userId === callerId && !active) {
        return json({ error: '자기 자신의 계정은 비활성화할 수 없습니다.' }, 400);
      }
      // profiles 먼저 갱신: 마지막 관리자 보호 트리거가 여기서 막는다
      const { error: profErr } = await admin.from('profiles').update({ is_active: active }).eq('id', userId);
      if (profErr) return json({ error: profErr.message }, 400);
      const { error: banErr } = await admin.auth.admin.updateUserById(userId, {
        ban_duration: active ? 'none' : BAN_FOREVER,
      });
      if (banErr) return json({ error: `로그인 차단 설정 실패: ${banErr.message}` }, 400);
      return json({ ok: true });
    }

    return json({ error: '알 수 없는 요청입니다.' }, 400);
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});

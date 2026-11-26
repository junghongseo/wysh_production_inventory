import { createClient } from '@supabase/supabase-js';
import { authStorage } from './services/authStorage';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// 방금 발급된 로그인 토큰을 바로 DB API(/rest/v1)에 쓰면 "JWT issued at future"(PGRST303)로 거부되고,
// 그 토큰은 이후에도 계속 거부된다(서버 시계 차이 + 검증 결과 캐시로 추정).
// 그래서 새 토큰은 처음 본 시점부터 TOKEN_SETTLE_MS 동안 기다린 뒤에 DB API로 보낸다.
const TOKEN_SETTLE_MS = 3000;
const tokenFirstSeenAt = new Map();

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const settlingFetch = async (input, init) => {
  const url = typeof input === 'string' ? input : input?.url || '';
  if (url.includes('/rest/v1/')) {
    const headers = new Headers(init?.headers || (typeof input === 'object' ? input.headers : undefined));
    const token = (headers.get('Authorization') || '').replace(/^Bearer\s+/i, '');
    // anon/publishable 키는 사용자 토큰이 아니므로 기다릴 필요 없음 (사용자 JWT는 점 2개로 구성)
    if (token && token.split('.').length === 3 && token !== supabaseAnonKey) {
      if (!tokenFirstSeenAt.has(token)) {
        if (tokenFirstSeenAt.size > 20) tokenFirstSeenAt.clear();
        tokenFirstSeenAt.set(token, Date.now());
      }
      const wait = tokenFirstSeenAt.get(token) + TOKEN_SETTLE_MS - Date.now();
      if (wait > 0) await sleep(wait);
    }
  }
  return fetch(input, init);
};

let supabaseClient = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    supabaseClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        storage: authStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      },
      global: { fetch: settlingFetch }
    });
    console.log("Supabase Connection: Active (Synced with Cloud DB)");
  } catch (e) {
    console.error("Failed to initialize Supabase client:", e);
  }
} else {
  console.error("Supabase Connection: Inactive (VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY 누락)");
}

export const supabase = supabaseClient;

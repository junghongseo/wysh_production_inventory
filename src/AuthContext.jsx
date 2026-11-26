import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from './supabaseClient';
import {
  getRememberMe,
  setRememberMe,
  saveCachedProfile,
  loadCachedProfile,
  clearCachedProfile
} from './services/authStorage';
import { flushPendingPushes, resetPushFailures } from './services/pushTracker';
import { clearLocalDataCache } from './services/storageService';
import { can as canWith, usernameToEmail, IDLE_LOGOUT_MS } from './utils/permissions';

/* global __APP_VERSION__ */
export const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev';

const PROFILE_COLUMNS = 'id, username, display_name, is_admin, is_active, must_change_password, permissions, last_seen_at, last_app_version, created_at';
const PRESENCE_INTERVAL_MS = 5 * 60 * 1000;
const IDLE_CHECK_INTERVAL_MS = 30 * 1000;
const LAST_ACTIVITY_KEY = 'wysh_last_activity';

const AuthContext = createContext(null);

const translateAuthError = (error) => {
  const msg = (error?.message || '').toLowerCase();
  if (msg.includes('invalid login credentials')) return '아이디 또는 비밀번호가 올바르지 않습니다.';
  if (msg.includes('banned')) return '비활성화된 계정입니다. 관리자에게 문의하세요.';
  if (msg.includes('fetch') || msg.includes('network')) return '서버에 연결할 수 없습니다. 인터넷 연결을 확인해 주세요.';
  return error?.message || '알 수 없는 오류가 발생했습니다.';
};

// Edge Function 오류 응답 본문의 { error } 메시지를 꺼낸다
const readFunctionError = async (error) => {
  try {
    const body = await error?.context?.json?.();
    if (body?.error) return body.error;
  } catch {
    /* ignore */
  }
  return error?.message || '요청에 실패했습니다.';
};

export const AuthProvider = ({ children }) => {
  const [session, setSession] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profiles, setProfiles] = useState([]);
  const [authLoading, setAuthLoading] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);
  const [authNotice, setAuthNotice] = useState('');
  const loggingOutRef = useRef(false);

  const userId = session?.user?.id || null;

  // 1. 세션 복원 + 변경 감지
  useEffect(() => {
    if (!supabase) {
      setAuthLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session || null);
      setAuthLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession || null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  // 2. 프로필 목록 (본인 프로필 + 작업자 이름 표시용)
  const refreshProfiles = useCallback(async () => {
    if (!supabase || !userId) return null;
    const { data, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).order('created_at');
    if (error) throw error;
    setProfiles(data || []);
    const mine = (data || []).find(p => p.id === userId) || null;
    setProfile(mine);
    if (mine) saveCachedProfile(mine);
    return mine;
  }, [userId]);

  // 이 함수는 아래 effect 들보다 먼저 선언되어야 한다
  const logout = useCallback(async ({ skipConfirm = false, notice = '' } = {}) => {
    if (loggingOutRef.current) return false;
    loggingOutRef.current = true;
    try {
      resetPushFailures();
      const { pending, failures } = await flushPendingPushes();
      if (!skipConfirm && (pending > 0 || failures > 0)) {
        const ok = window.confirm(
          `서버에 아직 저장되지 않았거나 저장에 실패한 변경이 있습니다 (전송 중 ${pending}건, 실패 ${failures}건).\n` +
          '지금 로그아웃하면 이 변경은 사라질 수 있습니다. 그래도 로그아웃할까요?'
        );
        if (!ok) return false;
      }
      clearLocalDataCache();
      clearCachedProfile();
      try {
        sessionStorage.removeItem(LAST_ACTIVITY_KEY);
      } catch {
        /* ignore */
      }
      setProfile(null);
      setProfiles([]);
      if (supabase) await supabase.auth.signOut().catch(() => {});
      setSession(null);
      setAuthNotice(notice);
      return true;
    } finally {
      loggingOutRef.current = false;
    }
  }, []);

  useEffect(() => {
    if (!userId) {
      setProfile(null);
      setProfiles([]);
      return;
    }
    let cancelled = false;
    setProfileLoading(true);
    refreshProfiles()
      .catch((e) => {
        // 오프라인: 마지막으로 받은 프로필로 계속 사용
        console.warn('Failed to load profile, falling back to cached profile:', e);
        if (!cancelled) setProfile(loadCachedProfile(userId));
      })
      .finally(() => {
        if (!cancelled) setProfileLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId, refreshProfiles]);

  // 3. 권한 변경 즉시 반영 (Realtime)
  useEffect(() => {
    if (!supabase || !userId) return;
    const channel = supabase
      .channel('wysh_profiles_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, () => {
        refreshProfiles().catch(() => {});
      })
      .subscribe();
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshProfiles().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [userId, refreshProfiles]);

  // 비활성화되면 즉시 로그아웃
  useEffect(() => {
    if (profile && !profile.is_active) {
      logout({ skipConfirm: true, notice: '계정이 비활성화되어 로그아웃되었습니다.' });
    }
  }, [profile, logout]);

  // 4. 접속 기록 (마지막 접속 시각 + 앱 버전)
  useEffect(() => {
    if (!supabase || !userId || !profile?.is_active) return;
    const touch = () => {
      supabase.rpc('touch_presence', { p_version: APP_VERSION }).then(({ error }) => {
        if (error) console.warn('touch_presence failed:', error);
      });
    };
    touch();
    const id = setInterval(touch, PRESENCE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [userId, profile?.is_active]);

  // 5. "로그인 유지"를 체크하지 않았으면 30분 무조작 시 자동 로그아웃
  useEffect(() => {
    if (!userId || getRememberMe()) return;
    const markActivity = () => {
      try {
        sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
      } catch {
        /* ignore */
      }
    };
    const readLastActivity = () => {
      try {
        return Number(sessionStorage.getItem(LAST_ACTIVITY_KEY)) || Date.now();
      } catch {
        return Date.now();
      }
    };
    const check = () => {
      if (Date.now() - readLastActivity() >= IDLE_LOGOUT_MS) {
        logout({ skipConfirm: true, notice: '30분 동안 사용하지 않아 자동으로 로그아웃되었습니다.' });
      }
    };
    // 앱을 다시 열었을 때 이미 시간이 지났으면 바로 로그아웃
    check();
    markActivity();
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'];
    events.forEach(e => window.addEventListener(e, markActivity, { passive: true }));
    const onVisible = () => {
      if (document.visibilityState === 'visible') check();
    };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(check, IDLE_CHECK_INTERVAL_MS);
    return () => {
      events.forEach(e => window.removeEventListener(e, markActivity));
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [userId, logout]);

  // 6. 로그인 / 비밀번호 변경 / 관리자 기능
  const login = useCallback(async (username, password, remember) => {
    if (!supabase) return { error: 'Supabase 설정이 없어 로그인할 수 없습니다.' };
    setAuthNotice('');
    // 이전 사용자의 로컬 캐시가 남아 있으면 비운다 (공용 기기)
    clearLocalDataCache();
    setRememberMe(!!remember);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: usernameToEmail(username),
      password
    });
    if (error) return { error: translateAuthError(error) };

    const { data: prof, error: profErr } = await supabase
      .from('profiles')
      .select('is_active')
      .eq('id', data.user.id)
      .maybeSingle();
    if (profErr || !prof || !prof.is_active) {
      await supabase.auth.signOut().catch(() => {});
      return { error: !prof ? '계정 정보가 없습니다. 관리자에게 문의하세요.' : '비활성화된 계정입니다. 관리자에게 문의하세요.' };
    }
    try {
      sessionStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
    } catch {
      /* ignore */
    }
    return { error: null };
  }, []);

  const changePassword = useCallback(async (newPassword) => {
    if (!supabase) return { error: 'Supabase 설정이 없습니다.' };
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) {
      const msg = (error.message || '').toLowerCase();
      if (msg.includes('different from the old')) return { error: '이전 비밀번호와 다른 비밀번호를 입력해 주세요.' };
      return { error: translateAuthError(error) };
    }
    const { error: rpcErr } = await supabase.rpc('complete_password_change');
    if (rpcErr) return { error: rpcErr.message };
    await refreshProfiles().catch(() => {});
    return { error: null };
  }, [refreshProfiles]);

  const callAdminUsers = useCallback(async (action, payload = {}) => {
    if (!supabase) return { error: 'Supabase 설정이 없습니다.' };
    const { data, error } = await supabase.functions.invoke('admin-users', { body: { action, ...payload } });
    if (error) return { error: await readFunctionError(error) };
    if (data?.error) return { error: data.error };
    await refreshProfiles().catch(() => {});
    return { error: null, data };
  }, [refreshProfiles]);

  const updateUserPermissions = useCallback(async (targetId, { permissions, isAdmin, displayName }) => {
    if (!supabase) return { error: 'Supabase 설정이 없습니다.' };
    const patch = {};
    if (permissions !== undefined) patch.permissions = permissions;
    if (isAdmin !== undefined) patch.is_admin = isAdmin;
    if (displayName !== undefined) patch.display_name = displayName;
    const { error } = await supabase.from('profiles').update(patch).eq('id', targetId);
    if (error) return { error: error.message };
    await refreshProfiles().catch(() => {});
    return { error: null };
  }, [refreshProfiles]);

  const can = useCallback((permission) => canWith(profile, permission), [profile]);

  const profilesById = useMemo(
    () => Object.fromEntries(profiles.map(p => [p.id, p])),
    [profiles]
  );

  const value = {
    session,
    user: session?.user || null,
    profile,
    profiles,
    profilesById,
    authLoading,
    profileLoading,
    authNotice,
    isConfigured: !!supabase,
    can,
    login,
    logout,
    changePassword,
    refreshProfiles,
    callAdminUsers,
    updateUserPermissions
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

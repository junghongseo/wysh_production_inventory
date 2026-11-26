// 로그인 세션 저장소.
// "이 기기에서 로그인 유지"를 체크하면 localStorage(무기한), 아니면 sessionStorage(앱/탭을 닫으면 사라짐 + 30분 무조작 시 로그아웃).
const REMEMBER_KEY = 'wysh_auth_remember';

export const getRememberMe = () => {
  try {
    return localStorage.getItem(REMEMBER_KEY) === '1';
  } catch {
    return false;
  }
};

export const setRememberMe = (remember) => {
  try {
    localStorage.setItem(REMEMBER_KEY, remember ? '1' : '0');
  } catch {
    /* ignore */
  }
};

const safe = (fn, fallback = null) => {
  try {
    return fn();
  } catch {
    return fallback;
  }
};

export const authStorage = {
  getItem: (key) => safe(() => localStorage.getItem(key)) ?? safe(() => sessionStorage.getItem(key)),
  setItem: (key, value) => {
    if (getRememberMe()) {
      safe(() => localStorage.setItem(key, value));
      safe(() => sessionStorage.removeItem(key));
    } else {
      safe(() => sessionStorage.setItem(key, value));
      safe(() => localStorage.removeItem(key));
    }
  },
  removeItem: (key) => {
    safe(() => localStorage.removeItem(key));
    safe(() => sessionStorage.removeItem(key));
  }
};

// 오프라인에서도 이미 로그인된 세션을 쓸 수 있도록 마지막 프로필을 세션과 같은 저장소에 둔다.
const PROFILE_KEY = 'wysh_auth_profile';

export const saveCachedProfile = (profile) => {
  if (!profile) return;
  authStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};

export const loadCachedProfile = (userId) => {
  const raw = authStorage.getItem(PROFILE_KEY);
  if (!raw) return null;
  const parsed = safe(() => JSON.parse(raw));
  return parsed && parsed.id === userId ? parsed : null;
};

export const clearCachedProfile = () => authStorage.removeItem(PROFILE_KEY);

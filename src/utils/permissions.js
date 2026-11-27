// 권한 정의와 판정 (순수 함수). DB 쪽 public.permission_parent / has_permission 과 같은 규칙을 유지한다.

export const LOGIN_EMAIL_DOMAIN = 'wysh.local';
export const USERNAME_PATTERN = /^[a-z0-9._]{3,20}$/;
export const MIN_PASSWORD_LENGTH = 8;
export const IDLE_LOGOUT_MS = 30 * 60 * 1000;

// 메뉴 권한 (켜면 탭이 보이고 기본 기능을 쓸 수 있다)
export const MENU_PERMISSIONS = [
  { key: 'menu.calendar', label: '캘린더', description: '생산 일정 보기', tab: 'calendar-view' },
  { key: 'menu.inventory', label: '재고', description: '재고 보기, 출고 등록(미검증)', tab: 'inventory-view' },
  { key: 'menu.reports', label: '보고서', description: '보기, 작성, 관능 보고서 확인', tab: 'reports-view' },
  { key: 'menu.orders', label: '주문 정리 및 분석', description: '주문 파일 정리·분석', tab: 'order-view' },
  { key: 'menu.recipes', label: '제품 및 레시피 설정', description: '제품·배합표 편집', tab: 'recipes-view' }
];

// 기능 권한 (parent 메뉴 권한이 함께 있어야 유효)
export const FEATURE_PERMISSIONS = [
  { key: 'calendar.recipe', parent: 'menu.calendar', label: '배합표 보기', description: '생산계획별 원재료 배합표(배합 비율) 열람' },
  { key: 'calendar.plans', parent: 'menu.calendar', label: '생산계획 관리', description: '생산계획 등록·수정·삭제' },
  { key: 'calendar.notes', parent: 'menu.calendar', label: '일정 메모 작성', description: '캘린더 일정 메모 작성·수정·삭제' },
  { key: 'inventory.verify', parent: 'menu.inventory', label: '출고 검증 및 취소', description: '출고 검증, 출고 취소, 출고 메모 수정' },
  { key: 'reports.confirm', parent: 'menu.reports', label: '보고서 확인 처리', description: '관능 보고서 외 전체 보고서 확인' },
  { key: 'recipes.cost', parent: 'menu.recipes', label: '원가 보기', description: '원가, 원가율, 원재료 단가표' },
  { key: 'ai.manager', parent: null, label: 'AI 매니저', description: 'AI 생산 매니저 채팅' }
];

export const ALL_PERMISSION_KEYS = [
  ...MENU_PERMISSIONS.map(p => p.key),
  ...FEATURE_PERMISSIONS.map(p => p.key)
];

const PARENT_OF = Object.fromEntries(FEATURE_PERMISSIONS.map(p => [p.key, p.parent]));

// 관리자 전용 화면/기능 키 (권한으로 나눠 주지 않음)
export const ADMIN_ONLY = 'admin';

/**
 * profile: { is_admin, is_active, permissions: string[] }
 * 비활성 계정은 아무 권한도 없다. 관리자는 모든 권한을 가진다.
 * 기능 권한은 상위 메뉴 권한이 없으면 무효.
 */
export const can = (profile, permission) => {
  if (!profile || !profile.is_active) return false;
  if (profile.is_admin) return true;
  if (permission === ADMIN_ONLY) return false;
  const perms = Array.isArray(profile.permissions) ? profile.permissions : [];
  if (!perms.includes(permission)) return false;
  const parent = PARENT_OF[permission];
  return !parent || perms.includes(parent);
};

// 배합 데이터(비율·레시피 메모·부자재 구성)를 내려받을 수 있는지.
// 배합표 보기, 레시피 설정, 그리고 필요량 계산에 비율이 필요한 생산계획 관리.
// SQL public.can_read_recipes() 와 같은 규칙.
export const canReadRecipeData = (profile) =>
  can(profile, 'calendar.recipe') || can(profile, 'menu.recipes') || can(profile, 'calendar.plans');

// 탭 순서는 내비게이션 순서와 같다. team-view 는 관리자 전용.
export const TAB_PERMISSIONS = {
  'calendar-view': 'menu.calendar',
  'inventory-view': 'menu.inventory',
  'reports-view': 'menu.reports',
  'order-view': 'menu.orders',
  'recipes-view': 'menu.recipes',
  'team-view': ADMIN_ONLY
};

export const canViewTab = (profile, tab) => {
  const perm = TAB_PERMISSIONS[tab];
  return !!perm && can(profile, perm);
};

// 볼 수 있는 첫 번째 탭. 없으면 null (권한 없음 안내 화면)
export const firstAllowedTab = (profile) =>
  Object.keys(TAB_PERMISSIONS).find(tab => canViewTab(profile, tab)) || null;

// 미확인 배지 개수 (권한에 맞는 항목만)
export const countUnconfirmedReports = (profile, reports = []) => {
  if (!can(profile, 'menu.reports')) return 0;
  const all = can(profile, 'reports.confirm');
  return reports.filter(r => !r.confirmed && (all || r.type === 'sensory')).length;
};

export const countUnverifiedOutflows = (profile, inventory = []) => {
  if (!can(profile, 'inventory.verify')) return 0;
  return inventory.reduce(
    (acc, inv) => acc + (inv.history ? inv.history.filter(h => h.verified === false).length : 0),
    0
  );
};

export const usernameToEmail = (username) => `${String(username).trim().toLowerCase()}@${LOGIN_EMAIL_DOMAIN}`;

export const validateUsername = (username) =>
  USERNAME_PATTERN.test(String(username || '').trim().toLowerCase())
    ? null
    : '아이디는 영문 소문자, 숫자, ".", "_" 로 3~20자여야 합니다.';

export const validatePassword = (password) =>
  String(password || '').length >= MIN_PASSWORD_LENGTH
    ? null
    : `비밀번호는 ${MIN_PASSWORD_LENGTH}자 이상이어야 합니다.`;

// 작업자 이름 표시: 계정 기록이 있으면 계정 표시 이름, 없으면 과거 텍스트(서명자/작성자), 그것도 없으면 '—'
export const resolveWorkerName = (userId, legacyName, profilesById = {}) => {
  if (userId && profilesById[userId]) return profilesById[userId].display_name;
  const legacy = String(legacyName || '').trim();
  return legacy || '—';
};

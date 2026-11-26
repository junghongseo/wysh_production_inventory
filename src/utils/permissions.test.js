import {
  can,
  canViewTab,
  firstAllowedTab,
  countUnconfirmedReports,
  countUnverifiedOutflows,
  usernameToEmail,
  validateUsername,
  validatePassword,
  resolveWorkerName,
  ADMIN_ONLY
} from './permissions.js';

let totalPassed = 0;
let totalFailed = 0;
const assert = (cond, msg) => {
  if (cond) { totalPassed++; console.log(`  ✅ ${msg}`); }
  else { totalFailed++; console.error(`  ❌ ${msg}`); }
};

const user = (permissions, extra = {}) => ({ is_admin: false, is_active: true, permissions, ...extra });

console.log('\n[can]');
assert(can(null, 'menu.calendar') === false, '프로필 없으면 권한 없음');
assert(can(user(['menu.calendar']), 'menu.calendar') === true, '메뉴 권한 있음');
assert(can(user([]), 'menu.calendar') === false, '빈 권한');
assert(can(user(['calendar.plans']), 'calendar.plans') === false, '상위 메뉴 없으면 기능 권한 무효');
assert(can(user(['menu.calendar', 'calendar.plans']), 'calendar.plans') === true, '상위 메뉴 + 기능 권한');
assert(can(user(['ai.manager']), 'ai.manager') === true, '상위 메뉴 없는 기능 권한');
assert(can(user(['menu.calendar']), 'calendar.recipe') === false, '캘린더 권한만으로는 배합표를 볼 수 없음');
assert(can(user(['menu.calendar', 'calendar.plans']), 'calendar.recipe') === false, '생산계획 관리 권한으로도 배합표를 볼 수 없음');
assert(can(user(['menu.calendar', 'calendar.recipe']), 'calendar.recipe') === true, '배합표 보기 권한');
assert(can(user(['calendar.recipe']), 'calendar.recipe') === false, '캘린더 없이 배합표 보기 권한은 무효');
assert(can(user(['menu.calendar'], { is_active: false }), 'menu.calendar') === false, '비활성 계정은 권한 없음');
assert(can(user([], { is_admin: true }), 'recipes.cost') === true, '관리자는 모든 권한');
assert(can(user([], { is_admin: true }), ADMIN_ONLY) === true, '관리자 전용');
assert(can(user(['admin']), ADMIN_ONLY) === false, '권한 배열에 admin 이 있어도 관리자 아님');
assert(can(user([], { is_admin: true, is_active: false }), ADMIN_ONLY) === false, '비활성 관리자는 권한 없음');

console.log('\n[tabs]');
assert(canViewTab(user(['menu.orders']), 'order-view') === true, '주문 탭');
assert(canViewTab(user(['menu.orders']), 'team-view') === false, '팀원 관리 탭은 관리자만');
assert(canViewTab(user([]), 'unknown-view') === false, '알 수 없는 탭');
assert(firstAllowedTab(user(['menu.reports', 'menu.orders'])) === 'reports-view', '첫 번째 허용 탭');
assert(firstAllowedTab(user(['ai.manager'])) === null, '볼 수 있는 탭 없음 → null');
assert(firstAllowedTab(user([], { is_admin: true })) === 'calendar-view', '관리자는 캘린더부터');

console.log('\n[badges]');
const reports = [
  { type: 'sensory', confirmed: false },
  { type: 'production', confirmed: false },
  { type: 'production', confirmed: true }
];
assert(countUnconfirmedReports(user(['menu.reports']), reports) === 1, '보고서 메뉴만: 관능 미확인만');
assert(countUnconfirmedReports(user(['menu.reports', 'reports.confirm']), reports) === 2, '확인 권한: 전체 미확인');
assert(countUnconfirmedReports(user([]), reports) === 0, '보고서 메뉴 없음: 0');
const inventory = [{ history: [{ verified: false }, { verified: true }] }, { history: [{ verified: false }] }, {}];
assert(countUnverifiedOutflows(user(['menu.inventory']), inventory) === 0, '검증 권한 없음: 0');
assert(countUnverifiedOutflows(user(['menu.inventory', 'inventory.verify']), inventory) === 2, '검증 권한: 미검증 2');

console.log('\n[account helpers]');
assert(usernameToEmail(' Minsu ') === 'minsu@wysh.local', '아이디 → 로그인 이메일');
assert(validateUsername('kim.minsu_1') === null, '올바른 아이디');
assert(validateUsername('ab') !== null, '너무 짧은 아이디');
assert(validateUsername('김민수') !== null, '한글 아이디 불가');
assert(validateUsername('a b c') !== null, '공백 불가');
assert(validatePassword('1234567') !== null, '7자 비밀번호 불가');
assert(validatePassword('12345678') === null, '8자 비밀번호');

console.log('\n[resolveWorkerName]');
const profilesById = { u1: { display_name: '김민수' } };
assert(resolveWorkerName('u1', '민수', profilesById) === '김민수', '계정 기록 우선');
assert(resolveWorkerName(null, '박지영', profilesById) === '박지영', '과거 기록: 서명자 텍스트');
assert(resolveWorkerName(null, '  ', profilesById) === '—', '기록 없음');
assert(resolveWorkerName('unknown', '', profilesById) === '—', '알 수 없는 계정 + 텍스트 없음');

if (totalFailed > 0) {
  console.error(`\n💥 FAILED: ${totalFailed}, Passed: ${totalPassed}`);
  process.exit(1);
}
console.log(`\n🎉 ALL TESTS PASSED! Total: ${totalPassed}, Failed: ${totalFailed}`);

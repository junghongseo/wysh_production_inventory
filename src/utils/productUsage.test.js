import { getProductUsage } from './productUsage.js';

let totalPassed = 0;
let totalFailed = 0;
const assert = (cond, msg) => {
  if (cond) { totalPassed++; console.log(`  ✅ ${msg}`); }
  else { totalFailed++; console.error(`  ❌ ${msg}`); }
};

const plans = [
  { id: 'P-1', productId: 'greek', items: [{ productId: 'greek' }] },
  { id: 'P-2', productId: 'greek', items: [{ productId: 'greek' }, { productId: 'vanilla' }] },
  { id: 'P-SUB-1', planType: 'sub_ingredient', productId: null, subProductId: 'paste', targetYogurtProductId: 'mocha', items: [] },
  { id: 'P-3', productId: 'mud' }
];
const reports = [
  { id: 'r1', planId: 'P-1' }, { id: 'r2', planId: 'P-1' }, { id: 'r3', planId: 'P-2' }, { id: 'r4', planId: 'P-3' }
];

console.log('\n[getProductUsage]');
{
  const u = getProductUsage('greek', plans, reports);
  assert(u.planCount === 2 && u.reportCount === 3, '주 제품: 계획 2건, 보고서 3건');
}
{
  const u = getProductUsage('vanilla', plans, reports);
  assert(u.planCount === 1 && u.reportCount === 1, '2종 동시 계획의 두 번째 품목도 셈');
}
assert(getProductUsage('paste', plans, reports).planCount === 1, '반제품 계획의 반제품');
assert(getProductUsage('mocha', plans, reports).planCount === 1, '반제품 계획의 대상 요거트');
assert(getProductUsage('mud', plans, reports).reportCount === 1, '계획 1건 + 보고서 1건');
{
  const u = getProductUsage('new-flavor', plans, reports);
  assert(u.planCount === 0 && u.reportCount === 0, '쓰이지 않은 제품은 0건 (삭제 가능)');
}
assert(getProductUsage(null, plans, reports).planCount === 0, '제품 id 없음');
assert(getProductUsage('greek').planCount === 0, '목록이 없으면 0건');
assert(getProductUsage('x', [{ id: 'P', items: [null] }]).planCount === 0, '잘못된 품목은 무시');

console.log(`\n${totalFailed === 0 ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED'} Total: ${totalPassed + totalFailed}, Failed: ${totalFailed}`);
if (totalFailed > 0) process.exit(1);

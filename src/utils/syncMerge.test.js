import { mergeShippingCharts } from './syncMerge.js';

let totalPassed = 0;
let totalFailed = 0;
const assert = (cond, msg) => {
  if (cond) { totalPassed++; console.log(`  ✅ ${msg}`); }
  else { totalFailed++; console.error(`  ❌ ${msg}`); }
};
const chart = (date, updatedAt, title = date) => ({ date, updatedAt, title });

console.log('\n[mergeShippingCharts]');
{
  const { charts, toPush } = mergeShippingCharts([chart('2026-11-01', 't1')], []);
  assert(charts.length === 0 && toPush.length === 0, '다른 기기에서 삭제된 출고표는 로컬에서도 사라짐');
}
{
  const local = [chart('2026-11-01', 't1')];
  const { charts, toPush } = mergeShippingCharts(local, null);
  assert(charts.length === 1 && toPush.length === 0, '원격 조회 실패 시 로컬 유지');
}
{
  const { charts } = mergeShippingCharts([chart('2026-11-01', '2026-11-01T01:00:00Z', '로컬')], [chart('2026-11-01', '2026-11-01T02:00:00Z', '원격')]);
  assert(charts.length === 1 && charts[0].title === '원격', '원격이 더 새로우면 원격 사용');
}
{
  const local = chart('2026-11-01', '2026-11-01T03:00:00Z', '로컬');
  const { charts, toPush } = mergeShippingCharts([local], [chart('2026-11-01', '2026-11-01T02:00:00Z', '원격')]);
  assert(charts[0].title === '로컬' && toPush.length === 1 && toPush[0] === local, '로컬이 더 새로우면 로컬 사용 + 다시 올림');
}
{
  const { charts } = mergeShippingCharts([], [chart('2026-11-01', 't'), chart('2026-11-03', 't'), chart('2026-11-02', 't')]);
  assert(charts.map(c => c.date).join(',') === '2026-11-03,2026-11-02,2026-11-01', '날짜 내림차순 정렬');
}
{
  const { charts } = mergeShippingCharts([chart('2026-11-01', null, '로컬')], [chart('2026-11-01', '2026-11-01T02:00:00Z', '원격')]);
  assert(charts[0].title === '원격', '로컬 updatedAt 이 없으면 원격 사용');
}
{
  const { charts } = mergeShippingCharts(null, [null, { title: '날짜 없음' }, chart('2026-11-01', 't')]);
  assert(charts.length === 1, '잘못된 항목은 무시');
}

console.log(`\n${totalFailed === 0 ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED'} Total: ${totalPassed + totalFailed}, Failed: ${totalFailed}`);
if (totalFailed > 0) process.exit(1);

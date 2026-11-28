import { enqueue, removeIfUnchanged, markAttempt, mergeQueues, applyOutbox, isRetryableError } from './outboxQueue.js';

let totalPassed = 0;
let totalFailed = 0;
const assert = (cond, msg) => {
  if (cond) { totalPassed++; console.log(`  ✅ ${msg}`); }
  else { totalFailed++; console.error(`  ❌ ${msg}`); }
};

console.log('\n[enqueue]');
{
  let q = [];
  q = enqueue(q, { kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1', name: 'a' } }, 1);
  q = enqueue(q, { kind: 'inventory', key: 'P-1', op: 'upsert', payload: { planId: 'P-1' } }, 2);
  q = enqueue(q, { kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1', name: 'b' } }, 3);
  assert(q.length === 2, '같은 항목은 하나로 합침');
  assert(q[0].kind === 'plan' && q[0].payload.name === 'b' && q[0].v === 2, '마지막 값 + 버전 증가');
  assert(q[0].seq === 1 && q[1].kind === 'inventory', '처음 순서 유지 (계획이 재고보다 먼저)');
}
{
  let q = [];
  q = enqueue(q, { kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1' } }, 1);
  q = enqueue(q, { kind: 'inventory', key: 'P-1', op: 'upsert', payload: { planId: 'P-1' } }, 2);
  q = enqueue(q, { kind: 'plan', key: 'P-1', op: 'delete' }, 3);
  assert(q.length === 1 && q[0].op === 'delete', '계획 삭제 → 그 계획의 재고 저장도 뺌');
}
{
  let q = [];
  q = enqueue(q, { kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1', productId: 'prod-a' } }, 1);
  q = enqueue(q, { kind: 'inventory', key: 'P-1', op: 'upsert', payload: { planId: 'P-1' } }, 2);
  q = enqueue(q, { kind: 'plan', key: 'P-2', op: 'upsert', payload: { id: 'P-2', productId: 'prod-b' } }, 3);
  q = enqueue(q, { kind: 'product', key: 'prod-a', op: 'delete' }, 4);
  assert(q.map(e => `${e.kind}:${e.key}`).join(',') === 'plan:P-2,product:prod-a', '제품 삭제 → 그 제품의 계획·재고 저장도 뺌');
}
{
  const q0 = enqueue([], { kind: 'report', key: 'r1', op: 'upsert', payload: { id: 'r1' } }, 1);
  const sent = q0[0];
  const q1 = enqueue(q0, { kind: 'report', key: 'r1', op: 'upsert', payload: { id: 'r1', x: 1 } }, 2);
  assert(removeIfUnchanged(q1, sent).length === 1, '전송 중 새 값이 들어오면 남겨 둠');
  assert(removeIfUnchanged(q0, sent).length === 0, '그대로면 뺌');
  assert(markAttempt(q0, sent)[0].attempts === 1, '시도 횟수 증가');
}

console.log('\n[mergeQueues]');
{
  const snap = [{ seq: 1, kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1', name: 'old' }, v: 1 }];
  const cur = [{ seq: 2, kind: 'plan', key: 'P-2', op: 'upsert', payload: { id: 'P-2' }, v: 1 }];
  const m = mergeQueues(snap, cur);
  assert(m.length === 2 && m[0].key === 'P-1', '조회 중 전송이 끝난 항목도 계속 덮어 보여 줌');
  const cur2 = [{ seq: 1, kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1', name: 'new' }, v: 2 }];
  assert(mergeQueues(snap, cur2)[0].payload.name === 'new', '지금 대기열이 우선');
}

console.log('\n[applyOutbox]');
{
  const lists = {
    plans: [{ id: 'P-1', name: '서버' }, { id: 'P-2', productId: 'prod-b' }],
    inventory: [{ planId: 'P-1', actualQty: 10 }, { planId: 'P-2', actualQty: 5 }],
    shippingCharts: [{ date: '2026-11-01' }],
    reports: []
  };
  const q = [
    { seq: 1, kind: 'plan', key: 'P-1', op: 'upsert', payload: { id: 'P-1', name: '로컬' } },
    { seq: 2, kind: 'report', key: 'r1', op: 'upsert', payload: { id: 'r1' } },
    { seq: 3, kind: 'shippingChart', key: '2026-11-05', op: 'upsert', payload: { date: '2026-11-05' } },
    { seq: 4, kind: 'plan', key: 'P-2', op: 'delete' }
  ];
  const out = applyOutbox(lists, q);
  assert(out.plans.length === 1 && out.plans[0].name === '로컬', '대기 중인 수정이 서버 값보다 우선');
  assert(out.reports.length === 1, '대기 중인 새 항목 추가');
  assert(out.inventory.length === 1 && out.inventory[0].planId === 'P-1', '삭제 대기 계획의 재고는 숨김');
  assert(out.shippingCharts[0].date === '2026-11-05', '출고표는 날짜 내림차순');
  assert(out.products.length === 0 && out.calendarNotes.length === 0, '없는 목록은 빈 배열');
  assert(lists.plans[0].name === '서버', '원래 목록은 바꾸지 않음');
}
{
  const lists = { plans: [{ id: 'P-1', productId: 'prod-a' }, { id: 'P-2', productId: 'prod-b' }], inventory: [{ planId: 'P-1' }, { planId: 'P-2' }], products: [{ id: 'prod-a' }, { id: 'prod-b' }] };
  const out = applyOutbox(lists, [{ seq: 1, kind: 'product', key: 'prod-a', op: 'delete' }]);
  assert(out.products.length === 1 && out.plans.length === 1 && out.inventory.length === 1 && out.inventory[0].planId === 'P-2', '삭제 대기 제품의 계획·재고 숨김');
}
assert(applyOutbox({ plans: [{ id: 'P-1' }] }, []).plans.length === 1, '대기열이 비면 그대로');

console.log('\n[isRetryableError]');
assert(isRetryableError({ message: 'TypeError: Failed to fetch', code: '' }) === true, '네트워크 끊김');
assert(isRetryableError({ message: 'Load failed' }) === true, '사파리 네트워크 오류');
assert(isRetryableError({ code: 'PGRST301', message: 'JWT expired' }) === true, '토큰 만료');
assert(isRetryableError({ code: '57014', message: 'canceling statement due to statement timeout' }) === true, '서버 시간 초과');
assert(isRetryableError({ code: '42501', message: 'new row violates row-level security policy' }) === false, '권한 거부는 다시 안 보냄');
assert(isRetryableError({ code: '23503', message: 'violates foreign key constraint' }) === false, '데이터 오류는 다시 안 보냄');
assert(isRetryableError(null) === false, '오류 없음');

console.log(`\n${totalFailed === 0 ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED'} Total: ${totalPassed + totalFailed}, Failed: ${totalFailed}`);
if (totalFailed > 0) process.exit(1);

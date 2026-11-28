// 저장 대기열(outbox) 순수 함수.
// 서버에 아직 반영되지 않은 저장·삭제를 순서대로 보관하고, 동기화 결과 위에 덮어 보여 준다.
//
// 항목: { seq, kind, key, op: 'upsert' | 'delete', payload, v, attempts }
//   - kind+key 가 같은 항목은 하나로 합친다 (마지막 저장이 이김). 순서(seq)는 처음 자리를 유지해서
//     예를 들어 계획 → 그 계획의 재고 순서가 바뀌지 않게 한다 (재고는 계획을 외래키로 참조).
//   - v 는 합칠 때마다 1씩 늘어난다. 전송이 끝났을 때 그사이 새 값이 들어왔는지 확인하는 데 쓴다.

// 종류별 목록 이름과 키
export const OUTBOX_KINDS = {
  product: { list: 'products', keyOf: (x) => x.id },
  plan: { list: 'plans', keyOf: (x) => x.id },
  inventory: { list: 'inventory', keyOf: (x) => x.planId },
  calendarNote: { list: 'calendarNotes', keyOf: (x) => x.dateStr },
  report: { list: 'reports', keyOf: (x) => x.id },
  shippingChart: { list: 'shippingCharts', keyOf: (x) => x.date },
  materialCost: { list: 'materialCosts', keyOf: (x) => x.id }
};

const sameItem = (a, kind, key) => a.kind === kind && a.key === key;

/**
 * 대기열에 저장·삭제를 넣는다.
 * 삭제는 서버의 연쇄 삭제(ON DELETE CASCADE)와 맞춰, 딸린 항목의 대기 중인 저장도 함께 뺀다:
 *   - 계획 삭제 → 그 계획의 재고 저장
 *   - 제품 삭제 → 그 제품의 계획 저장과 그 계획들의 재고 저장
 * @returns {object[]} 새 대기열
 */
export const enqueue = (queue, { kind, key, op, payload = null }, nextSeq) => {
  let next = queue.slice();

  if (op === 'delete') {
    let planIds = [];
    if (kind === 'plan') planIds = [key];
    if (kind === 'product') {
      planIds = next
        .filter(e => e.kind === 'plan' && e.op === 'upsert' && e.payload?.productId === key)
        .map(e => e.key);
      next = next.filter(e => !(e.kind === 'plan' && planIds.includes(e.key)));
    }
    if (planIds.length > 0) {
      next = next.filter(e => !(e.kind === 'inventory' && planIds.includes(e.key)));
    }
  }

  const idx = next.findIndex(e => sameItem(e, kind, key));
  if (idx !== -1) {
    const prev = next[idx];
    next[idx] = { ...prev, op, payload, v: prev.v + 1, attempts: 0 };
  } else {
    next.push({ seq: nextSeq, kind, key, op, payload, v: 1, attempts: 0 });
  }
  return next;
};

// 전송을 마친 항목을 뺀다. 그사이 같은 항목에 새 값이 들어왔으면(v 가 다르면) 남겨 두어 다시 보낸다.
export const removeIfUnchanged = (queue, { kind, key, v }) =>
  queue.filter(e => !(sameItem(e, kind, key) && e.v === v));

export const markAttempt = (queue, { kind, key, v }) =>
  queue.map(e => (sameItem(e, kind, key) && e.v === v ? { ...e, attempts: e.attempts + 1 } : e));

/**
 * 두 대기열을 합친다 (뒤쪽 current 가 우선). 동기화 시작 때의 대기열과 지금 대기열을 합치는 데 쓴다:
 * 조회하는 사이 전송이 끝나 대기열에서 빠진 항목도, 조회 결과에 아직 안 들어 있을 수 있으므로 계속 덮어 보여 준다.
 */
export const mergeQueues = (snapshot, current) => {
  const result = current.slice();
  snapshot.forEach(s => {
    if (!result.some(e => sameItem(e, s.kind, s.key))) result.push(s);
  });
  return result.sort((a, b) => a.seq - b.seq);
};

/**
 * 서버에서 받은 목록 위에 대기 중인 저장·삭제를 덮어 보여 준다.
 * @param {object} lists { products, plans, inventory, calendarNotes, reports, shippingCharts, materialCosts }
 * @returns {object} 같은 모양의 새 목록 (출고표는 날짜 내림차순)
 */
export const applyOutbox = (lists, queue) => {
  const out = {};
  Object.values(OUTBOX_KINDS).forEach(({ list }) => {
    out[list] = (lists[list] || []).slice();
  });

  queue.forEach(({ kind, key, op, payload }) => {
    const def = OUTBOX_KINDS[kind];
    if (!def) return;
    const arr = out[def.list];
    const idx = arr.findIndex(x => def.keyOf(x) === key);
    if (op === 'delete') {
      if (idx !== -1) arr.splice(idx, 1);
    } else if (payload) {
      if (idx !== -1) arr[idx] = payload;
      else arr.push(payload);
    }
  });

  // 삭제 대기 중인 제품·계획에 딸린 항목은 서버가 연쇄 삭제하므로 미리 숨긴다
  const deletedProducts = new Set(queue.filter(e => e.kind === 'product' && e.op === 'delete').map(e => e.key));
  const deletedPlans = new Set(queue.filter(e => e.kind === 'plan' && e.op === 'delete').map(e => e.key));
  if (deletedProducts.size > 0) {
    out.plans = out.plans.filter(p => {
      if (!deletedProducts.has(p.productId)) return true;
      deletedPlans.add(p.id);
      return false;
    });
  }
  if (deletedPlans.size > 0) {
    out.inventory = out.inventory.filter(i => !deletedPlans.has(i.planId));
  }

  out.shippingCharts.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return out;
};

/**
 * 다시 보내면 성공할 수 있는 오류인지 (네트워크 끊김, 서버 일시 오류, 토큰 만료 등).
 * 권한 거부(42501)나 데이터 오류(23xxx 등)는 다시 보내도 같으므로 false.
 */
export const isRetryableError = (error) => {
  if (!error) return false;
  const code = String(error.code || '');
  const message = String(error.message || '');
  if (/fetch|network|timeout|load failed|aborted/i.test(message)) return true;
  if (code === '') return true;
  if (code.startsWith('PGRST3')) return true; // JWT 만료·시계 차이
  if (/^5\d\d$/.test(code) || /^(08|53|57)/.test(code)) return true; // HTTP 5xx, 연결·자원·운영자 개입 오류
  return false;
};

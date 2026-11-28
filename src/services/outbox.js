// 저장 대기열(outbox): 서버에 아직 반영되지 않은 저장·삭제를 localStorage 에 보관하고 순서대로 보낸다.
// - 네트워크가 끊겨 실패하면 대기열에 남겨 두고, 다음 동기화(10초)·온라인 복귀 때 다시 보낸다.
// - 동기화는 대기 중인 항목을 서버 값 위에 덮어 보여 주므로, 보내기 전에 화면에서 사라지지 않는다.
// - 권한 거부·데이터 오류처럼 다시 보내도 안 되는 실패는 알림 후 버린다 (화면은 서버 상태로 돌아감).
import * as remote from './supabaseService';
import { recordPushFailure } from './pushTracker';
import { enqueue, removeIfUnchanged, markAttempt } from '../utils/outboxQueue';

const STORAGE_KEY = 'wysh_outbox';
// 온라인인데도 계속 실패하는 항목은 이 횟수 뒤 버린다 (한 항목 때문에 뒤의 저장이 모두 막히지 않도록).
const MAX_ONLINE_ATTEMPTS = 30;

const PUSHERS = {
  product: { upsert: remote.pushProductToSupabase, delete: remote.deleteProductFromSupabase },
  plan: { upsert: remote.pushPlanToSupabase, delete: remote.deletePlanFromSupabase },
  inventory: { upsert: remote.pushInventoryToSupabase },
  calendarNote: { upsert: remote.pushCalendarNoteToSupabase, delete: remote.deleteCalendarNoteFromSupabase },
  report: { upsert: remote.pushReportToSupabase, delete: remote.deleteReportFromSupabase },
  shippingChart: { upsert: remote.pushShippingChartToSupabase, delete: remote.deleteShippingChartFromSupabase },
  materialCost: { upsert: remote.pushMaterialCostToSupabase, delete: remote.deleteMaterialCostFromSupabase }
};

const load = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

let queue = load();
let nextSeq = queue.reduce((max, e) => Math.max(max, e.seq || 0), 0) + 1;
let running = null;
const listeners = new Set();

const setQueue = (next) => {
  queue = next;
  try {
    if (queue.length > 0) localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
    else localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to persist outbox:', e);
  }
  listeners.forEach(fn => fn(queue.length));
};

const isOnline = () => typeof navigator === 'undefined' || navigator.onLine !== false;

const run = async () => {
  while (queue.length > 0) {
    const entry = queue[0];
    const pusher = PUSHERS[entry.kind]?.[entry.op];
    if (!pusher) {
      setQueue(removeIfUnchanged(queue, entry));
      continue;
    }
    let result;
    try {
      result = await pusher(entry.op === 'delete' ? entry.key : entry.payload);
    } catch (e) {
      console.warn('Outbox push threw:', e);
      result = { ok: false, retryable: true };
    }
    if (result?.ok || result?.retryable === false) {
      // 성공, 또는 다시 보내도 안 되는 실패(이미 알림) → 대기열에서 뺀다
      setQueue(removeIfUnchanged(queue, entry));
      continue;
    }
    // 다시 보낼 수 있는 실패: 순서를 지키기 위해 여기서 멈추고 다음 기회에 다시 보낸다
    if (isOnline()) {
      if (entry.attempts + 1 >= MAX_ONLINE_ATTEMPTS) {
        console.error('Outbox: giving up after repeated failures:', entry);
        recordPushFailure();
        if (typeof window !== 'undefined') {
          window.alert('서버에 계속 저장되지 않는 변경이 있어 저장을 멈췄습니다.\n잠시 후 화면이 서버 상태로 돌아갑니다. 해당 내용을 다시 입력해 주세요.');
        }
        setQueue(removeIfUnchanged(queue, entry));
        continue;
      }
      setQueue(markAttempt(queue, entry));
    }
    return;
  }
};

/** 대기 중인 저장을 보낸다. 이미 보내는 중이면 그 작업이 끝날 때까지 기다린다. */
export const flushOutbox = () => {
  if (!running) {
    running = run().finally(() => { running = null; });
  }
  return running;
};

/** 저장·삭제를 대기열에 넣고 바로 보내기 시작한다. */
export const enqueueSave = (kind, op, key, payload = null) => {
  setQueue(enqueue(queue, { kind, key, op, payload }, nextSeq++));
  // 이미 보내는 중이면 그 루프가 이어서 보낸다
  flushOutbox();
};

export const getOutbox = () => queue;

export const getOutboxCount = () => queue.length;

export const subscribeOutbox = (fn) => {
  listeners.add(fn);
  return () => listeners.delete(fn);
};

/** 로그아웃 전: 대기 중인 저장을 최대 timeoutMs 동안 보내 보고, 남은 건수를 돌려준다. */
export const drainOutbox = async (timeoutMs = 8000) => {
  if (queue.length > 0) {
    const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));
    await Promise.race([flushOutbox(), timeout]);
  }
  return queue.length;
};

/** 로그아웃·로그인 때 앞사람의 대기열을 남기지 않는다. */
export const clearOutbox = () => {
  setQueue([]);
};

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { flushOutbox(); });
}

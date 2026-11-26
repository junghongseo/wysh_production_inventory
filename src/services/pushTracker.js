// Supabase로 보내는 저장 요청을 추적한다.
// 로그아웃 직전에 전송 중인 요청이 끝날 때까지 기다리고, 실패가 있으면 경고하기 위해 쓴다.
const inFlight = new Set();
let failureCount = 0;

export const tracked = (fn) => (...args) => {
  const promise = Promise.resolve().then(() => fn(...args));
  inFlight.add(promise);
  promise.finally(() => inFlight.delete(promise)).catch(() => {});
  return promise;
};

export const recordPushFailure = () => {
  failureCount += 1;
};

export const resetPushFailures = () => {
  failureCount = 0;
};

export const getPushFailureCount = () => failureCount;

/**
 * 전송 중인 요청이 끝날 때까지(최대 timeoutMs) 기다린다.
 * @returns {Promise<{ pending: number, failures: number }>}
 */
export const flushPendingPushes = async (timeoutMs = 8000) => {
  if (inFlight.size > 0) {
    const timeout = new Promise(resolve => setTimeout(resolve, timeoutMs));
    await Promise.race([Promise.allSettled(Array.from(inFlight)), timeout]);
  }
  return { pending: inFlight.size, failures: failureCount };
};

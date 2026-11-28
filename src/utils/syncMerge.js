// 동기화 때 원격 데이터와 로컬 데이터를 합치는 순수 함수.

/**
 * 출고표(날짜별 1건) 병합.
 * - 원격 조회가 실패했으면(remote === null) 로컬을 그대로 둔다.
 * - 원격에 없는 로컬 출고표는 다른 기기에서 삭제된 것으로 보고 버린다 (삭제가 되살아나지 않도록).
 * - 같은 날짜가 양쪽에 있으면 updatedAt 이 더 새로운 쪽을 쓰고, 로컬이 더 새로우면 다시 올릴 목록(toPush)에 넣는다.
 * @returns {{ charts: object[], toPush: object[] }} charts 는 날짜 내림차순
 */
export const mergeShippingCharts = (local, remote) => {
  const sortDesc = (list) => [...list].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const localCharts = (local || []).filter(c => c && c.date);

  if (!Array.isArray(remote)) {
    return { charts: sortDesc(localCharts), toPush: [] };
  }

  const localByDate = new Map(localCharts.map(c => [c.date, c]));
  const charts = [];
  const toPush = [];
  remote.forEach(rc => {
    if (!rc || !rc.date) return;
    const lc = localByDate.get(rc.date);
    if (lc && lc.updatedAt && rc.updatedAt && lc.updatedAt > rc.updatedAt) {
      charts.push(lc);
      toPush.push(lc);
    } else {
      charts.push(rc);
    }
  });
  return { charts: sortDesc(charts), toPush };
};

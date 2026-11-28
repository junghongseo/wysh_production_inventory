// 제품이 생산 기록에 쓰였는지 확인한다 (제품 삭제 전 검사).
// 제품을 삭제하면 DB 가 그 제품의 생산계획 → 재고·보고서까지 연쇄 삭제하므로, 쓰인 제품은 삭제하지 않는다.

/**
 * @returns {{ planCount: number, reportCount: number }}
 *   planCount: 이 제품을 쓰는 생산계획 수 (주 제품, 2종 동시 계획의 품목, 반제품 계획의 반제품·대상 요거트)
 *   reportCount: 그 계획들에 딸린 보고서 수
 */
export const getProductUsage = (productId, plans = [], reports = []) => {
  if (!productId) return { planCount: 0, reportCount: 0 };
  const planIds = new Set(
    plans
      .filter(p =>
        p.productId === productId ||
        p.subProductId === productId ||
        p.targetYogurtProductId === productId ||
        (Array.isArray(p.items) && p.items.some(it => it && it.productId === productId))
      )
      .map(p => p.id)
  );
  const reportCount = reports.filter(r => planIds.has(r.planId)).length;
  return { planCount: planIds.size, reportCount };
};

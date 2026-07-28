/**
 * Calculates itemActualQty, itemOutflows, currentStock, and isReportConfirmed
 * for a specific item in a plan consistently across all components.
 */
export const calculateItemStock = (plan, item, planItems, invRecord = { history: [] }, reports = []) => {
  const isMultiItem = planItems.length > 1;
  const isReportConfirmed = reports && reports.some(r => r.type === 'bottling' && r.planId === plan.id && r.confirmed);
  const confirmedBottlingReport = reports?.find(r => r.type === 'bottling' && r.planId === plan.id && r.confirmed);
  const plannedQty = item.totalQty || ((item.expectedOrderQty || 0) + (item.marketingQty || 0) + (item.bufferQty || 0));

  let itemActualQty = 0;

  if (invRecord && invRecord.itemActualQtys && invRecord.itemActualQtys[item.productId] !== undefined) {
    itemActualQty = invRecord.itemActualQtys[item.productId];
  } else if (!isMultiItem && invRecord && invRecord.actualQty !== undefined && invRecord.actualQty !== plannedQty) {
    itemActualQty = invRecord.actualQty;
  } else if (confirmedBottlingReport && confirmedBottlingReport.details) {
    const d = confirmedBottlingReport.details;
    if (d.isMultiItem) {
      let matchedItem = null;
      if (d.item1 && (d.item1.productId === item.productId || (!d.item1.productId && planItems[0]?.productId === item.productId))) {
        matchedItem = d.item1;
      } else if (d.item2 && (d.item2.productId === item.productId || (!d.item2.productId && planItems[1]?.productId === item.productId))) {
        matchedItem = d.item2;
      }
      if (matchedItem) {
        itemActualQty = matchedItem.stockedQty !== undefined 
          ? matchedItem.stockedQty 
          : Math.max(0, (matchedItem.count || 0) - (matchedItem.deduct || 0));
      } else {
        itemActualQty = plannedQty;
      }
    } else {
      itemActualQty = d.actualStockedQty !== undefined 
        ? d.actualStockedQty 
        : Math.max(0, (d.count || 0) - (d.deduct || 0));
    }
  } else if (isReportConfirmed) {
    itemActualQty = plannedQty;
  } else if (!isMultiItem && invRecord && invRecord.actualQty !== undefined) {
    itemActualQty = invRecord.actualQty;
  } else {
    itemActualQty = plannedQty;
  }

  const itemOutflows = (invRecord?.history || []).reduce((sum, h) => {
    if (!isMultiItem || !h.productId || h.productId === item.productId) {
      return sum + (h.qty || 0);
    }
    return sum;
  }, 0);

  const currentStock = Math.max(0, itemActualQty - itemOutflows);

  return {
    plannedQty,
    itemActualQty,
    itemOutflows,
    currentStock,
    isReportConfirmed
  };
};

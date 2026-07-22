import React, { useMemo } from 'react';
import { useWysh } from '../WyshContext';

const dateAddDays = (dateStr, days) => {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const HeaderStats = () => {
  const { products, plans, inventory } = useWysh();

  const stats = useMemo(() => {
    // A. Product count
    const productCount = (products || []).length;

    // B. Pending Plans count
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingCount = (plans || []).filter(p => p && p.startDate && p.startDate >= todayStr).length;

    // C. Total Available Stock count (100% matching InventoryView's "출고 가능 계획만 보기" filter)
    let totalStock = 0;

    (plans || []).forEach(plan => {
      if (!plan) return;

      const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0 
        ? plan.items 
        : [{ productId: plan.productId, totalQty: plan.totalQty }];

      const isMultiItem = planItems.length > 1;
      const invRecord = (inventory || []).find(i => i.planId === plan.id) || { actualQty: plan.totalQty, history: [] };

      planItems.forEach(it => {
        const prod = (products || []).find(p => p.id === it.productId);
        const itemBotDate = it.bottlingDate || plan.bottlingDate;
        if (!itemBotDate) return;

        const shippingLimit = it.shippingLimit || (itemBotDate ? dateAddDays(itemBotDate, prod ? (prod.shippingLimitDays ?? 7) : 7) : plan.shippingLimit);

        // Filter: 출고 가능 계획만 (오늘 >= 병입일 AND 오늘 <= 출고기한)
        const isActive = shippingLimit >= todayStr && todayStr >= itemBotDate;
        if (!isActive) return;

        const plannedQty = it.totalQty || ((it.expectedOrderQty || 0) + (it.marketingQty || 0) + (it.bufferQty || 0));

        let itemActualQty = plannedQty;
        if (invRecord.itemActualQtys && invRecord.itemActualQtys[it.productId] !== undefined) {
          itemActualQty = invRecord.itemActualQtys[it.productId];
        } else if (!isMultiItem && invRecord.actualQty !== undefined) {
          itemActualQty = invRecord.actualQty;
        }

        const itemOutflows = (invRecord.history || []).reduce((sum, h) => {
          if (!isMultiItem || !h.productId || h.productId === it.productId) {
            return sum + (h.qty || 0);
          }
          return sum;
        }, 0);

        const currentStock = itemActualQty - itemOutflows;
        totalStock += currentStock;
      });
    });

    return {
      productCount,
      pendingCount,
      totalStock: isNaN(totalStock) ? 0 : totalStock
    };
  }, [products, plans, inventory]);

  return (
    <div className="header-stats" id="header-stats-panel">
      <div className="stat-mini-card">
        <span className="label">등록 제품수</span>
        <span className="value blue" id="stat-products-count">{stats.productCount}개</span>
      </div>
      <div className="stat-mini-card">
        <span className="label">대기중인 계획</span>
        <span className="value purple" id="stat-pending-plans">{stats.pendingCount}건</span>
      </div>
      <div className="stat-mini-card">
        <span className="label">총 현재 재고</span>
        <span className="value green" id="stat-total-stock">{stats.totalStock.toLocaleString()}개</span>
      </div>
    </div>
  );
};

export default HeaderStats;

import React, { useMemo } from 'react';
import { useWysh } from '../WyshContext';

const HeaderStats = () => {
  const { products, plans, inventory } = useWysh();

  const stats = useMemo(() => {
    // A. Product count
    const productCount = (products || []).length;

    // B. Pending Plans count
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingCount = (plans || []).filter(p => p && p.startDate && p.startDate >= todayStr).length;

    // C. Total Stock count
    let totalStock = 0;
    (inventory || []).forEach(inv => {
      if (!inv) return;
      const plan = (plans || []).find(p => p && p.id === inv.planId);
      // 생산계획이 세워졌더라도 병입일이 되지 않으면 총 재고 수량에 반영하지 않음
      if (plan && plan.bottlingDate && todayStr >= plan.bottlingDate) {
        const outflowSum = Array.isArray(inv.history) ? inv.history.reduce((sum, item) => sum + (item?.qty || 0), 0) : 0;
        const actual = inv.actualQty || (plan.totalQty || 0);
        totalStock += (actual - outflowSum);
      }
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

import React, { useMemo } from 'react';
import { useWysh } from '../WyshContext';

const HeaderStats = () => {
  const { products, plans, inventory } = useWysh();

  const stats = useMemo(() => {
    // A. Product count
    const productCount = products.length;

    // B. Pending Plans count
    const todayStr = new Date().toISOString().split('T')[0];
    const pendingCount = plans.filter(p => p.startDate >= todayStr).length;

    // C. Total Stock count
    let totalStock = 0;
    inventory.forEach(inv => {
      const outflowSum = inv.history ? inv.history.reduce((sum, item) => sum + item.qty, 0) : 0;
      totalStock += (inv.actualQty - outflowSum);
    });

    return {
      productCount,
      pendingCount,
      totalStock
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

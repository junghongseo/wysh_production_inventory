import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { filterChartsByRange, getAnalyticsProductList, computeOverallBreakdown } from '../../utils/shippingChartUtils';
import ProductTrendChart from './ProductTrendChart';
import OrderQtyDonutChart from './OrderQtyDonutChart';
import AnalyticsDataTable from './AnalyticsDataTable';

const RANGE_OPTIONS = [
  { label: '최근 7일', val: '7' },
  { label: '최근 14일', val: '14' },
  { label: '최근 30일', val: '30' },
  { label: '전체', val: 'all' }
];

// 영역 3: 출고 동향 & 수량별 비중 분석
const ShipmentAnalyticsSection = ({ shippingCharts }) => {
  const [analyticsRange, setAnalyticsRange] = useState('14'); // '7' | '14' | '30' | 'all'
  const [analyticsChartMode, setAnalyticsChartMode] = useState('qty'); // 'qty' | 'percent'
  const [hiddenProducts, setHiddenProducts] = useState(new Set()); // Set of hidden product names
  const [tablePageSize, setTablePageSize] = useState(10); // 10 | 15
  const [tableCurrentPage, setTableCurrentPage] = useState(1);

  // Reset page number to 1 when range or page size changes
  useEffect(() => {
    setTableCurrentPage(1);
  }, [analyticsRange, tablePageSize]);

  // Filtered Shipping Charts (Chronological for charts)
  const filteredAnalyticsCharts = useMemo(
    () => filterChartsByRange(shippingCharts, analyticsRange),
    [shippingCharts, analyticsRange]
  );

  // Sorted Shipping Charts for Detailed Table (Date Descending: 최신 날짜순)
  const sortedAnalyticsTableData = useMemo(() => {
    return [...filteredAnalyticsCharts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [filteredAnalyticsCharts]);

  // Extract all unique product names across filtered analytics charts
  const analyticsProductList = useMemo(
    () => getAnalyticsProductList(filteredAnalyticsCharts),
    [filteredAnalyticsCharts]
  );

  const toggleProductVisibility = useCallback((pName) => {
    setHiddenProducts(prev => {
      const next = new Set(prev);
      if (next.has(pName)) {
        next.delete(pName);
      } else {
        const visibleCount = analyticsProductList.filter(p => !next.has(p)).length;
        if (visibleCount <= 1) return prev;
        next.add(pName);
      }
      return next;
    });
  }, [analyticsProductList]);

  // Total Quantity Breakdown Aggregation for Donut Chart & Table Summary
  const overallBreakdown = useMemo(
    () => computeOverallBreakdown(filteredAnalyticsCharts),
    [filteredAnalyticsCharts]
  );

  // Pagination for Table
  const totalPages = Math.ceil(sortedAnalyticsTableData.length / tablePageSize) || 1;
  const pagedTableData = useMemo(() => {
    const startIdx = (tableCurrentPage - 1) * tablePageSize;
    return sortedAnalyticsTableData.slice(startIdx, startIdx + tablePageSize);
  }, [sortedAnalyticsTableData, tableCurrentPage, tablePageSize]);

  return (
    <section className="glass-card" style={{ padding: '24px 20px', width: '100%', boxSizing: 'border-box' }}>
      <div className="inventory-header-row" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📊 3. 출고 동향 및 수량별 비중 분석
          </h3>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
            일자별 제품별 출고 수량 추이와 1개·2개·3개 이상 주문 수량의 통합 비중을 원형(도넛) 차트 및 세부 통계로 분석합니다.
          </p>
        </div>

        {/* Range Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>조회 기간:</span>
          {RANGE_OPTIONS.map(r => (
            <button
              key={r.val}
              onClick={() => setAnalyticsRange(r.val)}
              style={{
                padding: '4px 10px',
                borderRadius: '6px',
                border: analyticsRange === r.val ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                backgroundColor: analyticsRange === r.val ? 'var(--color-primary)' : 'transparent',
                color: analyticsRange === r.val ? '#ffffff' : 'var(--text-secondary)',
                fontSize: '0.8rem',
                fontWeight: analyticsRange === r.val ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {filteredAnalyticsCharts.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
          <p style={{ fontWeight: 600, fontSize: '1rem' }}>분석할 출고표 데이터가 충분하지 않습니다.</p>
          <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
            상단 영역 1에서 출고표를 정리하신 후 '공식 출고표로 반영하기'를 눌러 데이터를 쌓아주세요.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {/* Side-by-Side 2 Chart Cards Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
              gap: '20px',
              alignItems: 'stretch'
            }}
          >
            <ProductTrendChart
              charts={filteredAnalyticsCharts}
              productList={analyticsProductList}
              hiddenProducts={hiddenProducts}
              onToggleProduct={toggleProductVisibility}
              chartMode={analyticsChartMode}
              setChartMode={setAnalyticsChartMode}
            />
            <OrderQtyDonutChart breakdown={overallBreakdown} />
          </div>

          <AnalyticsDataTable
            totalDays={sortedAnalyticsTableData.length}
            pagedRows={pagedTableData}
            breakdown={overallBreakdown}
            pageSize={tablePageSize}
            setPageSize={setTablePageSize}
            currentPage={tableCurrentPage}
            setCurrentPage={setTableCurrentPage}
            totalPages={totalPages}
          />
        </div>
      )}
    </section>
  );
};

export default ShipmentAnalyticsSection;

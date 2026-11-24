import React from 'react';
import { PRODUCT_COLORS, getProductTotalsFromChart } from '../../utils/shippingChartUtils';

const modeButtonStyle = (isActive) => ({
  padding: '3px 8px',
  fontSize: '0.75rem',
  fontWeight: 600,
  borderRadius: '4px',
  border: 'none',
  cursor: 'pointer',
  backgroundColor: isActive ? 'var(--color-primary)' : 'transparent',
  color: isActive ? '#ffffff' : 'var(--text-secondary)'
});

// SVG line chart body: one line per visible product
const TrendLines = ({ charts, productList, hiddenProducts, chartMode }) => {
  const visibleProducts = productList.filter(p => !hiddenProducts.has(p));

  // Calculate per-date product metrics
  const dailyData = charts.map(c => {
    const pTotals = getProductTotalsFromChart(c);
    const totalsMap = {};
    pTotals.forEach(pt => { totalsMap[pt.name] = pt.qty; });

    let activeDayTotal = 0;
    visibleProducts.forEach(pName => {
      activeDayTotal += (totalsMap[pName] || 0);
    });

    return {
      date: c.date,
      totalsMap,
      activeDayTotal
    };
  });

  // Determine Max Y value
  let maxVal = 10;
  if (chartMode === 'percent') {
    maxVal = 100;
  } else {
    let highestQty = 0;
    dailyData.forEach(d => {
      visibleProducts.forEach(pName => {
        const q = d.totalsMap[pName] || 0;
        if (q > highestQty) highestQty = q;
      });
    });
    maxVal = Math.max(highestQty, 10);
  }

  const stepX = 320 / Math.max(dailyData.length - 1, 1);
  const firstVisibleIdx = productList.findIndex(p => !hiddenProducts.has(p));

  return (
    <>
      {/* Y-axis Value Label Indicators */}
      <text x="35" y="24" textAnchor="end" fontSize="9" fill="var(--text-secondary)">
        {chartMode === 'percent' ? '100%' : maxVal}
      </text>
      <text x="35" y="98" textAnchor="end" fontSize="9" fill="var(--text-secondary)">
        {chartMode === 'percent' ? '50%' : Math.round(maxVal / 2)}
      </text>
      <text x="35" y="174" textAnchor="end" fontSize="9" fill="var(--text-secondary)">0</text>

      {/* Render line per visible product */}
      {visibleProducts.map((pName) => {
        const globalPIdx = productList.indexOf(pName);
        const color = PRODUCT_COLORS[(globalPIdx >= 0 ? globalPIdx : 0) % PRODUCT_COLORS.length];

        const points = dailyData.map((d, i) => {
          const x = 40 + i * stepX;
          const rawQty = d.totalsMap[pName] || 0;
          let calcVal = rawQty;
          if (chartMode === 'percent') {
            calcVal = d.activeDayTotal > 0 ? (rawQty / d.activeDayTotal) * 100 : 0;
          }
          const y = 170 - (calcVal / maxVal) * 150;
          return { x, y, val: calcVal, rawQty, date: d.date };
        });

        const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');

        return (
          <g key={pName}>
            {/* Line Path */}
            <path
              d={pathD}
              fill="none"
              stroke={color}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Point Circles and Value Labels */}
            {points.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="4" fill={color} stroke="#ffffff" strokeWidth="1.5">
                  <title>{`${p.date}: ${pName} ${p.rawQty}개 (${chartMode === 'percent' ? p.val.toFixed(1) + '%' : p.rawQty + '개'})`}</title>
                </circle>
                <text
                  x={p.x}
                  y={p.y - 7}
                  textAnchor="middle"
                  fontSize="9"
                  fontWeight="bold"
                  fill={color}
                >
                  {chartMode === 'percent' ? `${Math.round(p.val)}%` : p.rawQty}
                </text>
                {/* Date label at bottom (only once per date index) */}
                {globalPIdx === firstVisibleIdx && (
                  <text x={p.x} y="190" textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
                    {p.date.substring(5)}
                  </text>
                )}
              </g>
            ))}
          </g>
        );
      })}
    </>
  );
};

// 📈 일별 총 출고 수량 추이 (제품 필터 + 수량/상대비중 모드)
const ProductTrendChart = ({ charts, productList, hiddenProducts, onToggleProduct, chartMode, setChartMode }) => (
  <div style={{ backgroundColor: 'var(--bg-card)', padding: '18px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>

    {/* Chart Header & Mode Switch */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', flexWrap: 'wrap', gap: '8px' }}>
      <h4 style={{ fontSize: '0.98rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        📈 일별 총 출고 수량 추이
      </h4>

      {/* Mode Selector Tabs (수량 vs 상대비중) */}
      <div style={{ display: 'inline-flex', backgroundColor: 'var(--bg-primary, rgba(0,0,0,0.05))', borderRadius: '6px', padding: '2px' }}>
        <button onClick={() => setChartMode('qty')} style={modeButtonStyle(chartMode === 'qty')}>
          수량 (개)
        </button>
        <button onClick={() => setChartMode('percent')} style={modeButtonStyle(chartMode === 'percent')}>
          상대 비중 (%)
        </button>
      </div>
    </div>

    {/* Product Filter Chips Bar */}
    {productList.length > 0 && (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '14px', alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600, marginRight: '2px' }}>제품 필터:</span>
        {productList.map((pName, pIdx) => {
          const color = PRODUCT_COLORS[pIdx % PRODUCT_COLORS.length];
          const isHidden = hiddenProducts.has(pName);

          return (
            <button
              key={pName}
              onClick={() => onToggleProduct(pName)}
              title={isHidden ? `${pName} 그래프 보기` : `${pName} 그래프 숨기기`}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '12px',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                border: `1px solid ${isHidden ? 'var(--border-color)' : color}`,
                backgroundColor: isHidden ? 'transparent' : `${color}15`,
                color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)',
                opacity: isHidden ? 0.5 : 1,
                textDecoration: isHidden ? 'line-through' : 'none',
                transition: 'all 0.2s ease'
              }}
            >
              <span
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '50%',
                  backgroundColor: isHidden ? 'var(--text-secondary)' : color
                }}
              />
              {pName}
            </button>
          );
        })}
      </div>
    )}

    {/* SVG Line Chart Render */}
    <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="100%" height="100%" viewBox="0 0 380 210" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
        {/* Horizontal Grid lines */}
        <line x1="40" y1="20" x2="360" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
        <line x1="40" y1="70" x2="360" y2="70" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
        <line x1="40" y1="120" x2="360" y2="120" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
        <line x1="40" y1="170" x2="360" y2="170" stroke="var(--border-color)" strokeOpacity="0.8" />

        <TrendLines charts={charts} productList={productList} hiddenProducts={hiddenProducts} chartMode={chartMode} />
      </svg>
    </div>
  </div>
);

export default ProductTrendChart;

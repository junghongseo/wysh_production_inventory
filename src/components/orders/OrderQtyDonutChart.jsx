import React from 'react';

const SEGMENTS = [
  { key: 'p1', rawKey: 'rawP1', label: '1개 주문:', color: '#0284c7' },
  { key: 'p2', rawKey: 'rawP2', label: '2개 주문:', color: '#0d9488' },
  { key: 'p3', rawKey: 'rawP3', label: '3개 이상:', color: '#8b5cf6' }
];

// 🍩 주문 수량별 구성 비중 (원형 차트)
const OrderQtyDonutChart = ({ breakdown }) => {
  const C = 2 * Math.PI * 35; // Circumference ≈ 219.91
  let offset = 0;

  return (
    <div style={{ backgroundColor: 'var(--bg-card)', padding: '18px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
      <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
        🍩 주문 수량별 구성 비중 (원형 차트)
      </h4>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', flexWrap: 'wrap', flex: 1, padding: '10px 0' }}>
        {/* SVG Donut Chart */}
        <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <svg width="150" height="150" viewBox="0 0 100 100">
            <g transform="rotate(-90 50 50)">
              {SEGMENTS.map(seg => {
                const len = (breakdown[seg.rawKey] / 100) * C;
                const dashOffset = offset === 0 ? '0' : `${-offset}`;
                offset += len;
                return (
                  <circle
                    key={seg.key}
                    cx="50"
                    cy="50"
                    r="35"
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth="18"
                    strokeDasharray={`${len} ${C - len}`}
                    strokeDashoffset={dashOffset}
                  />
                );
              })}
            </g>
          </svg>

          {/* Donut Center Label */}
          <div
            style={{
              position: 'absolute',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              pointerEvents: 'none'
            }}
          >
            <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600 }}>총 주문</span>
            <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{breakdown.grandTotalOrders}건</span>
          </div>
        </div>

        {/* Sleek Legend List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '130px' }}>
          {SEGMENTS.map(seg => (
            <div key={seg.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
              <span style={{ width: '12px', height: '12px', backgroundColor: seg.color, borderRadius: '3px' }}></span>
              <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{seg.label}</span>
              <span style={{ fontWeight: 700, color: seg.color, marginLeft: 'auto' }}>{breakdown[seg.key]}%</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default OrderQtyDonutChart;

import React from 'react';

// 1개 / 2개 / 3개 이상 주문건 요약 카드
const PILLS = [
  { countKey: 'count1', percentKey: 'percent1', label: '1개 주문건', bg: '#f0f9ff', border: '#bae6fd', labelColor: '#0369a1', valueColor: '#0c4a6e', percentColor: '#0284c7' },
  { countKey: 'count2', percentKey: 'percent2', label: '2개 주문건', bg: '#f0fdf4', border: '#bbf7d0', labelColor: '#15803d', valueColor: '#14532d', percentColor: '#16a34a' },
  { countKey: 'count3Plus', percentKey: 'percent3Plus', label: '3개 이상', bg: '#faf5ff', border: '#e9d5ff', labelColor: '#6b21a8', valueColor: '#581c87', percentColor: '#9333ea' }
];

const QtyBreakdownPills = ({ breakdown }) => (
  <div
    style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(3, 1fr)',
      gap: '8px',
      maxWidth: '440px',
      margin: '0 auto 16px auto'
    }}
  >
    {PILLS.map(p => (
      <div key={p.countKey} style={{ backgroundColor: p.bg, border: `1px solid ${p.border}`, borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
        <div style={{ color: p.labelColor, fontSize: '0.72rem', fontWeight: 700 }}>{p.label}</div>
        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: p.valueColor, marginTop: '1px' }}>{breakdown[p.countKey]}건</div>
        <div style={{ fontSize: '0.72rem', color: p.percentColor, fontWeight: 600 }}>({breakdown[p.percentKey]})</div>
      </div>
    ))}
  </div>
);

export default QtyBreakdownPills;

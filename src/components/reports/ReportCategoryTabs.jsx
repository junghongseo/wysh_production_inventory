import React from 'react';

// 리포트 종류 선택 버튼 (미확인 건수 배지 포함)
const CATEGORIES = [
  { type: 'fermentation', label: '🥛 발효 리포트', adminOnlyBadge: true },
  { type: 'whey_separation', label: '💧 유청분리 리포트', adminOnlyBadge: true },
  { type: 'bottling', label: '🍾 병입 리포트', adminOnlyBadge: true },
  { type: 'sensory', label: '👤 관능검사 리포트', adminOnlyBadge: false }
];

const badgeStyle = {
  backgroundColor: '#ef4444',
  color: '#ffffff',
  fontSize: '0.7rem',
  padding: '2px 6px',
  borderRadius: '10px',
  fontWeight: 'bold',
  marginLeft: '4px',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
  lineHeight: '1',
  flexShrink: 0,
  whiteSpace: 'nowrap'
};

const ReportCategoryTabs = ({ activeReportType, onSelect, reports, canConfirmAll }) => (
  <div className="glass-card" style={{ padding: '16px' }}>
    <div className="report-category-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {CATEGORIES.map(({ type, label, adminOnlyBadge }) => {
        const isActive = activeReportType === type;
        const unconfirmedCount = reports.filter(r => r.type === type && !r.confirmed).length;
        const showBadge = (!adminOnlyBadge || canConfirmAll) && unconfirmedCount > 0;

        return (
          <button
            key={type}
            className={`btn-secondary ${isActive ? 'active' : ''}`}
            onClick={() => onSelect(type)}
            style={{
              flex: '1 1 130px',
              minWidth: '120px',
              justifyContent: 'center',
              padding: '10px 8px',
              borderRadius: '10px',
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
              background: isActive ? 'var(--color-primary)' : '',
              color: isActive ? '#fff' : '',
              borderColor: isActive ? 'var(--color-primary)' : '',
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <span>{label}</span>
            {showBadge && (
              <span style={badgeStyle}>
                미확인 {unconfirmedCount}
              </span>
            )}
          </button>
        );
      })}
    </div>
  </div>
);

export default ReportCategoryTabs;

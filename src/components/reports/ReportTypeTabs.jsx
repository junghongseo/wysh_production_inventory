import React from 'react';

const REPORT_TYPES = [
  { id: 'fermentation', label: '1. 발효 공정 일지', icon: '🥛' },
  { id: 'whey_separation', label: '2. 유청 분리 일지', icon: '🧪' },
  { id: 'bottling', label: '3. 충진/병입 일지', icon: '🍶' },
  { id: 'packaging', label: '4. 최종 포장 일지', icon: '📦' }
];

const ReportTypeTabs = ({ activeType, onSelectType }) => {
  return (
    <div className="tab-navigation" style={{ marginBottom: '24px', display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
      {REPORT_TYPES.map(type => (
        <button
          key={type.id}
          className={`tab-btn ${activeType === type.id ? 'active' : ''}`}
          onClick={() => onSelectType(type.id)}
          style={{
            padding: '10px 18px',
            fontSize: '0.9rem',
            fontWeight: 600,
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)'
          }}
        >
          <span>{type.icon}</span>
          <span>{type.label}</span>
        </button>
      ))}
    </div>
  );
};

export default ReportTypeTabs;

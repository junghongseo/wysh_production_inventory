import React from 'react';

const InventoryHeaderFilter = ({
  statusFilter,
  setStatusFilter,
  monthFilter,
  setMonthFilter,
  searchTerm,
  setSearchTerm,
  uniqueMonths
}) => {
  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', background: 'var(--bg-secondary)', borderRadius: '8px', padding: '2px', border: '1px solid var(--border-color)' }}>
        <button
          className={`btn-tab ${statusFilter === 'active' ? 'active' : ''}`}
          onClick={() => setStatusFilter('active')}
          style={{
            padding: '6px 12px',
            fontSize: '0.8rem',
            borderRadius: '6px',
            border: 'none',
            background: statusFilter === 'active' ? 'var(--color-primary)' : 'transparent',
            color: statusFilter === 'active' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          유효 재고 (출고 가능)
        </button>
        <button
          className={`btn-tab ${statusFilter === 'all' ? 'active' : ''}`}
          onClick={() => setStatusFilter('all')}
          style={{
            padding: '6px 12px',
            fontSize: '0.8rem',
            borderRadius: '6px',
            border: 'none',
            background: statusFilter === 'all' ? 'var(--color-primary)' : 'transparent',
            color: statusFilter === 'all' ? '#ffffff' : 'var(--text-secondary)',
            fontWeight: 600,
            cursor: 'pointer'
          }}
        >
          전체 보기
        </button>
      </div>

      <select
        value={monthFilter}
        onChange={(e) => setMonthFilter(e.target.value)}
        className="form-control"
        style={{ width: 'auto', padding: '6px 12px', fontSize: '0.85rem' }}
      >
        <option value="">모든 월</option>
        {uniqueMonths.map(m => (
          <option key={m} value={m}>{m}월</option>
        ))}
      </select>

      <div style={{ position: 'relative', flex: 1, minWidth: '180px' }}>
        <input
          type="text"
          placeholder="계획명/제품명 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="form-control"
          style={{ paddingLeft: '32px', fontSize: '0.85rem' }}
        />
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)' }}
        >
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
      </div>
    </div>
  );
};

export default InventoryHeaderFilter;

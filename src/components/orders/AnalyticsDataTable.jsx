import React from 'react';

const BREAKDOWN_COLUMNS = [
  { countKey: 'count1', percentKey: 'percent1', totKey: 'tot1', pKey: 'p1', avgKey: 'avgCount1', label: '1개 주문', short: '1개', color: '#0284c7' },
  { countKey: 'count2', percentKey: 'percent2', totKey: 'tot2', pKey: 'p2', avgKey: 'avgCount2', label: '2개 주문', short: '2개', color: '#0d9488' },
  { countKey: 'count3Plus', percentKey: 'percent3Plus', totKey: 'tot3Plus', pKey: 'p3', avgKey: 'avgCount3Plus', label: '3개 이상', short: '3개+', color: '#8b5cf6' }
];

const EMPTY_BREAKDOWN = { count1: 0, count2: 0, count3Plus: 0, percent1: '0%', percent2: '0%', percent3Plus: '0%' };

const navButtonStyle = (disabled) => ({
  padding: '3px 8px',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'transparent',
  color: disabled ? 'var(--text-secondary)' : 'var(--text-primary)',
  opacity: disabled ? 0.4 : 1,
  fontSize: '0.78rem',
  cursor: disabled ? 'default' : 'pointer'
});

const edgeButtonStyle = (disabled) => ({
  padding: '4px 8px',
  borderRadius: '4px',
  border: '1px solid var(--border-color)',
  backgroundColor: 'transparent',
  fontSize: '0.78rem',
  cursor: disabled ? 'default' : 'pointer',
  opacity: disabled ? 0.4 : 1
});

// 📋 날짜별 주문 수량 구성 세부 데이터 (페이지네이션 + 기간 합계/일평균)
const AnalyticsDataTable = ({ totalDays, pagedRows, breakdown, pageSize, setPageSize, currentPage, setCurrentPage, totalPages }) => (
  <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>

    {/* Table Header Controls (Title + Page Size + Pagination Controls) */}
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
      <div>
        <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          📋 날짜별 주문 수량 구성 세부 데이터
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
            (총 {totalDays}일 / 최신 날짜순)
          </span>
        </h4>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
        {/* Page Size Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
          <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>표시 개수:</span>
          {[10, 15].map(size => (
            <button
              key={size}
              onClick={() => setPageSize(size)}
              style={{
                padding: '2px 8px',
                borderRadius: '4px',
                border: pageSize === size ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                backgroundColor: pageSize === size ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                color: pageSize === size ? 'var(--color-primary)' : 'var(--text-secondary)',
                fontSize: '0.75rem',
                fontWeight: pageSize === size ? 700 : 500,
                cursor: 'pointer'
              }}
            >
              {size}개씩
            </button>
          ))}
        </div>

        {/* Pagination Buttons */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              style={navButtonStyle(currentPage === 1)}
            >
              ◀ 이전
            </button>

            <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 6px' }}>
              {currentPage} / {totalPages}
            </span>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              style={navButtonStyle(currentPage === totalPages)}
            >
              다음 ▶
            </button>
          </div>
        )}
      </div>
    </div>

    {/* Table Render */}
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table className="analytics-table" style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
        <thead>
          <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
            <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700 }}>날짜</th>
            <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}><span className="m-full">총 주문건수</span><span className="m-short">총</span></th>
            {BREAKDOWN_COLUMNS.map(col => (
              <th key={col.countKey} style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: col.color }}><span className="m-full">{col.label}</span><span className="m-short">{col.short}</span></th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pagedRows.map((c) => {
            const bk = c.qtyBreakdown || EMPTY_BREAKDOWN;
            return (
              <tr key={c.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}><span className="m-full">{c.date}</span><span className="m-short">{(c.date || '').slice(5)}</span></td>
                <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{c.totalCount}건</td>
                {BREAKDOWN_COLUMNS.map(col => (
                  <td key={col.countKey} style={{ padding: '8px 10px', textAlign: 'right', color: col.color }}>
                    {bk[col.countKey]}건 <span className="analytics-pct" style={{ fontSize: '0.75rem', opacity: 0.8 }}>({bk[col.percentKey]})</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>

        {/* Summary & Average Bottom Footer Rows */}
        <tfoot>
          {/* Row 1: Period Total Summary */}
          <tr style={{ backgroundColor: 'rgba(2, 132, 199, 0.06)', borderTop: '2px solid var(--color-primary)', fontWeight: 'bold' }}>
            <td style={{ padding: '9px 10px', textAlign: 'left', color: 'var(--text-primary)' }}>
              <span className="m-full">조회 기간 총 합계 ({breakdown.totalDaysCount}일)</span>
              <span className="m-short">합계<br />({breakdown.totalDaysCount}일)</span>
            </td>
            <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
              {breakdown.grandTotalOrders}건
            </td>
            {BREAKDOWN_COLUMNS.map(col => (
              <td key={col.countKey} style={{ padding: '9px 10px', textAlign: 'right', color: col.color }}>
                {breakdown[col.totKey]}건 <span className="analytics-pct">({breakdown[col.pKey]}%)</span>
              </td>
            ))}
          </tr>

          {/* Row 2: Period Daily Average Summary */}
          <tr style={{ backgroundColor: 'rgba(13, 148, 136, 0.08)', borderTop: '1px solid rgba(13, 148, 136, 0.3)', fontWeight: 'bold' }}>
            <td style={{ padding: '9px 10px', textAlign: 'left', color: '#0f766e' }}>
              <span className="m-full">📊 조회 기간 일평균 (Daily Avg)</span>
              <span className="m-short">일평균</span>
            </td>
            <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0f766e', fontSize: '0.88rem' }}>
              <span className="m-full">평균 </span>{breakdown.avgTotalOrders}건<span className="m-full">/일</span>
            </td>
            {BREAKDOWN_COLUMNS.map(col => (
              <td key={col.countKey} style={{ padding: '9px 10px', textAlign: 'right', color: col.color }}>
                <span className="m-full">평균 </span>{breakdown[col.avgKey]}건
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>

    {/* Bottom Pagination Bar */}
    {totalPages > 1 && (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
        <button
          onClick={() => setCurrentPage(1)}
          disabled={currentPage === 1}
          style={edgeButtonStyle(currentPage === 1)}
        >
          처음
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
          <button
            key={page}
            onClick={() => setCurrentPage(page)}
            style={{
              padding: '4px 9px',
              borderRadius: '4px',
              border: currentPage === page ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
              backgroundColor: currentPage === page ? 'var(--color-primary)' : 'transparent',
              color: currentPage === page ? '#ffffff' : 'var(--text-primary)',
              fontSize: '0.78rem',
              fontWeight: currentPage === page ? 700 : 500,
              cursor: 'pointer'
            }}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => setCurrentPage(totalPages)}
          disabled={currentPage === totalPages}
          style={edgeButtonStyle(currentPage === totalPages)}
        >
          끝
        </button>
      </div>
    )}
  </div>
);

export default AnalyticsDataTable;

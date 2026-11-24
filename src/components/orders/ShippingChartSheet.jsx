import React, { forwardRef } from 'react';

const cellBase = { border: '1px solid #cbd5e1', padding: '6px 8px' };
const headCell = (textAlign) => ({ ...cellBase, textAlign, fontWeight: 'bold', color: '#334155' });
const numHeadCell = { ...headCell('right'), width: '55px', whiteSpace: 'nowrap' };
const footCell = { border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' };

// 인쇄 / 이미지 저장 대상이 되는 출고표 본문 (제목, 제품별 총 수량, 포장 유형 표, 특이사항)
const ShippingChartSheet = forwardRef(({
  title,
  onTitleChange,
  titleClassName,
  productTotals,
  results,
  totalCount,
  remarks,
  onRemarksChange,
  remarksPlaceholder
}, ref) => (
  <div
    ref={ref}
    style={{
      backgroundColor: '#ffffff',
      padding: '20px 14px',
      borderRadius: '8px',
      color: '#0f172a',
      fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
      width: '100%',
      maxWidth: '440px',
      margin: '0 auto',
      border: '1px solid #cbd5e1',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      boxSizing: 'border-box'
    }}
  >
    <div
      style={{
        fontSize: '16px',
        fontWeight: 'bold',
        marginBottom: '12px',
        color: '#0f172a',
        textAlign: 'left',
        borderBottom: '2px solid #0f172a',
        paddingBottom: '6px'
      }}
    >
      <input
        type="text"
        className={titleClassName}
        value={title}
        onChange={(e) => onTitleChange(e.target.value)}
        style={{
          border: 'none',
          background: 'transparent',
          fontSize: 'inherit',
          fontWeight: 'inherit',
          fontFamily: 'inherit',
          color: 'inherit',
          width: '100%',
          outline: 'none',
          padding: 0
        }}
        placeholder="제목을 입력하세요"
      />
    </div>

    {/* Product Totals */}
    <div
      style={{
        marginBottom: '14px',
        color: '#1e293b',
        fontSize: '12px',
        textAlign: 'left',
        backgroundColor: '#f8fafc',
        padding: '10px 12px',
        borderRadius: '6px',
        border: '1px solid #e2e8f0',
        lineHeight: '1.5'
      }}
    >
      <div style={{ color: '#0284c7', marginBottom: '4px', fontSize: '11px', fontWeight: 'bold', letterSpacing: '0.5px' }}>
        📦 제품별 총 발송 수량
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        {(!productTotals || productTotals.length === 0) ? (
          <div style={{ color: '#64748b' }}>발송 내역 없음</div>
        ) : (
          productTotals.map((item, idx) => (
            <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '2px' }}>
              <span style={{ color: '#334155', fontWeight: 500, wordBreak: 'break-all' }}>{item.name}</span>
              <span style={{ fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', marginLeft: '6px' }}>{item.qty}개</span>
            </div>
          ))
        )}
      </div>
    </div>

    {/* Output Table */}
    <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
      <table
        style={{
          width: '100%',
          borderCollapse: 'collapse',
          backgroundColor: '#ffffff',
          border: '1px solid #cbd5e1',
          fontSize: '12px'
        }}
      >
        <thead>
          <tr style={{ backgroundColor: '#f1f5f9' }}>
            <th style={headCell('left')}>
              포장 유형(개수)
            </th>
            <th style={numHeadCell}>
              건수
            </th>
            <th style={numHeadCell}>
              비율
            </th>
          </tr>
        </thead>
        <tbody>
          {results.map((item, idx) => {
            const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) + '%' : '0.0%';
            return (
              <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                <td style={{ ...cellBase, textAlign: 'left', color: '#0f172a', wordBreak: 'break-all', fontSize: '11px' }}>
                  {item.orderType}
                </td>
                <td style={{ ...cellBase, textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {item.count}
                </td>
                <td style={{ ...cellBase, textAlign: 'right', color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                  {percent}
                </td>
              </tr>
            );
          })}
          <tr>
            <td style={{ ...cellBase, height: '18px' }}>&nbsp;</td>
            <td style={cellBase}>&nbsp;</td>
            <td style={cellBase}>&nbsp;</td>
          </tr>
          <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
            <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', color: '#0f172a' }}>
              합계
            </td>
            <td style={footCell}>
              {totalCount}
            </td>
            <td style={footCell}>
              100%
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    {/* Remarks Area */}
    <div style={{ marginTop: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
      <div style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '5px 10px', fontSize: '11px', color: '#334155', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
        특이사항
      </div>
      <textarea
        value={remarks}
        onChange={(e) => onRemarksChange(e.target.value)}
        placeholder={remarksPlaceholder}
        style={{
          width: '100%',
          minHeight: '60px',
          padding: '8px 10px',
          border: 'none',
          outline: 'none',
          fontSize: '11px',
          lineHeight: '1.5',
          color: '#334155',
          resize: 'vertical',
          fontFamily: 'inherit',
          display: 'block',
          boxSizing: 'border-box'
        }}
      />
    </div>
  </div>
));

ShippingChartSheet.displayName = 'ShippingChartSheet';

export default ShippingChartSheet;

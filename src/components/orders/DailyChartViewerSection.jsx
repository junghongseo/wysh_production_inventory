import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { downloadChartImage, printChart } from '../../utils/shippingChartUtils';
import QtyBreakdownPills from './QtyBreakdownPills';
import ShippingChartSheet from './ShippingChartSheet';

// 영역 2: 각 날짜별 공식 출고표 확인 및 인쇄/다운로드
const DailyChartViewerSection = ({ shippingCharts, saveShippingChart, deleteShippingChart, selectedViewDate, setSelectedViewDate }) => {
  const [viewTitle, setViewTitle] = useState('');
  const [viewRemarks, setViewRemarks] = useState('');
  const viewCaptureRef = useRef(null);

  // Synchronize selected chart data when date changes
  const activeViewChart = useMemo(() => {
    return shippingCharts.find(c => c.date === selectedViewDate) || null;
  }, [shippingCharts, selectedViewDate]);

  // Handle editable title/remarks sync
  useEffect(() => {
    if (activeViewChart) {
      setViewTitle(activeViewChart.title || `${selectedViewDate} 출고표`);
      setViewRemarks(activeViewChart.remarks || '');
    }
  }, [activeViewChart, selectedViewDate]);

  // Save Remark/Title updates
  const handleSaveViewUpdates = useCallback(() => {
    if (!activeViewChart) return;
    const updated = {
      ...activeViewChart,
      title: viewTitle,
      remarks: viewRemarks
    };
    saveShippingChart(updated);
    alert('출고표 제목 및 특이사항이 수정되어 클라우드에 반영되었습니다.');
  }, [activeViewChart, viewTitle, viewRemarks, saveShippingChart]);

  return (
    <section className="glass-card" style={{ padding: '24px 20px', height: '100%', boxSizing: 'border-box' }}>
      <div className="inventory-header-row" style={{ marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            📋 2. 일별 공식 출고표 확인 및 인쇄
          </h3>
        </div>

        {/* Date Selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>조회 일자:</span>
          <input
            type="date"
            className="order-date-picker-input"
            value={selectedViewDate}
            onChange={(e) => setSelectedViewDate(e.target.value)}
            style={{
              padding: '4px 8px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              fontSize: '0.85rem',
              fontWeight: 600
            }}
          />
        </div>
      </div>

      {/* Date Quick Selection Pills */}
      {shippingCharts.length > 0 && (
        <div style={{ display: 'flex', gap: '5px', overflowX: 'auto', paddingBottom: '6px', marginBottom: '14px' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', alignSelf: 'center', whiteSpace: 'nowrap' }}>등록목록:</span>
          {shippingCharts.slice(0, 8).map((c) => {
            const isActive = selectedViewDate === c.date;
            return (
              <button
                key={c.date}
                className={`order-date-quick-btn ${isActive ? 'active' : ''}`}
                onClick={() => setSelectedViewDate(c.date)}
                style={{
                  padding: '3px 8px',
                  borderRadius: '12px',
                  border: isActive ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  backgroundColor: isActive ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                  color: isActive ? 'var(--color-primary)' : 'var(--text-secondary)',
                  fontSize: '0.78rem',
                  fontWeight: isActive ? 700 : 500,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {c.date.substring(5)} ({c.totalCount}건)
              </button>
            );
          })}
        </div>
      )}

      {!activeViewChart ? (
        <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--text-secondary)' }}>
          <div style={{ fontSize: '2rem', marginBottom: '8px' }}>📭</div>
          <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{selectedViewDate} 날짜에 등록된 출고표가 없습니다.</p>
          <p style={{ fontSize: '0.78rem', marginTop: '4px' }}>
            좌측 영역 1에서 엑셀 정리 후 '공식 출고표로 반영하기'를 눌러 등록해 주세요.
          </p>
        </div>
      ) : (
        <div>
          {/* Qty Breakdown Summary Pills */}
          {activeViewChart.qtyBreakdown && <QtyBreakdownPills breakdown={activeViewChart.qtyBreakdown} />}

          {/* Main View Capturable Block */}
          <ShippingChartSheet
            ref={viewCaptureRef}
            title={viewTitle}
            onTitleChange={setViewTitle}
            titleClassName="shipping-table-title-input"
            productTotals={activeViewChart.productTotals}
            results={activeViewChart.results}
            totalCount={activeViewChart.totalCount}
            remarks={viewRemarks}
            onRemarksChange={setViewRemarks}
            remarksPlaceholder="특이사항..."
          />

          {/* View Action Buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', flexWrap: 'wrap', gap: '8px', maxWidth: '440px', margin: '14px auto 0 auto' }}>
            <button
              className="btn-secondary"
              onClick={() => {
                if (window.confirm(`${selectedViewDate} 출고표 기록을 삭제하시겠습니까?`)) {
                  deleteShippingChart(selectedViewDate);
                }
              }}
              style={{ backgroundColor: 'transparent', color: '#ef4444', border: '1px solid #fca5a5', fontSize: '0.8rem', padding: '4px 8px' }}
            >
              🗑️ 삭제
            </button>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
              <button
                className="btn-secondary"
                onClick={handleSaveViewUpdates}
                style={{ fontSize: '0.85rem' }}
              >
                💾 저장
              </button>
              <button
                className="btn-secondary"
                onClick={() => printChart(viewCaptureRef)}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
              >
                🖨️ 인쇄
              </button>
              <button
                id="view-download-btn"
                className="btn-success"
                onClick={() => downloadChartImage(viewCaptureRef, selectedViewDate, 'view-download-btn')}
                style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
              >
                🖼️ 이미지 저장
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default DailyChartViewerSection;

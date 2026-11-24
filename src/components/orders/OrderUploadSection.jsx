import React, { useState, useRef, useCallback } from 'react';
import { parseRawOrderRows } from '../../utils/orderParser';
import { readOrderWorkbook, formatChartTitle, downloadChartImage, printChart } from '../../utils/shippingChartUtils';
import QtyBreakdownPills from './QtyBreakdownPills';
import ShippingChartSheet from './ShippingChartSheet';

// 영역 1: 주문서 엑셀 정리 및 공식 출고표 반영
const OrderUploadSection = ({ todayStr, shippingCharts, saveShippingChart, onReflected }) => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [results, setResults] = useState(null);
  const [productTotals, setProductTotals] = useState([]);
  const [qtyBreakdown, setQtyBreakdown] = useState(null);
  const [tableTitle, setTableTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);
  const [targetDate, setTargetDate] = useState(todayStr);

  const captureRef = useRef(null);

  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
      setSuccessMsg('');
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setFile(droppedFile);
        setError('');
        setSuccessMsg('');
      } else {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      }
    }
  }, []);

  const processExcel = useCallback(async () => {
    if (!file) {
      setError('정리할 엑셀 파일을 먼저 선택해 주세요.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const XLSX = await import('xlsx');
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = readOrderWorkbook(XLSX, data);

          if (workbook.SheetNames.length === 0) {
            throw new Error('엑셀 파일에 시트가 존재하지 않습니다.');
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          const parsed = parseRawOrderRows(jsonData);

          setResults(parsed.results);
          setProductTotals(parsed.productTotals);
          setQtyBreakdown(parsed.qtyBreakdown);
          setTableTitle(formatChartTitle(targetDate));
          setRemarks('');
        } catch (err) {
          console.error(err);
          setError(err.message || '엑셀 처리 중 오류가 발생했습니다.');
        } finally {
          setLoading(false);
        }
      };

      reader.onerror = () => {
        setError('파일을 읽는 도중 오류가 발생했습니다.');
        setLoading(false);
      };

      reader.readAsArrayBuffer(file);
    } catch (importErr) {
      console.error(importErr);
      setError('엑셀 모듈 로드 중 오류가 발생했습니다.');
      setLoading(false);
    }
  }, [file, targetDate]);

  // Total Count calculation helper
  const totalCount = results ? results.reduce((acc, curr) => acc + curr.count, 0) : 0;

  // Official Chart Reflection Handler
  const handleReflectAsOfficialChart = useCallback(() => {
    if (!results || results.length === 0 || !qtyBreakdown) {
      alert('반영할 출고표 데이터가 없습니다.');
      return;
    }

    const targetDateFormatted = targetDate || todayStr;
    const existing = shippingCharts.find(c => c.date === targetDateFormatted);
    if (existing) {
      if (!window.confirm(`${targetDateFormatted} 날짜에 이미 저장된 출고표가 있습니다. 새로운 내용으로 덮어쓰시겠습니까?`)) {
        return;
      }
    }

    const chartData = {
      date: targetDateFormatted,
      title: tableTitle || `${targetDateFormatted.substring(2)} 출고표`,
      totalCount,
      productTotals,
      results,
      qtyBreakdown,
      remarks
    };

    saveShippingChart(chartData);
    setSuccessMsg(`✅ ${targetDateFormatted} 출고표가 성공적으로 공식 반영 및 클라우드 동기화 되었습니다!`);
    onReflected(targetDateFormatted);
  }, [results, qtyBreakdown, targetDate, todayStr, shippingCharts, tableTitle, totalCount, productTotals, remarks, saveShippingChart, onReflected]);

  return (
    <section className="glass-card" style={{ padding: '24px 20px', height: '100%', boxSizing: 'border-box' }}>
      <div className="inventory-header-row" style={{ marginBottom: '12px' }}>
        <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          📁 1. 주문서 엑셀 정리 및 공식 출고표 반영
        </h3>
      </div>
      <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '16px' }}>
        엑셀 주문서를 업로드하면 포장 유형별/제품별 수량 및 1개·2개·3개 이상 수량별 비율을 정리합니다.
      </p>

      {/* Upload Zone */}
      <div
        className={`file-upload-zone ${isDragOver ? 'drag-over' : ''}`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{
          border: '2px dashed var(--border-highlight)',
          borderRadius: '12px',
          padding: '24px 16px',
          textAlign: 'center',
          backgroundColor: isDragOver ? 'rgba(2, 132, 199, 0.05)' : 'transparent',
          transition: 'var(--transition-smooth)',
          cursor: 'pointer'
        }}
        onClick={() => document.getElementById('excel-file-picker').click()}
      >
        <input
          type="file"
          id="excel-file-picker"
          accept=".xlsx, .xls"
          onChange={handleFileChange}
          style={{ display: 'none' }}
        />

        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="36"
          height="36"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: 'var(--color-primary)', marginBottom: '10px', opacity: 0.85 }}
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>

        {file ? (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{file.name}</p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px' }}>
              {(file.size / 1024).toFixed(1)} KB | 선택됨
            </p>
          </div>
        ) : (
          <div>
            <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
              엑셀 주문서 드래그 앤 드롭 또는 클릭 선택
            </p>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.78rem', marginTop: '4px' }}>
              지원 포맷: .xlsx, .xls
            </p>
          </div>
        )}
      </div>

      {error && (
        <div className="validation-banner show" style={{ marginTop: '14px', display: 'flex' }}>
          <span>⚠️ {error}</span>
        </div>
      )}

      {successMsg && (
        <div style={{ marginTop: '14px', padding: '10px 12px', borderRadius: '8px', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', fontWeight: 600, fontSize: '0.85rem' }}>
          {successMsg}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px', gap: '8px', flexWrap: 'wrap' }}>
        {file && (
          <button
            className="btn-secondary"
            onClick={() => { setFile(null); setResults(null); setQtyBreakdown(null); setError(''); setSuccessMsg(''); }}
            disabled={loading}
          >
            초기화
          </button>
        )}
        <button
          className="btn-primary"
          onClick={processExcel}
          disabled={loading || !file}
        >
          {loading ? '정리 중...' : '파일 정리하기'}
        </button>
      </div>

      {/* Results Visualizer Block */}
      {results && (
        <div style={{ marginTop: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>

          {/* Reflection Control Bar */}
          <div
            style={{
              display: 'flex',
              justify: 'space-between',
              alignItems: 'center',
              gap: '8px',
              backgroundColor: 'rgba(2, 132, 199, 0.08)',
              border: '1px solid rgba(2, 132, 199, 0.2)',
              borderRadius: '8px',
              padding: '10px 12px',
              maxWidth: '440px',
              margin: '0 auto 16px auto',
              flexWrap: 'wrap'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
              <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                📅 날짜 선택:
              </span>
              <input
                type="date"
                className="order-date-picker-input"
                value={targetDate}
                onChange={(e) => {
                  setTargetDate(e.target.value);
                  if (e.target.value) {
                    setTableTitle(formatChartTitle(e.target.value));
                  }
                }}
                style={{
                  padding: '4px 8px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem',
                  fontWeight: 600
                }}
              />
            </div>

            <button
              className="btn-success"
              onClick={handleReflectAsOfficialChart}
              style={{
                padding: '6px 12px',
                fontWeight: 700,
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
            >
              📌 공식 출고표로 반영하기
            </button>
          </div>

          {/* Qty Breakdown Summary Pills */}
          {qtyBreakdown && <QtyBreakdownPills breakdown={qtyBreakdown} />}

          {/* Printable / Capturable Visualizer Block */}
          <ShippingChartSheet
            ref={captureRef}
            title={tableTitle}
            onTitleChange={setTableTitle}
            productTotals={productTotals}
            results={results}
            totalCount={totalCount}
            remarks={remarks}
            onRemarksChange={setRemarks}
            remarksPlaceholder="여기에 특이사항을 입력하세요..."
          />

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', flexWrap: 'wrap', maxWidth: '440px', margin: '14px auto 0 auto' }}>
            <button
              className="btn-secondary"
              onClick={() => printChart(captureRef)}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
            >
              🖨️ 인쇄
            </button>
            <button
              id="process-download-btn"
              className="btn-success"
              onClick={() => downloadChartImage(captureRef, targetDate, 'process-download-btn')}
              style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
            >
              🖼️ 이미지 저장
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default OrderUploadSection;

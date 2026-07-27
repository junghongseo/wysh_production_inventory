import React, { useState, useRef, useMemo, useCallback } from 'react';
import { useWysh } from '../WyshContext';

const cleanItemName = (name) => {
  let nameStr = String(name || '').trim();
  // Remove bracket prefix (e.g. [RENEWAL])
  nameStr = nameStr.replace(/^\[[^\]]+\]\s*/, '');
  // Remove weight/capacity suffix (e.g. 330g, 350g, 20g, 20G, 330ml, etc.)
  nameStr = nameStr.replace(/\s*\d+\s*(?:[gG](?:[rR][aA][mM])?|[mM][lL])\s*$/, '');
  return nameStr.trim();
};

const OrderView = () => {
  const { shippingCharts, saveShippingChart, deleteShippingChart } = useWysh();

  // Local-time safe today string
  const todayStr = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  }, []);

  // Section 1 (Process & Reflect) states
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

  // Section 2 (Daily Viewer) states
  const [selectedViewDate, setSelectedViewDate] = useState(todayStr);
  const [viewTitle, setViewTitle] = useState('');
  const [viewRemarks, setViewRemarks] = useState('');

  // Section 3 (Analytics) states
  const [analyticsRange, setAnalyticsRange] = useState('14'); // '7' | '14' | '30' | 'all'
  const [tablePageSize, setTablePageSize] = useState(10); // 10 | 15
  const [tableCurrentPage, setTableCurrentPage] = useState(1);

  const captureRef = useRef(null);
  const viewCaptureRef = useRef(null);

  // Reset page number to 1 when range or page size changes
  React.useEffect(() => {
    setTableCurrentPage(1);
  }, [analyticsRange, tablePageSize]);

  // Synchronize Section 2 selected chart data when date changes
  const activeViewChart = useMemo(() => {
    return shippingCharts.find(c => c.date === selectedViewDate) || null;
  }, [shippingCharts, selectedViewDate]);

  // Handle Section 2 editable title/remarks sync
  React.useEffect(() => {
    if (activeViewChart) {
      setViewTitle(activeViewChart.title || `${selectedViewDate} 출고표`);
      setViewRemarks(activeViewChart.remarks || '');
    }
  }, [activeViewChart, selectedViewDate]);

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
          
          const isZip = data[0] === 0x50 && data[1] === 0x4B && data[2] === 0x03 && data[3] === 0x04;
          const isOles = data[0] === 0xD0 && data[1] === 0xCF && data[2] === 0x11 && data[3] === 0xE0;
          
          let workbook;
          if (!isZip && !isOles) {
            let encoding = 'utf-8';
            const prefixText = new TextDecoder('latin1').decode(data.slice(0, 2000));
            const charsetMatch = prefixText.match(/charset\s*=\s*["']?([\w\-]+)/i);
            if (charsetMatch && charsetMatch[1]) {
              encoding = charsetMatch[1].toLowerCase();
            }
            
            const text = new TextDecoder(encoding).decode(data);
            
            if (text.includes('Excel Workbook Frameset') || text.includes('<frameset') || text.includes('fnBuildFrameset')) {
              throw new Error("엑셀에서 '웹 페이지(*.htm; *.html)' 형식으로 저장되어 데이터 본문이 누락되었습니다. Excel에서 'Excel 통합 문서(*.xlsx)' 또는 'Excel 97-2003 통합 문서(*.xls)' 형식으로 다시 저장하여 업로드해 주세요.");
            }
            
            const htmlIndex = text.indexOf('<html');
            const tableIndex = text.indexOf('<table');
            
            let cleanedText = text;
            if (htmlIndex !== -1) {
              cleanedText = text.substring(htmlIndex);
            } else if (tableIndex !== -1) {
              cleanedText = text.substring(tableIndex);
            }
            
            workbook = XLSX.read(cleanedText, { type: 'string' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
          
          if (workbook.SheetNames.length === 0) {
            throw new Error('엑셀 파일에 시트가 존재하지 않습니다.');
          }

          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });

          if (!jsonData || jsonData.length === 0) {
            throw new Error('엑셀 파일에 읽을 데이터가 없습니다.');
          }

          // Header finding logic
          const groupKeywords = ['주문번호', '주문 번호', '품목 주문 번호', '품목주문번호', '송장번호', '송장 번호', '운송장번호', '운송장 번호', '운송장 정보', '배송 번호', '배송번호'];
          const nameKeywords = ['상품명', '상품 이름', '상품이름', '판매처 상품명', '판매처상품명', '상품명(옵션포함)', '품목명'];
          const qtyKeywords = ['수량', '주문수량', '주문 수량', '구매 수량', '구매수량', '배송 수량', '배송수량', '상품수량', '상품 수량'];

          let headerRowIndex = -1;
          let groupCol = -1;
          let nameCol = -1;
          let qtyCol = -1;

          for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
            const row = jsonData[r];
            if (!Array.isArray(row)) continue;
            
            let g = -1;
            let n = -1;
            let q = -1;

            for (let c = 0; c < row.length; c++) {
              const cellVal = String(row[c] || '').trim();
              if (g === -1 && groupKeywords.includes(cellVal)) {
                g = c;
              }
              if (n === -1 && nameKeywords.includes(cellVal)) {
                n = c;
              }
              if (q === -1 && qtyKeywords.includes(cellVal)) {
                q = c;
              }
            }
            
            if (g !== -1 && n !== -1 && q !== -1) {
              headerRowIndex = r;
              groupCol = g;
              nameCol = n;
              qtyCol = q;
              break;
            }
          }

          if (headerRowIndex === -1) {
            throw new Error('엑셀 파일에서 필수 항목(주문번호/송장번호, 상품명, 수량)의 헤더를 찾을 수 없습니다.');
          }

          const dfTarget = [];
          const productTotalsMap = {};

          for (let i = headerRowIndex + 1; i < jsonData.length; i++) {
            const row = jsonData[i];
            if (!row) continue;
            
            const groupVal = String(row[groupCol] || '').trim();
            const nameVal = cleanItemName(row[nameCol]);
            const rawQtyStr = String(row[qtyCol] || '').replace(/,/g, '').trim();
            let qtyVal = parseInt(rawQtyStr, 10);
            if (isNaN(qtyVal) || qtyVal <= 0) qtyVal = 1;

            if (groupVal && nameVal) {
              dfTarget.push({ groupVal, nameVal, qtyVal });
              productTotalsMap[nameVal] = (productTotalsMap[nameVal] || 0) + qtyVal;
            }
          }

          if (dfTarget.length === 0) {
            throw new Error('정리할 주문 데이터가 발견되지 않았습니다. 파일 내용을 확인하세요.');
          }

          // Packaging combinations map
          const groupedMap = {};
          // Order total quantity map (for 1, 2, 3+ order breakdown)
          const orderTotalQtyMap = {};

          dfTarget.forEach(item => {
            const formatted = `${item.nameVal} [${item.qtyVal}개]`;
            if (!groupedMap[item.groupVal]) {
              groupedMap[item.groupVal] = [];
            }
            groupedMap[item.groupVal].push(formatted);
            orderTotalQtyMap[item.groupVal] = (orderTotalQtyMap[item.groupVal] || 0) + item.qtyVal;
          });

          // Calculate 1개, 2개, 3개 이상 order counts
          let count1 = 0;
          let count2 = 0;
          let count3Plus = 0;

          Object.values(orderTotalQtyMap).forEach(totQty => {
            if (totQty === 1) count1++;
            else if (totQty === 2) count2++;
            else if (totQty >= 3) count3Plus++;
          });

          const totalOrdersCount = Object.keys(orderTotalQtyMap).length;
          const percent1 = totalOrdersCount > 0 ? ((count1 / totalOrdersCount) * 100).toFixed(1) + '%' : '0.0%';
          const percent2 = totalOrdersCount > 0 ? ((count2 / totalOrdersCount) * 100).toFixed(1) + '%' : '0.0%';
          const percent3Plus = totalOrdersCount > 0 ? ((count3Plus / totalOrdersCount) * 100).toFixed(1) + '%' : '0.0%';

          const computedBreakdown = {
            count1,
            count2,
            count3Plus,
            percent1,
            percent2,
            percent3Plus
          };

          const orderTypeCounts = {};
          Object.values(groupedMap).forEach(itemList => {
            const sortedItems = [...itemList].sort();
            const orderType = sortedItems.join(', ');
            orderTypeCounts[orderType] = (orderTypeCounts[orderType] || 0) + 1;
          });

          const processedResults = Object.entries(orderTypeCounts).map(([orderType, count]) => ({
            orderType,
            count
          }));
          processedResults.sort((a, b) => b.count - a.count);

          const processedProductTotals = Object.entries(productTotalsMap).map(([name, qty]) => ({
            name,
            qty
          }));
          processedProductTotals.sort((a, b) => b.qty - a.qty);

          setResults(processedResults);
          setProductTotals(processedProductTotals);
          setQtyBreakdown(computedBreakdown);
          
          const targetYy = targetDate.substring(2, 4);
          const targetMm = targetDate.substring(5, 7);
          const targetDd = targetDate.substring(8, 10);
          setTableTitle(`${targetYy}-${targetMm}-${targetDd} 출고표`);
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
    setSelectedViewDate(targetDateFormatted);
  }, [results, qtyBreakdown, targetDate, todayStr, shippingCharts, tableTitle, totalCount, productTotals, remarks, saveShippingChart]);

  // Section 2 View Save Remark/Title updates
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

  // Download Image Handler
  const handleDownloadImage = useCallback(async (ref, dateStrForName, btnId) => {
    if (!ref.current) return;

    const originalBtn = document.getElementById(btnId);
    if (originalBtn) {
      originalBtn.disabled = true;
      originalBtn.innerText = '이미지 저장 중...';
    }

    try {
      const html2canvas = (await import('html2canvas')).default;
      const canvas = await html2canvas(ref.current, {
        scale: 2,
        backgroundColor: '#ffffff'
      });
      const dStr = (dateStrForName || todayStr).replace(/-/g, '');
      const link = document.createElement('a');
      link.download = `출고표_${dStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      alert("이미지 저장 중 오류가 발생했습니다: " + err.message);
    } finally {
      if (originalBtn) {
        originalBtn.disabled = false;
        originalBtn.innerText = '이미지 저장하기';
      }
    }
  }, [todayStr]);

  // Print Handler
  const handlePrintChart = useCallback((ref) => {
    if (!ref.current) return;
    const contentHtml = ref.current.innerHTML;

    const printWindow = window.open('', '_blank', 'width=800,height=900');
    if (!printWindow) {
      alert('팝업 차단이 활성화되어 있어 인쇄 창을 열 수 없습니다. 팝업 차단을 해제해 주세요.');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>출고표 인쇄</title>
          <style>
            body {
              font-family: 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
              margin: 20px;
              color: #0f172a;
              background-color: #ffffff;
            }
            input, textarea {
              border: none !important;
              background: transparent !important;
              resize: none;
            }
            @media print {
              @page { margin: 15mm; }
              body { margin: 0; }
            }
          </style>
        </head>
        <body>
          <div style="max-width: 600px; margin: 0 auto;">
            ${contentHtml}
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, []);

  // Filtered Shipping Charts for Section 3 Analytics (Chronological for charts)
  const filteredAnalyticsCharts = useMemo(() => {
    if (!shippingCharts || shippingCharts.length === 0) return [];
    const sorted = [...shippingCharts].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
    if (analyticsRange === 'all') return sorted;
    const days = parseInt(analyticsRange, 10);
    if (isNaN(days)) return sorted;
    return sorted.slice(-days);
  }, [shippingCharts, analyticsRange]);

  // Sorted Shipping Charts for Section 3 Detailed Table (Date Descending: 최신 날짜순)
  const sortedAnalyticsTableData = useMemo(() => {
    return [...filteredAnalyticsCharts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [filteredAnalyticsCharts]);

  // Total Quantity Breakdown Aggregation for Section 3 Donut Chart & Table Summary
  const overallBreakdown = useMemo(() => {
    let tot1 = 0;
    let tot2 = 0;
    let tot3Plus = 0;
    let grandTotalOrders = 0;

    filteredAnalyticsCharts.forEach(c => {
      const bk = c.qtyBreakdown || { count1: 0, count2: 0, count3Plus: 0 };
      tot1 += (bk.count1 || 0);
      tot2 += (bk.count2 || 0);
      tot3Plus += (bk.count3Plus || 0);
      grandTotalOrders += (c.totalCount || 0);
    });

    const sumCounts = tot1 + tot2 + tot3Plus || grandTotalOrders || 1;
    const p1 = (tot1 / sumCounts) * 100;
    const p2 = (tot2 / sumCounts) * 100;
    const p3 = (tot3Plus / sumCounts) * 100;

    const totalDaysCount = filteredAnalyticsCharts.length;
    const avgTotalOrders = totalDaysCount > 0 ? (grandTotalOrders / totalDaysCount).toFixed(1) : '0';
    const avgCount1 = totalDaysCount > 0 ? (tot1 / totalDaysCount).toFixed(1) : '0';
    const avgCount2 = totalDaysCount > 0 ? (tot2 / totalDaysCount).toFixed(1) : '0';
    const avgCount3Plus = totalDaysCount > 0 ? (tot3Plus / totalDaysCount).toFixed(1) : '0';

    return {
      tot1,
      tot2,
      tot3Plus,
      grandTotalOrders,
      totalDaysCount,
      avgTotalOrders,
      avgCount1,
      avgCount2,
      avgCount3Plus,
      p1: p1.toFixed(1),
      p2: p2.toFixed(1),
      p3: p3.toFixed(1),
      rawP1: p1,
      rawP2: p2,
      rawP3: p3
    };
  }, [filteredAnalyticsCharts]);

  // Pagination for Section 3 Table
  const totalPages = Math.ceil(sortedAnalyticsTableData.length / tablePageSize) || 1;
  const pagedTableData = useMemo(() => {
    const startIdx = (tableCurrentPage - 1) * tablePageSize;
    return sortedAnalyticsTableData.slice(startIdx, startIdx + tablePageSize);
  }, [sortedAnalyticsTableData, tableCurrentPage, tablePageSize]);

  return (
    <div className="inventory-layout" style={{ width: '100%', maxWidth: '100%', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* ========================================================================= */}
      {/* 상단 2열 레이아웃: 좌측 (영역 1: 업로드 및 정리) / 우측 (영역 2: 일별 출고표 조회 및 인쇄) */}
      {/* ========================================================================= */}
      <div 
        style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', 
          gap: '24px',
          alignItems: 'start'
        }}
      >
        
        {/* ------------------------------------------------------------------------- */}
        {/* 영역 1: 주문 정리 및 공식 출고표 반영 (Top Left Column) */}
        {/* ------------------------------------------------------------------------- */}
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
                        const yy = e.target.value.substring(2, 4);
                        const mm = e.target.value.substring(5, 7);
                        const dd = e.target.value.substring(8, 10);
                        setTableTitle(`${yy}-${mm}-${dd} 출고표`);
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
              {qtyBreakdown && (
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    maxWidth: '440px',
                    margin: '0 auto 16px auto'
                  }}
                >
                  <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#0369a1', fontSize: '0.72rem', fontWeight: 700 }}>1개 주문건</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0c4a6e', marginTop: '1px' }}>{qtyBreakdown.count1}건</div>
                    <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>({qtyBreakdown.percent1})</div>
                  </div>

                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>2개 주문건</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d', marginTop: '1px' }}>{qtyBreakdown.count2}건</div>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>({qtyBreakdown.percent2})</div>
                  </div>

                  <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#6b21a8', fontSize: '0.72rem', fontWeight: 700 }}>3개 이상</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#581c87', marginTop: '1px' }}>{qtyBreakdown.count3Plus}건</div>
                    <div style={{ fontSize: '0.72rem', color: '#9333ea', fontWeight: 600 }}>({qtyBreakdown.percent3Plus})</div>
                  </div>
                </div>
              )}

              {/* Printable / Capturable Visualizer Block */}
              <div 
                ref={captureRef} 
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
                    value={tableTitle} 
                    onChange={(e) => setTableTitle(e.target.value)} 
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
                    {productTotals.length === 0 ? (
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
                        <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', fontWeight: 'bold', color: '#334155' }}>
                          포장 유형(개수)
                        </th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#334155', width: '55px', whiteSpace: 'nowrap' }}>
                          건수
                        </th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#334155', width: '55px', whiteSpace: 'nowrap' }}>
                          비율
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {results.map((item, idx) => {
                        const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) + '%' : '0.0%';
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', color: '#0f172a', wordBreak: 'break-all', fontSize: '11px' }}>
                              {item.orderType}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {item.count}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {percent}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', height: '18px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>&nbsp;</td>
                      </tr>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', color: '#0f172a' }}>
                          합계
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {totalCount}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
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
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="여기에 특이사항을 입력하세요..."
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

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px', flexWrap: 'wrap', maxWidth: '440px', margin: '14px auto 0 auto' }}>
                <button 
                  className="btn-secondary" 
                  onClick={() => handlePrintChart(captureRef)}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                >
                  🖨️ 인쇄
                </button>
                <button 
                  id="process-download-btn" 
                  className="btn-success" 
                  onClick={() => handleDownloadImage(captureRef, targetDate, 'process-download-btn')}
                  style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                >
                  🖼️ 이미지 저장
                </button>
              </div>
            </div>
          )}
        </section>

        {/* ------------------------------------------------------------------------- */}
        {/* 영역 2: 각 날짜별 공식 출고표 확인 및 인쇄/다운로드 (Top Right Column) */}
        {/* ------------------------------------------------------------------------- */}
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
              {shippingCharts.slice(0, 8).map((c) => (
                <button
                  key={c.date}
                  className={`order-date-quick-btn ${selectedViewDate === c.date ? 'active' : ''}`}
                  onClick={() => setSelectedViewDate(c.date)}
                  style={{
                    padding: '3px 8px',
                    borderRadius: '12px',
                    border: selectedViewDate === c.date ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                    backgroundColor: selectedViewDate === c.date ? 'rgba(2, 132, 199, 0.15)' : 'transparent',
                    color: selectedViewDate === c.date ? 'var(--color-primary)' : 'var(--text-secondary)',
                    fontSize: '0.78rem',
                    fontWeight: selectedViewDate === c.date ? 700 : 500,
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {c.date.substring(5)} ({c.totalCount}건)
                </button>
              ))}
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
              {activeViewChart.qtyBreakdown && (
                <div 
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    maxWidth: '440px',
                    margin: '0 auto 16px auto'
                  }}
                >
                  <div style={{ backgroundColor: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#0369a1', fontSize: '0.72rem', fontWeight: 700 }}>1개 주문건</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0c4a6e', marginTop: '1px' }}>{activeViewChart.qtyBreakdown.count1}건</div>
                    <div style={{ fontSize: '0.72rem', color: '#0284c7', fontWeight: 600 }}>({activeViewChart.qtyBreakdown.percent1})</div>
                  </div>

                  <div style={{ backgroundColor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#15803d', fontSize: '0.72rem', fontWeight: 700 }}>2개 주문건</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#14532d', marginTop: '1px' }}>{activeViewChart.qtyBreakdown.count2}건</div>
                    <div style={{ fontSize: '0.72rem', color: '#16a34a', fontWeight: 600 }}>({activeViewChart.qtyBreakdown.percent2})</div>
                  </div>

                  <div style={{ backgroundColor: '#faf5ff', border: '1px solid #e9d5ff', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                    <div style={{ color: '#6b21a8', fontSize: '0.72rem', fontWeight: 700 }}>3개 이상</div>
                    <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#581c87', marginTop: '1px' }}>{activeViewChart.qtyBreakdown.count3Plus}건</div>
                    <div style={{ fontSize: '0.72rem', color: '#9333ea', fontWeight: 600 }}>({activeViewChart.qtyBreakdown.percent3Plus})</div>
                  </div>
                </div>
              )}

              {/* Main View Capturable Block */}
              <div 
                ref={viewCaptureRef} 
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
                    className="shipping-table-title-input"
                    value={viewTitle} 
                    onChange={(e) => setViewTitle(e.target.value)} 
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
                    {(!activeViewChart.productTotals || activeViewChart.productTotals.length === 0) ? (
                      <div style={{ color: '#64748b' }}>발송 내역 없음</div>
                    ) : (
                      activeViewChart.productTotals.map((item, idx) => (
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
                        <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', fontWeight: 'bold', color: '#334155' }}>
                          포장 유형(개수)
                        </th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#334155', width: '55px', whiteSpace: 'nowrap' }}>
                          건수
                        </th>
                        <th style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', fontWeight: 'bold', color: '#334155', width: '55px', whiteSpace: 'nowrap' }}>
                          비율
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {activeViewChart.results.map((item, idx) => {
                        const percent = activeViewChart.totalCount > 0 
                          ? ((item.count / activeViewChart.totalCount) * 100).toFixed(1) + '%' 
                          : '0.0%';
                        return (
                          <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'left', color: '#0f172a', wordBreak: 'break-all', fontSize: '11px' }}>
                              {item.orderType}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {item.count}
                            </td>
                            <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', textAlign: 'right', color: '#64748b', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                              {percent}
                            </td>
                          </tr>
                        );
                      })}
                      <tr>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px', height: '18px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>&nbsp;</td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '6px 8px' }}>&nbsp;</td>
                      </tr>
                      <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'left', color: '#0f172a' }}>
                          합계
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          {activeViewChart.totalCount}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '8px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                          100%
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Remarks */}
                <div style={{ marginTop: '14px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                  <div style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '5px 10px', fontSize: '11px', color: '#334155', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                    특이사항
                  </div>
                  <textarea
                    value={viewRemarks}
                    onChange={(e) => setViewRemarks(e.target.value)}
                    placeholder="특이사항..."
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
                    onClick={() => handlePrintChart(viewCaptureRef)}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                  >
                    🖨️ 인쇄
                  </button>
                  <button 
                    id="view-download-btn" 
                    className="btn-success" 
                    onClick={() => handleDownloadImage(viewCaptureRef, selectedViewDate, 'view-download-btn')}
                    style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.85rem' }}
                  >
                    🖼️ 이미지 저장
                  </button>
                </div>
              </div>
            </div>
          )}
        </section>

      </div>

      {/* ========================================================================= */}
      {/* 하단 1열 전폭 레이아웃 (영역 3: 출고 동향 & 수량별 비중 분석 차트 - 2 Column Side-by-Side Charts) */}
      {/* ========================================================================= */}
      <section className="glass-card" style={{ padding: '24px 20px', width: '100%', boxSizing: 'border-box' }}>
        <div className="inventory-header-row" style={{ marginBottom: '16px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              📊 3. 출고 동향 및 수량별 비중 분석
            </h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '4px' }}>
              일자별 총 출고 건수 추이와 1개·2개·3개 이상 주문 수량의 통합 비중을 원형(도넛) 차트 및 세부 통계로 분석합니다.
            </p>
          </div>

          {/* Range Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>조회 기간:</span>
            {[
              { label: '최근 7일', val: '7' },
              { label: '최근 14일', val: '14' },
              { label: '최근 30일', val: '30' },
              { label: '전체', val: 'all' }
            ].map(r => (
              <button
                key={r.val}
                onClick={() => setAnalyticsRange(r.val)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  border: analyticsRange === r.val ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                  backgroundColor: analyticsRange === r.val ? 'var(--color-primary)' : 'transparent',
                  color: analyticsRange === r.val ? '#ffffff' : 'var(--text-secondary)',
                  fontSize: '0.8rem',
                  fontWeight: analyticsRange === r.val ? 700 : 500,
                  cursor: 'pointer'
                }}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {filteredAnalyticsCharts.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>📊</div>
            <p style={{ fontWeight: 600, fontSize: '1rem' }}>분석할 출고표 데이터가 충분하지 않습니다.</p>
            <p style={{ fontSize: '0.85rem', marginTop: '6px' }}>
              상단 영역 1에서 출고표를 정리하신 후 '공식 출고표로 반영하기'를 눌러 데이터를 쌓아주세요.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            
            {/* Side-by-Side 2 Chart Cards Grid */}
            <div 
              style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', 
                gap: '20px',
                alignItems: 'stretch'
              }}
            >
              {/* Left Chart: Line Chart (Daily Total Orders) - No Horizontal Scroll, Crisp Vector Text */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '18px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  📈 일별 총 출고 건수 추이
                </h4>
                
                <div style={{ width: '100%', height: '220px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="100%" height="100%" viewBox="0 0 380 200" preserveAspectRatio="xMidYMid meet" style={{ overflow: 'visible' }}>
                    {/* Horizontal Grid lines */}
                    <line x1="30" y1="20" x2="360" y2="20" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
                    <line x1="30" y1="70" x2="360" y2="70" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
                    <line x1="30" y1="120" x2="360" y2="120" stroke="var(--border-color)" strokeDasharray="3 3" opacity="0.5" />
                    <line x1="30" y1="170" x2="360" y2="170" stroke="var(--border-color)" strokeOpacity="0.8" />

                    {(() => {
                      const maxCount = Math.max(...filteredAnalyticsCharts.map(c => c.totalCount || 1), 10);
                      const stepX = 330 / Math.max(filteredAnalyticsCharts.length - 1, 1);

                      const points = filteredAnalyticsCharts.map((c, i) => {
                        const x = 30 + i * stepX;
                        const y = 170 - ((c.totalCount || 0) / maxCount) * 140;
                        return { x, y, count: c.totalCount, date: c.date };
                      });

                      const pathD = points.reduce((acc, p, i) => i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`, '');

                      return (
                        <>
                          {/* Line */}
                          <path d={pathD} fill="none" stroke="var(--color-primary)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                          
                          {/* Data Points */}
                          {points.map((p, i) => (
                            <g key={i}>
                              <circle cx={p.x} cy={p.y} r="4.5" fill="var(--color-primary)" stroke="#ffffff" strokeWidth="2" />
                              <text x={p.x} y={p.y - 8} textAnchor="middle" fontSize="10" fontWeight="bold" fill="var(--text-primary)">
                                {p.count}
                              </text>
                              <text x={p.x} y="188" textAnchor="middle" fontSize="9" fill="var(--text-secondary)">
                                {p.date.substring(5)}
                              </text>
                            </g>
                          ))}
                        </>
                      );
                    })()}
                  </svg>
                </div>
              </div>

              {/* Right Chart: Sleek SVG Donut / Pie Chart (Order Quantity Breakdown) */}
              <div style={{ backgroundColor: 'var(--bg-card)', padding: '18px 16px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: '0.98rem', fontWeight: 700, marginBottom: '14px', color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  🍩 주문 수량별 구성 비중 (원형 차트)
                </h4>

                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', gap: '16px', flexWrap: 'wrap', flex: 1, padding: '10px 0' }}>
                  {/* SVG Donut Chart */}
                  <div style={{ position: 'relative', width: '150px', height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="150" height="150" viewBox="0 0 100 100">
                      {(() => {
                        const C = 2 * Math.PI * 35; // Circumference ≈ 219.91
                        const l1 = (overallBreakdown.rawP1 / 100) * C;
                        const l2 = (overallBreakdown.rawP2 / 100) * C;
                        const l3 = (overallBreakdown.rawP3 / 100) * C;

                        return (
                          <g transform="rotate(-90 50 50)">
                            {/* Segment 1: 1개 주문 */}
                            <circle
                              cx="50"
                              cy="50"
                              r="35"
                              fill="transparent"
                              stroke="#0284c7"
                              strokeWidth="18"
                              strokeDasharray={`${l1} ${C - l1}`}
                              strokeDashoffset="0"
                            />
                            {/* Segment 2: 2개 주문 */}
                            <circle
                              cx="50"
                              cy="50"
                              r="35"
                              fill="transparent"
                              stroke="#0d9488"
                              strokeWidth="18"
                              strokeDasharray={`${l2} ${C - l2}`}
                              strokeDashoffset={`${-l1}`}
                            />
                            {/* Segment 3: 3개 이상 주문 */}
                            <circle
                              cx="50"
                              cy="50"
                              r="35"
                              fill="transparent"
                              stroke="#8b5cf6"
                              strokeWidth="18"
                              strokeDasharray={`${l3} ${C - l3}`}
                              strokeDashoffset={`${-(l1 + l2)}`}
                            />
                          </g>
                        );
                      })()}
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
                      <span style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>{overallBreakdown.grandTotalOrders}건</span>
                    </div>
                  </div>

                  {/* Sleek Legend List */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '130px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#0284c7', borderRadius: '3px' }}></span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>1개 주문:</span>
                      <span style={{ fontWeight: 700, color: '#0284c7', marginLeft: 'auto' }}>{overallBreakdown.p1}%</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#0d9488', borderRadius: '3px' }}></span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>2개 주문:</span>
                      <span style={{ fontWeight: 700, color: '#0d9488', marginLeft: 'auto' }}>{overallBreakdown.p2}%</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <span style={{ width: '12px', height: '12px', backgroundColor: '#8b5cf6', borderRadius: '3px' }}></span>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>3개 이상:</span>
                      <span style={{ fontWeight: 700, color: '#8b5cf6', marginLeft: 'auto' }}>{overallBreakdown.p3}%</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Detailed Data Table (With Pagination & Period Summary Rows) */}
            <div style={{ backgroundColor: 'var(--bg-card)', padding: '16px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
              
              {/* Table Header Controls (Title + Page Size + Pagination Controls) */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
                <div>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    📋 날짜별 주문 수량 구성 세부 데이터
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
                      (총 {sortedAnalyticsTableData.length}일 / 최신 날짜순)
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
                        onClick={() => setTablePageSize(size)}
                        style={{
                          padding: '2px 8px',
                          borderRadius: '4px',
                          border: tablePageSize === size ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                          backgroundColor: tablePageSize === size ? 'rgba(2, 132, 199, 0.12)' : 'transparent',
                          color: tablePageSize === size ? 'var(--color-primary)' : 'var(--text-secondary)',
                          fontSize: '0.75rem',
                          fontWeight: tablePageSize === size ? 700 : 500,
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
                        onClick={() => setTableCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={tableCurrentPage === 1}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'transparent',
                          color: tableCurrentPage === 1 ? 'var(--text-secondary)' : 'var(--text-primary)',
                          opacity: tableCurrentPage === 1 ? 0.4 : 1,
                          fontSize: '0.78rem',
                          cursor: tableCurrentPage === 1 ? 'default' : 'pointer'
                        }}
                      >
                        ◀ 이전
                      </button>

                      <span style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-primary)', padding: '0 6px' }}>
                        {tableCurrentPage} / {totalPages}
                      </span>

                      <button
                        onClick={() => setTableCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={tableCurrentPage === totalPages}
                        style={{
                          padding: '3px 8px',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)',
                          backgroundColor: 'transparent',
                          color: tableCurrentPage === totalPages ? 'var(--text-secondary)' : 'var(--text-primary)',
                          opacity: tableCurrentPage === totalPages ? 0.4 : 1,
                          fontSize: '0.78rem',
                          cursor: tableCurrentPage === totalPages ? 'default' : 'pointer'
                        }}
                      >
                        다음 ▶
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Table Render */}
              <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ backgroundColor: 'var(--bg-secondary)', borderBottom: '2px solid var(--border-color)' }}>
                      <th style={{ padding: '9px 10px', textAlign: 'left', fontWeight: 700 }}>날짜</th>
                      <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700 }}>총 주문건수</th>
                      <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0284c7' }}>1개 주문</th>
                      <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#0d9488' }}>2개 주문</th>
                      <th style={{ padding: '9px 10px', textAlign: 'right', fontWeight: 700, color: '#8b5cf6' }}>3개 이상</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTableData.map((c) => {
                      const bk = c.qtyBreakdown || { count1: 0, count2: 0, count3Plus: 0, percent1: '0%', percent2: '0%', percent3Plus: '0%' };
                      return (
                        <tr key={c.date} style={{ borderBottom: '1px solid var(--border-color)' }}>
                          <td style={{ padding: '8px 10px', textAlign: 'left', fontWeight: 600 }}>{c.date}</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', fontWeight: 700 }}>{c.totalCount}건</td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0284c7' }}>
                            {bk.count1}건 <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({bk.percent1})</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#0d9488' }}>
                            {bk.count2}건 <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({bk.percent2})</span>
                          </td>
                          <td style={{ padding: '8px 10px', textAlign: 'right', color: '#8b5cf6' }}>
                            {bk.count3Plus}건 <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>({bk.percent3Plus})</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>

                  {/* Summary & Average Bottom Footer Rows */}
                  <tfoot>
                    {/* Row 1: Period Total Summary */}
                    <tr style={{ backgroundColor: 'rgba(2, 132, 199, 0.06)', borderTop: '2px solid var(--color-primary)', fontWeight: 'bold' }}>
                      <td style={{ padding: '9px 10px', textAlign: 'left', color: 'var(--text-primary)' }}>
                        조회 기간 총 합계 ({overallBreakdown.totalDaysCount}일)
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: 'var(--text-primary)', fontSize: '0.88rem' }}>
                        {overallBreakdown.grandTotalOrders}건
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0284c7' }}>
                        {overallBreakdown.tot1}건 ({overallBreakdown.p1}%)
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0d9488' }}>
                        {overallBreakdown.tot2}건 ({overallBreakdown.p2}%)
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#8b5cf6' }}>
                        {overallBreakdown.tot3Plus}건 ({overallBreakdown.p3}%)
                      </td>
                    </tr>

                    {/* Row 2: Period Daily Average Summary */}
                    <tr style={{ backgroundColor: 'rgba(13, 148, 136, 0.08)', borderTop: '1px solid rgba(13, 148, 136, 0.3)', fontWeight: 'bold' }}>
                      <td style={{ padding: '9px 10px', textAlign: 'left', color: '#0f766e' }}>
                        📊 조회 기간 일평균 (Daily Avg)
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0f766e', fontSize: '0.88rem' }}>
                        평균 {overallBreakdown.avgTotalOrders}건/일
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0284c7' }}>
                        평균 {overallBreakdown.avgCount1}건
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#0d9488' }}>
                        평균 {overallBreakdown.avgCount2}건
                      </td>
                      <td style={{ padding: '9px 10px', textAlign: 'right', color: '#8b5cf6' }}>
                        평균 {overallBreakdown.avgCount3Plus}건
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Bottom Pagination Bar */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', marginTop: '14px' }}>
                  <button
                    onClick={() => setTableCurrentPage(1)}
                    disabled={tableCurrentPage === 1}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontSize: '0.78rem',
                      cursor: tableCurrentPage === 1 ? 'default' : 'pointer',
                      opacity: tableCurrentPage === 1 ? 0.4 : 1
                    }}
                  >
                    처음
                  </button>

                  {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                    <button
                      key={page}
                      onClick={() => setTableCurrentPage(page)}
                      style={{
                        padding: '4px 9px',
                        borderRadius: '4px',
                        border: tableCurrentPage === page ? '1px solid var(--color-primary)' : '1px solid var(--border-color)',
                        backgroundColor: tableCurrentPage === page ? 'var(--color-primary)' : 'transparent',
                        color: tableCurrentPage === page ? '#ffffff' : 'var(--text-primary)',
                        fontSize: '0.78rem',
                        fontWeight: tableCurrentPage === page ? 700 : 500,
                        cursor: 'pointer'
                      }}
                    >
                      {page}
                    </button>
                  ))}

                  <button
                    onClick={() => setTableCurrentPage(totalPages)}
                    disabled={tableCurrentPage === totalPages}
                    style={{
                      padding: '4px 8px',
                      borderRadius: '4px',
                      border: '1px solid var(--border-color)',
                      backgroundColor: 'transparent',
                      fontSize: '0.78rem',
                      cursor: tableCurrentPage === totalPages ? 'default' : 'pointer',
                      opacity: tableCurrentPage === totalPages ? 0.4 : 1
                    }}
                  >
                    끝
                  </button>
                </div>
              )}
            </div>

          </div>
        )}
      </section>

    </div>
  );
};

export default OrderView;

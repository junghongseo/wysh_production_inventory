import React, { useState, useRef, useMemo } from 'react';
import * as XLSX from 'xlsx';
import html2canvas from 'html2canvas';

const OrderView = () => {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState(null);
  const [productTotals, setProductTotals] = useState([]);
  const [tableTitle, setTableTitle] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isDragOver, setIsDragOver] = useState(false);

  const captureRef = useRef(null);

  // Local-time safe today string
  const todayStr = useMemo(() => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  }, []);

  const cleanItemName = (name) => {
    let nameStr = String(name || '').trim();
    // Remove bracket prefix (e.g. [RENEWAL])
    nameStr = nameStr.replace(/^\[[^\]]+\]\s*/, '');
    // Remove weight/capacity suffix (e.g. 330g, 350g, 20g, 20G, 330ml, etc.)
    nameStr = nameStr.replace(/\s*\d+\s*(?:[gG](?:[rR][aA][mM])?|[mM][lL])\s*$/, '');
    return nameStr.trim();
  };

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      setError('');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      // Check file extension
      const ext = droppedFile.name.split('.').pop().toLowerCase();
      if (ext === 'xlsx' || ext === 'xls') {
        setFile(droppedFile);
        setError('');
      } else {
        setError('엑셀 파일(.xlsx, .xls)만 업로드 가능합니다.');
      }
    }
  };

  const processExcel = () => {
    if (!file) {
      setError('정리할 엑셀 파일을 먼저 선택해 주세요.');
      return;
    }

    setLoading(true);
    setError('');

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        
        // Detect if it is HTML disguised as Excel
        const isZip = data[0] === 0x50 && data[1] === 0x4B && data[2] === 0x03 && data[3] === 0x04;
        const isOles = data[0] === 0xD0 && data[1] === 0xCF && data[2] === 0x11 && data[3] === 0xE0;
        
        let workbook;
        if (!isZip && !isOles) {
          // Detect charset encoding from HTML header if present
          let encoding = 'utf-8';
          const prefixText = new TextDecoder('latin1').decode(data.slice(0, 2000));
          const charsetMatch = prefixText.match(/charset\s*=\s*["']?([\w\-]+)/i);
          if (charsetMatch && charsetMatch[1]) {
            encoding = charsetMatch[1].toLowerCase();
          }
          
          const text = new TextDecoder(encoding).decode(data);
          
          // Check if it's a multi-file web page frameset exported by Excel (missing data body)
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
        
        // Read as raw 2D array to scan for header row index dynamically
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: "" });

        if (rawData.length === 0) {
          throw new Error('엑셀 파일에 데이터가 없습니다.');
        }

        // Schema patterns for dynamic header matching
        const schemaA = {
          required: ['송장번호', '상품명', '상품수량'],
          group: '송장번호',
          name: '상품명',
          qty: '상품수량'
        };
        const schemaB = {
          required: ['주문 번호', '상품 이름', '구매 수량'],
          group: '주문 번호',
          name: '상품 이름',
          qty: '구매 수량'
        };
        const schemaC = {
          required: ['주문 번호', '상품 이름', '배송 수량'],
          group: '주문 번호',
          name: '상품 이름',
          qty: '배송 수량'
        };

        const schemas = [schemaA, schemaB, schemaC];
        let selectedSchema = null;
        let headerRowIndex = -1;
        let headers = [];

        // Scan rows to find headers
        for (let i = 0; i < rawData.length; i++) {
          const row = rawData[i].map(val => String(val || '').trim());
          const rowSet = new Set(row);

          for (const schema of schemas) {
            if (schema.required.every(col => rowSet.has(col))) {
              headerRowIndex = i;
              selectedSchema = schema;
              headers = row;
              break;
            }
          }
          if (selectedSchema) break;
        }

        if (!selectedSchema) {
          // If no matching schema is found, throw an informative error
          const allHeaders = rawData[0] ? rawData[0].join(', ') : '';
          throw new Error(`지원하지 않는 엑셀 파일 형식이거나 필수 열(송장번호/주문 번호, 상품명/상품 이름, 상품수량/구매 수량)이 누락되었습니다. (첫 행 인식 항목: ${allHeaders})`);
        }

        const groupCol = selectedSchema.group;
        const nameCol = selectedSchema.name;
        const qtyCol = selectedSchema.qty;

        // Map rows starting from headerRowIndex + 1
        const rows = [];
        for (let i = headerRowIndex + 1; i < rawData.length; i++) {
          const row = rawData[i];
          if (!row || row.length === 0) continue;
          
          const rowObj = {};
          headers.forEach((header, index) => {
            if (header) {
              rowObj[header] = row[index];
            }
          });
          rows.push(rowObj);
        }

        const dfTarget = [];
        const productTotalsMap = {};

        rows.forEach((row) => {
          const groupVal = String(row[groupCol] || '').trim();
          const nameVal = cleanItemName(row[nameCol]);
          let qtyVal = parseInt(row[qtyCol], 10);
          if (isNaN(qtyVal)) qtyVal = 1;

          if (groupVal && nameVal) {
            dfTarget.push({ groupVal, nameVal, qtyVal });
            productTotalsMap[nameVal] = (productTotalsMap[nameVal] || 0) + qtyVal;
          }
        });

        if (dfTarget.length === 0) {
          throw new Error('정리할 주문 데이터가 발견되지 않았습니다. 파일 내용을 확인하세요.');
        }

        // Group by group column value (Invoice or Order Number)
        const groupedMap = {};
        dfTarget.forEach(item => {
          const formatted = `${item.nameVal} [${item.qtyVal}개]`;
          if (!groupedMap[item.groupVal]) {
            groupedMap[item.groupVal] = [];
          }
          groupedMap[item.groupVal].push(formatted);
        });

        // Combine formatted item names and count identical order types
        const orderTypeCounts = {};
        Object.values(groupedMap).forEach(itemList => {
          const sortedItems = [...itemList].sort();
          const orderType = sortedItems.join(', ');
          orderTypeCounts[orderType] = (orderTypeCounts[orderType] || 0) + 1;
        });

        // Convert counts to sorted list
        const processedResults = Object.entries(orderTypeCounts).map(([orderType, count]) => ({
          orderType,
          count
        }));
        processedResults.sort((a, b) => b.count - a.count);

        // Convert product totals to list
        const processedProductTotals = Object.entries(productTotalsMap).map(([name, qty]) => ({
          name,
          qty
        }));
        processedProductTotals.sort((a, b) => b.qty - a.qty);

        // Success state update
        setResults(processedResults);
        setProductTotals(processedProductTotals);
        
        // Format today's date into YY-MM-DD
        const yy = todayStr.substring(2, 4);
        const mm = todayStr.substring(5, 7);
        const dd = todayStr.substring(8, 10);
        setTableTitle(`${yy}-${mm}-${dd} 출고표`);
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
  };

  const handleDownloadImage = () => {
    if (!captureRef.current) return;

    const originalBtn = document.getElementById('download-btn');
    if (originalBtn) {
      originalBtn.disabled = true;
      originalBtn.innerText = '이미지 저장 중...';
    }

    html2canvas(captureRef.current, {
      scale: 2,
      backgroundColor: '#ffffff'
    }).then(canvas => {
      const dateStr = todayStr.replace(/-/g, '');
      const link = document.createElement('a');
      link.download = `출고표_${dateStr}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    }).catch(err => {
      alert("이미지 저장 중 오류가 발생했습니다: " + err.message);
    }).finally(() => {
      if (originalBtn) {
        originalBtn.disabled = false;
        originalBtn.innerText = '이미지 저장하기';
      }
    });
  };

  // Get total count
  const totalCount = results ? results.reduce((acc, curr) => acc + curr.count, 0) : 0;

  return (
    <div className="inventory-layout" style={{ maxWidth: '680px', margin: '0 auto' }}>
      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr' }}>
        {/* Upload Card */}
        <div className="glass-card">
          <div className="inventory-header-row" style={{ marginBottom: '16px' }}>
            <h3 style={{ fontSize: '1.15rem', fontWeight: 600 }}>주문 자동 정리</h3>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '20px' }}>
            엑셀 주문서를 업로드하면 브라우저 내에서 직접 포장유형별 및 제품별 수량을 집계합니다.
          </p>
          <div 
            className={`file-upload-zone ${isDragOver ? 'drag-over' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: '2px dashed var(--border-highlight)',
              borderRadius: '12px',
              padding: '40px 20px',
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
              width="48" 
              height="48" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5" 
              strokeLinecap="round" 
              strokeLinejoin="round"
              style={{ color: 'var(--color-primary)', marginBottom: '16px', opacity: 0.8 }}
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>

            {file ? (
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>{file.name}</p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                  {(file.size / 1024).toFixed(1)} KB | 파일이 선택되었습니다.
                </p>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '1rem' }}>
                  엑셀 주문서 파일을 드래그 앤 드롭하거나 클릭하여 선택하세요.
                </p>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '4px' }}>
                  지원 포맷: .xlsx, .xls
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="validation-banner show" style={{ marginTop: '16px', display: 'flex' }}>
              <span>⚠️ {error}</span>
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '20px', gap: '12px' }}>
            {file && (
              <button 
                className="btn-secondary" 
                onClick={() => { setFile(null); setResults(null); setError(''); }}
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
              {loading ? '데이터 정리 중...' : '파일 업로드 및 정리하기'}
            </button>
          </div>
        </div>

        {/* Results Visualizer */}
        {results && (
          <div className="glass-card" style={{ marginTop: '24px' }}>
            <div 
              ref={captureRef} 
              style={{ 
                backgroundColor: '#ffffff', 
                padding: '30px 24px', 
                borderRadius: '8px', 
                color: '#0f172a',
                fontFamily: "'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif",
                maxWidth: '520px',
                margin: '0 auto',
                border: '1px solid #cbd5e1',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
              }}
            >
              {/* Table Title (Click to Edit) */}
              <div 
                style={{ 
                  fontSize: '18px', 
                  fontWeight: 'bold', 
                  marginBottom: '16px', 
                  color: '#0f172a',
                  textAlign: 'left',
                  borderBottom: '2px solid #0f172a',
                  paddingBottom: '8px'
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
                  marginBottom: '20px', 
                  color: '#1e293b', 
                  fontSize: '14px', 
                  textAlign: 'left',
                  backgroundColor: '#f8fafc',
                  padding: '14px 18px',
                  borderRadius: '8px',
                  border: '1px solid #e2e8f0',
                  lineHeight: '1.6'
                }}
              >
                <div style={{ color: '#0284c7', marginBottom: '8px', fontSize: '12px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  📦 제품별 총 발송 수량
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {productTotals.length === 0 ? (
                    <div style={{ color: '#64748b' }}>발송 내역 없음</div>
                  ) : (
                    productTotals.map((item, idx) => (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed #e2e8f0', paddingBottom: '4px' }}>
                        <span style={{ color: '#334155', fontWeight: 500 }}>{item.name}</span>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>{item.qty}개</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Output Table */}
              <table 
                style={{ 
                  width: '100%', 
                  borderCollapse: 'collapse', 
                  backgroundColor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  fontSize: '14px',
                  tableLayout: 'fixed'
                }}
              >
                <thead>
                  <tr style={{ backgroundColor: '#f1f5f9' }}>
                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 14px', textAlign: 'left', fontWeight: 'bold', color: '#334155' }}>
                      포장 유형(개수)
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 14px', textAlign: 'right', fontWeight: 'bold', color: '#334155', width: '70px' }}>
                      건수
                    </th>
                    <th style={{ border: '1px solid #cbd5e1', padding: '10px 14px', textAlign: 'right', fontWeight: 'bold', color: '#334155', width: '70px' }}>
                      비율
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((item, idx) => {
                    const percent = totalCount > 0 ? ((item.count / totalCount) * 100).toFixed(1) + '%' : '0.0%';
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e2e8f0' }}>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px 14px', textAlign: 'left', color: '#0f172a', wordBreak: 'break-all', fontSize: '13px' }}>
                          {item.orderType}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px 14px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace' }}>
                          {item.count}
                        </td>
                        <td style={{ border: '1px solid #cbd5e1', padding: '10px 14px', textAlign: 'right', color: '#64748b', fontFamily: 'monospace' }}>
                          {percent}
                        </td>
                      </tr>
                    );
                  })}
                  {/* Empty Spacer Row (matching standard template style) */}
                  <tr>
                    <td style={{ border: '1px solid #cbd5e1', padding: '10px 14px', height: '24px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '10px 14px' }}>&nbsp;</td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '10px 14px' }}>&nbsp;</td>
                  </tr>
                  {/* Total Row */}
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: 'bold' }}>
                    <td style={{ border: '1px solid #cbd5e1', padding: '12px 14px', textAlign: 'left', color: '#0f172a' }}>
                      합계
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '12px 14px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace' }}>
                      {totalCount}
                    </td>
                    <td style={{ border: '1px solid #cbd5e1', padding: '12px 14px', textAlign: 'right', color: '#0f172a', fontFamily: 'monospace' }}>
                      100%
                    </td>
                  </tr>
                </tbody>
              </table>

              {/* Remarks Area */}
              <div style={{ marginTop: '20px', border: '1px solid #cbd5e1', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f1f5f9', fontWeight: 'bold', padding: '8px 14px', fontSize: '13px', color: '#334155', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                  특이사항
                </div>
                <textarea
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="여기에 특이사항을 입력하시면 이미지 저장 시 출고표 하단에 포함됩니다..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px 14px',
                    border: 'none',
                    outline: 'none',
                    fontSize: '13px',
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

            {/* Action Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '20px' }}>
              <button 
                id="download-btn" 
                className="btn-success" 
                onClick={handleDownloadImage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                  <circle cx="9" cy="9" r="2"></circle>
                  <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"></path>
                </svg>
                이미지 저장하기
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default OrderView;

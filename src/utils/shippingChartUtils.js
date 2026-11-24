// Helpers for OrderView (주문 엑셀 정리 / 공식 출고표 / 출고 동향 분석)

// Color Palette for Products in Analytics Chart
export const PRODUCT_COLORS = [
  '#0284c7', // Sky Blue
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#6366f1', // Indigo
  '#14b8a6', // Teal
  '#ef4444', // Red
  '#3b82f6', // Blue
  '#a855f7'  // Purple
];

// Local-time safe today string (YYYY-MM-DD)
export const getLocalTodayStr = () => {
  const today = new Date();
  const offset = today.getTimezoneOffset() * 60000;
  return new Date(today.getTime() - offset).toISOString().split('T')[0];
};

// 'YYYY-MM-DD' -> 'YY-MM-DD 출고표'
export const formatChartTitle = (dateStr) => {
  const yy = dateStr.substring(2, 4);
  const mm = dateStr.substring(5, 7);
  const dd = dateStr.substring(8, 10);
  return `${yy}-${mm}-${dd} 출고표`;
};

// Parse an uploaded order file (xlsx / xls / HTML-disguised xls) into a SheetJS workbook
export const readOrderWorkbook = (XLSX, data) => {
  const isZip = data[0] === 0x50 && data[1] === 0x4B && data[2] === 0x03 && data[3] === 0x04;
  const isOles = data[0] === 0xD0 && data[1] === 0xCF && data[2] === 0x11 && data[3] === 0xE0;

  if (isZip || isOles) {
    return XLSX.read(data, { type: 'array' });
  }

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

  return XLSX.read(cleanedText, { type: 'string' });
};

// Safely get product totals array from saved chart item (with legacy fallback)
export const getProductTotalsFromChart = (chart) => {
  if (Array.isArray(chart?.productTotals) && chart.productTotals.length > 0) {
    return chart.productTotals;
  }
  const totalsMap = {};
  if (Array.isArray(chart?.results)) {
    chart.results.forEach(res => {
      const items = (res.orderType || '').split(',');
      items.forEach(item => {
        const match = item.match(/^(.*?)\s*\[(\d+)개\]$/);
        if (match) {
          const pName = match[1].trim();
          const pQty = parseInt(match[2], 10) * (res.count || 1);
          totalsMap[pName] = (totalsMap[pName] || 0) + pQty;
        }
      });
    });
  }
  return Object.entries(totalsMap).map(([name, qty]) => ({ name, qty }));
};

// Charts in the selected range (chronological)
export const filterChartsByRange = (shippingCharts, analyticsRange) => {
  if (!shippingCharts || shippingCharts.length === 0) return [];
  const sorted = [...shippingCharts].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  if (analyticsRange === 'all') return sorted;
  const days = parseInt(analyticsRange, 10);
  if (isNaN(days)) return sorted;
  return sorted.slice(-days);
};

// All unique product names across charts, sorted by total shipped quantity (desc)
export const getAnalyticsProductList = (charts) => {
  const qtyMap = {};
  charts.forEach(c => {
    const pTotals = getProductTotalsFromChart(c);
    pTotals.forEach(p => {
      if (p.name) {
        qtyMap[p.name] = (qtyMap[p.name] || 0) + p.qty;
      }
    });
  });
  return Object.keys(qtyMap).sort((a, b) => qtyMap[b] - qtyMap[a]);
};

// Total Quantity Breakdown Aggregation for Donut Chart & Table Summary
export const computeOverallBreakdown = (charts) => {
  let tot1 = 0;
  let tot2 = 0;
  let tot3Plus = 0;
  let grandTotalOrders = 0;

  charts.forEach(c => {
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

  const totalDaysCount = charts.length;
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
};

// Save a DOM node as PNG image (출고표_YYYYMMDD.png)
export const downloadChartImage = async (ref, dateStrForName, btnId) => {
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
    const dStr = (dateStrForName || getLocalTodayStr()).replace(/-/g, '');
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
};

// Open a print window with the chart content
export const printChart = (ref) => {
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
};

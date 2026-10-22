/**
 * orderParser.js
 * 
 * 엑셀 발주서 데이터 파싱, 헤더 자동 감지, 상품명 정제 및 주문 패턴 집계를 전담하는 순수 함수 모듈입니다.
 */

/**
 * 상품명 정제 함수 (대괄호 접두사 및 용량/중량 접미사 제거)
 */
export const cleanItemName = (name) => {
  let nameStr = String(name || '').trim();
  // Remove bracket prefix (e.g. [RENEWAL])
  nameStr = nameStr.replace(/^\[[^\]]+\]\s*/, '');
  // Remove weight/capacity suffix (e.g. 330g, 350g, 20g, 20G, 330ml, etc.)
  nameStr = nameStr.replace(/\s*\d+\s*(?:[gG](?:[rR][aA][mM])?|[mM][lL])\s*$/, '');
  return nameStr.trim();
};

/**
 * 엑셀 원본 JSON 2차원 배열로부터 주문 내역을 파싱하고 집계하는 순수 함수
 * @param {Array<Array<any>>} jsonData - 시트 원본 2차원 배열 데이터
 * @returns {{ productTotals: Array<{name: string, qty: number}>, results: Array<{orderType: string, count: number}>, qtyBreakdown: object, totalPackageCount: number, totalProductQty: number }}
 */
export const parseRawOrderRows = (jsonData) => {
  if (!jsonData || jsonData.length === 0) {
    throw new Error('엑셀 파일에 읽을 데이터가 없습니다.');
  }

  // Header finding logic ('상품수량'을 '주문수량'보다 최우선으로 선택)
  const invoiceKeywords = ['송장번호', '송장 번호', '운송장번호', '운송장 번호', '운송장 정보'];
  const orderKeywords = ['주문번호', '주문 번호', '품목 주문 번호', '품목주문번호'];
  const nameKeywords = ['상품명', '상품 이름', '상품이름', '판매처 상품명', '판매처상품명', '상품명(옵션포함)', '품목명'];
  const qtyKeywords = ['상품수량', '상품 수량', '배송 수량', '배송수량', '구매 수량', '구매수량', '수량', '주문수량', '주문 수량'];

  let headerRowIndex = -1;
  let groupCol = -1;
  let nameCol = -1;
  let qtyCol = -1;

  for (let r = 0; r < Math.min(jsonData.length, 15); r++) {
    const row = jsonData[r];
    if (!Array.isArray(row)) continue;
    
    let invCol = -1;
    let ordCol = -1;
    let n = -1;
    let q = -1;
    let bestQtyPriority = Infinity;

    for (let c = 0; c < row.length; c++) {
      const cellVal = String(row[c] || '').trim();
      if (invCol === -1 && invoiceKeywords.includes(cellVal)) {
        invCol = c;
      }
      if (ordCol === -1 && orderKeywords.includes(cellVal)) {
        ordCol = c;
      }
      if (n === -1 && nameKeywords.includes(cellVal)) {
        n = c;
      }
      const qPriority = qtyKeywords.indexOf(cellVal);
      if (qPriority !== -1 && qPriority < bestQtyPriority) {
        bestQtyPriority = qPriority;
        q = c;
      }
    }
    
    if ((invCol !== -1 || ordCol !== -1) && n !== -1 && q !== -1) {
      headerRowIndex = r;
      let useInv = false;
      if (invCol !== -1) {
        for (let k = r + 1; k < Math.min(jsonData.length, r + 20); k++) {
          if (jsonData[k] && String(jsonData[k][invCol] || '').trim()) {
            useInv = true;
            break;
          }
        }
      }
      groupCol = useInv ? invCol : (ordCol !== -1 ? ordCol : invCol);
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

  // Aggregate products per package/invoice group
  const groupProductMap = {}; // { groupVal: { nameVal: sumQty } }
  const orderTotalQtyMap = {}; // { groupVal: totalQty }

  dfTarget.forEach(item => {
    if (!groupProductMap[item.groupVal]) {
      groupProductMap[item.groupVal] = {};
    }
    groupProductMap[item.groupVal][item.nameVal] = (groupProductMap[item.groupVal][item.nameVal] || 0) + item.qtyVal;
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
  Object.values(groupProductMap).forEach(prodMap => {
    const formattedItems = Object.entries(prodMap).map(([pName, pQty]) => `${pName} [${pQty}개]`);
    formattedItems.sort();
    const orderType = formattedItems.join(', ');
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

  const totalProductQty = processedProductTotals.reduce((sum, item) => sum + item.qty, 0);

  return {
    productTotals: processedProductTotals,
    results: processedResults,
    qtyBreakdown: computedBreakdown,
    totalPackageCount: totalOrdersCount,
    totalProductQty
  };
};

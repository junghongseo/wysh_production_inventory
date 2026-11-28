import React, { useState } from 'react';

// 모바일 재고 목록: 표 대신 카드. 차수·제품·현재 재고를 먼저 보이고, 나머지는 펼쳐서 본다.
// 카드를 누르면 PC 표의 행 선택과 같이 아래 출고 기록을 그 차수로 거른다.
const InventoryCardList = ({ rows, selectedId, onSelect }) => {
  const [expanded, setExpanded] = useState(() => new Set());

  const toggleExpanded = (key) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  if (rows.length === 0) {
    return <div className="empty-state" style={{ padding: '24px 8px', textAlign: 'center' }}>조건에 부합하는 생산 차수가 없습니다.</div>;
  }

  return (
    <ul className="inventory-card-list">
      {rows.map(({ subKey, planId, subName, prodName, shippingLimit, expiryDate, plannedQty, actualQty, currentStock, isReportConfirmed }) => {
        const isSelected = selectedId === subKey || selectedId === planId;
        const isOpen = expanded.has(subKey);
        const stockClass = !isReportConfirmed ? 'is-pending' : (currentStock < 30 ? 'is-low' : '');
        return (
          <li key={subKey} className={`inventory-card ${isSelected ? 'selected' : ''}`}>
            <button
              type="button"
              className="inventory-card-main"
              onClick={() => onSelect(isSelected ? null : subKey)}
              aria-pressed={isSelected}
            >
              <span className="inventory-card-info">
                <span className="inventory-card-id">{planId}</span>
                <strong className="inventory-card-name">{prodName}</strong>
                <span className="inventory-card-sub">{subName} · 출고기한 {shippingLimit || '-'}</span>
              </span>
              <span className={`inventory-card-stock ${stockClass}`}>
                {isReportConfirmed ? (
                  <>
                    <b>{currentStock.toLocaleString()}</b>
                    <small>현재 재고</small>
                  </>
                ) : (
                  <small className="inventory-card-pending">리포트 대기</small>
                )}
              </span>
            </button>

            <button
              type="button"
              className="inventory-card-toggle"
              onClick={() => toggleExpanded(subKey)}
              aria-expanded={isOpen}
            >
              {isOpen ? '접기 ▲' : '자세히 ▼'}
            </button>

            {isOpen && (
              <dl className="inventory-card-details">
                <div><dt>소비기한</dt><dd>{expiryDate || '-'}</dd></div>
                <div><dt>계획 수량</dt><dd>{plannedQty.toLocaleString()}개</dd></div>
                <div><dt>실제 입고</dt><dd>{isReportConfirmed ? `${actualQty.toLocaleString()}개` : '리포트 대기중'}</dd></div>
                <div><dt>상태</dt><dd>{isReportConfirmed ? '✓ 병입 입고 연동완료' : '리포트 승인 대기'}</dd></div>
              </dl>
            )}
          </li>
        );
      })}
    </ul>
  );
};

export default InventoryCardList;

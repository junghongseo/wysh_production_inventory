import React, { useState, useEffect, useMemo } from 'react';
import { useWysh } from '../../WyshContext';

const ModifyQtyModal = ({ isOpen, onClose, planId, productId }) => {
  const { plans, products, getInventoryRecord, updateActualQty } = useWysh();

  const [actualQty, setActualQty] = useState('');

  const details = useMemo(() => {
    if (!isOpen || !planId) return null;
    const plan = plans.find(p => p.id === planId);
    const record = getInventoryRecord(planId);
    const prod = productId ? products.find(p => p.id === productId) : (plan ? products.find(p => p.id === plan.productId) : null);
    
    let currentActual = plan ? plan.totalQty : 0;
    if (record) {
      if (productId && record.itemActualQtys && record.itemActualQtys[productId] !== undefined) {
        currentActual = record.itemActualQtys[productId];
      } else if (record.actualQty !== undefined) {
        currentActual = record.actualQty;
      }
    }

    const isMulti = plan && plan.items && plan.items.length > 1;
    const displayName = isMulti && prod ? `${plan.name}_${prod.name}` : (plan ? plan.name : '');

    return {
      plan,
      prod,
      record,
      currentActual,
      displayName
    };
  }, [isOpen, planId, productId, plans, products, getInventoryRecord]);

  // Set initial actual quantity
  useEffect(() => {
    if (details) {
      setActualQty(details.currentActual);
    } else {
      setActualQty('');
    }
  }, [details]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!planId) return;

    const qty = parseInt(actualQty) || 0;
    updateActualQty(planId, qty, productId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" id="modify-qty-modal">
      <div className="modal-content" style={{ width: '400px' }}>
        <div className="modal-header">
          <h3>실제 생산 입고량 수정</h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        {details && details.plan && (
          <form id="modify-qty-form" onSubmit={handleSubmit}>
            <div className="modal-body">
              <div className="info-row" style={{ marginBottom: '16px' }}>
                <span className="label">생산 계획명</span>
                <span className="value" style={{ fontWeight: 600 }}>{details.displayName}</span>
              </div>
              {details.prod && (
                <div className="info-row" style={{ marginBottom: '16px' }}>
                  <span className="label">대상 품목</span>
                  <span className="value">{details.prod.name} ({details.prod.weight}g)</span>
                </div>
              )}
              <div className="info-row" style={{ marginBottom: '20px' }}>
                <span className="label">현재 등록 입고량</span>
                <span className="value highlight">{details.currentActual.toLocaleString()} 개</span>
              </div>
              <div className="form-group">
                <label htmlFor="modify-actual-qty">실제 입고 수량 (개)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="modify-actual-qty" 
                  min="0" 
                  value={actualQty}
                  onChange={(e) => setActualQty(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required 
                />
              </div>
              <div className="note-card" style={{ marginTop: '16px', borderColor: 'rgba(251, 146, 60, 0.2)', background: 'rgba(251, 146, 60, 0.05)' }}>
                <p style={{ fontSize: '0.8rem', color: 'var(--color-warning)', lineHeight: '1.4' }}>
                  ⚠️ 실제 입고량을 수정하여 반영하면, 해당 품목의 현재 재고(최종 재고) 역시 새로운 입고량을 기준으로 자동 재계산됩니다.
                </p>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
              <button type="submit" className="btn-success">수정 반영</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

export default ModifyQtyModal;

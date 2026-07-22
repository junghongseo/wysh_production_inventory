import React, { useState, useEffect, useMemo } from 'react';
import { useWysh } from '../../WyshContext';

const PlanRegistrationModal = ({ isOpen, onClose, editPlanId }) => {
  const { plans, products, addPlan, updatePlan } = useWysh();

  // Local-time safe YYYY-MM-DD helper
  const getTodayStr = () => {
    const today = new Date();
    const offset = today.getTimezoneOffset() * 60000;
    return new Date(today.getTime() - offset).toISOString().split('T')[0];
  };

  const dateAddDays = (dateStr, days) => {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    d.setDate(d.getDate() + days);
    // return YYYY-MM-DD
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Form states
  const [planName, setPlanName] = useState('');
  const [items, setItems] = useState([
    { productId: '', expectedOrderQty: 0, marketingQty: 0, bufferQty: 0, bottlingDate: '', shippingLimit: '', expiryDate: '' }
  ]);
  const [startDate, setStartDate] = useState('');
  const [fermenterType, setFermenterType] = useState('');
  const [planMemo, setPlanMemo] = useState('');

  // Mode check
  const isEditMode = !!editPlanId;

  // Helper to calculate shipping limit and expiry dates dynamically for a product item
  const calculateItemDerivedDates = (botDate, prod) => {
    if (!botDate) return { shippingLimit: '', expiryDate: '' };
    const sDays = prod ? (prod.shippingLimitDays ?? 7) : 7;
    const eDays = prod ? (prod.expiryDays ?? 22) : 22;
    return {
      shippingLimit: dateAddDays(botDate, sDays),
      expiryDate: dateAddDays(botDate, eDays)
    };
  };

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        const plan = plans.find(p => p.id === editPlanId);
        if (plan) {
          setPlanName(plan.name);
          setStartDate(plan.startDate);
          setFermenterType(plan.fermenterType);
          setPlanMemo(plan.memo || '');

          if (plan.items && Array.isArray(plan.items) && plan.items.length > 0) {
            setItems(plan.items.map(it => {
              const prod = products.find(p => p.id === it.productId);
              const botDate = it.bottlingDate || plan.bottlingDate;
              const sLimit = it.shippingLimit || plan.shippingLimit || (prod ? dateAddDays(botDate, prod.shippingLimitDays ?? 7) : '');
              const eDate = it.expiryDate || plan.expiryDate || (prod ? dateAddDays(botDate, prod.expiryDays ?? 22) : '');
              return {
                productId: it.productId || '',
                expectedOrderQty: it.expectedOrderQty || 0,
                marketingQty: it.marketingQty || 0,
                bufferQty: it.bufferQty || 0,
                bottlingDate: botDate,
                shippingLimit: sLimit,
                expiryDate: eDate
              };
            }));
          } else {
            const prod = products.find(p => p.id === plan.productId);
            setItems([{
              productId: plan.productId || '',
              expectedOrderQty: plan.expectedOrderQty || 0,
              marketingQty: plan.marketingQty || 0,
              bufferQty: plan.bufferQty || 0,
              bottlingDate: plan.bottlingDate,
              shippingLimit: plan.shippingLimit || (prod ? dateAddDays(plan.bottlingDate, prod.shippingLimitDays ?? 7) : ''),
              expiryDate: plan.expiryDate || (prod ? dateAddDays(plan.bottlingDate, prod.expiryDays ?? 22) : '')
            }]);
          }
        }
      } else {
        // Reset form
        setPlanName('');
        const today = getTodayStr();
        const defaultBot = dateAddDays(today, 2);
        setStartDate(today);
        setFermenterType('');
        setPlanMemo('');
        setItems([{
          productId: '',
          expectedOrderQty: 0,
          marketingQty: 0,
          bufferQty: 0,
          bottlingDate: defaultBot,
          shippingLimit: '',
          expiryDate: ''
        }]);
      }
    }
  }, [isOpen, editPlanId, plans, products]);

  // Date trigger: Start date change (updates default bottling dates)
  const handleStartDateChange = (val) => {
    setStartDate(val);
    const defaultBot = dateAddDays(val, 2);
    setItems(prevItems => prevItems.map(it => {
      const prod = products.find(p => p.id === it.productId);
      const botDate = defaultBot;
      const derived = calculateItemDerivedDates(botDate, prod);
      return {
        ...it,
        bottlingDate: botDate,
        shippingLimit: derived.shippingLimit,
        expiryDate: derived.expiryDate
      };
    }));
  };

  // Item change handlers
  const handleItemChange = (index, field, value) => {
    const next = items.map((item, idx) => {
      if (idx === index) {
        const prod = field === 'productId' ? products.find(p => p.id === value) : products.find(p => p.id === item.productId);

        if (field === 'productId') {
          const itemBotDate = item.bottlingDate || dateAddDays(startDate || getTodayStr(), 2);
          const derived = calculateItemDerivedDates(itemBotDate, prod);
          return {
            ...item,
            productId: value,
            bottlingDate: itemBotDate,
            shippingLimit: derived.shippingLimit,
            expiryDate: derived.expiryDate
          };
        } else if (field === 'bottlingDate') {
          const derived = calculateItemDerivedDates(value, prod);
          return {
            ...item,
            bottlingDate: value,
            shippingLimit: derived.shippingLimit,
            expiryDate: derived.expiryDate
          };
        } else if (field === 'shippingLimit' || field === 'expiryDate') {
          return {
            ...item,
            [field]: value
          };
        } else {
          return {
            ...item,
            [field]: parseInt(value) || 0
          };
        }
      }
      return item;
    });
    setItems(next);
  };

  const handleAddItem = () => {
    if (items.length >= 2) return;
    const defaultBot = dateAddDays(startDate || getTodayStr(), 2);
    setItems([...items, {
      productId: '',
      expectedOrderQty: 0,
      marketingQty: 0,
      bufferQty: 0,
      bottlingDate: defaultBot,
      shippingLimit: '',
      expiryDate: ''
    }]);
  };

  const handleRemoveItem = (index) => {
    if (index === 0) return;
    setItems(items.filter((_, idx) => idx !== index));
  };

  // Calculations across items
  const computedItems = useMemo(() => {
    return items.map(item => {
      const totalQty = (item.expectedOrderQty || 0) + (item.marketingQty || 0) + (item.bufferQty || 0);
      const prod = products.find(p => p.id === item.productId);
      
      let baseYogurtG = 0;
      if (prod) {
        const itemTotalWeightG = totalQty * prod.weight;
        if (prod.isFlavor) {
          const flavorYield = prod.yield || 100;
          const inputWeightG = itemTotalWeightG / (flavorYield / 100);
          const baseIng = prod.ingredients?.find(i => i.name.includes('위시그릭') || i.name.includes('플레인')) || prod.ingredients?.[0];
          const baseRatio = baseIng ? baseIng.ratio : 70;
          baseYogurtG = inputWeightG * (baseRatio / 100);
        } else {
          baseYogurtG = itemTotalWeightG;
        }
      }

      return {
        ...item,
        totalQty,
        product: prod,
        baseYogurtG
      };
    });
  }, [items, products]);

  const totalVolumeL = useMemo(() => {
    const totalBaseYogurtG = computedItems.reduce((sum, item) => sum + item.baseYogurtG, 0);
    if (totalBaseYogurtG === 0) return 0;
    const totalRawMilkG = totalBaseYogurtG / 0.28;
    return totalRawMilkG / 1000;
  }, [computedItems]);

  // Fermenter verification
  const validation = useMemo(() => {
    const hasValidProducts = items.every(it => !!it.productId);
    if (!hasValidProducts || !fermenterType || !startDate) {
      return { valid: false, success: false, message: '' };
    }

    let capacityWarning = null;

    // Capacity validation (Warning only, does not block submission)
    if (totalVolumeL > 0) {
      if (totalVolumeL >= 120 && totalVolumeL <= 280) {
        if (fermenterType === 'large') {
          capacityWarning = `⚠️ 계산된 원재료 총량(${totalVolumeL.toFixed(2)}L)은 소형 규격(120L~280L)에 해당합니다.`;
        }
      } else if (totalVolumeL >= 300 && totalVolumeL <= 580) {
        if (fermenterType === 'small') {
          capacityWarning = `⚠️ 계산된 원재료 총량(${totalVolumeL.toFixed(2)}L)은 대형 규격(300L~580L)에 해당합니다.`;
        }
      } else {
        capacityWarning = `⚠️ 계산된 원재료 총량(${totalVolumeL.toFixed(2)}L)이 발효기 적정 용량 범위를 벗어났습니다. (소형: 120L~280L, 대형: 300L~580L)`;
      }
    }

    // Schedule overlap check
    const hasOverlap = plans.some(plan => {
      if (isEditMode && plan.id === editPlanId) return false;
      return plan.startDate === startDate && plan.fermenterType === fermenterType;
    });

    if (hasOverlap) {
      const typeStr = fermenterType === 'small' ? '소형' : '대형';
      return {
        valid: false,
        success: false,
        message: `❌ 일정 충돌: ${startDate} 일자에 이미 ${typeStr} 발효기가 배정되어 사용 중입니다. 날짜나 발효기를 변경하세요.`
      };
    }

    if (capacityWarning) {
      return {
        valid: true,
        success: false,
        message: capacityWarning
      };
    }

    return {
      valid: true,
      success: true,
      message: '✓ 발효기 가동 및 생산 일정이 정상 검증되었습니다.'
    };
  }, [items, fermenterType, startDate, totalVolumeL, plans, isEditMode, editPlanId]);

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validation.valid) return;

    const primaryItem = computedItems[0] || {};
    const overallExpectedOrderQty = computedItems.reduce((acc, item) => acc + item.expectedOrderQty, 0);
    const overallMarketingQty = computedItems.reduce((acc, item) => acc + item.marketingQty, 0);
    const overallBufferQty = computedItems.reduce((acc, item) => acc + item.bufferQty, 0);
    const overallTotalQty = computedItems.reduce((acc, item) => acc + item.totalQty, 0);

    const planData = {
      name: planName.trim(),
      productId: primaryItem.productId || '',
      startDate,
      bottlingDate: primaryItem.bottlingDate || dateAddDays(startDate, 2),
      shippingLimit: primaryItem.shippingLimit || '',
      expiryDate: primaryItem.expiryDate || '',
      expectedOrderQty: overallExpectedOrderQty,
      marketingQty: overallMarketingQty,
      bufferQty: overallBufferQty,
      totalQty: overallTotalQty,
      fermenterType,
      totalVolumeL,
      memo: planMemo.trim(),
      items: computedItems.map(item => ({
        productId: item.productId,
        expectedOrderQty: item.expectedOrderQty,
        marketingQty: item.marketingQty,
        bufferQty: item.bufferQty,
        totalQty: item.totalQty,
        bottlingDate: item.bottlingDate,
        shippingLimit: item.shippingLimit,
        expiryDate: item.expiryDate
      }))
    };

    if (isEditMode) {
      updatePlan({
        ...planData,
        id: editPlanId
      });
    } else {
      addPlan(planData);
    }

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" id="plan-registration-modal">
      <div className="modal-content">
        <div className="modal-header">
          <h3 id="plan-modal-title">{isEditMode ? '생산 계획 수정' : '생산 계획 수립'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        
        <form id="plan-registration-form" onSubmit={handleSubmit}>
          {validation.message && (
            <div style={{ padding: '20px 24px 0 24px', flexShrink: 0 }}>
              <div className={`validation-banner show ${validation.success ? 'success' : ''}`} style={{ marginBottom: 0 }}>
                {validation.message}
              </div>
            </div>
          )}
          <div className="modal-body">

            {/* Row 1: Plan Name & Start Date */}
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="plan-name">생산 계획명</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="plan-name" 
                  placeholder="예: 7월 2주차 플레인 그릭 생산" 
                  value={planName}
                  onChange={(e) => setPlanName(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-start-date">생산 시작 일자 (발효 시작일)</label>
                <input 
                  type="date" 
                  className="form-control" 
                  id="plan-start-date" 
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  required 
                />
              </div>
            </div>

            {/* Multi-item Production Items Section */}
            {items.map((item, idx) => {
              const compItem = computedItems[idx] || {};
              const prod = compItem.product;
              return (
                <div 
                  key={idx} 
                  style={{ 
                    background: idx === 0 ? 'rgba(2, 132, 199, 0.03)' : 'rgba(168, 85, 247, 0.03)', 
                    border: `1px solid ${idx === 0 ? 'rgba(2, 132, 199, 0.15)' : 'rgba(168, 85, 247, 0.15)'}`, 
                    borderRadius: '10px', 
                    padding: '16px', 
                    marginBottom: '16px' 
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <h4 style={{ margin: 0, fontSize: '0.92rem', fontWeight: 700, color: idx === 0 ? 'var(--color-primary)' : 'var(--color-accent, #a855f7)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ background: idx === 0 ? 'var(--color-primary)' : '#a855f7', color: '#fff', fontSize: '0.72rem', padding: '2px 7px', borderRadius: '12px' }}>
                        품목 {idx + 1}
                      </span>
                      {idx === 0 ? '생산 품목 1 (기본)' : '생산 품목 2 (동시 생산)'}
                    </h4>

                    {idx === 0 && prod && (() => {
                      const colorMap = {
                        purple: { text: '🟣 보라색 테마', bg: '#f3e8ff', color: '#7e22ce' },
                        green: { text: '🟢 초록색 테마', bg: '#dcfce7', color: '#15803d' },
                        orange: { text: '🟠 주황색 테마', bg: '#ffedd5', color: '#c2410c' },
                        pink: { text: '🩷 핑크색 테마', bg: '#fce7f3', color: '#be185d' },
                        blue: { text: '🔵 파란색 테마', bg: '#e0f2fe', color: '#0369a1' }
                      };
                      const badge = colorMap[prod.color] || colorMap.blue;
                      return (
                        <span 
                          style={{ 
                            fontSize: '0.75rem', 
                            fontWeight: 600, 
                            padding: '3px 9px', 
                            borderRadius: '6px', 
                            background: badge.bg, 
                            color: badge.color,
                            border: `1px solid ${badge.color}33`,
                            marginLeft: 'auto'
                          }}
                          title="캘린더 일지 블록 대표 표시 색상"
                        >
                          🎨 캘린더 표시 색상: {badge.text}
                        </span>
                      );
                    })()}

                    {idx > 0 && (
                      <button 
                        type="button" 
                        className="btn-delete-tiny" 
                        onClick={() => handleRemoveItem(idx)}
                        style={{ color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '2px 8px', borderRadius: '4px', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                        품목 2 삭제
                      </button>
                    )}
                  </div>

                  <div className="form-group" style={{ marginBottom: '12px' }}>
                    <label htmlFor={`plan-product-${idx}`}>생산 품목 선택</label>
                    <select 
                      className="form-control" 
                      id={`plan-product-${idx}`} 
                      value={item.productId}
                      onChange={(e) => handleItemChange(idx, 'productId', e.target.value)}
                      required
                    >
                      <option value="" disabled>품목을 선택하세요</option>
                      {products.map(p => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.weight}g, 수율 {p.yield || 28}%{p.isFlavor ? ', 플레이버' : ', 플레인'})
                        </option>
                      ))}
                    </select>
                    {idx === 0 && (
                      <div style={{ fontSize: '0.73rem', color: 'var(--text-muted)', marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <span>💡 캘린더 일지 블록에는 품목 1({prod ? prod.name : '선택 품목'})의 색상이 대표로 반영됩니다.</span>
                      </div>
                    )}
                  </div>

                  {/* Quantities Row */}
                  <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr 1fr', marginBottom: '12px' }}>
                    <div className="form-group">
                      <label htmlFor={`plan-expected-${idx}`}>주문 예상 (개)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id={`plan-expected-${idx}`} 
                        min="0" 
                        value={item.expectedOrderQty}
                        onChange={(e) => handleItemChange(idx, 'expectedOrderQty', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`plan-marketing-${idx}`}>마케팅 (개)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id={`plan-marketing-${idx}`} 
                        min="0" 
                        value={item.marketingQty}
                        onChange={(e) => handleItemChange(idx, 'marketingQty', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`plan-buffer-${idx}`}>여유분 (개)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id={`plan-buffer-${idx}`} 
                        min="0" 
                        value={item.bufferQty}
                        onChange={(e) => handleItemChange(idx, 'bufferQty', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label>소계 수량 (개)</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={`${compItem.totalQty || 0} 개`}
                        readOnly 
                        style={{ fontWeight: 600 }}
                      />
                    </div>
                  </div>

                  {/* Dates Row for this specific item */}
                  <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
                    <div className="form-group">
                      <label htmlFor={`plan-bot-${idx}`}>품목 {idx + 1} 병입 일자</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id={`plan-bot-${idx}`}
                        value={item.bottlingDate || ''}
                        onChange={(e) => handleItemChange(idx, 'bottlingDate', e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`plan-ship-${idx}`}>최종 출고기한 {prod ? `(+${prod.shippingLimitDays ?? 7}일)` : ''}</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id={`plan-ship-${idx}`}
                        value={item.shippingLimit || ''}
                        onChange={(e) => handleItemChange(idx, 'shippingLimit', e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor={`plan-exp-${idx}`}>소비기한 {prod ? `(+${prod.expiryDays ?? 22}일)` : ''}</label>
                      <input 
                        type="date" 
                        className="form-control" 
                        id={`plan-exp-${idx}`}
                        value={item.expiryDate || ''}
                        onChange={(e) => handleItemChange(idx, 'expiryDate', e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </div>
              );
            })}

            {items.length < 2 && (
              <button 
                type="button" 
                className="btn-secondary"
                onClick={handleAddItem}
                style={{ width: '100%', padding: '8px', marginBottom: '16px', borderStyle: 'dashed', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '6px', fontSize: '0.85rem' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"></line>
                  <line x1="5" y1="12" x2="19" y2="12"></line>
                </svg>
                + 생산 품목 2 추가 (동시 생산)
              </button>
            )}

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

            {/* Row 5: Fermenter Validation & Selection */}
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="plan-total-volume">원재료 총량 (L)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="plan-total-volume" 
                  value={`${totalVolumeL.toFixed(2)} L`}
                  readOnly 
                  style={{ color: 'var(--color-primary)', fontWeight: 600 }} 
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-fermenter">발효기 선택</label>
                <select 
                  className="form-control" 
                  id="plan-fermenter" 
                  value={fermenterType}
                  onChange={(e) => setFermenterType(e.target.value)}
                  required
                >
                  <option value="" disabled>대형/소형 선택</option>
                  <option value="small">소형 발효기 (120L ~ 280L)</option>
                  <option value="large">대형 발효기 (300L ~ 580L)</option>
                </select>
              </div>
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

            {/* Row 6: Memo (Optional) */}
            <div className="form-group">
              <label htmlFor="plan-memo">메모 (선택사항)</label>
              <textarea 
                className="form-control" 
                id="plan-memo" 
                rows="3"
                placeholder="생산 관련 특이사항이나 메모를 입력하세요..." 
                value={planMemo}
                onChange={(e) => setPlanMemo(e.target.value)}
                style={{ resize: 'vertical', minHeight: '80px', padding: '10px' }}
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary" id="submit-plan-btn" disabled={!validation.valid}>
              {isEditMode ? '수정 완료' : '생산 계획 등록'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PlanRegistrationModal;

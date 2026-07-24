import React, { useState, useEffect, useMemo } from 'react';
import { useWysh } from '../../WyshContext';

const PlanRegistrationModal = ({ 
  isOpen, 
  onClose, 
  editPlanId, 
  initialStartDate,
  initialPlanType = 'yogurt',
  initialSubProductId = '',
  initialTargetYogurtProductId = '',
  initialTargetYogurtQty = '',
  onRequestSubPlanModal
}) => {
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
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  };

  // Main plan category: 'yogurt' | 'sub_ingredient'
  const [planType, setPlanType] = useState('yogurt');

  // Yogurt Plan form states
  const [planName, setPlanName] = useState('');
  const [items, setItems] = useState([
    { productId: '', expectedOrderQty: 0, marketingQty: 0, bufferQty: 0, bottlingDate: '', shippingLimit: '', expiryDate: '' }
  ]);
  const [startDate, setStartDate] = useState('');
  const [fermenterType, setFermenterType] = useState('');
  const [planMemo, setPlanMemo] = useState('');

  // Sub-ingredient Plan form states
  const [subProductId, setSubProductId] = useState('');
  const [targetYogurtProductId, setTargetYogurtProductId] = useState('');
  const [targetYogurtQty, setTargetYogurtQty] = useState('');

  const yogurtProducts = useMemo(() => products.filter(p => !p.isSubIngredient && p.category !== 'sub_ingredient'), [products]);
  const subIngredients = useMemo(() => products.filter(p => p.isSubIngredient || p.category === 'sub_ingredient'), [products]);

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

  // Track whether form has initialized for the current modal session
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize form
  useEffect(() => {
    if (!isOpen) {
      setIsInitialized(false);
      return;
    }
    
    // If already initialized for this modal session, do not re-initialize on background updates
    if (isInitialized) return;

    if (isEditMode) {
      const plan = plans.find(p => p.id === editPlanId);
      if (plan) {
        const currentPlanType = plan.planType || 'yogurt';
        setPlanType(currentPlanType);
        setPlanName(plan.name);
        setStartDate(plan.startDate);
        setFermenterType(plan.fermenterType || '');
        setPlanMemo(plan.memo || '');

        if (currentPlanType === 'sub_ingredient') {
          setSubProductId(plan.subProductId || '');
          setTargetYogurtProductId(plan.targetYogurtProductId || '');
          setTargetYogurtQty(plan.targetYogurtQty || '');
        } else {
          if (plan.items && Array.isArray(plan.items) && plan.items.length > 0) {
            setItems(plan.items.map(it => {
              const prod = yogurtProducts.find(p => p.id === it.productId);
              const botDate = it.bottlingDate || plan.bottlingDate;
              const sLimit = it.shippingLimit || plan.shippingLimit || (prod ? dateAddDays(botDate, prod.shippingLimitDays ?? 7) : '');
              const eDate = it.expiryDate || plan.expiryDate || (prod ? dateAddDays(botDate, prod.expiryDays ?? 22) : '');
              return {
                productId: it.productId || '',
                expectedOrderQty: it.expectedOrderQty ?? '',
                marketingQty: it.marketingQty ?? '',
                bufferQty: it.bufferQty ?? '',
                bottlingDate: botDate,
                shippingLimit: sLimit,
                expiryDate: eDate
              };
            }));
          } else {
            const prod = yogurtProducts.find(p => p.id === plan.productId);
            setItems([{
              productId: plan.productId || '',
              expectedOrderQty: plan.expectedOrderQty ?? '',
              marketingQty: plan.marketingQty ?? '',
              bufferQty: plan.bufferQty ?? '',
              bottlingDate: plan.bottlingDate,
              shippingLimit: plan.shippingLimit || (prod ? dateAddDays(plan.bottlingDate, prod.shippingLimitDays ?? 7) : ''),
              expiryDate: plan.expiryDate || (prod ? dateAddDays(plan.bottlingDate, prod.expiryDays ?? 22) : '')
            }]);
          }
        }
      }
    } else {
      // New Plan
      const start = initialStartDate || getTodayStr();
      const defaultBot = dateAddDays(start, 2);
      setPlanType(initialPlanType || 'yogurt');
      setPlanName('');
      setStartDate(start);
      setFermenterType('');
      setPlanMemo('');

      setSubProductId(initialSubProductId || (subIngredients.length > 0 ? subIngredients[0].id : ''));
      setTargetYogurtProductId(initialTargetYogurtProductId || (yogurtProducts.length > 0 ? yogurtProducts[0].id : ''));
      setTargetYogurtQty(initialTargetYogurtQty || '');

      const defaultProd = yogurtProducts.length > 0 ? yogurtProducts[0] : null;
      const initialDerived = calculateItemDerivedDates(defaultBot, defaultProd);
      setItems([{
        productId: defaultProd ? defaultProd.id : '',
        expectedOrderQty: '',
        marketingQty: '',
        bufferQty: '',
        bottlingDate: defaultBot,
        shippingLimit: initialDerived.shippingLimit,
        expiryDate: initialDerived.expiryDate
      }]);
    }
    setIsInitialized(true);
  }, [isOpen, editPlanId, isInitialized, initialStartDate, initialPlanType, initialSubProductId, initialTargetYogurtProductId, initialTargetYogurtQty, plans, yogurtProducts, subIngredients]);

  // Date trigger: Start date change
  const handleStartDateChange = (val) => {
    setStartDate(val);
    if (planType === 'yogurt') {
      const defaultBot = dateAddDays(val, 2);
      setItems(prevItems => prevItems.map(it => {
        const prod = yogurtProducts.find(p => p.id === it.productId);
        const botDate = defaultBot;
        const derived = calculateItemDerivedDates(botDate, prod);
        return {
          ...it,
          bottlingDate: botDate,
          shippingLimit: derived.shippingLimit,
          expiryDate: derived.expiryDate
        };
      }));
    }
  };

  // Item change handlers for Yogurt plan
  const handleItemChange = (index, field, value) => {
    const next = items.map((item, idx) => {
      if (idx === index) {
        const prod = yogurtProducts.find(p => p.id === (field === 'productId' ? value : item.productId));
        const itemBotDate = field === 'bottlingDate' ? value : (item.bottlingDate || dateAddDays(startDate || getTodayStr(), 2));

        if (field === 'productId') {
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
            [field]: value === '' ? '' : (parseInt(value, 10) || 0)
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
      expectedOrderQty: '',
      marketingQty: '',
      bufferQty: '',
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
      const expQty = parseInt(item.expectedOrderQty, 10) || 0;
      const mktQty = parseInt(item.marketingQty, 10) || 0;
      const bufQty = parseInt(item.bufferQty, 10) || 0;
      const totalQty = expQty + mktQty + bufQty;
      const prod = yogurtProducts.find(p => p.id === item.productId);
      
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
        expectedOrderQty: expQty,
        marketingQty: mktQty,
        bufferQty: bufQty,
        totalQty,
        product: prod,
        baseYogurtG
      };
    });
  }, [items, yogurtProducts]);

  const totalVolumeL = useMemo(() => {
    const totalBaseYogurtG = computedItems.reduce((sum, item) => sum + item.baseYogurtG, 0);
    if (totalBaseYogurtG === 0) return 0;
    const totalRawMilkG = totalBaseYogurtG / 0.28;
    return totalRawMilkG / 1000;
  }, [computedItems]);

  // Fermenter validation for Yogurt Plan
  const validation = useMemo(() => {
    if (planType === 'sub_ingredient') {
      const hasValidSub = !!subProductId && !!targetYogurtProductId && parseInt(targetYogurtQty) > 0 && !!startDate;
      if (!hasValidSub) {
        return { valid: false, success: false, message: '⚠️ 부재료, 연동 요거트 제품, 수량 및 생산일자를 입력하세요.' };
      }
      return { valid: true, success: true, message: '✓ 부재료 생산계획 정보가 정상 입력되었습니다.' };
    }

    const hasValidProducts = items.every(it => !!it.productId);
    if (!hasValidProducts || !fermenterType || !startDate) {
      return { valid: false, success: false, message: '' };
    }

    let capacityWarning = null;

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

    const hasOverlap = plans.some(plan => {
      if (isEditMode && plan.id === editPlanId) return false;
      return (plan.planType || 'yogurt') === 'yogurt' && plan.startDate === startDate && plan.fermenterType === fermenterType;
    });

    if (hasOverlap) {
      const typeStr = fermenterType === 'small' ? '소형' : '대형';
      return {
        valid: false,
        success: false,
        message: `❌ 일정 충돌: ${startDate} 일자에 이미 ${typeStr} 발효기가 배정되어 사용 중입니다.`
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
  }, [planType, subProductId, targetYogurtProductId, targetYogurtQty, items, fermenterType, startDate, totalVolumeL, plans, isEditMode, editPlanId]);

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validation.valid) return;

    if (planType === 'sub_ingredient') {
      const subProd = subIngredients.find(p => p.id === subProductId);
      const targetYogurt = yogurtProducts.find(p => p.id === targetYogurtProductId);
      const nameStr = planName.trim() || `[부재료] ${subProd ? subProd.name : '부재료'} (${targetYogurt ? targetYogurt.name : ''} ${targetYogurtQty}개분)`;

      const subPlanData = {
        name: nameStr,
        planType: 'sub_ingredient',
        subProductId,
        targetYogurtProductId,
        targetYogurtQty: parseInt(targetYogurtQty) || 0,
        startDate,
        memo: planMemo.trim(),
        color: subProd?.color || 'orange'
      };

      if (isEditMode) {
        updatePlan({
          ...subPlanData,
          id: editPlanId
        });
      } else {
        addPlan(subPlanData);
      }

      onClose();
      return;
    }

    // Yogurt Plan Submit
    const primaryItem = computedItems[0] || {};
    const overallExpectedOrderQty = computedItems.reduce((acc, item) => acc + item.expectedOrderQty, 0);
    const overallMarketingQty = computedItems.reduce((acc, item) => acc + item.marketingQty, 0);
    const overallBufferQty = computedItems.reduce((acc, item) => acc + item.bufferQty, 0);
    const overallTotalQty = computedItems.reduce((acc, item) => acc + item.totalQty, 0);

    const planData = {
      name: planName.trim(),
      planType: 'yogurt',
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

    let createdOrUpdatedPlan;
    if (isEditMode) {
      createdOrUpdatedPlan = { ...planData, id: editPlanId };
      updatePlan(createdOrUpdatedPlan);
    } else {
      createdOrUpdatedPlan = addPlan(planData);
    }

    onClose();

    // Check if any yogurt item has linked sub-ingredients
    const foundSubIngItem = computedItems.find(it => {
      const prod = it.product;
      if (!prod) return false;
      return prod.ingredients?.some(ing => ing.subProductId || subIngredients.some(sp => sp.name === ing.name));
    });

    if (foundSubIngItem) {
      const prod = foundSubIngItem.product;
      const linkedIng = prod.ingredients?.find(ing => ing.subProductId || subIngredients.some(sp => sp.name === ing.name));
      const subProd = linkedIng?.subProductId 
        ? subIngredients.find(sp => sp.id === linkedIng.subProductId)
        : subIngredients.find(sp => sp.name === linkedIng?.name);

      if (subProd) {
        setTimeout(() => {
          const userConfirm = window.confirm(
            `등록한 요거트 생산계획 '${prod.name}'에는 부재료 '${subProd.name}'가 포함되어 있습니다.\n\n이 제품에 필요한 부재료의 생산계획을 지금 연동 등록하시겠습니까?`
          );
          if (userConfirm && onRequestSubPlanModal) {
            onRequestSubPlanModal({
              subProductId: subProd.id,
              targetYogurtProductId: prod.id,
              targetYogurtQty: foundSubIngItem.totalQty,
              startDate: startDate
            });
          }
        }, 150);
      }
    }
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
          {/* Plan Category Switcher */}
          {!isEditMode && (
            <div style={{ padding: '16px 24px 0 24px' }}>
              <div style={{ display: 'flex', gap: '8px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px' }}>
                <button
                  type="button"
                  onClick={() => setPlanType('yogurt')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: planType === 'yogurt' ? 'var(--bg-secondary)' : 'transparent',
                    fontWeight: planType === 'yogurt' ? 700 : 500,
                    color: planType === 'yogurt' ? 'var(--color-primary)' : 'var(--text-secondary)',
                    boxShadow: planType === 'yogurt' ? 'var(--glass-shadow)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  🥛 요거트 생산계획
                </button>
                <button
                  type="button"
                  onClick={() => setPlanType('sub_ingredient')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    fontSize: '0.85rem',
                    borderRadius: '6px',
                    border: 'none',
                    background: planType === 'sub_ingredient' ? 'var(--bg-secondary)' : 'transparent',
                    fontWeight: planType === 'sub_ingredient' ? 700 : 500,
                    color: planType === 'sub_ingredient' ? '#c2410c' : 'var(--text-secondary)',
                    boxShadow: planType === 'sub_ingredient' ? 'var(--glass-shadow)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  🍞 부재료 생산계획
                </button>
              </div>
            </div>
          )}

          {validation.message && (
            <div style={{ padding: '16px 24px 0 24px', flexShrink: 0 }}>
              <div className={`validation-banner show ${validation.success ? 'success' : ''}`} style={{ marginBottom: 0 }}>
                {validation.message}
              </div>
            </div>
          )}

          <div className="modal-body">
            {planType === 'sub_ingredient' ? (
              /* Sub-ingredient Plan Form */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label htmlFor="sub-product-select" style={{ fontWeight: 600 }}>대상 부재료 선택</label>
                    <select
                      id="sub-product-select"
                      className="form-control"
                      value={subProductId}
                      onChange={(e) => setSubProductId(e.target.value)}
                      required
                    >
                      <option value="" disabled>부재료를 선택하세요</option>
                      {subIngredients.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label htmlFor="target-yogurt-select" style={{ fontWeight: 600 }}>사용 요거트 제품 선택</label>
                    <select
                      id="target-yogurt-select"
                      className="form-control"
                      value={targetYogurtProductId}
                      onChange={(e) => setTargetYogurtProductId(e.target.value)}
                      required
                    >
                      <option value="" disabled>요거트 제품을 선택하세요</option>
                      {yogurtProducts.map(y => (
                        <option key={y.id} value={y.id}>{y.name} ({y.weight}g)</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                  <div className="form-group">
                    <label htmlFor="target-yogurt-qty" style={{ fontWeight: 600 }}>생산 소요 요거트 수량 (개분)</label>
                    <input
                      type="number"
                      className="form-control"
                      id="target-yogurt-qty"
                      min="1"
                      placeholder="예: 2310"
                      value={targetYogurtQty}
                      onChange={(e) => setTargetYogurtQty(e.target.value)}
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="sub-plan-start-date" style={{ fontWeight: 600 }}>부재료 생산 일자</label>
                    <input
                      type="date"
                      className="form-control"
                      id="sub-plan-start-date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label htmlFor="sub-plan-name">부재료 생산 계획명 (자동 작성 가능)</label>
                  <input
                    type="text"
                    className="form-control"
                    id="sub-plan-name"
                    placeholder="비워둘 경우 '[부재료] 부재료명 (제품명 N개분)'으로 자동 설정됩니다"
                    value={planName}
                    onChange={(e) => setPlanName(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="sub-plan-memo">메모 (선택사항)</label>
                  <textarea
                    className="form-control"
                    id="sub-plan-memo"
                    rows="3"
                    placeholder="부재료 소분/전처리 작업 관련 특이사항이나 메모를 입력하세요..."
                    value={planMemo}
                    onChange={(e) => setPlanMemo(e.target.value)}
                    style={{ resize: 'vertical', minHeight: '70px' }}
                  />
                </div>
              </div>
            ) : (
              /* Standard Yogurt Plan Form */
              <>
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
                          {yogurtProducts.map(p => (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.weight}g, 수율 {p.yield || 28}%{p.isFlavor ? ', 플레이버' : ', 플레인'})
                            </option>
                          ))}
                        </select>
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

                      {/* Dates Row */}
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

                {/* Fermenter Selection */}
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

                {/* Memo */}
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
              </>
            )}
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

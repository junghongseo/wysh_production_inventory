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
  const [productId, setProductId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [bottlingDate, setBottlingDate] = useState('');
  const [shippingLimit, setShippingLimit] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [avgOrder, setAvgOrder] = useState(0);
  const [marketing, setMarketing] = useState(0);
  const [buffer, setBuffer] = useState(0);
  const [fermenterType, setFermenterType] = useState('');

  // Mode check
  const isEditMode = !!editPlanId;

  // Initialize form
  useEffect(() => {
    if (isOpen) {
      if (isEditMode) {
        const plan = plans.find(p => p.id === editPlanId);
        if (plan) {
          setPlanName(plan.name);
          setProductId(plan.productId);
          setStartDate(plan.startDate);
          setBottlingDate(plan.bottlingDate);
          setShippingLimit(plan.shippingLimit);
          setExpiryDate(plan.expiryDate);
          setAvgOrder(plan.avgOrderQty);
          setMarketing(plan.marketingQty);
          setBuffer(plan.bufferQty);
          setFermenterType(plan.fermenterType);
        }
      } else {
        // Reset form
        setPlanName('');
        setProductId('');
        const today = getTodayStr();
        setStartDate(today);
        setFermenterType('');
        setAvgOrder(0);
        setMarketing(0);
        setBuffer(0);

        // Date calculations default
        const botDate = dateAddDays(today, 2);
        setBottlingDate(botDate);
        setShippingLimit(dateAddDays(botDate, 7));
        setExpiryDate(dateAddDays(botDate, 22));
      }
    }
  }, [isOpen, editPlanId, plans]);

  // Memoize selected product
  const selectedProduct = useMemo(() => {
    return products.find(p => p.id === productId) || null;
  }, [productId, products]);

  // Helper to calculate shipping limit and expiry dates dynamically
  const calculateDerivedDates = (botDate, prod) => {
    if (!botDate) return;
    const sDays = prod ? (prod.shippingLimitDays ?? 7) : 7;
    const eDays = prod ? (prod.expiryDays ?? 22) : 22;
    setShippingLimit(dateAddDays(botDate, sDays));
    setExpiryDate(dateAddDays(botDate, eDays));
  };

  // Date trigger: Start date change
  const handleStartDateChange = (val) => {
    setStartDate(val);
    const botDate = dateAddDays(val, 2);
    setBottlingDate(botDate);
    calculateDerivedDates(botDate, selectedProduct);
  };

  // Date trigger: Bottling date change
  const handleBottlingDateChange = (val) => {
    setBottlingDate(val);
    calculateDerivedDates(val, selectedProduct);
  };

  // Product selection handler
  const handleProductChange = (id) => {
    setProductId(id);
    const prod = products.find(p => p.id === id);
    calculateDerivedDates(bottlingDate, prod);
  };

  // Calculations
  const totalQty = useMemo(() => {
    return (avgOrder * 7) + marketing + buffer;
  }, [avgOrder, marketing, buffer]);

  const totalVolumeL = useMemo(() => {
    if (!productId) return 0;
    const prod = products.find(p => p.id === productId);
    if (!prod) return 0;
    return (totalQty * prod.weight) / ((prod.yield || 28) * 10);
  }, [totalQty, productId, products]);

  // Fermenter verification
  const validation = useMemo(() => {
    if (!productId || !fermenterType || !startDate) {
      return { valid: false, success: false, message: '' };
    }

    // Capacity validation
    if (totalVolumeL > 0) {
      if (totalVolumeL >= 120 && totalVolumeL <= 280) {
        if (fermenterType === 'large') {
          return {
            valid: false,
            success: false,
            message: `⚠️ 계산된 원재료 총량(${totalVolumeL.toFixed(2)}L)은 소형 규격(120L~280L)에 해당합니다. 소형 발효기를 선택하세요.`
          };
        }
      } else if (totalVolumeL >= 300 && totalVolumeL <= 580) {
        if (fermenterType === 'small') {
          return {
            valid: false,
            success: false,
            message: `⚠️ 계산된 원재료 총량(${totalVolumeL.toFixed(2)}L)은 대형 규격(300L~580L)에 해당합니다. 대형 발효기를 선택하세요.`
          };
        }
      } else {
        return {
          valid: false,
          success: false,
          message: `❌ 원재료 총량이 소형(120L~280L) 또는 대형(300L~580L) 발효기 규격을 벗어났습니다. 수량을 조정하세요.`
        };
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

    return {
      valid: true,
      success: true,
      message: '✓ 발효기 가동 및 생산 일정이 정상 검증되었습니다.'
    };
  }, [productId, fermenterType, startDate, totalVolumeL, plans, isEditMode, editPlanId]);

  // Form submit handler
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validation.valid) return;

    const planData = {
      name: planName.trim(),
      productId,
      startDate,
      bottlingDate,
      shippingLimit,
      expiryDate,
      avgOrderQty: avgOrder,
      marketingQty: marketing,
      bufferQty: buffer,
      totalQty,
      fermenterType,
      totalVolumeL
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
          <div className="modal-body">
            {/* Validation Banner */}
            {validation.message && (
              <div className={`validation-banner show ${validation.success ? 'success' : ''}`}>
                {validation.message}
              </div>
            )}

            {/* Row 1: Plan Name */}
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

            {/* Row 2: Product & Start Date */}
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="plan-product">생산 품목 선택</label>
                <select 
                  className="form-control" 
                  id="plan-product" 
                  value={productId}
                  onChange={(e) => handleProductChange(e.target.value)}
                  required
                >
                  <option value="" disabled>품목을 선택하세요</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.weight}g, 수율 {p.yield || 28}%)
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="plan-start-date">생산 시작 일자</label>
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

            {/* Row 3: Date Auto-calculations */}
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="plan-bottling-date">병입 일자</label>
                <input 
                  type="date" 
                  className="form-control" 
                  id="plan-bottling-date" 
                  value={bottlingDate}
                  onChange={(e) => handleBottlingDateChange(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-shipping-limit">최종 출고기한 {selectedProduct ? `(병입일 + ${selectedProduct.shippingLimitDays}일)` : ''}</label>
                <input 
                  type="date" 
                  className="form-control" 
                  id="plan-shipping-limit" 
                  value={shippingLimit}
                  onChange={(e) => setShippingLimit(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="plan-expiry-date">소비기한 {selectedProduct ? `(병입일 + ${selectedProduct.expiryDays}일)` : ''}</label>
              <input 
                type="date" 
                className="form-control" 
                id="plan-expiry-date" 
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                required 
              />
            </div>

            <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '16px 0' }} />

            {/* Row 4: Quantities Input */}
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="plan-avg-order">일 평균 주문수량 (개)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="plan-avg-order" 
                  min="0" 
                  value={avgOrder}
                  onChange={(e) => setAvgOrder(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-marketing">마케팅 활용 수량 (개)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="plan-marketing" 
                  min="0" 
                  value={marketing}
                  onChange={(e) => setMarketing(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  required 
                />
              </div>
            </div>
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="plan-buffer">여유분 수량 (개)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="plan-buffer" 
                  min="0" 
                  value={buffer}
                  onChange={(e) => setBuffer(parseInt(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="plan-total-qty">합계수량 (자동 계산)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="plan-total-qty" 
                  value={totalQty}
                  readOnly 
                />
              </div>
            </div>

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

import React, { useState, useEffect } from 'react';
import { useWysh } from '../../WyshContext';

const ProductRegistrationModal = ({ isOpen, onClose, onSuccess }) => {
  const { products, addProduct } = useWysh();

  const [name, setName] = useState('');
  const [isFlavor, setIsFlavor] = useState(false);
  const [baseProductId, setBaseProductId] = useState('');
  const [weight, setWeight] = useState('');
  const [yieldRate, setYieldRate] = useState(28);
  const [color, setColor] = useState('blue');
  const [shippingLimitDays, setShippingLimitDays] = useState(7);
  const [expiryDays, setExpiryDays] = useState(22);
  const [defaultSterilizationTemp, setDefaultSterilizationTemp] = useState(85);
  const [defaultSterilizationTime, setDefaultSterilizationTime] = useState(30);
  const [defaultCoolingTemp, setDefaultCoolingTemp] = useState(40);
  const [defaultInoculationTemp, setDefaultInoculationTemp] = useState(42);
  const [defaultHeatingTemp, setDefaultHeatingTemp] = useState(43);
  const [defaultHeaterTemp, setDefaultHeaterTemp] = useState(44);

  // Available plain base products
  const plainProducts = products.filter(p => !p.isFlavor);

  // Reset form fields when opened
  useEffect(() => {
    if (isOpen) {
      setName('');
      setIsFlavor(false);
      const defaultBase = plainProducts.length > 0 ? plainProducts[0].id : '';
      setBaseProductId(defaultBase);
      setWeight('');
      setYieldRate(28);
      setColor('blue');
      setShippingLimitDays(7);
      setExpiryDays(22);
      setDefaultSterilizationTemp(85);
      setDefaultSterilizationTime(30);
      setDefaultCoolingTemp(40);
      setDefaultInoculationTemp(42);
      setDefaultHeatingTemp(43);
      setDefaultHeaterTemp(44);
    }
  }, [isOpen]);

  // Handle category change
  const handleCategoryChange = (flavorStatus) => {
    setIsFlavor(flavorStatus);
    if (flavorStatus) {
      setYieldRate(100);
      if (!baseProductId && plainProducts.length > 0) {
        setBaseProductId(plainProducts[0].id);
      }
    } else {
      setYieldRate(28);
      setBaseProductId('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    let initialIngredients = [
      { name: '원유', ratio: 95 },
      { name: '유산균', ratio: 5 }
    ];

    if (isFlavor && baseProductId) {
      const baseProd = products.find(p => p.id === baseProductId);
      const baseName = baseProd ? baseProd.name : '위시그릭 019';
      initialIngredients = [
        { name: baseName, ratio: 70 },
        { name: '추가 재료', ratio: 30 }
      ];
    }

    const newProduct = {
      name: name.trim(),
      category: isFlavor ? 'flavor' : 'plain',
      isFlavor,
      baseProductId: isFlavor ? baseProductId : null,
      weight: parseInt(weight) || 0,
      yield: parseFloat(yieldRate) || (isFlavor ? 100 : 28),
      color,
      shippingLimitDays: parseInt(shippingLimitDays) || 7,
      expiryDays: parseInt(expiryDays) || 22,
      ingredients: initialIngredients,
      defaultSterilizationTemp: parseFloat(defaultSterilizationTemp) || 85,
      defaultSterilizationTime: parseInt(defaultSterilizationTime) || 30,
      defaultCoolingTemp: parseFloat(defaultCoolingTemp) || 40,
      defaultInoculationTemp: parseFloat(defaultInoculationTemp) || 42,
      defaultHeatingTemp: parseFloat(defaultHeatingTemp) || 43,
      defaultHeaterTemp: parseFloat(defaultHeaterTemp) || 44
    };

    const added = addProduct(newProduct);
    if (onSuccess) {
      onSuccess(added);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay open" id="product-registration-modal">
      <div className="modal-content" style={{ width: '540px' }}>
        <div className="modal-header">
          <h3>새 요거트 제품 추가</h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        <form id="product-registration-form" onSubmit={handleSubmit}>
          <div className="modal-body">
            <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: '12px' }}>
              <div className="form-group">
                <label>제품 카테고리</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input 
                      type="radio" 
                      name="product-category" 
                      checked={!isFlavor} 
                      onChange={() => handleCategoryChange(false)} 
                    />
                    플레인 요거트
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer', fontWeight: 500 }}>
                    <input 
                      type="radio" 
                      name="product-category" 
                      checked={isFlavor} 
                      onChange={() => handleCategoryChange(true)} 
                    />
                    플레이버 요거트
                  </label>
                </div>
              </div>
              {isFlavor && (
                <div className="form-group">
                  <label htmlFor="base-product-select">대표 베이스 제품 선택</label>
                  <select
                    id="base-product-select"
                    className="form-control"
                    value={baseProductId}
                    onChange={(e) => setBaseProductId(e.target.value)}
                    required={isFlavor}
                    style={{ marginTop: '2px' }}
                  >
                    {plainProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="new-product-name">제품명</label>
              <input 
                type="text" 
                className="form-control" 
                id="new-product-name" 
                placeholder={isFlavor ? "예: 위시크림 피스타치오 초코칩" : "예: 위시그릭 019"} 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required 
              />
            </div>
            <div className="form-group-grid">
              <div className="form-group">
                <label htmlFor="new-product-weight">단일 중량 (g)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="new-product-weight" 
                  min="1" 
                  placeholder="예: 150" 
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-product-yield">수율 (%)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="new-product-yield" 
                  min="1" 
                  max="100" 
                  step="0.1"
                  placeholder="예: 28" 
                  value={yieldRate}
                  onChange={(e) => setYieldRate(e.target.value)}
                  required 
                />
              </div>
            </div>
            <div className="form-group-grid" style={{ marginTop: '12px' }}>
              <div className="form-group">
                <label htmlFor="new-product-shipping-days">최종 출고 기한 (일)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="new-product-shipping-days" 
                  min="1" 
                  value={shippingLimitDays}
                  onChange={(e) => setShippingLimitDays(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required 
                />
              </div>
              <div className="form-group">
                <label htmlFor="new-product-expiry-days">소비 기한 (일)</label>
                <input 
                  type="number" 
                  className="form-control" 
                  id="new-product-expiry-days" 
                  min="1" 
                  value={expiryDays}
                  onChange={(e) => setExpiryDays(e.target.value)}
                  onFocus={(e) => e.target.select()}
                  required 
                />
              </div>
            </div>
            <div className="form-group" style={{ marginTop: '12px' }}>
              <label>생산 일정 표시 색상</label>
              <div className="color-picker-grid" id="new-product-color-picker" style={{ maxWidth: '100%', gridTemplateColumns: 'repeat(12, 1fr)', gap: '8px', marginTop: '6px' }}>
                {colors.map(c => (
                  <div 
                    key={c}
                    className={`color-swatch ${color === c ? 'active' : ''}`}
                    data-color={c} 
                    style={{ backgroundColor: colorMap[c] }}
                    onClick={() => setColor(c)}
                  ></div>
                ))}
              </div>
            </div>
            <div style={{ marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: 600, marginBottom: '12px' }}>발효 공정 기본 설정값</h4>
              
              <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                <div className="form-group">
                  <label htmlFor="new-product-sterilization-temp">기본 살균 온도 (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="new-product-sterilization-temp" 
                    value={defaultSterilizationTemp}
                    onChange={(e) => setDefaultSterilizationTemp(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-product-sterilization-time">기본 살균 시간 (분)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="new-product-sterilization-time" 
                    value={defaultSterilizationTime}
                    onChange={(e) => setDefaultSterilizationTime(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '8px' }}>
                <div className="form-group">
                  <label htmlFor="new-product-cooling-temp">기본 냉각 설정 온도 (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="new-product-cooling-temp" 
                    value={defaultCoolingTemp}
                    onChange={(e) => setDefaultCoolingTemp(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-product-inoculation-temp">기본 접종 온도 (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="new-product-inoculation-temp" 
                    value={defaultInoculationTemp}
                    onChange={(e) => setDefaultInoculationTemp(e.target.value)}
                    required 
                  />
                </div>
              </div>

              <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '8px' }}>
                <div className="form-group">
                  <label htmlFor="new-product-heating-temp">기본 가열 설정 온도 (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="new-product-heating-temp" 
                    value={defaultHeatingTemp}
                    onChange={(e) => setDefaultHeatingTemp(e.target.value)}
                    required 
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="new-product-heater-temp">기본 히터 설정 온도 (°C)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    id="new-product-heater-temp" 
                    value={defaultHeaterTemp}
                    onChange={(e) => setDefaultHeaterTemp(e.target.value)}
                    required 
                  />
                </div>
              </div>
            </div>
            <div className="note-card" style={{ marginTop: '16px' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p style={{ fontSize: '0.8rem', lineHeight: '1.4' }}>제품을 등록한 뒤, '제품 및 레시피 설정' 탭에서 각 원재료(원유, 유산균 등)의 상세 배합 비율(합계 100%)을 구성할 수 있습니다.</p>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>취소</button>
            <button type="submit" className="btn-primary">제품 등록</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProductRegistrationModal;

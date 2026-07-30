import React, { useState, useEffect, useMemo } from 'react';

const MaterialCostModal = ({ isOpen, onClose, onSave, editingMaterial }) => {
  const [category, setCategory] = useState('raw'); // 'raw' (원재료) | 'packaging' (부자재)
  const [name, setName] = useState('');
  const [manufacturer, setManufacturer] = useState('');
  const [supplier, setSupplier] = useState('');
  const [packageQty, setPackageQty] = useState('');
  const [unit, setUnit] = useState('g');
  const [priceVatInclusive, setPriceVatInclusive] = useState('');
  const [taxType, setTaxType] = useState('taxable'); // 'taxable' (과세) | 'duty_free' (면세)

  useEffect(() => {
    if (editingMaterial) {
      setCategory(editingMaterial.category || 'raw');
      setName(editingMaterial.name || '');
      setManufacturer(editingMaterial.manufacturer || '');
      setSupplier(editingMaterial.supplier || '');
      setPackageQty(editingMaterial.packageQty || '');
      setUnit(editingMaterial.unit || (editingMaterial.category === 'packaging' ? '개' : 'g'));
      setPriceVatInclusive(editingMaterial.priceVatInclusive || '');
      setTaxType(editingMaterial.taxType || 'taxable');
    } else {
      setCategory('raw');
      setName('');
      setManufacturer('');
      setSupplier('');
      setPackageQty('');
      setUnit('g');
      setPriceVatInclusive('');
      setTaxType('taxable');
    }
  }, [editingMaterial, isOpen]);

  // Adjust unit options when category changes
  const handleCategoryChange = (newCat) => {
    setCategory(newCat);
    if (newCat === 'packaging' && unit !== '개') {
      setUnit('개');
    } else if (newCat === 'raw' && unit === '개') {
      setUnit('g');
    }
  };

  // Real-time calculation of VAT-exclusive price and unit cost
  const calculationPreview = useMemo(() => {
    const price = parseFloat(priceVatInclusive) || 0;
    const qty = parseFloat(packageQty) || 0;

    if (price <= 0 || qty <= 0) {
      return { priceExcludingVat: 0, unitCostExcludingVat: 0, formattedUnitText: '' };
    }

    // 1. VAT-exclusive price
    const priceExcludingVat = taxType === 'taxable' ? price / 1.1 : price;

    if (category === 'raw') {
      // Convert to grams (or ml)
      let factorInGrams = 1;
      if (unit === 'kg' || unit === 'L') {
        factorInGrams = 1000;
      }
      const totalGrams = qty * factorInGrams;
      if (totalGrams <= 0) return { priceExcludingVat, unitCostExcludingVat: 0, formattedUnitText: '10g당' };
      
      const costPer10g = (priceExcludingVat / totalGrams) * 10;
      return {
        priceExcludingVat,
        unitCostExcludingVat: costPer10g,
        formattedUnitText: '10g당 (VAT 제외)'
      };
    } else {
      // Packaging / sub-materials: cost per piece
      const costPerPiece = priceExcludingVat / qty;
      return {
        priceExcludingVat,
        unitCostExcludingVat: costPerPiece,
        formattedUnitText: '개당 (VAT 제외)'
      };
    }
  }, [priceVatInclusive, packageQty, taxType, category, unit]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) {
      alert('제품명을 입력해 주세요.');
      return;
    }
    if (!packageQty || parseFloat(packageQty) <= 0) {
      alert('올바른 단위 포장량을 입력해 주세요.');
      return;
    }
    if (!priceVatInclusive || parseFloat(priceVatInclusive) < 0) {
      alert('올바른 구매 가격을 입력해 주세요.');
      return;
    }

    onSave({
      id: editingMaterial ? editingMaterial.id : undefined,
      category,
      name: name.trim(),
      manufacturer: manufacturer.trim(),
      supplier: supplier.trim(),
      packageQty: parseFloat(packageQty),
      unit,
      priceVatInclusive: parseFloat(priceVatInclusive),
      taxType
    });
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose} style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.65)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1100,
      padding: '16px'
    }}>
      <div 
        className="modal-content glass-card" 
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '520px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '16px',
          padding: '24px',
          background: 'var(--bg-primary, #ffffff)',
          boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color, #e2e8f0)'
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)' }}>
            {editingMaterial ? '원/부자재 단가 정보 수정' : '신규 원/부자재 단가 등록'}
          </h3>
          <button 
            type="button" 
            onClick={onClose}
            style={{ background: 'none', border: 'none', fontSize: '1.5rem', cursor: 'pointer', color: 'var(--text-muted)' }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          
          {/* Category Toggle */}
          <div className="form-group">
            <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '8px' }}>
              재료 분류 구분
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
              <button
                type="button"
                className={`chip-button ${category === 'raw' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('raw')}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>🥛</span>
                <span>원재료 (10g당 계산)</span>
              </button>
              <button
                type="button"
                className={`chip-button ${category === 'packaging' ? 'active' : ''}`}
                onClick={() => handleCategoryChange('packaging')}
                style={{
                  height: '42px',
                  borderRadius: '10px',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px'
                }}
              >
                <span>📦</span>
                <span>부자재 (개당 계산)</span>
              </button>
            </div>
          </div>

          {/* Product Name */}
          <div className="form-group">
            <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
              제품명 <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input 
              type="text" 
              className="form-control" 
              placeholder={category === 'raw' ? '예: 서울우유 1L, 원유, 유산균' : '예: PET 용기 150ml, 브랜드 스티커, 택배박스'}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={{ height: '40px', fontSize: '0.9rem' }}
            />
          </div>

          {/* Manufacturer & Supplier Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                제조사
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="예: 서울우유협동조합"
                value={manufacturer}
                onChange={(e) => setManufacturer(e.target.value)}
                style={{ height: '38px', fontSize: '0.86rem' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.84rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                구매처
              </label>
              <input 
                type="text" 
                className="form-control" 
                placeholder="예: 하나로마트, 방산시장"
                value={supplier}
                onChange={(e) => setSupplier(e.target.value)}
                style={{ height: '38px', fontSize: '0.86rem' }}
              />
            </div>
          </div>

          {/* Package Qty & Unit */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                단위 포장량 <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="number" 
                step="any"
                className="form-control" 
                placeholder="예: 1000"
                value={packageQty}
                onChange={(e) => setPackageQty(e.target.value)}
                required
                min="0.001"
                style={{ height: '40px', fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                포장 단위
              </label>
              <select
                className="form-control"
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                style={{ height: '40px', fontSize: '0.88rem', fontWeight: 600 }}
              >
                {category === 'raw' ? (
                  <>
                    <option value="g">g (그램)</option>
                    <option value="kg">kg (킬로그램)</option>
                    <option value="ml">ml (밀리리터)</option>
                    <option value="L">L (리터)</option>
                  </>
                ) : (
                  <>
                    <option value="개">개</option>
                    <option value="장">장</option>
                    <option value="롤">롤</option>
                    <option value="box">box</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {/* Purchase Price & Tax Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.8fr 1.2fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                구매 가격 (VAT 포함 원화) <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="예: 11000"
                value={priceVatInclusive}
                onChange={(e) => setPriceVatInclusive(e.target.value)}
                required
                min="0"
                style={{ height: '40px', fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', fontWeight: 700 }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                과세 구분
              </label>
              <select
                className="form-control"
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                style={{ height: '40px', fontSize: '0.88rem', fontWeight: 600 }}
              >
                <option value="taxable">과세 (VAT 10%)</option>
                <option value="duty_free">면세</option>
              </select>
            </div>
          </div>

          {/* Real-time Calculation Summary Card */}
          <div style={{
            background: 'var(--bg-tertiary, #f8fafc)',
            border: '1px solid var(--border-color, #e2e8f0)',
            borderRadius: '12px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            marginTop: '4px'
          }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              🧮 자동 단가 계산 미리보기
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
              <span style={{ color: 'var(--text-muted)' }}>공급가액 (VAT 제외):</span>
              <strong style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-primary)' }}>
                {Math.round(calculationPreview.priceExcludingVat).toLocaleString()} 원
              </strong>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px dashed var(--border-color)', paddingTop: '8px' }}>
              <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                {category === 'raw' ? '10g 당 단가 (VAT 제외)' : '개 당 단가 (VAT 제외)'}
              </span>
              <span style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)' }}>
                {calculationPreview.unitCostExcludingVat.toFixed(2)} 원
              </span>
            </div>
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '12px' }}>
            <button 
              type="button" 
              className="btn-secondary"
              onClick={onClose}
              style={{ height: '40px', padding: '0 18px', borderRadius: '8px', fontWeight: 600 }}
            >
              취소
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              style={{ 
                height: '40px', 
                padding: '0 24px', 
                borderRadius: '8px', 
                fontWeight: 700,
                background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                border: 'none'
              }}
            >
              {editingMaterial ? '수정 저장' : '등록 완료'}
            </button>
          </div>

        </form>
      </div>
    </div>
  );
};

export default MaterialCostModal;

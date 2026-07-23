import React, { useState, useEffect, useMemo } from 'react';
import { useWysh } from '../WyshContext';

const RecipesView = ({ 
  selectedProduct, 
  setSelectedProduct, 
  onOpenProductModal, 
  onDeleteProduct, 
  onConfirmModal 
}) => {
  const { products, updateProduct } = useWysh();

  // Category Filter Tab state for the Left Panel
  const [filterTab, setFilterTab] = useState('all'); // 'all' | 'yogurt' | 'sub_ingredient'

  // Local form states for the Recipe Editor
  const [productName, setProductName] = useState('');
  const [productCategory, setProductCategory] = useState('plain'); // 'plain' | 'flavor' | 'sub_ingredient'
  const [productIsFlavor, setProductIsFlavor] = useState(false);
  const [productIsSubIngredient, setProductIsSubIngredient] = useState(false);
  const [productBaseProductId, setProductBaseProductId] = useState('');
  const [productWeight, setProductWeight] = useState('');
  const [productYield, setProductYield] = useState('');
  const [productColor, setProductColor] = useState('blue');
  const [productShippingLimitDays, setProductShippingLimitDays] = useState(7);
  const [productExpiryDays, setProductExpiryDays] = useState(22);
  const [ingredients, setIngredients] = useState([]);
  const [defaultSterilizationTemp, setDefaultSterilizationTemp] = useState(85);
  const [defaultSterilizationTime, setDefaultSterilizationTime] = useState(30);
  const [defaultCoolingTemp, setDefaultCoolingTemp] = useState(40);
  const [defaultInoculationTemp, setDefaultInoculationTemp] = useState(42);
  const [defaultHeatingTemp, setDefaultHeatingTemp] = useState(43);
  const [defaultHeaterTemp, setDefaultHeaterTemp] = useState(44);

  const subIngredientsList = useMemo(() => products.filter(p => p.isSubIngredient || p.category === 'sub_ingredient'), [products]);
  const plainProducts = useMemo(() => products.filter(p => !p.isFlavor && !p.isSubIngredient && p.id !== selectedProduct?.id), [products, selectedProduct]);

  const filteredProducts = useMemo(() => {
    if (filterTab === 'yogurt') return products.filter(p => !p.isSubIngredient && p.category !== 'sub_ingredient');
    if (filterTab === 'sub_ingredient') return products.filter(p => p.isSubIngredient || p.category === 'sub_ingredient');
    return products;
  }, [products, filterTab]);

  // Initialize editor form when selectedProduct changes
  useEffect(() => {
    if (selectedProduct) {
      setProductName(selectedProduct.name);
      const isSub = selectedProduct.isSubIngredient || selectedProduct.category === 'sub_ingredient';
      const isFlav = !!selectedProduct.isFlavor && !isSub;
      setProductIsSubIngredient(isSub);
      setProductIsFlavor(isFlav);
      setProductCategory(isSub ? 'sub_ingredient' : (isFlav ? 'flavor' : 'plain'));
      setProductBaseProductId(selectedProduct.baseProductId || (plainProducts.length > 0 ? plainProducts[0].id : ''));
      setProductWeight(selectedProduct.weight || 0);
      setProductYield(selectedProduct.yield !== undefined ? selectedProduct.yield : (isSub || isFlav ? 100 : 28));
      setProductColor(selectedProduct.color || (isSub ? 'orange' : 'blue'));
      setProductShippingLimitDays(selectedProduct.shippingLimitDays || 7);
      setProductExpiryDays(selectedProduct.expiryDays || 22);
      // Clone ingredients to avoid direct mutation
      setIngredients(selectedProduct.ingredients ? JSON.parse(JSON.stringify(selectedProduct.ingredients)) : []);
      setDefaultSterilizationTemp(selectedProduct.defaultSterilizationTemp !== undefined ? selectedProduct.defaultSterilizationTemp : 85);
      setDefaultSterilizationTime(selectedProduct.defaultSterilizationTime !== undefined ? selectedProduct.defaultSterilizationTime : 30);
      setDefaultCoolingTemp(selectedProduct.defaultCoolingTemp !== undefined ? selectedProduct.defaultCoolingTemp : 40);
      setDefaultInoculationTemp(selectedProduct.defaultInoculationTemp !== undefined ? selectedProduct.defaultInoculationTemp : 42);
      setDefaultHeatingTemp(selectedProduct.defaultHeatingTemp !== undefined ? selectedProduct.defaultHeatingTemp : 43);
      setDefaultHeaterTemp(selectedProduct.defaultHeaterTemp !== undefined ? selectedProduct.defaultHeaterTemp : 44);
    } else {
      setProductName('');
      setProductCategory('plain');
      setProductIsFlavor(false);
      setProductIsSubIngredient(false);
      setProductBaseProductId('');
      setProductWeight('');
      setProductYield('');
      setProductColor('blue');
      setProductShippingLimitDays(7);
      setProductExpiryDays(22);
      setIngredients([]);
      setDefaultSterilizationTemp(85);
      setDefaultSterilizationTime(30);
      setDefaultCoolingTemp(40);
      setDefaultInoculationTemp(42);
      setDefaultHeatingTemp(43);
      setDefaultHeaterTemp(44);
    }
  }, [selectedProduct?.id]);

  // Compute ingredients ratio sum
  const ratioSum = useMemo(() => {
    const sum = ingredients.reduce((acc, ing) => acc + (parseFloat(ing.ratio) || 0), 0);
    return Math.round(sum * 100) / 100;
  }, [ingredients]);

  const isRatioValid = Math.abs(ratioSum - 100) < 0.001 || ratioSum === 100;

  // Swatch colors list
  const colors = ['blue', 'purple', 'green', 'orange', 'pink', 'red', 'brown', 'black', 'gray', 'teal', 'yellow', 'indigo'];
  const colorMap = {
    blue: '#0ea5e9',
    purple: '#a855f7',
    green: '#10b981',
    orange: '#f97316',
    pink: '#ec4899',
    red: '#ef4444',
    brown: '#78350f',
    black: '#0f172a',
    gray: '#64748b',
    teal: '#14b8a6',
    yellow: '#eab308',
    indigo: '#6366f1'
  };

  // Handle synchronization of first ingredient when base product changes or category changes
  useEffect(() => {
    if (productIsFlavor && !productIsSubIngredient && productBaseProductId) {
      const baseProduct = products.find(p => p.id === productBaseProductId);
      if (baseProduct) {
        setIngredients(prev => {
          const next = [...prev];
          if (next.length === 0) {
            next.push({ name: baseProduct.name, ratio: 70 });
          } else if (next[0].name !== baseProduct.name) {
            next[0] = { ...next[0], name: baseProduct.name };
          } else {
            return prev;
          }
          return next;
        });
      }
    }
  }, [productIsFlavor, productIsSubIngredient, productBaseProductId, products]);

  // Add ingredient row
  const handleAddIngredient = () => {
    setIngredients([...ingredients, { name: '', ratio: 0 }]);
  };

  // Remove ingredient row with Confirmation
  const handleRemoveIngredient = (index) => {
    if (productIsFlavor && !productIsSubIngredient && index === 0) {
      alert('플레이버 요거트의 베이스 제품 원재료 항목은 삭제할 수 없습니다.');
      return;
    }
    onConfirmModal(
      '원재료 삭제',
      '정말로 이 원재료 항목을 레시피에서 삭제하시겠습니까?',
      () => {
        setIngredients(ingredients.filter((_, idx) => idx !== index));
      }
    );
  };

  // Ingredient change handler
  const handleIngredientChange = (index, field, value) => {
    if (productIsFlavor && !productIsSubIngredient && index === 0 && field === 'name') {
      return; // Prevent name edit for base ingredient
    }
    const nextIngredients = ingredients.map((ing, idx) => {
      if (idx === index) {
        return {
          ...ing,
          [field]: field === 'ratio' ? parseFloat(value) || 0 : value
        };
      }
      return ing;
    });
    setIngredients(nextIngredients);
  };

  // Select registered Sub-ingredient for ingredient row
  const handleSelectSubIngredient = (index, subProdId) => {
    const subProd = subIngredientsList.find(s => s.id === subProdId);
    if (!subProd) return;
    const nextIngredients = ingredients.map((ing, idx) => {
      if (idx === index) {
        return {
          ...ing,
          name: subProd.name,
          subProductId: subProd.id
        };
      }
      return ing;
    });
    setIngredients(nextIngredients);
  };

  // Reset recipe form
  const handleResetRecipe = () => {
    if (selectedProduct) {
      setProductName(selectedProduct.name);
      setProductWeight(selectedProduct.weight);
      setProductYield(selectedProduct.yield || (selectedProduct.isSubIngredient ? 100 : 28));
      setProductColor(selectedProduct.color || 'blue');
      setIngredients(selectedProduct.ingredients ? JSON.parse(JSON.stringify(selectedProduct.ingredients)) : []);
      setDefaultSterilizationTemp(selectedProduct.defaultSterilizationTemp !== undefined ? selectedProduct.defaultSterilizationTemp : 85);
      setDefaultSterilizationTime(selectedProduct.defaultSterilizationTime !== undefined ? selectedProduct.defaultSterilizationTime : 30);
      setDefaultCoolingTemp(selectedProduct.defaultCoolingTemp !== undefined ? selectedProduct.defaultCoolingTemp : 40);
      setDefaultInoculationTemp(selectedProduct.defaultInoculationTemp !== undefined ? selectedProduct.defaultInoculationTemp : 42);
      setDefaultHeatingTemp(selectedProduct.defaultHeatingTemp !== undefined ? selectedProduct.defaultHeatingTemp : 43);
      setDefaultHeaterTemp(selectedProduct.defaultHeaterTemp !== undefined ? selectedProduct.defaultHeaterTemp : 44);
    }
  };

  // Submit recipe save
  const handleRecipeSave = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;
    if (!productName.trim()) {
      alert('제품/부재료 이름을 입력하세요.');
      return;
    }
    if (!isRatioValid) {
      alert('성분 함량의 합계는 반드시 정확히 100%여야 합니다.');
      return;
    }

    const updated = {
      ...selectedProduct,
      name: productName.trim(),
      category: productIsSubIngredient ? 'sub_ingredient' : (productIsFlavor ? 'flavor' : 'plain'),
      isFlavor: productIsSubIngredient ? false : productIsFlavor,
      isSubIngredient: productIsSubIngredient,
      baseProductId: (!productIsSubIngredient && productIsFlavor) ? productBaseProductId : null,
      weight: parseInt(productWeight) || 0,
      yield: parseFloat(productYield) || (productIsSubIngredient || productIsFlavor ? 100 : 28),
      color: productColor,
      shippingLimitDays: parseInt(productShippingLimitDays) || 7,
      expiryDays: parseInt(productExpiryDays) || 22,
      ingredients: ingredients.map(ing => ({
        name: ing.name.trim(),
        ratio: ing.ratio,
        ...(ing.subProductId ? { subProductId: ing.subProductId } : {})
      })),
      defaultSterilizationTemp: parseFloat(defaultSterilizationTemp) || 85,
      defaultSterilizationTime: parseInt(defaultSterilizationTime) || 30,
      defaultCoolingTemp: parseFloat(defaultCoolingTemp) || 40,
      defaultInoculationTemp: parseFloat(defaultInoculationTemp) || 42,
      defaultHeatingTemp: parseFloat(defaultHeatingTemp) || 43,
      defaultHeaterTemp: parseFloat(defaultHeaterTemp) || 44
    };

    updateProduct(updated);
    setSelectedProduct(updated);
    alert('제품/부재료 설정 및 레시피 정보가 안전하게 저장되었습니다.');
  };

  const selectedBaseProduct = useMemo(() => {
    if (productIsSubIngredient || !productIsFlavor || !productBaseProductId) return null;
    return products.find(p => p.id === productBaseProductId);
  }, [productIsSubIngredient, productIsFlavor, productBaseProductId, products]);

  return (
    <div className="recipe-split">
      {/* Left: Product & Sub-ingredient List */}
      <div className="glass-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 600 }}>제품 및 부재료 목록</h3>
            <span style={{ fontSize: '0.7rem', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight: 600 }}>Admin</span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button className="btn-primary" onClick={onOpenProductModal} style={{ padding: '6px 12px', fontSize: '0.8rem' }}>
              + 신규 등록
            </button>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div style={{ display: 'flex', gap: '4px', background: 'var(--bg-tertiary)', padding: '4px', borderRadius: '8px', marginBottom: '12px' }}>
          <button 
            type="button" 
            onClick={() => setFilterTab('all')}
            style={{ flex: 1, padding: '6px', fontSize: '0.78rem', borderRadius: '6px', border: 'none', background: filterTab === 'all' ? 'var(--bg-secondary)' : 'transparent', fontWeight: filterTab === 'all' ? 700 : 500, color: filterTab === 'all' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            전체 ({products.length})
          </button>
          <button 
            type="button" 
            onClick={() => setFilterTab('yogurt')}
            style={{ flex: 1, padding: '6px', fontSize: '0.78rem', borderRadius: '6px', border: 'none', background: filterTab === 'yogurt' ? 'var(--bg-secondary)' : 'transparent', fontWeight: filterTab === 'yogurt' ? 700 : 500, color: filterTab === 'yogurt' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            요거트 ({products.filter(p => !p.isSubIngredient && p.category !== 'sub_ingredient').length})
          </button>
          <button 
            type="button" 
            onClick={() => setFilterTab('sub_ingredient')}
            style={{ flex: 1, padding: '6px', fontSize: '0.78rem', borderRadius: '6px', border: 'none', background: filterTab === 'sub_ingredient' ? 'var(--bg-secondary)' : 'transparent', fontWeight: filterTab === 'sub_ingredient' ? 700 : 500, color: filterTab === 'sub_ingredient' ? 'var(--color-primary)' : 'var(--text-secondary)', cursor: 'pointer' }}
          >
            부재료 ({subIngredientsList.length})
          </button>
        </div>

        <div id="product-list-container">
          {filteredProducts.length === 0 ? (
            <div className="empty-state">
              <p>등록된 항목이 없습니다.</p>
            </div>
          ) : (
            filteredProducts.map(p => {
              const isSub = p.isSubIngredient || p.category === 'sub_ingredient';
              return (
                <div 
                  key={p.id} 
                  className={`product-item ${selectedProduct?.id === p.id ? 'active' : ''}`}
                  onClick={() => setSelectedProduct(p)}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                      <span className="name">{p.name}</span>
                      {isSub ? (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(249, 115, 22, 0.12)', color: '#c2410c', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          부재료
                        </span>
                      ) : p.isFlavor ? (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(168, 85, 247, 0.12)', color: 'var(--color-accent, #a855f7)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          플레이버
                        </span>
                      ) : (
                        <span style={{ fontSize: '0.65rem', background: 'rgba(2, 132, 199, 0.12)', color: 'var(--color-primary)', padding: '1px 5px', borderRadius: '4px', fontWeight: 600 }}>
                          플레인
                        </span>
                      )}
                    </div>
                    <div className="weight">{isSub ? '소분/배합용' : `${p.weight} g`}</div>
                  </div>
                  <button 
                    className="btn-delete-tiny" 
                    title="항목 삭제"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeleteProduct(p.id);
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6"></polyline>
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      <line x1="10" y1="11" x2="10" y2="17"></line>
                      <line x1="14" y1="11" x2="14" y2="17"></line>
                    </svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right: Recipe Editor */}
      <div className="glass-card">
        <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 id="recipe-editor-title" style={{ fontSize: '1.15rem', fontWeight: 600 }}>
            {productIsSubIngredient ? '부재료 설정 및 레시피' : '제품별 설정 및 레시피'}
          </h3>
          <span 
            id="recipe-product-badge" 
            style={{ 
              background: selectedProduct ? (productIsSubIngredient ? 'rgba(249, 115, 22, 0.15)' : 'rgba(56, 189, 248, 0.15)') : 'var(--bg-tertiary)', 
              padding: '4px 10px', 
              borderRadius: '6px', 
              fontSize: '0.8rem', 
              fontWeight: 600, 
              color: selectedProduct ? (productIsSubIngredient ? '#c2410c' : 'var(--color-primary)') : 'var(--text-secondary)' 
            }}
          >
            {selectedProduct ? `${selectedProduct.name} 편집 중` : '선택 대기'}
          </span>
        </div>

        <div id="recipe-editor-content">
          {!selectedProduct ? (
            <div className="empty-state">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <p>왼쪽 목록에서 특정 요거트 제품이나 부재료를 클릭하면 레시피를 편집할 수 있습니다.</p>
            </div>
          ) : (
            <form id="recipe-editor-form" onSubmit={handleRecipeSave}>
              {/* Validation Ratio Banner */}
              <div 
                className={`validation-banner show ${isRatioValid ? 'success' : ''}`} 
                id="recipe-validation-banner" 
                style={{ marginBottom: '20px' }}
              >
                {isRatioValid 
                  ? '✓ 원재료 배합 비율 합계가 100%입니다. 저장이 가능합니다.' 
                  : `⚠️ 성분 함량의 합계는 반드시 정확히 100%여야 합니다. (현재 합계: ${ratioSum}%)`
                }
              </div>

              {/* Category & Base Product Link Section */}
              {!productIsSubIngredient && (
                <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', background: 'rgba(2, 132, 199, 0.04)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(2, 132, 199, 0.12)', marginBottom: '16px' }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label style={{ fontWeight: 600 }}>제품 카테고리 설정</label>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="edit-product-category" 
                          checked={!productIsFlavor} 
                          onChange={() => {
                            setProductIsFlavor(false);
                            setProductBaseProductId('');
                          }} 
                        />
                        플레인 요거트
                      </label>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', cursor: 'pointer' }}>
                        <input 
                          type="radio" 
                          name="edit-product-category" 
                          checked={productIsFlavor} 
                          onChange={() => {
                            setProductIsFlavor(true);
                            if (!productBaseProductId && plainProducts.length > 0) {
                              setProductBaseProductId(plainProducts[0].id);
                            }
                          }} 
                        />
                        플레이버 요거트
                      </label>
                    </div>
                  </div>
                  {productIsFlavor && (
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label htmlFor="edit-base-product-select" style={{ fontWeight: 600 }}>연동 베이스 제품 (플레인)</label>
                      <select
                        id="edit-base-product-select"
                        className="form-control"
                        value={productBaseProductId}
                        onChange={(e) => setProductBaseProductId(e.target.value)}
                        style={{ marginTop: '2px' }}
                      >
                        {plainProducts.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}
                </div>
              )}

              {productIsSubIngredient && (
                <div style={{ background: 'rgba(249, 115, 22, 0.06)', padding: '12px', borderRadius: '8px', border: '1px solid rgba(249, 115, 22, 0.2)', marginBottom: '16px', fontSize: '0.85rem', color: '#c2410c', fontWeight: 600 }}>
                  🍞 부재료 레시피 관리 모드: 부재료의 자체 원재료 비율(합계 100%)을 구성합니다. 요거트 생산 시 투입재료로 선택되어 1개/20개/총량 기준 배합표로 출력됩니다.
                </div>
              )}

              <div className="form-group-grid" style={{ gridTemplateColumns: productIsSubIngredient ? '1fr' : '2fr 1fr 1fr' }}>
                <div className="form-group">
                  <label htmlFor="edit-product-name">{productIsSubIngredient ? '부재료 이름' : '제품 이름'}</label>
                  <input 
                    type="text" 
                    className="form-control" 
                    id="edit-product-name" 
                    value={productName}
                    onChange={(e) => setProductName(e.target.value)}
                    required 
                  />
                </div>
                {!productIsSubIngredient && (
                  <>
                    <div className="form-group">
                      <label htmlFor="edit-product-weight">단일 용량 중량 (g)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-weight" 
                        min="1"
                        value={productWeight}
                        onChange={(e) => setProductWeight(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-product-yield">수율 (%)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-yield" 
                        min="1" 
                        max="100"
                        step="0.1"
                        value={productYield}
                        onChange={(e) => setProductYield(e.target.value)}
                        required 
                      />
                    </div>
                  </>
                )}
              </div>

              {!productIsSubIngredient && (
                <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '12px' }}>
                  <div className="form-group">
                    <label htmlFor="edit-product-shipping-days">최종 출고 기한 (일)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="edit-product-shipping-days" 
                      min="1"
                      value={productShippingLimitDays}
                      onChange={(e) => setProductShippingLimitDays(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label htmlFor="edit-product-expiry-days">소비 기한 (일)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      id="edit-product-expiry-days" 
                      min="1"
                      value={productExpiryDays}
                      onChange={(e) => setProductExpiryDays(e.target.value)}
                      onFocus={(e) => e.target.select()}
                      required 
                    />
                  </div>
                </div>
              )}

              <div className="form-group" style={{ marginBottom: '20px', marginTop: '12px' }}>
                <label>표시 색상</label>
                <div className="color-picker-grid" id="edit-product-color-picker">
                  {colors.map(color => (
                    <div 
                      key={color}
                      className={`color-swatch ${productColor === color ? 'active' : ''}`} 
                      data-color={color} 
                      style={{ backgroundColor: colorMap[color] }}
                      onClick={() => setProductColor(color)}
                    ></div>
                  ))}
                </div>
              </div>

              {!productIsSubIngredient && (
                <div style={{ marginTop: '20px', marginBottom: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px' }}>발효 공정 기본 설정값</h4>
                  
                  <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                    <div className="form-group">
                      <label htmlFor="edit-product-sterilization-temp">기본 살균 온도 (°C)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-sterilization-temp" 
                        value={defaultSterilizationTemp}
                        onChange={(e) => setDefaultSterilizationTemp(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-product-sterilization-time">기본 살균 시간 (분)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-sterilization-time" 
                        value={defaultSterilizationTime}
                        onChange={(e) => setDefaultSterilizationTime(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '12px' }}>
                    <div className="form-group">
                      <label htmlFor="edit-product-cooling-temp">기본 냉각 설정 온도 (°C)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-cooling-temp" 
                        value={defaultCoolingTemp}
                        onChange={(e) => setDefaultCoolingTemp(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-product-inoculation-temp">기본 접종 온도 (°C)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-inoculation-temp" 
                        value={defaultInoculationTemp}
                        onChange={(e) => setDefaultInoculationTemp(e.target.value)}
                        required 
                      />
                    </div>
                  </div>

                  <div className="form-group-grid" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '12px' }}>
                    <div className="form-group">
                      <label htmlFor="edit-product-heating-temp">기본 가열 설정 온도 (°C)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-heating-temp" 
                        value={defaultHeatingTemp}
                        onChange={(e) => setDefaultHeatingTemp(e.target.value)}
                        required 
                      />
                    </div>
                    <div className="form-group">
                      <label htmlFor="edit-product-heater-temp">기본 히터 설정 온도 (°C)</label>
                      <input 
                        type="number" 
                        className="form-control" 
                        id="edit-product-heater-temp" 
                        value={defaultHeaterTemp}
                        onChange={(e) => setDefaultHeaterTemp(e.target.value)}
                        required 
                      />
                    </div>
                  </div>
                </div>
              )}

              <h4 style={{ fontSize: '0.95rem', fontWeight: 600, marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span>{productIsSubIngredient ? '부재료 구성 원재료 비율 (%)' : '원재료 배합 비율 (%)'}</span>
                <button 
                  type="button" 
                  className="btn-secondary btn-add-ing-row" 
                  onClick={handleAddIngredient}
                  style={{ padding: '4px 10px', fontSize: '0.8rem' }}
                >
                  + 원재료 추가
                </button>
              </h4>

              <div id="recipe-ingredients-grid">
                {ingredients.map((ing, idx) => {
                  const isBaseIngredient = !productIsSubIngredient && productIsFlavor && idx === 0;
                  return (
                    <div key={idx} className="recipe-ingredient-row" id={`recipe-ing-row-${idx}`}>
                      <div style={{ position: 'relative', flex: 1, display: 'flex', gap: '6px' }}>
                        <input 
                          type="text" 
                          className="form-control ing-name-input" 
                          value={ing.name} 
                          onChange={(e) => handleIngredientChange(idx, 'name', e.target.value)}
                          placeholder={isBaseIngredient ? "연동된 베이스 제품명" : (productIsSubIngredient ? "부재료 구성 원재료명 (예: 아몬드 페이스트)" : "원재료명 (예: 원유, 과일 퓨레 등)")} 
                          required 
                          readOnly={isBaseIngredient}
                          style={{
                            backgroundColor: isBaseIngredient ? 'var(--bg-tertiary)' : 'transparent',
                            color: isBaseIngredient ? 'var(--text-primary)' : 'inherit',
                            fontWeight: isBaseIngredient ? 600 : 'normal',
                            paddingLeft: isBaseIngredient ? '32px' : '12px',
                            cursor: isBaseIngredient ? 'not-allowed' : 'text'
                          }}
                        />
                        {isBaseIngredient && (
                          <span style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--color-primary)' }} title="연동된 베이스 제품 (편집 불가)">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
                            </svg>
                          </span>
                        )}

                        {/* Quick Select for Registered Sub-ingredients when editing Yogurt Products */}
                        {!productIsSubIngredient && !isBaseIngredient && subIngredientsList.length > 0 && (
                          <select
                            className="form-control"
                            style={{ width: '130px', fontSize: '0.75rem', padding: '4px 6px' }}
                            value={ing.subProductId || ''}
                            onChange={(e) => handleSelectSubIngredient(idx, e.target.value)}
                            title="등록된 부재료에서 선택"
                          >
                            <option value="">+ 부재료 선택</option>
                            {subIngredientsList.map(subP => (
                              <option key={subP.id} value={subP.id}>{subP.name}</option>
                            ))}
                          </select>
                        )}
                      </div>

                      <div style={{ position: 'relative' }}>
                        <input 
                          type="number" 
                          className="form-control ing-ratio-input" 
                          value={ing.ratio} 
                          onChange={(e) => handleIngredientChange(idx, 'ratio', e.target.value)}
                          min="0.000001" 
                          max="100" 
                          step="any" 
                          placeholder="비율" 
                          required 
                          style={{ paddingRight: '28px' }}
                        />
                        <span style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '0.85rem', color: 'var(--text-muted)' }}>%</span>
                      </div>
                      <button 
                        type="button" 
                        className="btn-icon" 
                        onClick={() => handleRemoveIngredient(idx)}
                        disabled={isBaseIngredient}
                        style={{ 
                          borderColor: isBaseIngredient ? 'rgba(0,0,0,0.06)' : 'rgba(248,113,113,0.2)',
                          opacity: isBaseIngredient ? 0.3 : 1,
                          cursor: isBaseIngredient ? 'not-allowed' : 'pointer'
                        }}
                        title={isBaseIngredient ? "베이스 제품은 삭제할 수 없습니다" : "원재료 삭제"}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Linked Base Product Recipe Preview */}
              {selectedBaseProduct && (
                <div style={{ marginTop: '24px', background: 'rgba(14, 165, 233, 0.04)', border: '1px solid rgba(14, 165, 233, 0.2)', borderRadius: '8px', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <h5 style={{ margin: 0, fontSize: '0.9rem', color: 'var(--color-primary)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                      </svg>
                      [연동 베이스 제품] {selectedBaseProduct.name} 레시피 정보
                    </h5>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>기본 수율: {selectedBaseProduct.yield}%</span>
                  </div>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                    플레이버 제품 생산 시 베이스로 사용되는 '{selectedBaseProduct.name}' 자체를 만들기 위한 기본 원재료 비율입니다.
                  </p>
                  <div className="wysh-table-wrapper">
                    <table className="wysh-table" style={{ fontSize: '0.82rem' }}>
                      <thead>
                        <tr>
                          <th>베이스 원재료명</th>
                          <th style={{ textAlign: 'right' }}>함량 비율(%)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {selectedBaseProduct.ingredients && selectedBaseProduct.ingredients.map((bIng, bIdx) => (
                          <tr key={bIdx}>
                            <td style={{ fontWeight: 500 }}>{bIng.name}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{bIng.ratio}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              <div style={{ marginTop: '24px', borderTop: '1px solid var(--border-color)', paddingTop: '16px', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
                <button type="button" className="btn-secondary btn-reset-recipe" onClick={handleResetRecipe}>원래대로</button>
                <button type="submit" className="btn-success" id="save-recipe-btn" disabled={!isRatioValid}>저장</button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default RecipesView;

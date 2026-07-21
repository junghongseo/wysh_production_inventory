import React, { useMemo, useCallback } from 'react';
import { useWysh } from '../WyshContext';

const RecipeDrawer = ({ isOpen, onClose, planId }) => {
  const { plans, products } = useWysh();

  const details = useMemo(() => {
    if (!isOpen || !planId) return null;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;
    const product = products.find(p => p.id === plan.productId);
    if (!product) return null;

    const totalWeightG = plan.totalQty * product.weight;
    const totalInputWeightG = totalWeightG / (product.yield / 100);

    let totalRatioSum = 0;
    let totalWeightSum = 0;

    const computedIngredients = product.ingredients.map(ing => {
      const neededQtyG = totalInputWeightG * (ing.ratio / 100);
      const neededQtyKg = neededQtyG / 1000;

      totalRatioSum += ing.ratio;
      totalWeightSum += neededQtyG;

      const isLacticBacteria = ing.name.includes('유산균');
      const displayG = isLacticBacteria
        ? Number(neededQtyG.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
        : Math.round(neededQtyG).toLocaleString();

      return {
        name: ing.name,
        ratio: ing.ratio,
        displayG,
        neededQtyKg
      };
    });

    // Secondary base product computation if flavor product
    let baseProductDetails = null;
    if (product.isFlavor || product.baseProductId) {
      const baseProduct = products.find(p => p.id === product.baseProductId) || products.find(p => !p.isFlavor);
      if (baseProduct) {
        // Find base ingredient in flavor product recipe
        const baseIng = product.ingredients.find(ing => ing.name.includes(baseProduct.name) || ing.name.includes('위시그릭') || ing.name.includes('플레인')) || product.ingredients[0];
        const baseRatio = baseIng ? baseIng.ratio : 70;
        
        // Needed finished base yogurt weight for this batch
        const neededBaseFinishedG = totalInputWeightG * (baseRatio / 100);
        const neededBaseFinishedKg = neededBaseFinishedG / 1000;
        
        // Input weight required for producing this amount of base product (incorporating base product's yield)
        const baseYield = baseProduct.yield || 28;
        const totalBaseInputWeightG = neededBaseFinishedG / (baseYield / 100);
        
        let baseRatioSum = 0;
        let baseWeightSum = 0;

        const computedBaseIngredients = (baseProduct.ingredients || []).map(bIng => {
          const bNeededQtyG = totalBaseInputWeightG * (bIng.ratio / 100);
          const bNeededQtyKg = bNeededQtyG / 1000;

          baseRatioSum += bIng.ratio;
          baseWeightSum += bNeededQtyG;

          const isLacticBacteria = bIng.name.includes('유산균');
          const displayG = isLacticBacteria
            ? Number(bNeededQtyG.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
            : Math.round(bNeededQtyG).toLocaleString();

          return {
            name: bIng.name,
            ratio: bIng.ratio,
            displayG,
            neededQtyKg: bNeededQtyKg
          };
        });

        baseProductDetails = {
          product: baseProduct,
          neededBaseFinishedG,
          neededBaseFinishedKg,
          baseYield,
          totalBaseInputWeightG,
          computedBaseIngredients,
          baseRatioSum,
          baseWeightSum
        };
      }
    }

    return {
      plan,
      product,
      totalWeightG,
      totalInputWeightG,
      computedIngredients,
      totalRatioSum,
      totalWeightSum,
      baseProductDetails
    };
  }, [isOpen, planId, plans, products]);

  const handlePrint = useCallback(() => {
    document.body.classList.add('printing-recipe');
    window.print();
    const handleAfterPrint = () => {
      document.body.classList.remove('printing-recipe');
    };
    window.addEventListener('afterprint', handleAfterPrint, { once: true });
    // Safety fallback
    setTimeout(handleAfterPrint, 1500);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay open" onClick={onClose}>
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>원재료 배합표</h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        {details && (
          <div className="drawer-body">
            <div className="info-row" style={{ marginBottom: '12px' }}>
              <span className="label">차수계획명</span>
              <span className="value" style={{ fontWeight: 600 }}>{details.plan.name}</span>
            </div>
            <div className="info-row" style={{ marginBottom: '12px' }}>
              <span className="label">제품명</span>
              <span className="value" style={{ fontWeight: 600 }}>{details.product.name}</span>
            </div>
            <div className="info-row" style={{ marginBottom: '12px' }}>
              <span className="label">개별 제품 중량</span>
              <span className="value" style={{ fontWeight: 600 }}>{details.product.weight.toLocaleString()} g</span>
            </div>
            <div className="info-row" style={{ marginBottom: '12px' }}>
              <span className="label">수율</span>
              <span className="value" style={{ fontWeight: 600 }}>{details.product.yield}%</span>
            </div>
            <div className="info-row" style={{ marginBottom: '12px' }}>
              <span className="label">수량</span>
              <span className="value" style={{ fontWeight: 600 }}>{details.plan.totalQty.toLocaleString()} 개</span>
            </div>
            <div className="info-row" style={{ marginBottom: '12px' }}>
              <span className="label">총 생산 중량(g)</span>
              <span className="value" style={{ fontWeight: 600 }}>{details.totalWeightG.toLocaleString()} g ({(details.totalWeightG / 1000).toFixed(2)} kg)</span>
            </div>
            <div className="info-row" style={{ marginBottom: '20px' }}>
              <span className="label">가동 발효기</span>
              <span className="value highlight" style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
                {details.plan.fermenterType === 'small' ? '소형 발효기' : '대형 발효기'}
              </span>
            </div>

            {/* Print / PDF Action Button */}
            <div style={{ marginBottom: '20px' }} className="drawer-print-actions">
              <button 
                className="btn-success" 
                onClick={handlePrint}
                style={{ 
                  width: '100%', 
                  justifyContent: 'center', 
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))', 
                  border: 'none', 
                  fontWeight: 600 
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                  <polyline points="6 9 6 2 18 2 18 9"></polyline>
                  <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                  <rect x="6" y="14" width="12" height="8"></rect>
                </svg>
                배합표 인쇄 / PDF 저장
              </button>
            </div>

            <div className="wysh-table-wrapper">
              <table className="wysh-table" id="recipe-drawer-table">
                <thead>
                  <tr>
                    <th>원재료명</th>
                    <th style={{ textAlign: 'right' }}>함량(%)</th>
                    <th style={{ textAlign: 'right' }}>필요량(g)</th>
                    <th style={{ textAlign: 'right' }}>참고량(kg)</th>
                  </tr>
                </thead>
                <tbody>
                  {details.computedIngredients.map((ing, idx) => (
                    <tr key={idx}>
                      <td style={{ fontWeight: 500 }}>{ing.name}</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.neededQtyKg.toFixed(2)} kg)</td>
                    </tr>
                  ))}
                  <tr className="total-row">
                    <td>합계</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{details.totalRatioSum.toFixed(2)}%</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{Math.round(details.totalWeightSum).toLocaleString()} g</td>
                    <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(details.totalWeightSum / 1000).toFixed(2)} kg)</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Base Product Secondary Recipe Table */}
            {details.baseProductDetails && (
              <div style={{ marginTop: '28px', borderTop: '2px dashed var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    [베이스 제품 필요 배합표] {details.baseProductDetails.product.name}
                  </h4>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    베이스 필요량: {details.baseProductDetails.neededBaseFinishedKg.toFixed(2)} kg
                  </span>
                </div>

                <div className="info-row" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span className="label">베이스 제품 수율</span>
                  <span className="value" style={{ fontWeight: 600 }}>{details.baseProductDetails.baseYield}%</span>
                </div>
                <div className="info-row" style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                  <span className="label">베이스 투입 필요 총 중량</span>
                  <span className="value" style={{ fontWeight: 600 }}>
                    {Math.round(details.baseProductDetails.totalBaseInputWeightG).toLocaleString()} g ({(details.baseProductDetails.totalBaseInputWeightG / 1000).toFixed(2)} kg)
                  </span>
                </div>

                <div className="wysh-table-wrapper">
                  <table className="wysh-table" id="recipe-drawer-base-table">
                    <thead>
                      <tr>
                        <th>베이스 원재료명</th>
                        <th style={{ textAlign: 'right' }}>함량(%)</th>
                        <th style={{ textAlign: 'right' }}>필요량(g)</th>
                        <th style={{ textAlign: 'right' }}>참고량(kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {details.baseProductDetails.computedBaseIngredients.map((ing, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{ing.name}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.neededQtyKg.toFixed(2)} kg)</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>합계</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{details.baseProductDetails.baseRatioSum.toFixed(2)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{Math.round(details.baseProductDetails.baseWeightSum).toLocaleString()} g</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(details.baseProductDetails.baseWeightSum / 1000).toFixed(2)} kg)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {details.plan.memo && (
              <div className="note-card" style={{ marginTop: '20px', flexDirection: 'column', alignItems: 'stretch', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: 'var(--color-primary)' }}>
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 0 }}>
                    <path d="M12 20h9"></path>
                    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                  </svg>
                  <span>생산 메모</span>
                </div>
                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', width: '100%', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'left' }}>
                  {details.plan.memo}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(RecipeDrawer);

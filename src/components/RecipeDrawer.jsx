import React, { useMemo, useCallback } from 'react';
import { useWysh } from '../WyshContext';

const RecipeDrawer = ({ isOpen, onClose, planId }) => {
  const { plans, products } = useWysh();

  const details = useMemo(() => {
    if (!isOpen || !planId) return null;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;

    const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0 
      ? plan.items 
      : [{ productId: plan.productId, totalQty: plan.totalQty }];

    let totalCombinedBaseYogurtG = 0;

    const itemDetailsList = planItems.map((it, idx) => {
      const product = products.find(p => p.id === it.productId);
      if (!product) return null;

      const itemTotalQty = it.totalQty || ( (it.expectedOrderQty || 0) + (it.marketingQty || 0) + (it.bufferQty || 0) );
      const itemTotalWeightG = itemTotalQty * product.weight;
      const itemInputWeightG = itemTotalWeightG / (product.yield / 100);

      let totalRatioSum = 0;
      let totalWeightSum = 0;

      const computedIngredients = (product.ingredients || []).map(ing => {
        const neededQtyG = itemInputWeightG * (ing.ratio / 100);
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

      // Calculate base yogurt requirement for this item
      let baseYogurtNeededG = 0;
      if (product.isFlavor) {
        const baseIng = product.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || product.ingredients?.[0];
        const baseRatio = baseIng ? baseIng.ratio : 70;
        baseYogurtNeededG = itemInputWeightG * (baseRatio / 100);
      } else {
        baseYogurtNeededG = itemTotalWeightG;
      }

      totalCombinedBaseYogurtG += baseYogurtNeededG;

      return {
        itemIndex: idx + 1,
        item: it,
        product,
        itemTotalQty,
        itemTotalWeightG,
        itemInputWeightG,
        computedIngredients,
        totalRatioSum,
        totalWeightSum,
        baseYogurtNeededG
      };
    }).filter(Boolean);

    // Compute combined base product (Plain) recipe
    const baseProduct = products.find(p => !p.isFlavor) || products[0];
    const totalCombinedBaseYogurtKg = totalCombinedBaseYogurtG / 1000;
    const baseYield = baseProduct ? (baseProduct.yield || 28) : 28;
    const totalBaseInputWeightG = totalCombinedBaseYogurtG / (baseYield / 100);

    let baseRatioSum = 0;
    let baseWeightSum = 0;

    const computedCombinedBaseIngredients = baseProduct ? (baseProduct.ingredients || []).map(bIng => {
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
    }) : [];

    return {
      plan,
      itemDetailsList,
      combinedBaseDetails: {
        baseProduct,
        totalCombinedBaseYogurtG,
        totalCombinedBaseYogurtKg,
        baseYield,
        totalBaseInputWeightG,
        computedCombinedBaseIngredients,
        baseRatioSum,
        baseWeightSum
      }
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
    <div className="drawer-overlay open" onClick={onClose} id="recipe-drawer-overlay">
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
              <span className="label">가동 발효기</span>
              <span className="value highlight" style={{ color: 'var(--color-primary)', fontSize: '1rem' }}>
                {details.plan.fermenterType === 'small' ? '소형 발효기' : '대형 발효기'} (원재료 총량: {(details.plan.totalVolumeL || 0).toFixed(2)} L)
              </span>
            </div>

            {/* Summary List of Produced Items */}
            <div style={{ background: 'var(--bg-tertiary)', borderRadius: '8px', padding: '12px', marginBottom: '16px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '6px' }}>
                생산 품목 구성 ({details.itemDetailsList.length}개 품목)
              </span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {details.itemDetailsList.map((itDetail, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                      품목 {itDetail.itemIndex}: {itDetail.product.name} ({itDetail.product.weight}g)
                    </span>
                    <span style={{ fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>
                      {itDetail.itemTotalQty.toLocaleString()} 개 ({itDetail.itemTotalWeightG.toLocaleString()} g)
                    </span>
                  </div>
                ))}
              </div>
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

            {/* Individual Item Recipe Tables */}
            {details.itemDetailsList.map((itDetail, idx) => (
              <div key={idx} style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>
                      품목 {itDetail.itemIndex}
                    </span>
                    {itDetail.product.name} 필요 배합표
                  </h4>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>
                    수량: {itDetail.itemTotalQty.toLocaleString()} 개 | 수율: {itDetail.product.yield}%
                  </span>
                </div>

                <div className="wysh-table-wrapper">
                  <table className="wysh-table">
                    <thead>
                      <tr>
                        <th>원재료명</th>
                        <th style={{ textAlign: 'right' }}>함량(%)</th>
                        <th style={{ textAlign: 'right' }}>필요량(g)</th>
                        <th style={{ textAlign: 'right' }}>참고량(kg)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {itDetail.computedIngredients.map((ing, ingIdx) => (
                        <tr key={ingIdx}>
                          <td style={{ fontWeight: 500 }}>{ing.name}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.neededQtyKg.toFixed(2)} kg)</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>합계</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{itDetail.totalRatioSum.toFixed(2)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{Math.round(itDetail.totalWeightSum).toLocaleString()} g</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(itDetail.totalWeightSum / 1000).toFixed(2)} kg)</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            ))}

            {/* Combined Base Product Secondary Recipe Table */}
            {details.combinedBaseDetails && details.combinedBaseDetails.baseProduct && (
              <div className="base-recipe-section" style={{ marginTop: '28px', borderTop: '2px dashed var(--border-color)', paddingTop: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <h4 style={{ fontSize: '0.98rem', fontWeight: 700, color: 'var(--color-primary)', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                    </svg>
                    [전체 합산 베이스 제품 필요 배합표] {details.combinedBaseDetails.baseProduct.name}
                  </h4>
                  <span style={{ fontSize: '0.78rem', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '3px 8px', borderRadius: '6px', fontWeight: 600 }}>
                    총 베이스 필요량: {details.combinedBaseDetails.totalCombinedBaseYogurtKg.toFixed(2)} kg
                  </span>
                </div>

                <div className="info-row" style={{ marginBottom: '8px', fontSize: '0.85rem' }}>
                  <span className="label">베이스 요거트 수율</span>
                  <span className="value" style={{ fontWeight: 600 }}>{details.combinedBaseDetails.baseYield}%</span>
                </div>
                <div className="info-row" style={{ marginBottom: '14px', fontSize: '0.85rem' }}>
                  <span className="label">베이스 제조 필요 원유/유산균 총량</span>
                  <span className="value" style={{ fontWeight: 600 }}>
                    {Math.round(details.combinedBaseDetails.totalBaseInputWeightG).toLocaleString()} g ({(details.combinedBaseDetails.totalBaseInputWeightG / 1000).toFixed(2)} kg)
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
                      {details.combinedBaseDetails.computedCombinedBaseIngredients.map((ing, idx) => (
                        <tr key={idx}>
                          <td style={{ fontWeight: 500 }}>{ing.name}</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.neededQtyKg.toFixed(2)} kg)</td>
                        </tr>
                      ))}
                      <tr className="total-row">
                        <td>합계</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{details.combinedBaseDetails.baseRatioSum.toFixed(2)}%</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{Math.round(details.combinedBaseDetails.baseWeightSum).toLocaleString()} g</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(details.combinedBaseDetails.baseWeightSum / 1000).toFixed(2)} kg)</td>
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

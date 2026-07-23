import React, { useMemo, useCallback } from 'react';
import { useWysh } from '../WyshContext';

const formatQtyG = (qtyG, ratio = 0, isLacticBacteria = false) => {
  if (ratio <= 1 || isLacticBacteria) {
    return Number(qtyG.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Math.round(qtyG).toLocaleString();
};

const RecipeDrawer = ({ isOpen, onClose, planId }) => {
  const { plans, products } = useWysh();

  const details = useMemo(() => {
    if (!isOpen || !planId) return null;
    const plan = plans.find(p => p.id === planId);
    if (!plan) return null;

    // 1. Sub-ingredient Plan Recipe Calculations
    if (plan.planType === 'sub_ingredient') {
      const subProduct = products.find(p => p.id === plan.subProductId);
      const targetYogurt = products.find(p => p.id === plan.targetYogurtProductId);
      const targetYogurtQty = plan.targetYogurtQty || 0;

      // Find sub-ingredient ratio inside target yogurt's recipe
      let subRatioInYogurt = 25; // Default fallback ratio
      if (targetYogurt && subProduct) {
        const foundIng = targetYogurt.ingredients?.find(i => 
          i.subProductId === subProduct.id || 
          i.name === subProduct.name || 
          i.name.includes(subProduct.name) || 
          subProduct.name.includes(i.name)
        );
        if (foundIng) {
          subRatioInYogurt = foundIng.ratio;
        }
      }

      const yogurtWeightG = targetYogurt ? (targetYogurt.weight || 130) : 130;
      const subWeightPer1YogurtG = yogurtWeightG * (subRatioInYogurt / 100);
      const subWeightPer20YogurtG = subWeightPer1YogurtG * 20;
      const totalSubWeightG = subWeightPer1YogurtG * targetYogurtQty;

      const subIngredients = subProduct ? (subProduct.ingredients || []) : [];

      // Compute Table 1: 1 unit worth
      const table1Items = subIngredients.map(ing => {
        const qtyG = subWeightPer1YogurtG * (ing.ratio / 100);
        return {
          name: ing.name,
          ratio: ing.ratio,
          displayG: formatQtyG(qtyG, ing.ratio, ing.name?.includes('유산균')),
          qtyKg: qtyG / 1000
        };
      });

      // Compute Table 2: 20 units worth
      const table2Items = subIngredients.map(ing => {
        const qtyG = subWeightPer20YogurtG * (ing.ratio / 100);
        return {
          name: ing.name,
          ratio: ing.ratio,
          displayG: formatQtyG(qtyG, ing.ratio, ing.name?.includes('유산균')),
          qtyKg: qtyG / 1000
        };
      });

      // Compute Table 3: Total planned units worth
      const table3Items = subIngredients.map(ing => {
        const qtyG = totalSubWeightG * (ing.ratio / 100);
        return {
          name: ing.name,
          ratio: ing.ratio,
          displayG: formatQtyG(qtyG, ing.ratio, ing.name?.includes('유산균')),
          qtyKg: qtyG / 1000
        };
      });

      const subIngredientRatioSum = subIngredients.reduce((sum, ing) => sum + (Number(ing.ratio) || 0), 0);

      return {
        isSubIngredientPlan: true,
        plan,
        subProduct,
        targetYogurt,
        targetYogurtQty,
        subRatioInYogurt,
        yogurtWeightG,
        subWeightPer1YogurtG,
        subWeightPer20YogurtG,
        totalSubWeightG,
        subIngredientRatioSum,
        table1Items,
        table2Items,
        table3Items
      };
    }

    // 2. Standard Yogurt Plan Recipe Calculations
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
        const displayG = formatQtyG(neededQtyG, ing.ratio, isLacticBacteria);

        return {
          name: ing.name,
          ratio: ing.ratio,
          displayG,
          neededQtyKg
        };
      });

      let baseYogurtNeededG = 0;
      let details20Qty = null;
      if (product.isFlavor) {
        let baseIng = null;
        if (product.baseProductId) {
          const linkedBase = products.find(p => p.id === product.baseProductId);
          if (linkedBase) {
            baseIng = product.ingredients?.find(ing => ing.name === linkedBase.name || ing.name.includes(linkedBase.name));
          }
        }
        if (!baseIng) {
          baseIng = product.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || product.ingredients?.[0];
        }
        const baseRatio = baseIng ? baseIng.ratio : 70;
        baseYogurtNeededG = itemInputWeightG * (baseRatio / 100);

        // 20-unit calculation for Flavor Yogurt
        const weight20G = 20 * product.weight;
        const inputWeight20G = weight20G / (product.yield / 100);

        let totalRatioSum20 = 0;
        let totalWeightSum20 = 0;

        const computedIngredients20 = (product.ingredients || []).map(ing => {
          const neededQtyG = inputWeight20G * (ing.ratio / 100);
          const neededQtyKg = neededQtyG / 1000;

          totalRatioSum20 += ing.ratio;
          totalWeightSum20 += neededQtyG;

          const isLacticBacteria = ing.name.includes('유산균');
          const displayG = formatQtyG(neededQtyG, ing.ratio, isLacticBacteria);

          return {
            name: ing.name,
            ratio: ing.ratio,
            displayG,
            neededQtyKg
          };
        });

        details20Qty = {
          qty: 20,
          totalWeightG: weight20G,
          inputWeightG: inputWeight20G,
          computedIngredients: computedIngredients20,
          totalRatioSum: totalRatioSum20,
          totalWeightSum: totalWeightSum20
        };
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
        baseYogurtNeededG,
        details20Qty
      };
    }).filter(Boolean);

    let baseProduct = itemDetailsList.map(d => d.product).find(p => !p.isFlavor);

    if (!baseProduct) {
      const flavorItem = itemDetailsList.find(d => d.product.isFlavor && d.product.baseProductId);
      if (flavorItem) {
        baseProduct = products.find(p => p.id === flavorItem.product.baseProductId);
      }
    }

    if (!baseProduct) {
      const flavorItem = itemDetailsList.find(d => d.product.isFlavor);
      if (flavorItem) {
        const firstIngName = flavorItem.product.ingredients?.[0]?.name;
        if (firstIngName) {
          baseProduct = products.find(p => p.name.includes(firstIngName) || firstIngName.includes(p.name));
        }
      }
    }

    if (!baseProduct) {
      baseProduct = products.find(p => !p.isFlavor) || products[0];
    }

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
      const displayG = formatQtyG(bNeededQtyG, bIng.ratio, isLacticBacteria);

      return {
        name: bIng.name,
        ratio: bIng.ratio,
        displayG,
        neededQtyKg: bNeededQtyKg
      };
    }) : [];

    const hasFlavor = itemDetailsList.some(d => d.product.isFlavor);
    const hasBase = itemDetailsList.some(d => !d.product.isFlavor);
    const isTwoItemsWithBaseAndFlavor = itemDetailsList.length === 2 && hasFlavor && hasBase;

    const displayItemDetailsList = isTwoItemsWithBaseAndFlavor
      ? itemDetailsList.filter(d => d.product.isFlavor)
      : itemDetailsList;

    return {
      isSubIngredientPlan: false,
      plan,
      itemDetailsList,
      displayItemDetailsList,
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
    setTimeout(handleAfterPrint, 1500);
  }, []);

  if (!isOpen) return null;

  return (
    <div className="drawer-overlay open" onClick={onClose} id="recipe-drawer-overlay">
      <div className="drawer-content" onClick={(e) => e.stopPropagation()}>
        <div className="drawer-header">
          <h3>{details?.isSubIngredientPlan ? '부재료 전용 원재료 배합표' : '원재료 배합표'}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="닫기">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>
        {details && (
          <div className="drawer-body">
            {details.isSubIngredientPlan ? (
              /* Render Sub-ingredient Plan 3-Table Recipe Drawer */
              <>
                <div className="info-row" style={{ marginBottom: '12px' }}>
                  <span className="label">부재료 생산 계획명</span>
                  <span className="value" style={{ fontWeight: 600 }}>{details.plan.name}</span>
                </div>
                <div className="info-row" style={{ marginBottom: '12px' }}>
                  <span className="label">대상 부재료</span>
                  <span className="value highlight" style={{ color: '#c2410c', fontSize: '1rem', fontWeight: 700 }}>
                    🍞 {details.subProduct ? details.subProduct.name : '부재료'}
                  </span>
                </div>
                <div className="info-row" style={{ marginBottom: '16px' }}>
                  <span className="label">사용 요거트 제품 / 목표 생산량</span>
                  <span className="value" style={{ fontWeight: 600 }}>
                    {details.targetYogurt ? details.targetYogurt.name : '요거트 제품'} ({details.yogurtWeightG}g) x {details.targetYogurtQty.toLocaleString()}개분 (투입비율 {details.subRatioInYogurt}%)
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
                      background: 'linear-gradient(135deg, #f97316, #ea580c)', 
                      border: 'none', 
                      fontWeight: 600 
                    }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
                      <polyline points="6 9 6 2 18 2 18 9"></polyline>
                      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                      <rect x="6" y="14" width="12" height="8"></rect>
                    </svg>
                    부재료 배합표 인쇄 / PDF 저장
                  </button>
                </div>

                {/* Table 1: 1 Yogurt Unit */}
                <div style={{ marginBottom: '24px', background: 'rgba(249, 115, 22, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#c2410c', margin: 0 }}>
                      1. 요거트 1개 기준 부재료 소요 배합표
                    </h4>
                    <span style={{ fontSize: '0.78rem', background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      부재료 필요량: {details.subWeightPer1YogurtG.toFixed(1)} g
                    </span>
                  </div>
                  <div className="wysh-table-wrapper">
                    <table className="wysh-table">
                      <thead>
                        <tr>
                          <th>부재료 구성 원재료명</th>
                          <th style={{ textAlign: 'right' }}>함량(%)</th>
                          <th style={{ textAlign: 'right' }}>필요량(g)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.table1Items.map((ing, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 500 }}>{ing.name}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td>합계</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{details.subIngredientRatioSum.toFixed(2)}%</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 700 }}>{details.subWeightPer1YogurtG.toFixed(1)} g</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 2: 20 Yogurt Units */}
                <div style={{ marginBottom: '24px', background: 'rgba(249, 115, 22, 0.03)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.2)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#c2410c', margin: 0 }}>
                      2. 요거트 20개 기준 부재료 소요 배합표
                    </h4>
                    <span style={{ fontSize: '0.78rem', background: '#ffedd5', color: '#c2410c', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                      부재료 필요량: {Math.round(details.subWeightPer20YogurtG).toLocaleString()} g ({(details.subWeightPer20YogurtG / 1000).toFixed(2)} kg)
                    </span>
                  </div>
                  <div className="wysh-table-wrapper">
                    <table className="wysh-table">
                      <thead>
                        <tr>
                          <th>부재료 구성 원재료명</th>
                          <th style={{ textAlign: 'right' }}>함량(%)</th>
                          <th style={{ textAlign: 'right' }}>필요량(g)</th>
                          <th style={{ textAlign: 'right' }}>참고량(kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.table2Items.map((ing, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 500 }}>{ing.name}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.qtyKg.toFixed(2)} kg)</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td>합계</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{details.subIngredientRatioSum.toFixed(2)}%</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 700 }}>{Math.round(details.subWeightPer20YogurtG).toLocaleString()} g</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(details.subWeightPer20YogurtG / 1000).toFixed(2)} kg)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Table 3: Total Planned Yogurt Units */}
                <div style={{ marginBottom: '24px', background: 'rgba(249, 115, 22, 0.06)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(249, 115, 22, 0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: '#c2410c', margin: 0 }}>
                      3. 생산계획 총량 기준 부재료 배합표 ({details.targetYogurtQty.toLocaleString()}개분)
                    </h4>
                    <span style={{ fontSize: '0.8rem', background: '#ea580c', color: '#fff', padding: '2px 9px', borderRadius: '6px', fontWeight: 700 }}>
                      총 부재료 소요량: {Math.round(details.totalSubWeightG).toLocaleString()} g ({(details.totalSubWeightG / 1000).toFixed(2)} kg)
                    </span>
                  </div>
                  <div className="wysh-table-wrapper">
                    <table className="wysh-table">
                      <thead>
                        <tr>
                          <th>부재료 구성 원재료명</th>
                          <th style={{ textAlign: 'right' }}>함량(%)</th>
                          <th style={{ textAlign: 'right' }}>필요량(g)</th>
                          <th style={{ textAlign: 'right' }}>참고량(kg)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {details.table3Items.map((ing, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: 500 }}>{ing.name}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.qtyKg.toFixed(2)} kg)</td>
                          </tr>
                        ))}
                        <tr className="total-row">
                          <td>합계</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{details.subIngredientRatioSum.toFixed(2)}%</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 700 }}>{Math.round(details.totalSubWeightG).toLocaleString()} g</td>
                          <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(details.totalSubWeightG / 1000).toFixed(2)} kg)</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {details.plan.memo && (
                  <div className="note-card" style={{ marginTop: '20px', flexDirection: 'column', alignItems: 'stretch', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', fontWeight: 600, color: '#c2410c' }}>
                      <span>부재료 생산 메모</span>
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.5', width: '100%', color: 'var(--text-primary)', fontSize: '0.85rem', textAlign: 'left' }}>
                      {details.plan.memo}
                    </div>
                  </div>
                )}
              </>
            ) : (
              /* Render Standard Yogurt Plan Recipe Drawer */
              <>
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
                {details.displayItemDetailsList.map((itDetail, idx) => (
                  <div key={idx} style={{ marginBottom: '24px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ background: 'var(--color-primary)', color: '#fff', fontSize: '0.7rem', padding: '1px 6px', borderRadius: '10px' }}>
                          품목 {itDetail.itemIndex}
                        </span>
                        {itDetail.product.name} 필요 배합표 ({itDetail.itemTotalQty.toLocaleString()}개 전체 수량 기준)
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

                    {/* 20-Unit Flavor Recipe Table */}
                    {itDetail.details20Qty && (
                      <div style={{ marginTop: '16px', background: 'rgba(2, 132, 199, 0.04)', padding: '14px', borderRadius: '10px', border: '1px solid rgba(2, 132, 199, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <h5 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--color-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
                            🧪 {itDetail.product.name} (20개 기준 필요 배합표)
                          </h5>
                          <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'var(--font-outfit)' }}>
                            20개 생산 기준 소요 원재료
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
                              {itDetail.details20Qty.computedIngredients.map((ing, ingIdx) => (
                                <tr key={ingIdx}>
                                  <td style={{ fontWeight: 500 }}>{ing.name}</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{ing.ratio}%</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}>{ing.displayG} g</td>
                                  <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontStyle: 'italic' }}>({ing.neededQtyKg.toFixed(2)} kg)</td>
                                </tr>
                              ))}
                              <tr className="total-row">
                                <td>합계</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{itDetail.details20Qty.totalRatioSum.toFixed(2)}%</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{Math.round(itDetail.details20Qty.totalWeightSum).toLocaleString()} g</td>
                                <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontStyle: 'italic' }}>({(itDetail.details20Qty.totalWeightSum / 1000).toFixed(2)} kg)</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
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
                        [전체 합산 베이스 배합표] {details.combinedBaseDetails.baseProduct.name}
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
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(RecipeDrawer);

/**
 * recipeCalculator.js
 * 
 * 원재료 배합표 및 생산 계획 수치 계산을 전담하는 순수 함수 모듈입니다.
 * UI 상태나 외부 부작용(Side Effects) 없이, 입력된 계획(plan)과 제품(products) 데이터를 기반으로
 * 원재료 소요량, 20개 단위 배합, 반제품 배합, 베이스 요거트 합산 배합 등을 엄밀하게 계산합니다.
 */

/**
 * 투입 중량(g) 표시 포맷팅
 * - 함량이 1% 이하이거나 유산균인 경우 소수점 첫째 자리까지 표시
 * - 그 외는 정수로 반올림
 */
export const formatQtyG = (qtyG, ratio = 0, isLacticBacteria = false) => {
  if (ratio <= 1 || isLacticBacteria) {
    return Number(qtyG.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  }
  return Math.round(qtyG).toLocaleString();
};

/**
 * 원재료 목록에 대해 총 투입 중량(inputWeightG) 기준 필요량(g, kg)을 계산
 */
export const computeIngredients = (ingredients = [], inputWeightG = 0) => {
  let totalRatioSum = 0;
  let totalWeightSum = 0;

  const computed = ingredients.map(ing => {
    const ratio = Number(ing.ratio) || 0;
    const neededQtyG = inputWeightG * (ratio / 100);
    const neededQtyKg = neededQtyG / 1000;

    totalRatioSum += ratio;
    totalWeightSum += neededQtyG;

    const isLacticBacteria = ing.name?.includes('유산균') || false;
    const displayG = formatQtyG(neededQtyG, ratio, isLacticBacteria);

    return {
      name: ing.name,
      ratio,
      displayG,
      neededQtyKg
    };
  });

  return {
    computedIngredients: computed,
    totalRatioSum,
    totalWeightSum
  };
};

/**
 * 반제품 전용 생산 계획(Sub-ingredient Plan)의 3단 배합표 계산
 * Table 1: 요거트 1개 기준 소요 배합
 * Table 2: 요거트 20개 기준 소요 배합
 * Table 3: 생산계획 총량 기준 소요 배합
 */
export const computeSubIngredientRecipe = (plan, products = []) => {
  if (!plan) return null;

  const subProduct = products.find(p => 
    p.id === plan.subProductId || 
    p.id === plan.productId || 
    ((p.isSubIngredient || p.category === 'sub_ingredient') && (plan.name?.includes(p.name) || p.name?.includes(plan.name)))
  );
  const targetYogurt = products.find(p => p.id === plan.targetYogurtProductId);
  const targetYogurtQty = plan.targetYogurtQty || 0;

  // 대상 요거트 레시피 내 반제품 투입 비율 탐색 (기본값 25%)
  let subRatioInYogurt = 25;
  if (targetYogurt && subProduct) {
    const foundIng = targetYogurt.ingredients?.find(i => 
      i.subProductId === subProduct.id || 
      i.name === subProduct.name || 
      i.name.includes(subProduct.name) || 
      subProduct.name.includes(i.name)
    );
    if (foundIng) {
      subRatioInYogurt = Number(foundIng.ratio) || 25;
    }
  }

  const yogurtWeightG = targetYogurt ? (targetYogurt.weight || 130) : 130;
  const subWeightPer1YogurtG = yogurtWeightG * (subRatioInYogurt / 100);
  const subWeightPer20YogurtG = subWeightPer1YogurtG * 20;
  const totalSubWeightG = subWeightPer1YogurtG * targetYogurtQty;

  const subIngredients = subProduct ? (subProduct.ingredients || []) : [];

  // Table 1: 1개분
  const table1Items = subIngredients.map(ing => {
    const ratio = Number(ing.ratio) || 0;
    const qtyG = subWeightPer1YogurtG * (ratio / 100);
    return {
      name: ing.name,
      ratio,
      displayG: formatQtyG(qtyG, ratio, ing.name?.includes('유산균')),
      qtyKg: qtyG / 1000
    };
  });

  // Table 2: 20개분
  const table2Items = subIngredients.map(ing => {
    const ratio = Number(ing.ratio) || 0;
    const qtyG = subWeightPer20YogurtG * (ratio / 100);
    return {
      name: ing.name,
      ratio,
      displayG: formatQtyG(qtyG, ratio, ing.name?.includes('유산균')),
      qtyKg: qtyG / 1000
    };
  });

  // Table 3: 계획 총량분
  const table3Items = subIngredients.map(ing => {
    const ratio = Number(ing.ratio) || 0;
    const qtyG = totalSubWeightG * (ratio / 100);
    return {
      name: ing.name,
      ratio,
      displayG: formatQtyG(qtyG, ratio, ing.name?.includes('유산균')),
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
};

/**
 * 일반 요거트 생산 계획(단일/2종 동시 생산)의 배합표 및 전체 합산 베이스 배합표 계산
 */
export const computeStandardYogurtRecipe = (plan, products = []) => {
  if (!plan) return null;

  const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0 
    ? plan.items 
    : [{ productId: plan.productId, totalQty: plan.totalQty }];

  let totalCombinedBaseYogurtG = 0;

  const itemDetailsList = planItems.map((it, idx) => {
    const product = products.find(p => p.id === it.productId);
    if (!product) return null;

    const itemTotalQty = it.totalQty || ((it.expectedOrderQty || 0) + (it.marketingQty || 0) + (it.bufferQty || 0));
    const itemTotalWeightG = itemTotalQty * (product.weight || 0);
    const itemInputWeightG = itemTotalWeightG / ((product.yield || 100) / 100);

    const { computedIngredients, totalRatioSum, totalWeightSum } = computeIngredients(
      product.ingredients || [],
      itemInputWeightG
    );

    let baseYogurtNeededG = 0;
    let details20Qty = null;
    let detailsRemainderQty = null;

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
      const baseRatio = baseIng ? (Number(baseIng.ratio) || 70) : 70;
      baseYogurtNeededG = itemInputWeightG * (baseRatio / 100);

      // 20개 기준 배합 계산
      const weight20G = 20 * product.weight;
      const inputWeight20G = weight20G / ((product.yield || 100) / 100);
      const res20 = computeIngredients(product.ingredients || [], inputWeight20G);

      details20Qty = {
        qty: 20,
        totalWeightG: weight20G,
        inputWeightG: inputWeight20G,
        computedIngredients: res20.computedIngredients,
        totalRatioSum: res20.totalRatioSum,
        totalWeightSum: res20.totalWeightSum
      };

      // 20의 배수가 아닐 때 잔여 N개 기준 배합 계산
      const remainderQty = itemTotalQty % 20;
      if (remainderQty > 0) {
        const weightRemainderG = remainderQty * product.weight;
        const inputWeightRemainderG = weightRemainderG / ((product.yield || 100) / 100);
        const resRemainder = computeIngredients(product.ingredients || [], inputWeightRemainderG);

        detailsRemainderQty = {
          qty: remainderQty,
          totalWeightG: weightRemainderG,
          inputWeightG: inputWeightRemainderG,
          computedIngredients: resRemainder.computedIngredients,
          totalRatioSum: resRemainder.totalRatioSum,
          totalWeightSum: resRemainder.totalWeightSum
        };
      }
    } else {
      baseYogurtNeededG = itemTotalWeightG;
    }

    // 각 품목별 베이스 요거트 소요량을 누적
    totalCombinedBaseYogurtG += baseYogurtNeededG;

    // 연계된 반제품 레시피 메모 탐색
    const linkedSubProducts = (product.ingredients || [])
      .map(ing => {
        if (ing.subProductId) {
          return products.find(p => p.id === ing.subProductId);
        }
        return products.find(p => (p.isSubIngredient || p.category === 'sub_ingredient') && (p.name === ing.name || ing.name.includes(p.name) || p.name.includes(ing.name)));
      })
      .filter(Boolean);

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
      details20Qty,
      detailsRemainderQty,
      linkedSubProducts
    };
  }).filter(Boolean);

  // 베이스 제품(플레인 요거트 등) 결정
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
    const ratio = Number(bIng.ratio) || 0;
    const bNeededQtyG = totalBaseInputWeightG * (ratio / 100);
    const bNeededQtyKg = bNeededQtyG / 1000;

    baseRatioSum += ratio;
    baseWeightSum += bNeededQtyG;

    const isLacticBacteria = bIng.name?.includes('유산균') || false;
    const displayG = formatQtyG(bNeededQtyG, ratio, isLacticBacteria);

    return {
      name: bIng.name,
      ratio,
      displayG,
      neededQtyKg: bNeededQtyKg
    };
  }) : [];

  const hasFlavor = itemDetailsList.some(d => d.product.isFlavor);
  const hasBase = itemDetailsList.some(d => !d.product.isFlavor);
  const isTwoItemsWithBaseAndFlavor = itemDetailsList.length === 2 && hasFlavor && hasBase;

  // 2종 동시 생산(플레인 + 플레이버) 시 개별 테이블에서는 플레이버만 출력 (플레인은 합산 베이스 배합표로 통합)
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
};

/**
 * 계획(plan) 타입에 따른 배합표 통합 계산 진입 함수
 */
export const calculateRecipeDetails = (plan, products = []) => {
  if (!plan) return null;
  if (plan.planType === 'sub_ingredient') {
    return computeSubIngredientRecipe(plan, products);
  }
  return computeStandardYogurtRecipe(plan, products);
};

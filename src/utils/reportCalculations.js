// Pure calculation helpers for ReportsView (발효 / 유청분리 / 병입 / 관능검사 리포트)

// Seed historical pH measurements for Wish Greek (위시그릭)
export const WISH_GREEK_SEED_PH_DATA = [
  4.47, 4.46, 4.51, 4.42, 4.58, 4.51, 4.41, 4.36, 4.61, 4.42,
  4.48, 4.46, 4.48, 4.46, 4.46, 4.67, 4.52, 4.46, 4.50, 4.48, 4.51
];

// Seed historical pH measurements for Mud Greek (머드그릭)
export const MUD_GREEK_SEED_PH_DATA = [
  4.23, 4.33, 4.38, 4.29, 4.31, 4.20, 4.16, 4.30
];

const WISH_GREEK_PH_CONFIG = {
  name: '위시그릭',
  targetMin: 4.42,
  targetMax: 4.58,
  minScale: 4.20,
  maxScale: 4.80,
  seedData: WISH_GREEK_SEED_PH_DATA,
  defaultAvg: 4.49
};

const MUD_GREEK_PH_CONFIG = {
  name: '머드그릭',
  targetMin: 4.20,
  targetMax: 4.35,
  minScale: 4.00,
  maxScale: 4.50,
  seedData: MUD_GREEK_SEED_PH_DATA,
  defaultAvg: 4.28
};

const formatYmd = (d) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dayStr = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
};

const getPlanItems = (plan) => (
  plan.items && Array.isArray(plan.items) && plan.items.length > 0
    ? plan.items
    : [{ productId: plan.productId, totalQty: plan.totalQty }]
);

// Ratio (%) of base yogurt contained in a flavor product (default 70%)
const getFlavorBaseRatio = (prod) => {
  const baseIng = prod.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || prod.ingredients?.[0];
  return baseIng ? baseIng.ratio : 70;
};

// 1. Filtered plans for dropdown according to production pipeline stages
export const getAvailablePlans = ({ plans, reports, activeReportType, isEditing, selectedPlanId }) => {
  const basePlans = plans.filter(p => p.planType !== 'sub_ingredient');

  if (activeReportType === 'fermentation') {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    const diff = today.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(today.setDate(diff));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const startStr = formatYmd(monday);
    const endStr = formatYmd(sunday);

    const fermentationPlanIds = new Set(
      reports.filter(r => r.type === 'fermentation').map(r => r.planId)
    );

    return basePlans.filter(p => {
      if (isEditing && p.id === selectedPlanId) return true;
      return p.startDate >= startStr && p.startDate <= endStr && !fermentationPlanIds.has(p.id);
    });
  }

  if (activeReportType === 'whey_separation') {
    // Show ONLY plans that HAVE a completed Fermentation report AND DO NOT HAVE a Whey Separation report yet.
    // Exclude legacy plans prior to 7월 4주차 (2026-07-20) created before digital whey separation reports were introduced.
    const fermentationPlanIds = new Set(
      reports.filter(r => r.type === 'fermentation').map(r => r.planId)
    );
    const wheySeparationPlanIds = new Set(
      reports.filter(r => r.type === 'whey_separation').map(r => r.planId)
    );

    return basePlans.filter(p => {
      if (isEditing && p.id === selectedPlanId) return true;
      const isLegacyPlan = p.startDate < '2026-07-20' || p.name.includes('7월 3주차') || p.name.includes('7월 2주차') || p.name.includes('7월 1주차') || p.name.includes('7월3주차');
      return fermentationPlanIds.has(p.id) && !wheySeparationPlanIds.has(p.id) && !isLegacyPlan;
    });
  }

  if (activeReportType === 'bottling') {
    // Show ONLY plans that HAVE a completed Whey Separation report AND DO NOT HAVE a Bottling report yet
    const wheySeparationPlanIds = new Set(
      reports.filter(r => r.type === 'whey_separation').map(r => r.planId)
    );
    const bottlingPlanIds = new Set(
      reports.filter(r => r.type === 'bottling').map(r => r.planId)
    );

    return basePlans.filter(p => {
      if (isEditing && p.id === selectedPlanId) return true;
      return wheySeparationPlanIds.has(p.id) && !bottlingPlanIds.has(p.id);
    });
  }

  return basePlans;
};

// Available targets for Sensory Evaluation (handles multi-item plan splitting like (계획명)_(제품명))
export const getAvailableSensoryTargets = ({ plans, reports, products, isEditing, selectedTargetKey }) => {
  const basePlans = plans.filter(p => p.planType !== 'sub_ingredient');
  const bottlingReports = reports.filter(r => r.type === 'bottling');
  const sensoryReports = reports.filter(r => r.type === 'sensory');

  const targets = [];

  bottlingReports.forEach(bRep => {
    const plan = basePlans.find(p => p.id === bRep.planId);
    if (!plan) return;

    const d = bRep.details || {};

    if (d.isMultiItem) {
      // 2-item parallel production plan
      const items = [];
      if (d.item1 && d.item1.productId) items.push(d.item1);
      if (d.item2 && d.item2.productId) items.push(d.item2);

      items.forEach(it => {
        const key = `${plan.id}::${it.productId}`;
        const isCompleted = sensoryReports.some(sr =>
          sr.planId === plan.id &&
          sr.details?.productId === it.productId &&
          sr.details?.sensoryStatus === 'completed'
        );

        if (!isCompleted || (isEditing && selectedTargetKey === key)) {
          targets.push({
            key,
            planId: plan.id,
            productId: it.productId,
            productName: it.productName,
            displayName: `${plan.name}_${it.productName}`,
            startDate: plan.startDate,
            isMultiItem: true
          });
        }
      });
    } else {
      // Single item production plan
      const key = plan.id;
      const prodId = d.productId || plan.productId;
      const prodObj = products.find(p => p.id === prodId);
      const prodName = d.productName || (prodObj ? prodObj.name : '');

      const isCompleted = sensoryReports.some(sr =>
        sr.planId === plan.id &&
        (!sr.details?.productId || sr.details?.productId === prodId) &&
        sr.details?.sensoryStatus === 'completed'
      );

      if (!isCompleted || (isEditing && selectedTargetKey === key)) {
        targets.push({
          key,
          planId: plan.id,
          productId: prodId,
          productName: prodName,
          displayName: plan.name,
          startDate: plan.startDate,
          isMultiItem: false
        });
      }
    }
  });

  return targets;
};

// Selected plan and base product details (base yogurt / raw material weights)
export const computePlanDetails = (selectedPlanId, plans, products) => {
  if (!selectedPlanId) return null;
  const plan = plans.find(p => p.id === selectedPlanId);
  if (!plan) return null;

  const planItems = getPlanItems(plan);

  let baseProduct = planItems.map(it => products.find(p => p.id === it.productId)).find(p => p && !p.isFlavor);

  if (!baseProduct) {
    const flavorItem = planItems.map(it => products.find(p => p.id === it.productId)).find(p => p && p.isFlavor && p.baseProductId);
    if (flavorItem) {
      baseProduct = products.find(p => p.id === flavorItem.baseProductId);
    }
  }

  if (!baseProduct) {
    const flavorItem = planItems.map(it => products.find(p => p.id === it.productId)).find(p => p && p.isFlavor);
    if (flavorItem) {
      const firstIngName = flavorItem.ingredients?.[0]?.name;
      if (firstIngName) {
        baseProduct = products.find(p => p.name.includes(firstIngName) || firstIngName.includes(p.name));
      }
    }
  }

  if (!baseProduct) {
    baseProduct = products.find(p => !p.isFlavor) || products[0];
  }

  const product = baseProduct;
  if (!product) return null;

  let totalBaseYogurtG = 0;
  planItems.forEach(it => {
    const itemProd = products.find(p => p.id === it.productId);
    if (!itemProd) return;

    const itemTotalQty = it.totalQty || ((it.expectedOrderQty || 0) + (it.marketingQty || 0) + (it.bufferQty || 0));
    const itemTotalWeightG = itemTotalQty * itemProd.weight;
    const itemInputWeightG = itemTotalWeightG / ((itemProd.yield || 100) / 100);

    if (itemProd.isFlavor) {
      totalBaseYogurtG += itemInputWeightG * (getFlavorBaseRatio(itemProd) / 100);
    } else {
      totalBaseYogurtG += itemTotalWeightG;
    }
  });

  const baseYield = product.yield || 28;
  const totalInputWeightG = totalBaseYogurtG / (baseYield / 100);

  let totalRatioSum = 0;
  let totalWeightSumG = 0;

  const computedIngredients = (product.ingredients || []).map(ing => {
    const neededQtyG = totalInputWeightG * (ing.ratio / 100);
    const neededQtyKg = neededQtyG / 1000;
    totalRatioSum += ing.ratio;
    totalWeightSumG += neededQtyG;

    const isLacticBacteria = ing.name.includes('유산균');
    const displayG = neededQtyG <= 10 || isLacticBacteria
      ? Number(neededQtyG.toFixed(1)).toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })
      : Math.round(neededQtyG).toLocaleString();

    return {
      name: ing.name,
      ratio: ing.ratio,
      displayG,
      neededQtyKg,
      neededQtyG
    };
  });

  return {
    plan,
    product,
    baseProduct,
    totalWeightG: totalBaseYogurtG,
    totalInputWeightG,
    totalRatioSum,
    totalWeightSumG,
    computedIngredients,
    planItems
  };
};

// Product pH Configuration (Wish Greek vs Mud Greek vs Default)
export const getProductPhConfig = (selectedPlanDetails) => {
  if (!selectedPlanDetails || !selectedPlanDetails.product) {
    return { ...WISH_GREEK_PH_CONFIG };
  }
  const prodName = selectedPlanDetails.product.name || '';
  if (prodName.includes('머드그릭') || prodName.includes('머드')) {
    return { ...MUD_GREEK_PH_CONFIG };
  }
  return { ...WISH_GREEK_PH_CONFIG };
};

// Historical Average pH calculation for selected product (dynamic update with seed data)
export const computeHistoricalAvgPh = ({ config, selectedPlanDetails, reports, plans, products }) => {
  if (!selectedPlanDetails || !selectedPlanDetails.product) return config.defaultAvg;
  const prodName = selectedPlanDetails.product.name || '';
  const prodId = selectedPlanDetails.product.id;

  // Find all whey separation reports matching this base product
  const relevantReports = reports.filter(r => {
    if (r.type !== 'whey_separation') return false;
    const plan = plans.find(p => p.id === r.planId);
    if (!plan) return false;

    const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0
      ? plan.items
      : [{ productId: plan.productId }];

    return planItems.some(it => {
      const pObj = products.find(p => p.id === it.productId);
      return pObj && (pObj.id === prodId || pObj.baseProductId === prodId || pObj.name.includes(prodName));
    }) || (r.details && (r.details.productId === prodId || r.details.productName?.includes(prodName)));
  });

  const reportPhs = relevantReports
    .map(r => parseFloat(r.details?.phValue))
    .filter(v => !isNaN(v) && v > 0);

  const allPhs = [...config.seedData, ...reportPhs];

  if (allPhs.length === 0) return config.defaultAvg;
  const sum = allPhs.reduce((acc, curr) => acc + curr, 0);
  return sum / allPhs.length;
};

// Real-time calculations for Whey Separation
export const computeWheyCalculations = (wheyBattCount, wheyLastBattWeightG, selectedPlanDetails) => {
  const batts = parseInt(wheyBattCount) || 0;
  const lastG = parseInt(wheyLastBattWeightG) || 0;
  const totalYieldG = (batts * 10000) + lastG;
  const totalYieldKg = totalYieldG / 1000;

  const targetRawMaterialG = selectedPlanDetails?.totalWeightSumG || selectedPlanDetails?.totalInputWeightG || 0;
  const targetRawMaterialKg = targetRawMaterialG / 1000;

  let lossG = 0;
  let lossPercent = 0;
  if (targetRawMaterialG > 0 && totalYieldG > 0) {
    lossG = targetRawMaterialG - totalYieldG;
    lossPercent = (lossG / targetRawMaterialG) * 100;
  }

  return {
    batts,
    lastG,
    totalYieldG,
    totalYieldKg,
    targetRawMaterialG,
    targetRawMaterialKg,
    lossG,
    lossPercent
  };
};

// Compute exact expiry date for a product item in a plan
export const getItemExpiryDate = (item, plan, prod) => {
  if (item && item.expiryDate) return item.expiryDate;

  let botDate = item?.bottlingDate || plan?.bottlingDate;
  if (!botDate && plan?.startDate) {
    const d = new Date(plan.startDate + 'T00:00:00');
    if (!isNaN(d.getTime())) {
      d.setDate(d.getDate() + 2);
      botDate = formatYmd(d);
    }
  }

  const expiryDays = (prod && prod.expiryDays !== undefined) ? prod.expiryDays : 22;

  if (botDate) {
    const bd = new Date(botDate + 'T00:00:00');
    if (!isNaN(bd.getTime())) {
      bd.setDate(bd.getDate() + expiryDays);
      return formatYmd(bd);
    }
  }

  if (plan?.expiryDate) return plan.expiryDate;

  return '-';
};

// Bottled weight converted to base yogurt weight (flavor products contain only a ratio of base yogurt)
const toBaseYogurtG = (prod, totalG) => (prod.isFlavor ? totalG * (getFlavorBaseRatio(prod) / 100) : totalG);

// Real-time calculations for Bottling Report (Single & 2-Item Parallel Plans)
export const computeBottlingCalculations = (selectedPlanDetails, products, inputs) => {
  if (!selectedPlanDetails) return null;
  const { planItems, product, baseProduct, totalWeightSumG, totalInputWeightG, plan } = selectedPlanDetails;
  const isMultiItem = planItems && planItems.length > 1;
  const rawMaterialTotalG = totalWeightSumG || totalInputWeightG || 0;

  if (!isMultiItem) {
    // Single Item Production Plan
    const item0 = planItems && planItems[0];
    const actualProd = products.find(p => p.id === item0?.productId) || product || {};

    const count = parseInt(inputs.bottlingCount) || 0;
    const remainsG = parseInt(inputs.bottlingRemainsG) || 0;
    const deduct = parseInt(inputs.bottlingDeductionQty) || 0;
    const unitWeightG = actualProd.weight || 300;

    const totalBottledWeightG = (count * unitWeightG) + remainsG;

    // Base Yogurt weight calculation if actualProd is a flavor product
    const baseYogurtWeightG = toBaseYogurtG(actualProd, totalBottledWeightG);

    // Target yield is ALWAYS the base product target yield
    const targetYield = baseProduct?.yield || product?.yield || 28;
    // Actual yield is Base Yogurt weight divided by Raw Material total weight
    const actualYield = rawMaterialTotalG > 0 ? (baseYogurtWeightG / rawMaterialTotalG) * 100 : 0;
    const actualStockedQty = Math.max(0, count - deduct);
    const expiryDate = getItemExpiryDate(item0, plan, actualProd);

    return {
      isMultiItem: false,
      productName: actualProd.name || product?.name,
      count,
      remainsG,
      deduct,
      unitWeightG,
      totalBottledWeightG,
      baseYogurtWeightG,
      targetYield,
      actualYield: Number(actualYield.toFixed(2)),
      actualStockedQty,
      expiryDate
    };
  }

  // 2-Item Parallel Production Plan
  const item1 = planItems[0];
  const item2 = planItems[1];

  const prod1 = products.find(p => p.id === item1?.productId) || {};
  const prod2 = products.find(p => p.id === item2?.productId) || {};

  const count1 = parseInt(inputs.item1BottlingCount) || 0;
  const remains1G = parseInt(inputs.item1BottlingRemainsG) || 0;
  const deduct1 = parseInt(inputs.item1DeductionQty) || 0;
  const unitWeight1G = prod1.weight || 300;

  const count2 = parseInt(inputs.item2BottlingCount) || 0;
  const remains2G = parseInt(inputs.item2BottlingRemainsG) || 0;
  const deduct2 = parseInt(inputs.item2DeductionQty) || 0;
  const unitWeight2G = prod2.weight || 300;

  const item1TotalG = (count1 * unitWeight1G) + remains1G;
  const item2TotalG = (count2 * unitWeight2G) + remains2G;

  const item1BaseYogurtG = toBaseYogurtG(prod1, item1TotalG);
  const item2BaseYogurtG = toBaseYogurtG(prod2, item2TotalG);

  const totalCombinedBaseYogurtG = item1BaseYogurtG + item2BaseYogurtG;
  const targetYield = baseProduct?.yield || 28;
  const actualYield = rawMaterialTotalG > 0 ? (totalCombinedBaseYogurtG / rawMaterialTotalG) * 100 : 0;

  return {
    isMultiItem: true,
    item1: {
      productId: item1?.productId || prod1.id,
      productName: prod1.name || '품목 1',
      count: count1,
      remainsG: remains1G,
      deduct: deduct1,
      unitWeightG: unitWeight1G,
      totalProducedG: item1TotalG,
      baseYogurtG: item1BaseYogurtG,
      stockedQty: Math.max(0, count1 - deduct1),
      expiryDate: getItemExpiryDate(item1, plan, prod1)
    },
    item2: {
      productId: item2?.productId || prod2.id,
      productName: prod2.name || '품목 2',
      count: count2,
      remainsG: remains2G,
      deduct: deduct2,
      unitWeightG: unitWeight2G,
      totalProducedG: item2TotalG,
      baseYogurtG: item2BaseYogurtG,
      stockedQty: Math.max(0, count2 - deduct2),
      expiryDate: getItemExpiryDate(item2, plan, prod2)
    },
    targetYield,
    actualYield: Number(actualYield.toFixed(2)),
    totalCombinedBaseYogurtG
  };
};

// Reflect a confirmed bottling report's stocked quantities into inventory (actual qty per product)
export const applyBottlingStockToInventory = (report, updateActualQty) => {
  const d = report.details;
  if (d.isMultiItem) {
    if (d.item1 && d.item1.productId) {
      const stocked = d.item1.stockedQty !== undefined ? d.item1.stockedQty : Math.max(0, (d.item1.count || 0) - (d.item1.deduct || 0));
      updateActualQty(report.planId, stocked, d.item1.productId);
    }
    if (d.item2 && d.item2.productId) {
      const stocked = d.item2.stockedQty !== undefined ? d.item2.stockedQty : Math.max(0, (d.item2.count || 0) - (d.item2.deduct || 0));
      updateActualQty(report.planId, stocked, d.item2.productId);
    }
  } else {
    const stocked = d.actualStockedQty !== undefined ? d.actualStockedQty : Math.max(0, (d.count || 0) - (d.deduct || 0));
    updateActualQty(report.planId, stocked, d.productId || null);
  }
};

// Date formatter helper (YYYY-MM-DD HH:mm)
export const formatReportDate = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
};

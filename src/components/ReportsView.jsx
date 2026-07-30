import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWysh } from '../WyshContext';
import AgitatorConfirmModal from './modals/AgitatorConfirmModal';
import FermentationReportForm from './reports/FermentationReportForm';
import WheyReportForm from './reports/WheyReportForm';
import BottlingReportForm from './reports/BottlingReportForm';
import SensoryReportForm from './reports/SensoryReportForm';

// Seed historical pH measurements for Wish Greek (위시그릭)
const WISH_GREEK_SEED_PH_DATA = [
  4.47, 4.46, 4.51, 4.42, 4.58, 4.51, 4.41, 4.36, 4.61, 4.42, 
  4.48, 4.46, 4.48, 4.46, 4.46, 4.67, 4.52, 4.46, 4.50, 4.48, 4.51
];

// Seed historical pH measurements for Mud Greek (머드그릭)
const MUD_GREEK_SEED_PH_DATA = [
  4.23, 4.33, 4.38, 4.29, 4.31, 4.20, 4.16, 4.30
];

const ReportsView = () => {
  const { plans, products, reports, addReport, updateReport, deleteReport, updateActualQty, isAdminLoggedIn } = useWysh();

  const lastInitializedPlanIdRef = useRef(null);

  // Active Report Type: fermentation, whey_separation, bottling, packaging
  const [activeReportType, setActiveReportType] = useState('fermentation');
  
  // Selected report for editing or viewing
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mobileSubTab, setMobileSubTab] = useState('form'); // 'form' or 'history' on mobile

  // Form states - General
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [workerName, setWorkerName] = useState('');
  
  // Checkbox states (Fermentation)
  const [checkedSterilization, setCheckedSterilization] = useState(false);
  const [checkedCooling, setCheckedCooling] = useState(false);
  const [checkedInoculation, setCheckedInoculation] = useState(false);
  const [checkedHeating, setCheckedHeating] = useState(false);
  const [checkedHeater, setCheckedHeater] = useState(false);
  const [checkedHeaterLow, setCheckedHeaterLow] = useState(false);
  const [checkedAgitator, setCheckedAgitator] = useState(false);
  const [isAgitatorModalOpen, setIsAgitatorModalOpen] = useState(false);

  // Detail input states (Fermentation)
  const [sterilizationTemp, setSterilizationTemp] = useState('');
  const [sterilizationTime, setSterilizationTime] = useState('');
  const [coolingTemp, setCoolingTemp] = useState('');
  const [inoculationTemp, setInoculationTemp] = useState('');
  const [heatingTemp, setHeatingTemp] = useState('');
  const [heaterTemp, setHeaterTemp] = useState('');

  // Form states (Whey Separation)
  const [wheyConsistency, setWheyConsistency] = useState('되직함');
  const [wheyConsistencyMemo, setWheyConsistencyMemo] = useState('');
  const [wheyForeignMatter, setWheyForeignMatter] = useState(false); // false: 발견 없음, true: 발견됨
  const [wheyForeignMatterDetail, setWheyForeignMatterDetail] = useState('');
  const [wheyBattCount, setWheyBattCount] = useState('');
  const [wheyLastBattWeightG, setWheyLastBattWeightG] = useState('');
  const [wheyTempUpper, setWheyTempUpper] = useState('');
  const [wheyTempLower, setWheyTempLower] = useState('');
  const [wheyPh, setWheyPh] = useState('');

  // Form states (Bottling Report - Single Item)
  const [bottlingCount, setBottlingCount] = useState('');
  const [bottlingRemainsG, setBottlingRemainsG] = useState('');
  const [bottlingDeductionQty, setBottlingDeductionQty] = useState('');
  const [bottlingMemo, setBottlingMemo] = useState('');

  // Form states (Bottling Report - 2-Item Parallel Production)
  const [item1BottlingCount, setItem1BottlingCount] = useState('');
  const [item1BottlingRemainsG, setItem1BottlingRemainsG] = useState('');
  const [item1DeductionQty, setItem1DeductionQty] = useState('');

  const [item2BottlingCount, setItem2BottlingCount] = useState('');
  const [item2BottlingRemainsG, setItem2BottlingRemainsG] = useState('');
  const [item2DeductionQty, setItem2DeductionQty] = useState('');

  // Form states (Sensory Evaluation Report)
  const [eval1Note, setEval1Note] = useState('');
  const [eval1Name, setEval1Name] = useState('');
  const [eval2Note, setEval2Note] = useState('');
  const [eval2Name, setEval2Name] = useState('');
  const [sensoryStatus, setSensoryStatus] = useState('partial'); // 'partial' or 'completed'
  const [selectedTargetKey, setSelectedTargetKey] = useState('');
  const [selectedSensoryProductId, setSelectedSensoryProductId] = useState('');

  // 1. Filtered plans for dropdown according to production pipeline stages
  const availablePlans = useMemo(() => {
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

      const format = (d) => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const dayStr = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${dayStr}`;
      };

      const startStr = format(monday);
      const endStr = format(sunday);

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
  }, [plans, reports, activeReportType, isEditing, selectedPlanId]);

  // Available targets for Sensory Evaluation (handles multi-item plan splitting like (계획명)_(제품명))
  const availableSensoryTargets = useMemo(() => {
    if (activeReportType !== 'sensory') return [];

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
  }, [plans, reports, activeReportType, isEditing, selectedTargetKey, products]);

  // Selected plan and product details
  const selectedPlanDetails = useMemo(() => {
    if (!selectedPlanId) return null;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return null;

    const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0 
      ? plan.items 
      : [{ productId: plan.productId, totalQty: plan.totalQty }];

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
        const baseIng = itemProd.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || itemProd.ingredients?.[0];
        const baseRatio = baseIng ? baseIng.ratio : 70;
        totalBaseYogurtG += itemInputWeightG * (baseRatio / 100);
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
  }, [selectedPlanId, plans, products]);

  // Product pH Configuration (Wish Greek vs Mud Greek vs Default)
  const productPhConfig = useMemo(() => {
    if (!selectedPlanDetails || !selectedPlanDetails.product) {
      return {
        name: '위시그릭',
        targetMin: 4.42,
        targetMax: 4.58,
        minScale: 4.20,
        maxScale: 4.80,
        seedData: WISH_GREEK_SEED_PH_DATA,
        defaultAvg: 4.49
      };
    }
    const prodName = selectedPlanDetails.product.name || '';
    if (prodName.includes('머드그릭') || prodName.includes('머드')) {
      return {
        name: '머드그릭',
        targetMin: 4.20,
        targetMax: 4.35,
        minScale: 4.00,
        maxScale: 4.50,
        seedData: MUD_GREEK_SEED_PH_DATA,
        defaultAvg: 4.28
      };
    }
    return {
      name: '위시그릭',
      targetMin: 4.42,
      targetMax: 4.58,
      minScale: 4.20,
      maxScale: 4.80,
      seedData: WISH_GREEK_SEED_PH_DATA,
      defaultAvg: 4.49
    };
  }, [selectedPlanDetails]);

  // Historical Average pH calculation for selected product (dynamic update with seed data)
  const historicalAvgPh = useMemo(() => {
    const config = productPhConfig;
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
  }, [selectedPlanDetails, reports, plans, products, productPhConfig]);

  // Real-time calculations for Whey Separation
  const wheyCalculations = useMemo(() => {
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
  }, [wheyBattCount, wheyLastBattWeightG, selectedPlanDetails]);

  // Helper to compute exact expiry date for a product item in a plan
  const getItemExpiryDate = (item, plan, prod) => {
    if (item && item.expiryDate) return item.expiryDate;
    
    let botDate = item?.bottlingDate || plan?.bottlingDate;
    if (!botDate && plan?.startDate) {
      const d = new Date(plan.startDate + 'T00:00:00');
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + 2);
        botDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    }

    const expiryDays = (prod && prod.expiryDays !== undefined) ? prod.expiryDays : 22;

    if (botDate) {
      const bd = new Date(botDate + 'T00:00:00');
      if (!isNaN(bd.getTime())) {
        bd.setDate(bd.getDate() + expiryDays);
        return `${bd.getFullYear()}-${String(bd.getMonth() + 1).padStart(2, '0')}-${String(bd.getDate()).padStart(2, '0')}`;
      }
    }

    if (plan?.expiryDate) return plan.expiryDate;

    return '-';
  };

  // Real-time calculations for Bottling Report (Single & 2-Item Parallel Plans)
  const bottlingCalculations = useMemo(() => {
    if (!selectedPlanDetails) return null;
    const { planItems, product, baseProduct, totalWeightSumG, totalInputWeightG, plan } = selectedPlanDetails;
    const isMultiItem = planItems && planItems.length > 1;
    const rawMaterialTotalG = totalWeightSumG || totalInputWeightG || 0;

    if (!isMultiItem) {
      // Single Item Production Plan
      const item0 = planItems && planItems[0];
      const actualProd = products.find(p => p.id === item0?.productId) || product || {};

      const count = parseInt(bottlingCount) || 0;
      const remainsG = parseInt(bottlingRemainsG) || 0;
      const deduct = parseInt(bottlingDeductionQty) || 0;
      const unitWeightG = actualProd.weight || 300;

      const totalBottledWeightG = (count * unitWeightG) + remainsG;

      // Base Yogurt weight calculation if actualProd is a flavor product
      let baseYogurtWeightG = totalBottledWeightG;
      if (actualProd.isFlavor) {
        const baseIng = actualProd.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || actualProd.ingredients?.[0];
        const baseRatio = baseIng ? baseIng.ratio : 70;
        baseYogurtWeightG = totalBottledWeightG * (baseRatio / 100);
      }

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
    } else {
      // 2-Item Parallel Production Plan
      const item1 = planItems[0];
      const item2 = planItems[1];

      const prod1 = products.find(p => p.id === item1?.productId) || {};
      const prod2 = products.find(p => p.id === item2?.productId) || {};

      const count1 = parseInt(item1BottlingCount) || 0;
      const remains1G = parseInt(item1BottlingRemainsG) || 0;
      const deduct1 = parseInt(item1DeductionQty) || 0;
      const unitWeight1G = prod1.weight || 300;

      const count2 = parseInt(item2BottlingCount) || 0;
      const remains2G = parseInt(item2BottlingRemainsG) || 0;
      const deduct2 = parseInt(item2DeductionQty) || 0;
      const unitWeight2G = prod2.weight || 300;

      const item1TotalG = (count1 * unitWeight1G) + remains1G;
      const item2TotalG = (count2 * unitWeight2G) + remains2G;

      // Base Yogurt weight calculation for Item 1 (flavor yogurt converted to base ratio)
      let item1BaseYogurtG = item1TotalG;
      if (prod1.isFlavor) {
        const baseIng = prod1.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || prod1.ingredients?.[0];
        const baseRatio = baseIng ? baseIng.ratio : 70;
        item1BaseYogurtG = item1TotalG * (baseRatio / 100);
      }

      // Base Yogurt weight calculation for Item 2
      let item2BaseYogurtG = item2TotalG;
      if (prod2.isFlavor) {
        const baseIng = prod2.ingredients?.find(ing => ing.name.includes('위시그릭') || ing.name.includes('플레인')) || prod2.ingredients?.[0];
        const baseRatio = baseIng ? baseIng.ratio : 70;
        item2BaseYogurtG = item2TotalG * (baseRatio / 100);
      }

      const totalCombinedBaseYogurtG = item1BaseYogurtG + item2BaseYogurtG;
      const targetYield = baseProduct?.yield || 28;
      const actualYield = rawMaterialTotalG > 0 ? (totalCombinedBaseYogurtG / rawMaterialTotalG) * 100 : 0;

      const item1StockedQty = Math.max(0, count1 - deduct1);
      const item2StockedQty = Math.max(0, count2 - deduct2);

      const expiryDate1 = getItemExpiryDate(item1, plan, prod1);
      const expiryDate2 = getItemExpiryDate(item2, plan, prod2);

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
          stockedQty: item1StockedQty,
          expiryDate: expiryDate1
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
          stockedQty: item2StockedQty,
          expiryDate: expiryDate2
        },
        targetYield,
        actualYield: Number(actualYield.toFixed(2)),
        totalCombinedBaseYogurtG
      };
    }
  }, [selectedPlanDetails, products, bottlingCount, bottlingRemainsG, bottlingDeductionQty, item1BottlingCount, item1BottlingRemainsG, item1DeductionQty, item2BottlingCount, item2BottlingRemainsG, item2DeductionQty]);

  // When plan changes, initialize details with product default settings (for fermentation)
  useEffect(() => {
    if (selectedPlanDetails && !isEditing && activeReportType === 'fermentation') {
      const planId = selectedPlanDetails.plan?.id;
      if (lastInitializedPlanIdRef.current === planId) {
        // Already initialized for this plan! Do not overwrite user inputs on background sync!
        return;
      }
      const prod = selectedPlanDetails.product;
      setSterilizationTemp(prod.defaultSterilizationTemp !== undefined ? prod.defaultSterilizationTemp : 85);
      setSterilizationTime(prod.defaultSterilizationTime !== undefined ? prod.defaultSterilizationTime : 30);
      setCoolingTemp(prod.defaultCoolingTemp !== undefined ? prod.defaultCoolingTemp : 40);
      setInoculationTemp(prod.defaultInoculationTemp !== undefined ? prod.defaultInoculationTemp : 42);
      setHeatingTemp(prod.defaultHeatingTemp !== undefined ? prod.defaultHeatingTemp : 43);
      setHeaterTemp(prod.defaultHeaterTemp !== undefined ? prod.defaultHeaterTemp : 44);
      
      setCheckedSterilization(false);
      setCheckedCooling(false);
      setCheckedInoculation(false);
      setCheckedHeating(false);
      setCheckedHeater(false);
      setCheckedHeaterLow(false);
      setCheckedAgitator(false);

      lastInitializedPlanIdRef.current = planId;
    } else {
      lastInitializedPlanIdRef.current = null;
    }
  }, [selectedPlanDetails, isEditing, activeReportType]);

  // Auto-fetched data for sensory evaluation report (from fermentation and whey separation)
  const sensoryAutoData = useMemo(() => {
    if (!selectedPlanId) return null;
    const fermRep = reports.find(r => r.type === 'fermentation' && r.planId === selectedPlanId);
    const wheyRep = reports.find(r => r.type === 'whey_separation' && r.planId === selectedPlanId);

    let targetProductName = selectedPlanDetails?.product?.name || '';
    if (selectedTargetKey) {
      const targetObj = availableSensoryTargets.find(t => t.key === selectedTargetKey);
      if (targetObj?.productName) {
        targetProductName = targetObj.productName;
      }
    } else if (selectedSensoryProductId) {
      const prodObj = products.find(p => p.id === selectedSensoryProductId);
      if (prodObj) targetProductName = prodObj.name;
    }

    return {
      productName: targetProductName,
      sterilizationTemp: fermRep?.details?.sterilizationTemp ?? '미작성',
      sterilizationTime: fermRep?.details?.sterilizationTime ?? '미작성',
      heatingTemp: fermRep?.details?.heatingTemp ?? '미작성',
      phValue: wheyRep?.details?.phValue ?? '미작성'
    };
  }, [reports, selectedPlanId, selectedTargetKey, availableSensoryTargets, selectedPlanDetails, selectedSensoryProductId, products]);

  // Handle target selection for sensory evaluation report
  const handleSensoryTargetChange = (targetKey) => {
    setSelectedTargetKey(targetKey);
    if (!targetKey) {
      setSelectedPlanId('');
      setSelectedSensoryProductId('');
      handleResetForm();
      return;
    }

    const [planId, prodId] = targetKey.includes('::') ? targetKey.split('::') : [targetKey, ''];
    setSelectedPlanId(planId);
    setSelectedSensoryProductId(prodId || '');

    // Check if an existing sensory report exists for this target
    const existingSensory = reports.find(r => 
      r.type === 'sensory' && 
      r.planId === planId && 
      (!prodId || r.details?.productId === prodId)
    );

    if (existingSensory) {
      handleSelectReport(existingSensory);
    } else {
      // Clear evaluator fields for new sensory report
      setSelectedReportId(null);
      setIsEditing(false);
      setEval1Note('');
      setEval1Name('');
      setEval2Note('');
      setEval2Name('');
      setSensoryStatus('partial');
    }
  };

  // Handle report selection for view/edit
  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setIsEditing(true);
    setSelectedPlanId(report.planId);
    setWorkerName(report.workerName);
    setMobileSubTab('form');

    if (report.type === 'bottling') {
      const d = report.details || {};
      setBottlingMemo(d.bottlingMemo || '');
      if (d.isMultiItem) {
        setItem1BottlingCount(d.item1?.count !== undefined ? d.item1.count : '');
        setItem1BottlingRemainsG(d.item1?.remainsG !== undefined ? d.item1.remainsG : '');
        setItem1DeductionQty(d.item1?.deduct !== undefined ? d.item1.deduct : '');

        setItem2BottlingCount(d.item2?.count !== undefined ? d.item2.count : '');
        setItem2BottlingRemainsG(d.item2?.remainsG !== undefined ? d.item2.remainsG : '');
        setItem2DeductionQty(d.item2?.deduct !== undefined ? d.item2.deduct : '');
      } else {
        setBottlingCount(d.count !== undefined ? d.count : '');
        setBottlingRemainsG(d.remainsG !== undefined ? d.remainsG : '');
        setBottlingDeductionQty(d.deduct !== undefined ? d.deduct : '');
      }
    } else if (report.type === 'whey_separation') {
      const d = report.details || {};
      setWheyConsistency(d.consistency || '되직함');
      setWheyConsistencyMemo(d.consistencyMemo || '');
      setWheyForeignMatter(!!d.foreignMatter);
      setWheyForeignMatterDetail(d.foreignMatterDetail || '');
      setWheyBattCount(d.battCount !== undefined ? d.battCount : '');
      setWheyLastBattWeightG(d.lastBattWeightG !== undefined ? d.lastBattWeightG : '');
      setWheyTempUpper(d.tempUpper !== undefined ? d.tempUpper : '');
      setWheyTempLower(d.tempLower !== undefined ? d.tempLower : '');
      setWheyPh(d.phValue !== undefined ? d.phValue : '');
    } else if (report.type === 'sensory') {
      const d = report.details || {};
      setSensoryStatus(d.sensoryStatus || 'partial');
      setEval1Note(d.evaluator1?.note || '');
      setEval1Name(d.evaluator1?.name || report.workerName || '');
      setEval2Note(d.evaluator2?.note || '');
      setEval2Name(d.evaluator2?.name || '');
      const prodId = d.productId || '';
      setSelectedSensoryProductId(prodId);
      const targetKey = d.targetKey || (prodId ? `${report.planId}::${prodId}` : report.planId);
      setSelectedTargetKey(targetKey);
    } else {
      const checked = report.checkedItems || [];
      setCheckedSterilization(checked.includes('sterilization'));
      setCheckedCooling(checked.includes('cooling'));
      setCheckedInoculation(checked.includes('inoculation'));
      setCheckedHeating(checked.includes('heating'));
      setCheckedHeater(checked.includes('heater'));
      setCheckedHeaterLow(checked.includes('heater_low'));
      setCheckedAgitator(checked.includes('agitator'));

      const d = report.details || {};
      setSterilizationTemp(d.sterilizationTemp || 85);
      setSterilizationTime(d.sterilizationTime || 30);
      setCoolingTemp(d.coolingTemp || 40);
      setInoculationTemp(d.inoculationTemp || 42);
      setHeatingTemp(d.heatingTemp || 43);
      setHeaterTemp(d.heaterTemp || 44);
    }
  };

  const handleToggleAgitator = (e) => {
    const nextValIsOn = e.target.checked;
    if (!nextValIsOn) {
      setIsAgitatorModalOpen(true);
    } else {
      setCheckedAgitator(false);
    }
  };

  // Reset form
  const handleResetForm = () => {
    setSelectedReportId(null);
    setIsEditing(false);
    setSelectedPlanId('');
    setWorkerName('');
    
    // Fermentation resets
    setCheckedSterilization(false);
    setCheckedCooling(false);
    setCheckedInoculation(false);
    setCheckedHeating(false);
    setCheckedHeater(false);
    setCheckedHeaterLow(false);
    setCheckedAgitator(false);
    setSterilizationTemp('');
    setSterilizationTime('');
    setCoolingTemp('');
    setInoculationTemp('');
    setHeatingTemp('');
    setHeaterTemp('');

    // Whey separation resets
    setWheyConsistency('되직함');
    setWheyConsistencyMemo('');
    setWheyForeignMatter(false);
    setWheyForeignMatterDetail('');
    setWheyBattCount('');
    setWheyLastBattWeightG('');
    setWheyTempUpper('');
    setWheyTempLower('');
    setWheyPh('');

    // Bottling resets
    setBottlingCount('');
    setBottlingRemainsG('');
    setBottlingDeductionQty('');
    setBottlingMemo('');
    setItem1BottlingCount('');
    setItem1BottlingRemainsG('');
    setItem1DeductionQty('');
    setItem2BottlingCount('');
    setItem2BottlingRemainsG('');
    setItem2DeductionQty('');

    // Sensory resets
    setEval1Note('');
    setEval1Name('');
    setEval2Note('');
    setEval2Name('');
    setSensoryStatus('partial');
    setSelectedTargetKey('');
    setSelectedSensoryProductId('');
  };

  // Handle form submit (save or update)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      alert('생산 계획을 선택해주세요.');
      return;
    }

    if (activeReportType === 'sensory') {
      if (!selectedTargetKey && !selectedPlanId) {
        alert('관능검사 대상 생산 건을 선택해 주세요.');
        return;
      }
      if (!eval1Note.trim() || !eval1Name.trim()) {
        alert('1차 평가자의 관능평가 소감과 서명(이름)을 모두 작성해 주세요.');
        return;
      }

      let nextStatus = 'partial';
      if (eval2Note.trim() && eval2Name.trim()) {
        nextStatus = 'completed';
      }

      const targetObj = availableSensoryTargets.find(t => t.key === selectedTargetKey);
      const targetProdName = sensoryAutoData?.productName || targetObj?.productName || selectedPlanDetails?.product?.name || '';
      const targetProdId = selectedSensoryProductId || targetObj?.productId || selectedPlanDetails?.product?.id || '';

      const existingReport = isEditing 
        ? reports.find(r => r.id === selectedReportId) 
        : reports.find(r => r.type === 'sensory' && r.planId === selectedPlanId && (r.details?.productId === targetProdId || !targetProdId));
      
      const existingDetails = existingReport?.details || {};

      const reportData = {
        planId: selectedPlanId,
        type: 'sensory',
        workerName: eval1Name.trim(),
        confirmed: isEditing && existingReport ? existingReport.confirmed : false,
        checkedItems: [],
        details: {
          productId: targetProdId,
          productName: targetProdName,
          targetKey: selectedTargetKey,
          isMultiItem: selectedTargetKey.includes('::') || targetObj?.isMultiItem,
          sterilizationTemp: sensoryAutoData?.sterilizationTemp,
          sterilizationTime: sensoryAutoData?.sterilizationTime,
          heatingTemp: sensoryAutoData?.heatingTemp,
          phValue: sensoryAutoData?.phValue,
          sensoryStatus: nextStatus,
          evaluator1: {
            note: eval1Note.trim(),
            name: eval1Name.trim(),
            savedAt: existingDetails.evaluator1?.savedAt || new Date().toISOString()
          },
          evaluator2: (eval2Note.trim() && eval2Name.trim()) ? {
            note: eval2Note.trim(),
            name: eval2Name.trim(),
            savedAt: existingDetails.evaluator2?.savedAt || new Date().toISOString()
          } : (existingDetails.evaluator2 || null)
        }
      };

      if ((isEditing && selectedReportId) || existingReport) {
        const targetId = selectedReportId || existingReport.id;
        const targetObjInReports = reports.find(r => r.id === targetId);
        updateReport({
          ...targetObjInReports,
          ...reportData
        });
        alert(`관능검사 리포트가 성공적으로 저장되었습니다. (상태: ${nextStatus === 'completed' ? '최종 완료' : '1차 완료'})`);
      } else {
        addReport(reportData);
        alert(`관능검사 리포트가 성공적으로 등록되었습니다. (상태: ${nextStatus === 'completed' ? '최종 완료' : '1차 완료'})`);
      }

      handleResetForm();
      setMobileSubTab('history');
      return;
    }

    if (!workerName.trim()) {
      alert('확인자 서명을 작성해주세요.');
      return;
    }

    if (activeReportType === 'bottling') {
      if (bottlingCalculations?.isMultiItem) {
        if (item1BottlingCount === '' || item2BottlingCount === '') {
          alert('두 품목의 병입 수량을 모두 입력해주세요.');
          return;
        }
      } else {
        if (bottlingCount === '') {
          alert('병입 완제품 수량을 입력해주세요.');
          return;
        }
      }

      const isConfirmed = isEditing ? (reports.find(r => r.id === selectedReportId)?.confirmed || false) : false;

      const reportData = {
        planId: selectedPlanId,
        type: 'bottling',
        workerName: workerName.trim(),
        confirmed: isConfirmed,
        checkedItems: [],
        details: {
          productId: selectedPlanDetails?.product?.id,
          productName: selectedPlanDetails?.product?.name,
          isMultiItem: bottlingCalculations?.isMultiItem,
          bottlingMemo: bottlingMemo.trim(),
          targetYield: bottlingCalculations?.targetYield,
          actualYield: bottlingCalculations?.actualYield,
          ...(bottlingCalculations?.isMultiItem ? {
            item1: bottlingCalculations.item1,
            item2: bottlingCalculations.item2,
            totalCombinedBaseYogurtG: bottlingCalculations.totalCombinedBaseYogurtG
          } : {
            count: bottlingCalculations.count,
            remainsG: bottlingCalculations.remainsG,
            deduct: bottlingCalculations.deduct,
            unitWeightG: bottlingCalculations.unitWeightG,
            totalBottledWeightG: bottlingCalculations.totalBottledWeightG,
            actualStockedQty: bottlingCalculations.actualStockedQty,
            expiryDate: bottlingCalculations.expiryDate
          })
        }
      };

      if (isEditing && selectedReportId) {
        const existing = reports.find(r => r.id === selectedReportId);
        const updatedReport = {
          ...existing,
          ...reportData
        };
        updateReport(updatedReport);

        if (updatedReport.confirmed && updatedReport.details) {
          const d = updatedReport.details;
          if (d.isMultiItem) {
            if (d.item1 && d.item1.productId) {
              const stocked = d.item1.stockedQty !== undefined ? d.item1.stockedQty : Math.max(0, (d.item1.count || 0) - (d.item1.deduct || 0));
              updateActualQty(updatedReport.planId, stocked, d.item1.productId);
            }
            if (d.item2 && d.item2.productId) {
              const stocked = d.item2.stockedQty !== undefined ? d.item2.stockedQty : Math.max(0, (d.item2.count || 0) - (d.item2.deduct || 0));
              updateActualQty(updatedReport.planId, stocked, d.item2.productId);
            }
          } else {
            const stocked = d.actualStockedQty !== undefined ? d.actualStockedQty : Math.max(0, (d.count || 0) - (d.deduct || 0));
            updateActualQty(updatedReport.planId, stocked, d.productId || null);
          }
        }

        alert('병입 리포트가 성공적으로 수정되었습니다.');
      } else {
        addReport(reportData);
        alert('병입 리포트가 성공적으로 등록되었습니다. (관리자 승인 대기 상태)');
      }

      handleResetForm();
      setMobileSubTab('history');
      return;
    }

    if (activeReportType === 'whey_separation') {
      if (wheyBattCount === '' || wheyLastBattWeightG === '') {
        alert('밧드 개수와 마지막 밧드 무게(g)를 입력해주세요.');
        return;
      }
      if (!wheyTempUpper || !wheyTempLower) {
        alert('탱크 윗부분 및 아랫부분 온도를 입력해주세요.');
        return;
      }
      if (!wheyPh) {
        alert('pH 수치를 입력해주세요.');
        return;
      }

      const config = productPhConfig;
      const isConfirmed = isEditing ? (reports.find(r => r.id === selectedReportId)?.confirmed || false) : false;

      const reportData = {
        planId: selectedPlanId,
        type: 'whey_separation',
        workerName: workerName.trim(),
        confirmed: isConfirmed,
        checkedItems: [],
        details: {
          productId: selectedPlanDetails?.product?.id,
          productName: selectedPlanDetails?.product?.name,
          targetMin: config.targetMin,
          targetMax: config.targetMax,
          consistency: wheyConsistency,
          consistencyMemo: wheyConsistencyMemo.trim(),
          foreignMatter: wheyForeignMatter,
          foreignMatterDetail: wheyForeignMatter ? wheyForeignMatterDetail.trim() : '',
          battCount: wheyCalculations.batts,
          lastBattWeightG: wheyCalculations.lastG,
          totalYieldG: wheyCalculations.totalYieldG,
          targetRawMaterialG: wheyCalculations.targetRawMaterialG,
          lossRatePercent: Number(wheyCalculations.lossPercent.toFixed(2)),
          tempUpper: parseFloat(wheyTempUpper),
          tempLower: parseFloat(wheyTempLower),
          phValue: parseFloat(wheyPh),
          avgPhValue: historicalAvgPh ? Number(historicalAvgPh.toFixed(2)) : null
        }
      };

      if (isEditing && selectedReportId) {
        const existing = reports.find(r => r.id === selectedReportId);
        updateReport({
          ...existing,
          ...reportData
        });
        alert('유청분리 리포트가 성공적으로 수정되었습니다.');
      } else {
        addReport(reportData);
        alert('유청분리 리포트가 성공적으로 등록되었습니다. (관리자 승인 대기 상태)');
      }

      handleResetForm();
      setMobileSubTab('history');
      return;
    }

    // Fermentation submit logic
    const checkedItems = [];
    if (checkedSterilization) checkedItems.push('sterilization');
    if (checkedCooling) checkedItems.push('cooling');
    if (checkedInoculation) checkedItems.push('inoculation');
    if (checkedHeating) checkedItems.push('heating');
    if (checkedHeater) checkedItems.push('heater');
    if (checkedHeaterLow) checkedItems.push('heater_low');
    if (checkedAgitator) checkedItems.push('agitator');

    const isConfirmed = isEditing ? (reports.find(r => r.id === selectedReportId)?.confirmed || false) : false;

    const reportData = {
      planId: selectedPlanId,
      type: 'fermentation',
      workerName: workerName.trim(),
      confirmed: isConfirmed,
      checkedItems,
      details: {
        productId: selectedPlanDetails?.product?.id,
        productName: selectedPlanDetails?.product?.name,
        sterilizationTemp: parseFloat(sterilizationTemp) || 85,
        sterilizationTime: parseInt(sterilizationTime) || 30,
        coolingTemp: parseFloat(coolingTemp) || 40,
        inoculationTemp: parseFloat(inoculationTemp) || 42,
        heatingTemp: parseFloat(heatingTemp) || 43,
        heaterTemp: parseFloat(heaterTemp) || 44
      }
    };

    if (isEditing && selectedReportId) {
      const existing = reports.find(r => r.id === selectedReportId);
      updateReport({
        ...existing,
        ...reportData
      });
      alert('발효 리포트가 안전하게 수정되었습니다.');
    } else {
      addReport(reportData);
      alert('발효 리포트가 안전하게 등록되었습니다.');
    }

    handleResetForm();
    setMobileSubTab('history');
  };

  // Report confirmation handler
  const handleConfirmReport = (report, e) => {
    if (e) e.stopPropagation();
    if (!isAdminLoggedIn && report.type !== 'sensory') {
      alert('관리자 로그인 후에 확인 처리를 진행할 수 있습니다.');
      return;
    }

    if (window.confirm('이 리포트를 승인/확인 완료 처리하시겠습니까?')) {
      const confirmedTime = new Date().toISOString();
      const updated = {
        ...report,
        confirmed: true,
        confirmedAt: confirmedTime,
        details: {
          ...(report.details || {}),
          confirmed: true,
          confirmedAt: confirmedTime
        }
      };

      updateReport(updated);

      // If it's a Bottling Report, update actual stock in inventory automatically!
      if (report.type === 'bottling' && report.details) {
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
      }
    }
  };

  // Handle delete report
  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (window.confirm('정말로 이 리포트를 삭제하시겠습니까?')) {
      deleteReport(id);
      if (selectedReportId === id) {
        handleResetForm();
      }
    }
  };

  // Filtered reports list
  const filteredReports = useMemo(() => {
    return reports
      .filter(r => r.type === activeReportType)
      .sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
  }, [reports, activeReportType]);

  // Find plan name for display
  const getPlanName = (planId) => {
    const plan = plans.find(p => p.id === planId);
    return plan ? plan.name : planId;
  };

  const getProductColor = (planId) => {
    const plan = plans.find(p => p.id === planId);
    if (!plan) return 'blue';
    const prod = products.find(p => p.id === plan.productId);
    return prod ? prod.color : 'blue';
  };

  // Date formatter helper
  const formatReportDate = (isoString) => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const min = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${d} ${h}:${min}`;
  };

  // Helper renderer for pH gauge scale
  const renderPhGauge = (currentPhVal) => {
    const config = productPhConfig;
    const targetAvg = historicalAvgPh !== null ? historicalAvgPh : config.defaultAvg;
    const val = parseFloat(currentPhVal);

    if (isNaN(val)) {
      return (
        <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '8px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
          💡 [{config.name}] 누적 평균 pH: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>{targetAvg.toFixed(2)}</strong> (적정 범위: {config.targetMin.toFixed(2)} ~ {config.targetMax.toFixed(2)})
        </div>
      );
    }

    const minScale = config.minScale;
    const maxScale = config.maxScale;
    const clampedVal = Math.min(Math.max(val, minScale), maxScale);
    const percent = ((clampedVal - minScale) / (maxScale - minScale)) * 100;

    const isTooAcidic = val < config.targetMin;
    const isAboveUpper = val > config.targetMax;

    const diff = (val - targetAvg).toFixed(2);
    const diffText = parseFloat(diff) > 0 ? `+${diff}` : `${diff}`;

    let statusText = '적정 산도 범위 (정상)';
    let statusBg = 'rgba(16, 185, 129, 0.15)';
    let statusColor = '#10b981';

    if (isTooAcidic) {
      statusText = '⚠️ 산도 높음 (신맛 주의)';
      statusBg = 'rgba(239, 68, 68, 0.15)';
      statusColor = '#ef4444';
    } else if (isAboveUpper) {
      statusText = `ℹ️ pH ${config.targetMax.toFixed(2)} 초과`;
      statusBg = 'rgba(2, 132, 199, 0.15)';
      statusColor = '#0284c7'; // 파란색 표시
    }

    return (
      <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', fontSize: '0.84rem' }}>
          <div>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>오늘의 pH: </span>
            <strong style={{ fontSize: '1.05rem', color: statusColor, fontFamily: 'var(--font-outfit)' }}>
              {val.toFixed(2)}
            </strong>
            <span style={{ marginLeft: '8px', fontSize: '0.75rem', padding: '3px 8px', borderRadius: '10px', background: statusBg, color: statusColor, fontWeight: 700 }}>
              {statusText}
            </span>
          </div>

          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
            [{config.name}] 누적 평균: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>{targetAvg.toFixed(2)}</strong>
            <span style={{ marginLeft: '6px', fontWeight: 700, color: parseFloat(diff) > 0 ? '#0284c7' : (parseFloat(diff) < 0 ? '#ef4444' : '#10b981') }}>
              ({diffText})
            </span>
          </div>
        </div>

        {/* Visual Gauge Bar */}
        <div style={{ position: 'relative', height: '14px', borderRadius: '7px', background: '#e2e8f0', overflow: 'hidden', margin: '10px 0 4px 0' }}>
          {/* Target zone background highlight */}
          <div 
            style={{ 
              position: 'absolute', 
              left: `${((config.targetMin - minScale) / (maxScale - minScale)) * 100}%`, 
              width: `${((config.targetMax - config.targetMin) / (maxScale - minScale)) * 100}%`, 
              height: '100%', 
              background: 'rgba(16, 185, 129, 0.3)' 
            }} 
          />
          {/* Active pointer bar */}
          <div 
            style={{ 
              position: 'absolute', 
              left: `calc(${percent}% - 4px)`, 
              width: '8px', 
              height: '100%', 
              background: statusColor, 
              borderRadius: '4px',
              boxShadow: '0 0 6px rgba(0,0,0,0.3)',
              transition: 'all 0.3s ease'
            }} 
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', fontFamily: 'var(--font-outfit)' }}>
          <span>{minScale.toFixed(2)} (신맛 주의)</span>
          <span style={{ color: '#10b981', fontWeight: 700 }}>[{config.name}] 적정 범위 {config.targetMin.toFixed(2)} ~ {config.targetMax.toFixed(2)}</span>
          <span>{maxScale.toFixed(2)}</span>
        </div>
      </div>
    );
  };

  const unconfirmedFermentationCount = reports.filter(r => r.type === 'fermentation' && !r.confirmed).length;
  const unconfirmedWheyCount = reports.filter(r => r.type === 'whey_separation' && !r.confirmed).length;
  const unconfirmedBottlingCount = reports.filter(r => r.type === 'bottling' && !r.confirmed).length;
  const unconfirmedSensoryCount = reports.filter(r => r.type === 'sensory' && !r.confirmed).length;

  return (
    <div className="recipe-split" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Category selector */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div className="report-category-grid" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className={`btn-secondary ${activeReportType === 'fermentation' ? 'active' : ''}`}
            onClick={() => { setActiveReportType('fermentation'); handleResetForm(); }}
            style={{ 
              flex: '1 1 130px', 
              minWidth: '120px',
              justifyContent: 'center', 
              padding: '10px 8px', 
              borderRadius: '10px', 
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
              background: activeReportType === 'fermentation' ? 'var(--color-primary)' : '',
              color: activeReportType === 'fermentation' ? '#fff' : '',
              borderColor: activeReportType === 'fermentation' ? 'var(--color-primary)' : '',
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <span>🥛 발효 리포트</span>
            {isAdminLoggedIn && unconfirmedFermentationCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold',
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                lineHeight: '1',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}>
                미확인 {unconfirmedFermentationCount}
              </span>
            )}
          </button>
          
          <button 
            className={`btn-secondary ${activeReportType === 'whey_separation' ? 'active' : ''}`}
            onClick={() => { setActiveReportType('whey_separation'); handleResetForm(); }}
            style={{ 
              flex: '1 1 130px', 
              minWidth: '120px',
              justifyContent: 'center', 
              padding: '10px 8px', 
              borderRadius: '10px', 
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
              background: activeReportType === 'whey_separation' ? 'var(--color-primary)' : '',
              color: activeReportType === 'whey_separation' ? '#fff' : '',
              borderColor: activeReportType === 'whey_separation' ? 'var(--color-primary)' : '',
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <span>💧 유청분리 리포트</span>
            {isAdminLoggedIn && unconfirmedWheyCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold',
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                lineHeight: '1',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}>
                미확인 {unconfirmedWheyCount}
              </span>
            )}
          </button>
          
          <button 
            className={`btn-secondary ${activeReportType === 'bottling' ? 'active' : ''}`}
            onClick={() => { setActiveReportType('bottling'); handleResetForm(); }}
            style={{ 
              flex: '1 1 130px', 
              minWidth: '120px',
              justifyContent: 'center', 
              padding: '10px 8px', 
              borderRadius: '10px', 
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
              background: activeReportType === 'bottling' ? 'var(--color-primary)' : '',
              color: activeReportType === 'bottling' ? '#fff' : '',
              borderColor: activeReportType === 'bottling' ? 'var(--color-primary)' : '',
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <span>🍾 병입 리포트</span>
            {isAdminLoggedIn && unconfirmedBottlingCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold',
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                lineHeight: '1',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}>
                미확인 {unconfirmedBottlingCount}
              </span>
            )}
          </button>

          <button 
            className={`btn-secondary ${activeReportType === 'sensory' ? 'active' : ''}`}
            onClick={() => { setActiveReportType('sensory'); handleResetForm(); }}
            style={{ 
              flex: '1 1 130px', 
              minWidth: '120px',
              justifyContent: 'center', 
              padding: '10px 8px', 
              borderRadius: '10px', 
              fontWeight: 700,
              fontSize: '0.88rem',
              letterSpacing: '-0.01em',
              background: activeReportType === 'sensory' ? 'var(--color-primary)' : '',
              color: activeReportType === 'sensory' ? '#fff' : '',
              borderColor: activeReportType === 'sensory' ? 'var(--color-primary)' : '',
              display: 'inline-flex',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '4px'
            }}
          >
            <span>👤 관능검사 리포트</span>
            {unconfirmedSensoryCount > 0 && (
              <span style={{
                backgroundColor: '#ef4444',
                color: '#ffffff',
                fontSize: '0.7rem',
                padding: '2px 6px',
                borderRadius: '10px',
                fontWeight: 'bold',
                marginLeft: '4px',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 4px rgba(239, 68, 68, 0.2)',
                lineHeight: '1',
                flexShrink: 0,
                whiteSpace: 'nowrap'
              }}>
                미확인 {unconfirmedSensoryCount}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Mobile-only sub-tab selector (신규 작성 / 이력 보기) */}
      <div className="mobile-subtab-container" style={{ display: 'none', background: 'var(--bg-secondary)', padding: '6px', borderRadius: '12px', border: '1px solid var(--border-color)', gap: '6px', width: '100%', boxSizing: 'border-box' }}>
        <button
          type="button"
          onClick={() => setMobileSubTab('form')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            background: mobileSubTab === 'form' ? 'var(--color-primary)' : 'transparent',
            color: mobileSubTab === 'form' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4z"></path></svg>
          리포트 작성
        </button>
        <button
          type="button"
          onClick={() => setMobileSubTab('history')}
          style={{
            flex: 1,
            padding: '10px',
            borderRadius: '8px',
            fontSize: '0.86rem',
            fontWeight: 700,
            background: mobileSubTab === 'history' ? 'var(--color-primary)' : 'transparent',
            color: mobileSubTab === 'history' ? '#fff' : 'var(--text-secondary)',
            border: 'none',
            cursor: 'pointer',
            transition: 'var(--transition-smooth)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          작성 이력 ({filteredReports.length})
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="report-grid-container">
        
        {/* Layout responsive grid and toggle switch CSS */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 1024px) {
            .report-grid-container {
              grid-template-columns: 1fr 1.3fr !important;
            }
          }
          
          .wysh-switch {
            position: relative;
            display: inline-block;
            width: 52px;
            height: 28px;
            flex-shrink: 0;
          }
          .wysh-switch input {
            opacity: 0;
            width: 0;
            height: 0;
          }
          .wysh-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: #cbd5e1;
            transition: .3s;
            border-radius: 28px;
          }
          .wysh-slider:before {
            position: absolute;
            content: "";
            height: 20px;
            width: 20px;
            left: 4px;
            bottom: 4px;
            background-color: white;
            transition: .3s;
            border-radius: 50%;
            box-shadow: 0 1px 3px rgba(0,0,0,0.15);
          }
          .wysh-switch input:checked + .wysh-slider {
            background-color: var(--color-warning, #f59e0b);
          }
          .wysh-switch input:checked + .wysh-slider:before {
            transform: translateX(24px);
          }

          .chip-button {
            background: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-secondary);
            padding: 6px 14px;
            border-radius: 20px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            transition: var(--transition-smooth);
          }
          .chip-button.active {
            background: var(--color-primary);
            color: #fff;
            border-color: var(--color-primary);
          }
        `}} />

        {/* Left: History list */}
        <div className={`glass-card report-history-card ${mobileSubTab === 'history' ? 'mobile-active' : 'mobile-inactive'}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {activeReportType === 'sensory' ? '👤 관능검사 리포트 작성 이력' : (activeReportType === 'bottling' ? '🍾 병입 리포트 작성 이력' : (activeReportType === 'whey_separation' ? '💧 유청분리 리포트 작성 이력' : '🥛 발효 리포트 작성 이력'))}
            </h3>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 10px', borderRadius: '12px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
              {filteredReports.length} 건
            </span>
          </div>

          <div className="report-history-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '720px', overflowY: 'auto' }}>
            {filteredReports.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>작성된 {activeReportType === 'sensory' ? '관능검사' : (activeReportType === 'bottling' ? '병입' : (activeReportType === 'whey_separation' ? '유청분리' : '발효'))} 리포트가 없습니다.</p>
              </div>
            ) : (
              filteredReports.map(rep => {
                const targetMin = rep.details?.targetMin || 4.20;
                const targetMax = rep.details?.targetMax || 4.58;
                const repPh = rep.details?.phValue;

                let phBadgeBg = 'rgba(168, 85, 247, 0.1)';
                let phBadgeColor = '#9333ea';

                if (repPh !== undefined) {
                  if (repPh < targetMin) {
                    phBadgeBg = 'rgba(239, 68, 68, 0.15)';
                    phBadgeColor = '#ef4444';
                  } else if (repPh > targetMax) {
                    phBadgeBg = 'rgba(2, 132, 199, 0.15)';
                    phBadgeColor = '#0284c7';
                  }
                }

                return (
                  <div 
                    key={rep.id} 
                    className={`product-item ${selectedReportId === rep.id ? 'active' : ''}`}
                    onClick={() => handleSelectReport(rep)}
                    style={{ 
                      cursor: 'pointer', 
                      padding: '16px', 
                      borderRadius: '12px', 
                      borderLeft: rep.confirmed 
                        ? `5px solid var(--color-${getProductColor(rep.planId)})` 
                        : '5px solid #f59e0b',
                      background: selectedReportId === rep.id 
                        ? 'var(--bg-tertiary)' 
                        : (rep.confirmed ? 'var(--bg-secondary)' : 'rgba(245, 158, 11, 0.08)'),
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'var(--transition-smooth)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px 12px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', minWidth: '0', flex: '1 1 auto' }}>
                        <span 
                          style={{ 
                            fontWeight: 700, 
                            fontSize: '0.92rem', 
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            maxWidth: '180px',
                            wordBreak: 'keep-all'
                          }}
                          title={rep.type === 'sensory' && rep.details?.productName && rep.details?.isMultiItem ? `${getPlanName(rep.planId)}_${rep.details.productName}` : getPlanName(rep.planId)}
                        >
                          {rep.type === 'sensory' && rep.details?.productName && rep.details?.isMultiItem ? `${getPlanName(rep.planId)}_${rep.details.productName}` : getPlanName(rep.planId)}
                        </span>
                        {rep.confirmed ? (
                          <span style={{ fontSize: '0.72rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '2px 7px', borderRadius: '6px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            ✓ 확인완료
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', background: 'rgba(245, 158, 11, 0.2)', color: '#b45309', padding: '2px 7px', borderRadius: '6px', fontWeight: 700, flexShrink: 0, whiteSpace: 'nowrap' }}>
                            ⚠️ 미확인
                          </span>
                        )}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                        {(isAdminLoggedIn || rep.type === 'sensory') && !rep.confirmed && (
                          <button 
                            className="btn-primary"
                            onClick={(e) => handleConfirmReport(rep, e)}
                            style={{ 
                              padding: '3px 9px', 
                              fontSize: '0.75rem', 
                              borderRadius: '6px', 
                              fontWeight: 700, 
                              background: 'linear-gradient(135deg, #10b981, #059669)', 
                              border: 'none', 
                              whiteSpace: 'nowrap',
                              boxShadow: '0 2px 4px rgba(16, 185, 129, 0.2)',
                              cursor: 'pointer'
                            }}
                          >
                            ✓ 확인
                          </button>
                        )}
                        <button 
                          className="btn-delete-tiny" 
                          onClick={(e) => handleDelete(rep.id, e)}
                          style={{ padding: '4px', opacity: 0.7 }}
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Whey separation summary badges */}
                    {rep.type === 'whey_separation' && rep.details && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.76rem', wordBreak: 'keep-all' }}>
                        <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          묽기: {rep.details.consistency}
                        </span>
                        <span style={{ background: rep.details.foreignMatter ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: rep.details.foreignMatter ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          {rep.details.foreignMatter ? '⚠️ 이물질 발견' : '✓ 이물질 없음'}
                        </span>
                        <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
                          추출량: {((rep.details.totalYieldG || 0) / 1000).toFixed(1)}kg ({rep.details.lossRatePercent || 0}% 로스)
                        </span>
                        <span style={{ 
                          background: phBadgeBg, 
                          color: phBadgeColor, 
                          padding: '2px 8px', 
                          borderRadius: '6px', 
                          fontWeight: 700, 
                          fontFamily: 'var(--font-outfit)' 
                        }}>
                          pH {rep.details.phValue}
                        </span>
                      </div>
                    )}

                    {/* Bottling summary badges */}
                    {rep.type === 'bottling' && rep.details && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', wordBreak: 'keep-all' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
                            🍾 병입 완료
                          </span>
                          <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
                            수율: {rep.details.actualYield}% (목표 {rep.details.targetYield}%)
                          </span>
                        </div>

                        {!rep.details.isMultiItem ? (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                            <span style={{ background: 'var(--bg-tertiary)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>
                              입고량: {rep.details.actualStockedQty}개 {rep.details.remainsG ? `(+남은 ${rep.details.remainsG}g)` : ''}
                            </span>
                            {rep.details.expiryDate && (
                              <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
                                📅 소비기한: {rep.details.expiryDate}
                              </span>
                            )}
                          </div>
                        ) : (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '8px' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600, flexWrap: 'wrap', gap: '4px' }}>
                              <span style={{ wordBreak: 'keep-all' }}>{rep.details.item1?.productName} ({rep.details.item1?.stockedQty}개 입고)</span>
                              <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)', fontWeight: 700, whiteSpace: 'nowrap' }}>📅 소비기한: {rep.details.item1?.expiryDate}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600, flexWrap: 'wrap', gap: '4px' }}>
                              <span style={{ wordBreak: 'keep-all' }}>{rep.details.item2?.productName} ({rep.details.item2?.stockedQty}개 입고)</span>
                              <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)', fontWeight: 700, whiteSpace: 'nowrap' }}>📅 소비기한: {rep.details.item2?.expiryDate}</span>
                            </div>
                          </div>
                        )}

                        {rep.details.bottlingMemo && (
                          <div>
                            <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, wordBreak: 'keep-all' }}>
                              📝 {rep.details.bottlingMemo}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Sensory evaluation summary badges */}
                    {rep.type === 'sensory' && rep.details && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', wordBreak: 'keep-all' }}>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                          <span style={{ 
                            background: rep.details.sensoryStatus === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)', 
                            color: rep.details.sensoryStatus === 'completed' ? '#10b981' : '#b45309', 
                            padding: '2px 8px', 
                            borderRadius: '6px', 
                            fontWeight: 700 
                          }}>
                            {rep.details.sensoryStatus === 'completed' ? '✓ 최종 완료 (2인 평가)' : '⏳ 1차 완료 (2차 평가 대기)'}
                          </span>
                        </div>
                        {rep.details.evaluator1 && (
                          <div style={{ background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>평가자 1 ({rep.details.evaluator1.name}):</strong> {rep.details.evaluator1.note}
                          </div>
                        )}
                        {rep.details.evaluator2 && (
                          <div style={{ background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
                            <strong style={{ color: 'var(--text-primary)' }}>평가자 2 ({rep.details.evaluator2.name}):</strong> {rep.details.evaluator2.note}
                          </div>
                        )}
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
                      <span>확인자: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rep.workerName}</strong></span>
                      <span style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontWeight: 500 }}>{formatReportDate(rep.createdAt)}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Report Form */}
        <div className={`glass-card report-form-card ${mobileSubTab === 'form' ? 'mobile-active' : 'mobile-inactive'}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {isEditing 
                ? (activeReportType === 'sensory' ? '관능검사 리포트 수정 / 상세조회' : (activeReportType === 'bottling' ? '병입 리포트 수정 / 상세조회' : (activeReportType === 'whey_separation' ? '유청분리 리포트 수정 / 상세조회' : '발효 리포트 수정 / 상세조회')))
                : (activeReportType === 'sensory' ? '신규 관능검사 리포트 작성' : (activeReportType === 'bottling' ? '신규 병입 리포트 작성' : (activeReportType === 'whey_separation' ? '신규 유청분리 리포트 작성' : '신규 발효 리포트 작성')))}
            </h3>
            {isEditing && (
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleResetForm}
                style={{ padding: '6px 12px', fontSize: '0.78rem', borderRadius: '8px', fontWeight: 600 }}
              >
                신규 작성으로 전환
              </button>
            )}
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            
            {/* Step 1: Select Plan */}
            <div className="form-group">
              <label htmlFor="report-plan-select" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                1. 작업한 생산 계획 선택
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', marginLeft: '8px' }}>
                  {activeReportType === 'fermentation' && '(이번 주 생산 계획만 표출됩니다)'}
                  {activeReportType === 'whey_separation' && '(발효 완료 & 유청분리 미작성 계획만 표출됩니다)'}
                  {activeReportType === 'bottling' && '(유청분리 완료 & 병입 미작성 계획만 표출됩니다)'}
                  {activeReportType === 'sensory' && '(병입 완료 생산 계획 및 제품별 표출됩니다)'}
                </span>
              </label>
              {activeReportType === 'sensory' ? (
                <select 
                  className="form-control" 
                  id="report-plan-select"
                  value={selectedTargetKey}
                  onChange={(e) => handleSensoryTargetChange(e.target.value)}
                  disabled={isEditing}
                  required
                  style={{ height: '42px', fontSize: '0.88rem' }}
                >
                  <option value="">-- 관능검사 대상 (생산 계획 및 제품) 선택 --</option>
                  {availableSensoryTargets.length === 0 ? (
                    <option disabled value="">
                      관능검사 작성 대상 생산 건이 없습니다.
                    </option>
                  ) : (
                    availableSensoryTargets.map(t => (
                      <option key={t.key} value={t.key}>
                        {t.displayName} ({t.startDate})
                      </option>
                    ))
                  )}
                </select>
              ) : (
                <select 
                  className="form-control" 
                  id="report-plan-select"
                  value={selectedPlanId}
                  onChange={(e) => setSelectedPlanId(e.target.value)}
                  disabled={isEditing}
                  required
                  style={{ height: '42px', fontSize: '0.88rem' }}
                >
                  <option value="">-- 생산 계획을 선택하세요 --</option>
                  {availablePlans.length === 0 ? (
                    <option disabled value="">
                      {activeReportType === 'fermentation' && '이번 주 예정된 생산 계획이 없습니다.'}
                      {activeReportType === 'whey_separation' && '유청분리 작성 대상 생산 계획이 없습니다.'}
                      {activeReportType === 'bottling' && '병입 작성 대상 생산 계획이 없습니다.'}
                    </option>
                  ) : (
                    availablePlans.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({p.startDate})</option>
                    ))
                  )}
                </select>
              )}
            </div>

            {/* BOTTLING REPORT FORM BODY */}
            {activeReportType === 'bottling' && (
              <BottlingReportForm
                selectedPlanDetails={selectedPlanDetails}
                bottlingCalculations={bottlingCalculations}
                bottlingCount={bottlingCount}
                setBottlingCount={setBottlingCount}
                bottlingRemainsG={bottlingRemainsG}
                setBottlingRemainsG={setBottlingRemainsG}
                item1BottlingCount={item1BottlingCount}
                setItem1BottlingCount={setItem1BottlingCount}
                item1BottlingRemainsG={item1BottlingRemainsG}
                setItem1BottlingRemainsG={setItem1BottlingRemainsG}
                item2BottlingCount={item2BottlingCount}
                setItem2BottlingCount={setItem2BottlingCount}
                item2BottlingRemainsG={item2BottlingRemainsG}
                setItem2BottlingRemainsG={setItem2BottlingRemainsG}
                bottlingMemo={bottlingMemo}
                setBottlingMemo={setBottlingMemo}
                bottlingDeductionQty={bottlingDeductionQty}
                setBottlingDeductionQty={setBottlingDeductionQty}
                item1DeductionQty={item1DeductionQty}
                setItem1DeductionQty={setItem1DeductionQty}
                item2DeductionQty={item2DeductionQty}
                setItem2DeductionQty={setItem2DeductionQty}
              />
            )}

            {/* WHEY SEPARATION FORM BODY */}
            {activeReportType === 'whey_separation' && (
              <WheyReportForm
                wheyConsistency={wheyConsistency}
                setWheyConsistency={setWheyConsistency}
                wheyConsistencyMemo={wheyConsistencyMemo}
                setWheyConsistencyMemo={setWheyConsistencyMemo}
                wheyForeignMatter={wheyForeignMatter}
                setWheyForeignMatter={setWheyForeignMatter}
                wheyForeignMatterDetail={wheyForeignMatterDetail}
                setWheyForeignMatterDetail={setWheyForeignMatterDetail}
                wheyBattCount={wheyBattCount}
                setWheyBattCount={setWheyBattCount}
                wheyLastBattWeightG={wheyLastBattWeightG}
                setWheyLastBattWeightG={setWheyLastBattWeightG}
                wheyCalculations={wheyCalculations}
                selectedPlanDetails={selectedPlanDetails}
                wheyTempUpper={wheyTempUpper}
                setWheyTempUpper={setWheyTempUpper}
                wheyTempLower={wheyTempLower}
                setWheyTempLower={setWheyTempLower}
                wheyPh={wheyPh}
                setWheyPh={setWheyPh}
                renderPhGauge={renderPhGauge}
              />
            )}

            {/* FERMENTATION REPORT FORM BODY */}
            {activeReportType === 'fermentation' && (
              <FermentationReportForm
                selectedPlanId={selectedPlanId}
                selectedPlanDetails={selectedPlanDetails}
                checkedSterilization={checkedSterilization}
                setCheckedSterilization={setCheckedSterilization}
                sterilizationTemp={sterilizationTemp}
                setSterilizationTemp={setSterilizationTemp}
                sterilizationTime={sterilizationTime}
                setSterilizationTime={setSterilizationTime}
                checkedCooling={checkedCooling}
                setCheckedCooling={setCheckedCooling}
                coolingTemp={coolingTemp}
                setCoolingTemp={setCoolingTemp}
                checkedInoculation={checkedInoculation}
                setCheckedInoculation={setCheckedInoculation}
                inoculationTemp={inoculationTemp}
                setInoculationTemp={setInoculationTemp}
                checkedHeating={checkedHeating}
                setCheckedHeating={setCheckedHeating}
                heatingTemp={heatingTemp}
                setHeatingTemp={setHeatingTemp}
                checkedHeater={checkedHeater}
                setCheckedHeater={setCheckedHeater}
                heaterTemp={heaterTemp}
                setHeaterTemp={setHeaterTemp}
                checkedHeaterLow={checkedHeaterLow}
                setCheckedHeaterLow={setCheckedHeaterLow}
                checkedAgitator={checkedAgitator}
                handleToggleAgitator={handleToggleAgitator}
              />
            )}

            {/* SENSORY REPORT FORM BODY */}
            {activeReportType === 'sensory' && (
              <SensoryReportForm
                selectedPlanId={selectedPlanId}
                sensoryAutoData={sensoryAutoData}
                selectedPlanDetails={selectedPlanDetails}
                eval1Note={eval1Note}
                setEval1Note={setEval1Note}
                eval1Name={eval1Name}
                setEval1Name={setEval1Name}
                eval2Note={eval2Note}
                setEval2Note={setEval2Note}
                eval2Name={eval2Name}
                setEval2Name={setEval2Name}
                sensoryStatus={sensoryStatus}
              />
            )}

            {/* Signature name for non-sensory reports */}
            {activeReportType !== 'sensory' && (
              <div className="form-group" style={{ marginTop: '8px' }}>
                <label htmlFor="report-worker-name" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                  {activeReportType === 'bottling' ? '4. 작업 확인자 서명' : (activeReportType === 'whey_separation' ? '7. 확인자 서명' : '3. 확인자 서명')}
                </label>
                <input 
                  type="text" 
                  className="form-control" 
                  id="report-worker-name" 
                  placeholder="예: 홍길동 (본인의 이름을 입력하세요)"
                  value={workerName}
                  onChange={(e) => setWorkerName(e.target.value)}
                  required
                  style={{ height: '40px', fontSize: '0.88rem' }}
                />
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button 
                type="button" 
                className="btn-secondary" 
                onClick={handleResetForm}
                style={{ height: '42px', padding: '0 20px', borderRadius: '8px', fontWeight: 600 }}
              >
                취소
              </button>
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ 
                  height: '42px', 
                  padding: '0 24px', 
                  borderRadius: '8px',
                  background: 'linear-gradient(135deg, var(--color-primary), var(--color-accent))',
                  border: 'none',
                  fontWeight: 700,
                  fontSize: '0.9rem',
                  boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)'
                }}
              >
                {activeReportType === 'sensory'
                  ? (eval2Name.trim() && eval2Note.trim() ? '관능검사 최종 저장' : '1차 관능평가 저장')
                  : (isEditing ? '리포트 수정 완료' : '리포트 제출')}
              </button>
            </div>

          </form>
        </div>

      </div>

      {/* Agitator OFF Confirmation Modal */}
      <AgitatorConfirmModal 
        isOpen={isAgitatorModalOpen}
        onConfirm={() => {
          setCheckedAgitator(true);
          setIsAgitatorModalOpen(false);
        }}
        onClose={() => {
          setIsAgitatorModalOpen(false);
        }}
      />
    </div>
  );
};

export default ReportsView;

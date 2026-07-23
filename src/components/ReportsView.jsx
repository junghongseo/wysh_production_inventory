import React, { useState, useEffect, useMemo } from 'react';
import { useWysh } from '../WyshContext';
import AgitatorConfirmModal from './modals/AgitatorConfirmModal';

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
  const { plans, products, reports, addReport, updateReport, deleteReport } = useWysh();

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

  // 1. Filtered plans for dropdown (Only those starting in the current week)
  const currentWeekPlans = useMemo(() => {
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

    return plans.filter(p => {
      if (p.planType === 'sub_ingredient') return false;
      if (isEditing && p.id === selectedPlanId) return true;
      return p.startDate >= startStr && p.startDate <= endStr;
    });
  }, [plans, isEditing, selectedPlanId]);

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
      const displayG = isLacticBacteria
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

  // When plan changes, initialize details with product default settings (for fermentation)
  useEffect(() => {
    if (selectedPlanDetails && !isEditing && activeReportType === 'fermentation') {
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
    }
  }, [selectedPlanDetails, isEditing, activeReportType]);

  // Handle report selection for view/edit
  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setIsEditing(true);
    setSelectedPlanId(report.planId);
    setWorkerName(report.workerName);
    setMobileSubTab('form');

    if (report.type === 'whey_separation') {
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
  };

  // Handle form submit (save or update)
  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedPlanId) {
      alert('생산 계획을 선택해주세요.');
      return;
    }
    if (!workerName.trim()) {
      alert('확인자 서명을 작성해주세요.');
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

      const reportData = {
        planId: selectedPlanId,
        type: 'whey_separation',
        workerName: workerName.trim(),
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
        alert('유청분리 리포트가 성공적으로 등록되었습니다.');
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

    const reportData = {
      planId: selectedPlanId,
      type: 'fermentation',
      workerName: workerName.trim(),
      checkedItems,
      details: {
        sterilizationTemp: parseFloat(sterilizationTemp),
        sterilizationTime: parseInt(sterilizationTime),
        coolingTemp: parseFloat(coolingTemp),
        inoculationTemp: parseFloat(inoculationTemp),
        heatingTemp: parseFloat(heatingTemp),
        heaterTemp: parseFloat(heaterTemp)
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

  return (
    <div className="recipe-split" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Category selector */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div className="report-category-grid" style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button 
            className={`btn-secondary ${activeReportType === 'fermentation' ? 'active' : ''}`}
            onClick={() => { setActiveReportType('fermentation'); handleResetForm(); }}
            style={{ 
              flex: 1, 
              justifyContent: 'center', 
              padding: '12px', 
              borderRadius: '10px', 
              fontWeight: 700,
              fontSize: '0.92rem',
              letterSpacing: '-0.01em',
              background: activeReportType === 'fermentation' ? 'var(--color-primary)' : '',
              color: activeReportType === 'fermentation' ? '#fff' : '',
              borderColor: activeReportType === 'fermentation' ? 'var(--color-primary)' : ''
            }}
          >
            🥛 발효 리포트
          </button>
          
          <button 
            className={`btn-secondary ${activeReportType === 'whey_separation' ? 'active' : ''}`}
            onClick={() => { setActiveReportType('whey_separation'); handleResetForm(); }}
            style={{ 
              flex: 1, 
              justifyContent: 'center', 
              padding: '12px', 
              borderRadius: '10px', 
              fontWeight: 700,
              fontSize: '0.92rem',
              letterSpacing: '-0.01em',
              background: activeReportType === 'whey_separation' ? 'var(--color-primary)' : '',
              color: activeReportType === 'whey_separation' ? '#fff' : '',
              borderColor: activeReportType === 'whey_separation' ? 'var(--color-primary)' : ''
            }}
          >
            💧 유청분리
          </button>
          
          <button 
            className="btn-secondary" 
            disabled 
            style={{ flex: 1, justifyBox: 'center', padding: '12px', borderRadius: '10px', opacity: 0.6, cursor: 'not-allowed', fontSize: '0.92rem', fontWeight: 600 }}
            title="병입 리포트는 추후 지원 예정입니다."
          >
            🍾 병입 (준비 중)
          </button>

          <button 
            className="btn-secondary" 
            disabled 
            style={{ flex: 1, justifyBox: 'center', padding: '12px', borderRadius: '10px', opacity: 0.6, cursor: 'not-allowed', fontSize: '0.92rem', fontWeight: 600 }}
            title="포장 리포트는 추후 지원 예정입니다."
          >
            📦 포장 (준비 중)
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
            padding: 8px 14px;
            border-radius: 8px;
            border: 1px solid var(--border-color);
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 0.85rem;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .chip-button.active {
            background: var(--color-primary);
            color: white;
            border-color: var(--color-primary);
            box-shadow: 0 2px 8px rgba(2, 132, 199, 0.25);
          }
        `}} />

        {/* Left: Report History List */}
        <div className={`glass-card report-history-card ${mobileSubTab === 'history' ? 'mobile-active' : 'mobile-inactive'}`} style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>{activeReportType === 'whey_separation' ? '작성된 유청분리 리포트 이력' : '작성된 발효 리포트 이력'}</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-outfit)', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
              TOTAL {filteredReports.length}
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '650px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredReports.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>작성된 {activeReportType === 'whey_separation' ? '유청분리' : '발효'} 리포트가 없습니다.</p>
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
                      borderLeft: `5px solid var(--color-${getProductColor(rep.planId)})`,
                      background: selectedReportId === rep.id ? 'var(--bg-tertiary)' : 'var(--bg-secondary)',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      transition: 'var(--transition-smooth)',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'stretch',
                      gap: '10px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                        {getPlanName(rep.planId)}
                      </span>
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

                    {/* Whey separation summary badges */}
                    {rep.type === 'whey_separation' && rep.details && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.76rem' }}>
                        <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          묽기: {rep.details.consistency}
                        </span>
                        <span style={{ background: rep.details.foreignMatter ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: rep.details.foreignMatter ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
                          {rep.details.foreignMatter ? '⚠️ 이물질 발견' : '✓ 이물질 없음'}
                        </span>
                        <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
                          추출량: {((rep.details.totalYieldG || 0) / 1000).toFixed(1)}kg ({rep.details.lossRatePercent || 0}% 로스)
                        </span>
                        <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 500, fontFamily: 'var(--font-outfit)' }}>
                          온도: {rep.details.tempUpper}°C / {rep.details.tempLower}°C
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

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px' }}>
                      <span>확인자: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rep.workerName}</strong></span>
                      <span style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-muted)' }}>{formatReportDate(rep.createdAt)}</span>
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
                ? (activeReportType === 'whey_separation' ? '유청분리 리포트 수정 / 상세조회' : '발효 리포트 수정 / 상세조회')
                : (activeReportType === 'whey_separation' ? '신규 유청분리 리포트 작성' : '신규 발효 리포트 작성')}
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
                <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', marginLeft: '8px' }}>(이번 주 생산 계획만 표출됩니다)</span>
              </label>
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
                {currentWeekPlans.length === 0 ? (
                  <option disabled value="">이번 주 예정된 생산 계획이 없습니다.</option>
                ) : (
                  currentWeekPlans.map(p => (
                    <option key={p.id} value={p.id}>{p.name} ({p.startDate})</option>
                  ))
                )}
              </select>
            </div>

            {/* WHEY SEPARATION FORM BODY */}
            {activeReportType === 'whey_separation' && (
              <>
                {/* 1. 묽기 측정 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    2. 요거트 묽기 측정
                  </label>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {['아주 묽음', '묽음', '보통', '되직함', '아주 되직함'].map((level) => (
                      <button
                        key={level}
                        type="button"
                        className={`chip-button ${wheyConsistency === level ? 'active' : ''}`}
                        onClick={() => setWheyConsistency(level)}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="묽기 특이사항 / 상세 메모 (선택사항)"
                    value={wheyConsistencyMemo}
                    onChange={(e) => setWheyConsistencyMemo(e.target.value)}
                    style={{ height: '36px', fontSize: '0.84rem', marginTop: '6px' }}
                  />
                </div>

                {/* 2. 이물질 검사 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      3. 이물질 발견 여부
                    </label>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        className={`chip-button ${!wheyForeignMatter ? 'active' : ''}`}
                        style={!wheyForeignMatter ? { background: '#10b981', borderColor: '#10b981' } : {}}
                        onClick={() => setWheyForeignMatter(false)}
                      >
                        ✓ 발견 없음
                      </button>
                      <button
                        type="button"
                        className={`chip-button ${wheyForeignMatter ? 'active' : ''}`}
                        style={wheyForeignMatter ? { background: '#ef4444', borderColor: '#ef4444' } : {}}
                        onClick={() => setWheyForeignMatter(true)}
                      >
                        ⚠️ 이물질 발견됨
                      </button>
                    </div>
                  </div>

                  {wheyForeignMatter && (
                    <input
                      type="text"
                      className="form-control"
                      placeholder="발견된 이물질 내용 및 수거 조치를 작성하세요"
                      value={wheyForeignMatterDetail}
                      onChange={(e) => setWheyForeignMatterDetail(e.target.value)}
                      required={wheyForeignMatter}
                      style={{ height: '38px', fontSize: '0.85rem', borderColor: '#ef4444' }}
                    />
                  )}
                </div>

                {/* 3. 밧드 무게 및 총 추출량/로스율 자동 계산 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    4. 바트 분할 무게 및 추출량 / 로스율 자동 계산
                  </label>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        10kg 밧드 개수
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="예: 19"
                          value={wheyBattCount}
                          onChange={(e) => setWheyBattCount(e.target.value)}
                          required
                          style={{ height: '40px', fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>밧드</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        마지막 밧드 무게 (g)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          className="form-control"
                          placeholder="예: 3200"
                          value={wheyLastBattWeightG}
                          onChange={(e) => setWheyLastBattWeightG(e.target.value)}
                          required
                          style={{ height: '40px', fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>g</span>
                      </div>
                    </div>
                  </div>

                  {/* Calculated summary card */}
                  <div style={{ background: 'var(--bg-secondary)', padding: '14px', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.84rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>10kg 밧드 총합:</span>
                      <strong style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-primary)' }}>{wheyCalculations.batts * 10} kg ({(wheyCalculations.batts * 10000).toLocaleString()} g)</strong>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px dashed var(--border-color)', paddingBottom: '6px' }}>
                      <span style={{ color: 'var(--text-secondary)' }}>총 추출 요거트 무게:</span>
                      <strong style={{ fontFamily: 'var(--font-outfit)', color: 'var(--color-primary)', fontSize: '0.95rem' }}>
                        {wheyCalculations.totalYieldKg.toFixed(2)} kg <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>({wheyCalculations.totalYieldG.toLocaleString()} g)</span>
                      </strong>
                    </div>
                    {selectedPlanDetails && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '2px' }}>
                        <span style={{ color: 'var(--text-secondary)' }}>생산 계획 원재료 목표량 대비 로스율:</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>
                            (목표: {wheyCalculations.targetRawMaterialKg.toFixed(2)} kg)
                          </span>
                          <span style={{ 
                            padding: '3px 10px', 
                            borderRadius: '12px', 
                            background: wheyCalculations.lossPercent > 5 ? 'rgba(239, 68, 68, 0.15)' : 'rgba(2, 132, 199, 0.15)', 
                            color: wheyCalculations.lossPercent > 5 ? '#ef4444' : 'var(--color-primary)', 
                            fontWeight: 700, 
                            fontFamily: 'var(--font-outfit)',
                            fontSize: '0.88rem'
                          }}>
                            {wheyCalculations.lossPercent.toFixed(2)}% 로스 ({wheyCalculations.lossG > 0 ? Math.round(wheyCalculations.lossG).toLocaleString() : 0}g)
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* 4. 온도 체크 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    5. 발효탱크 유청분리 직전 온도 체크
                  </label>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        탱크 윗부분 온도 (°C)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          placeholder="예: 35.9"
                          value={wheyTempUpper}
                          onChange={(e) => setWheyTempUpper(e.target.value)}
                          required
                          style={{ height: '40px', fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>°C</span>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
                        탱크 아랫부분 온도 (°C)
                      </label>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <input
                          type="number"
                          step="0.1"
                          className="form-control"
                          placeholder="예: 36.2"
                          value={wheyTempLower}
                          onChange={(e) => setWheyTempLower(e.target.value)}
                          required
                          style={{ height: '40px', fontSize: '0.9rem', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        />
                        <span style={{ fontSize: '0.85rem', color: 'var(--text-primary)', fontWeight: 600 }}>°C</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 5. pH (산도) 측정 및 과거 데이터 연동 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
                  <label style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    6. pH (산도) 측정
                  </label>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1 }}>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        placeholder="예: 4.47 (전극형 센서 pH 수치 기입)"
                        value={wheyPh}
                        onChange={(e) => setWheyPh(e.target.value)}
                        required
                        style={{ height: '42px', fontSize: '0.95rem', fontFamily: 'var(--font-outfit)', fontWeight: 700 }}
                      />
                    </div>
                  </div>

                  {renderPhGauge(wheyPh)}
                </div>
              </>
            )}

            {/* FERMENTATION REPORT FORM BODY */}
            {activeReportType === 'fermentation' && (
              <>
                {/* Step 2: Recipe Display */}
                {selectedPlanDetails && (
                  <div style={{ background: 'var(--bg-tertiary)', borderRadius: '12px', padding: '16px', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-primary)' }}>
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span>선택된 생산 계획의 배합표 (레시피 정보)</span>
                    </h4>
                    <div className="recipe-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.82rem', marginBottom: '12px', color: 'var(--text-secondary)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '10px' }}>
                      <div>
                        기준 베이스 제품: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedPlanDetails.product?.name || '베이스 제품'}</strong>
                        <span style={{ fontSize: '0.72rem', background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '1px 6px', borderRadius: '4px', marginLeft: '6px', fontWeight: 600 }}>
                          발효 공정 기준
                        </span>
                      </div>
                      <div>수량: <strong style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>{(selectedPlanDetails.plan?.totalQty || 0).toLocaleString()} 개</strong></div>
                      <div>필요 베이스 총량: <strong style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>{((selectedPlanDetails.totalWeightG || 0) / 1000).toFixed(2)} kg</strong></div>
                      <div>가동 발효기: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{selectedPlanDetails.plan?.fermenterType === 'large' ? '대형 발효기' : '소형 발효기'}</strong></div>
                    </div>

                    <div className="wysh-table-wrapper" style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <table className="wysh-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>원재료명</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>비율</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>필요량(g)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlanDetails.computedIngredients.map((ing, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px', fontWeight: 500, color: 'var(--text-primary)' }}>{ing.name}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)' }}>{ing.ratio}%</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-outfit)', color: 'var(--text-primary)' }}>{ing.displayG} g</td>
                            </tr>
                          ))}
                          <tr style={{ borderTop: '2px solid var(--border-color)', background: 'rgba(2, 132, 199, 0.05)', fontWeight: 700 }}>
                            <td style={{ padding: '9px 8px', color: 'var(--color-primary)' }}>합계 (전체 원재료 총량)</td>
                            <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--color-primary)' }}>{(selectedPlanDetails.totalRatioSum || 0).toFixed(2)}%</td>
                            <td style={{ padding: '9px 8px', textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--color-primary)', fontSize: '0.86rem' }}>
                              {Math.round(selectedPlanDetails.totalWeightSumG || 0).toLocaleString()} g <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 500 }}>({((selectedPlanDetails.totalWeightSumG || 0) / 1000).toFixed(2)} kg)</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* Step 3: Record details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <label style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                    2. 작업 내용 기록 (확인 항목 체크 및 입력)
                  </label>

                  {/* Sterilization */}
                  <div className="report-check-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div className="report-check-top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="chk-sterilization" 
                        checked={checkedSterilization} 
                        onChange={(e) => setCheckedSterilization(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="chk-sterilization" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', minWidth: '40px' }}>살균:</label>
                    </div>
                    <div className="report-check-bottom" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input 
                        type="number" 
                        className="form-control inline-input" 
                        value={sterilizationTemp} 
                        onChange={(e) => setSterilizationTemp(e.target.value)}
                        style={{ width: '70px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        disabled={!selectedPlanId}
                      />
                      <span>°C 에서</span>
                      <input 
                        type="number" 
                        className="form-control inline-input" 
                        value={sterilizationTime} 
                        onChange={(e) => setSterilizationTime(e.target.value)}
                        style={{ width: '70px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        disabled={!selectedPlanId}
                      />
                      <span>분 완료</span>
                    </div>
                  </div>

                  {/* Cooling */}
                  <div className="report-check-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div className="report-check-top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="chk-cooling" 
                        checked={checkedCooling} 
                        onChange={(e) => setCheckedCooling(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="chk-cooling" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>냉각 설정 온도:</label>
                    </div>
                    <div className="report-check-bottom" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input 
                        type="number" 
                        className="form-control inline-input" 
                        value={coolingTemp} 
                        onChange={(e) => setCoolingTemp(e.target.value)}
                        style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        disabled={!selectedPlanId}
                      />
                      <span>°C</span>
                    </div>
                  </div>

                  {/* Inoculation */}
                  <div className="report-check-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div className="report-check-top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="chk-inoculation" 
                        checked={checkedInoculation} 
                        onChange={(e) => setCheckedInoculation(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="chk-inoculation" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>유산균 접종:</label>
                    </div>
                    <div className="report-check-bottom" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input 
                        type="number" 
                        className="form-control inline-input" 
                        value={inoculationTemp} 
                        onChange={(e) => setInoculationTemp(e.target.value)}
                        style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        disabled={!selectedPlanId}
                      />
                      <span>°C 에서 접종 완료</span>
                    </div>
                  </div>

                  {/* Heating */}
                  <div className="report-check-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div className="report-check-top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="chk-heating" 
                        checked={checkedHeating} 
                        onChange={(e) => setCheckedHeating(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="chk-heating" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>가열 설정 온도:</label>
                    </div>
                    <div className="report-check-bottom" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input 
                        type="number" 
                        className="form-control inline-input" 
                        value={heatingTemp} 
                        onChange={(e) => setHeatingTemp(e.target.value)}
                        style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        disabled={!selectedPlanId}
                      />
                      <span>°C</span>
                    </div>
                  </div>

                  {/* Heater */}
                  <div className="report-check-row" style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                    <div className="report-check-top" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <input 
                        type="checkbox" 
                        id="chk-heater" 
                        checked={checkedHeater} 
                        onChange={(e) => setCheckedHeater(e.target.checked)}
                        style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                      />
                      <label htmlFor="chk-heater" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>히터 설정 온도:</label>
                    </div>
                    <div className="report-check-bottom" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      <input 
                        type="number" 
                        className="form-control inline-input" 
                        value={heaterTemp} 
                        onChange={(e) => setHeaterTemp(e.target.value)}
                        style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                        disabled={!selectedPlanId}
                      />
                      <span>°C</span>
                    </div>
                  </div>

                  {/* Heater low ON */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <input 
                      type="checkbox" 
                      id="chk-heater-low" 
                      checked={checkedHeaterLow} 
                      onChange={(e) => setCheckedHeaterLow(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                    />
                    <label htmlFor="chk-heater-low" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>히터 약 ON 완료</label>
                  </div>

                  {/* Agitator OFF Toggle Switch */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                    <span style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text-primary)' }}>교반 OFF 확인</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ 
                        fontSize: '0.8rem', 
                        fontWeight: 700, 
                        color: checkedAgitator ? 'var(--text-muted, #94a3b8)' : 'var(--color-warning, #f59e0b)',
                        background: checkedAgitator ? 'var(--bg-tertiary, #e2e8f0)' : 'rgba(245, 158, 11, 0.1)',
                        padding: '2px 8px',
                        borderRadius: '4px'
                      }}>
                        {checkedAgitator ? 'OFF (정지)' : 'ON (작동 중)'}
                      </span>
                      <label className="wysh-switch" style={{ margin: 0 }}>
                        <input 
                          type="checkbox" 
                          checked={!checkedAgitator} 
                          onChange={handleToggleAgitator}
                        />
                        <span className="wysh-slider"></span>
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Signature name */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label htmlFor="report-worker-name" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                {activeReportType === 'whey_separation' ? '7. 확인자 서명' : '3. 확인자 서명'}
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
                {isEditing ? '리포트 수정 완료' : '리포트 제출'}
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

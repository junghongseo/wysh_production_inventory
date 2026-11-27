import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useWysh } from '../WyshContext';
import { useAuth } from '../AuthContext';
import AgitatorConfirmModal from './modals/AgitatorConfirmModal';
import FermentationReportForm from './reports/FermentationReportForm';
import WheyReportForm from './reports/WheyReportForm';
import BottlingReportForm from './reports/BottlingReportForm';
import SensoryReportForm from './reports/SensoryReportForm';
import ReportCategoryTabs from './reports/ReportCategoryTabs';
import ReportMobileSubTabs from './reports/ReportMobileSubTabs';
import ReportHistoryList from './reports/ReportHistoryList';
import ReportPlanSelect from './reports/ReportPlanSelect';
import ReportViewStyles from './reports/ReportViewStyles';
import PhGauge from './reports/PhGauge';
import { REPORT_TYPE_NAMES } from './reports/reportTypeLabels';
import {
  getAvailablePlans,
  getAvailableSensoryTargets,
  computePlanDetails,
  getProductPhConfig,
  computeHistoricalAvgPh,
  computeWheyCalculations,
  computeBottlingCalculations,
  applyBottlingStockToInventory
} from '../utils/reportCalculations';

const ReportsView = () => {
  const { plans, products, reports, addReport, updateReport, deleteReport, updateActualQty } = useWysh();
  const { can, profile } = useAuth();
  const canConfirmAll = can('reports.confirm');
  const myName = profile?.display_name || '';

  const lastInitializedPlanIdRef = useRef(null);

  // Active Report Type: fermentation, whey_separation, bottling, packaging
  const [activeReportType, setActiveReportType] = useState('fermentation');
  
  // Selected report for editing or viewing
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [mobileSubTab, setMobileSubTab] = useState('form'); // 'form' or 'history' on mobile

  // Form states - General
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [workerName, setWorkerName] = useState(myName);
  
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
  const availablePlans = useMemo(
    () => getAvailablePlans({ plans, reports, activeReportType, isEditing, selectedPlanId }),
    [plans, reports, activeReportType, isEditing, selectedPlanId]
  );

  // Available targets for Sensory Evaluation (handles multi-item plan splitting like (계획명)_(제품명))
  const availableSensoryTargets = useMemo(() => {
    if (activeReportType !== 'sensory') return [];
    return getAvailableSensoryTargets({ plans, reports, products, isEditing, selectedTargetKey });
  }, [plans, reports, activeReportType, isEditing, selectedTargetKey, products]);

  // Selected plan and product details
  const selectedPlanDetails = useMemo(
    () => computePlanDetails(selectedPlanId, plans, products),
    [selectedPlanId, plans, products]
  );

  // Product pH Configuration (Wish Greek vs Mud Greek vs Default)
  const productPhConfig = useMemo(() => getProductPhConfig(selectedPlanDetails), [selectedPlanDetails]);

  // Historical Average pH calculation for selected product (dynamic update with seed data)
  const historicalAvgPh = useMemo(
    () => computeHistoricalAvgPh({ config: productPhConfig, selectedPlanDetails, reports, plans, products }),
    [selectedPlanDetails, reports, plans, products, productPhConfig]
  );

  // Real-time calculations for Whey Separation
  const wheyCalculations = useMemo(
    () => computeWheyCalculations(wheyBattCount, wheyLastBattWeightG, selectedPlanDetails),
    [wheyBattCount, wheyLastBattWeightG, selectedPlanDetails]
  );

  // Real-time calculations for Bottling Report (Single & 2-Item Parallel Plans)
  const bottlingCalculations = useMemo(
    () => computeBottlingCalculations(selectedPlanDetails, products, {
      bottlingCount, bottlingRemainsG, bottlingDeductionQty,
      item1BottlingCount, item1BottlingRemainsG, item1DeductionQty,
      item2BottlingCount, item2BottlingRemainsG, item2DeductionQty
    }),
    [selectedPlanDetails, products, bottlingCount, bottlingRemainsG, bottlingDeductionQty, item1BottlingCount, item1BottlingRemainsG, item1DeductionQty, item2BottlingCount, item2BottlingRemainsG, item2DeductionQty]
  );

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
    setWorkerName(myName);
    
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
          applyBottlingStockToInventory(updatedReport, updateActualQty);
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
    if (!canConfirmAll && report.type !== 'sensory') {
      alert('보고서 확인 처리 권한이 없습니다. 관리자에게 문의하세요.');
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
        applyBottlingStockToInventory(report, updateActualQty);
      }
    }
  };

  // Handle delete report
  const handleDelete = (id, e) => {
    e.stopPropagation();
    if (!canConfirmAll) {
      alert('보고서 삭제는 보고서 확인 권한이 있는 사람만 할 수 있습니다.');
      return;
    }
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

  // Helper renderer for pH gauge scale (passed to WheyReportForm)
  const renderPhGauge = (currentPhVal) => (
    <PhGauge value={currentPhVal} config={productPhConfig} historicalAvgPh={historicalAvgPh} />
  );

  const handleSelectReportType = (type) => {
    setActiveReportType(type);
    handleResetForm();
  };

  const { name: activeTypeName } = REPORT_TYPE_NAMES[activeReportType] || REPORT_TYPE_NAMES.fermentation;

  return (
    <div className="recipe-split" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Category selector */}
      <ReportCategoryTabs
        activeReportType={activeReportType}
        onSelect={handleSelectReportType}
        reports={reports}
        canConfirmAll={canConfirmAll}
      />

      {/* Mobile-only sub-tab selector (신규 작성 / 이력 보기) */}
      <ReportMobileSubTabs
        mobileSubTab={mobileSubTab}
        setMobileSubTab={setMobileSubTab}
        historyCount={filteredReports.length}
      />

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="report-grid-container">
        
        {/* Layout responsive grid and toggle switch CSS */}
        <ReportViewStyles />

        {/* Left: History list */}
        <ReportHistoryList
          activeReportType={activeReportType}
          mobileSubTab={mobileSubTab}
          filteredReports={filteredReports}
          selectedReportId={selectedReportId}
          plans={plans}
          products={products}
          canConfirmAll={canConfirmAll}
          onSelect={handleSelectReport}
          onConfirm={handleConfirmReport}
          onDelete={handleDelete}
        />

        {/* Right: Report Form */}
        <div className={`glass-card report-form-card ${mobileSubTab === 'form' ? 'mobile-active' : 'mobile-inactive'}`} style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {isEditing ? `${activeTypeName} 리포트 수정 / 상세조회` : `신규 ${activeTypeName} 리포트 작성`}
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
            <ReportPlanSelect
              activeReportType={activeReportType}
              isEditing={isEditing}
              selectedPlanId={selectedPlanId}
              onPlanChange={setSelectedPlanId}
              availablePlans={availablePlans}
              selectedTargetKey={selectedTargetKey}
              onSensoryTargetChange={handleSensoryTargetChange}
              availableSensoryTargets={availableSensoryTargets}
            />

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

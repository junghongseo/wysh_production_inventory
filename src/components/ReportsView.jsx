import React, { useState, useEffect, useMemo } from 'react';
import { useWysh } from '../WyshContext';
import AgitatorConfirmModal from './modals/AgitatorConfirmModal';

const ReportsView = () => {
  const { plans, products, reports, addReport, updateReport, deleteReport } = useWysh();

  // Active Report Type: fermentation, whey_separation, bottling, packaging
  const [activeReportType, setActiveReportType] = useState('fermentation');
  
  // Selected report for editing or viewing
  const [selectedReportId, setSelectedReportId] = useState(null);
  const [isEditing, setIsEditing] = useState(false);

  // Form states
  const [selectedPlanId, setSelectedPlanId] = useState('');
  const [workerName, setWorkerName] = useState('');
  
  // Checkbox states
  const [checkedSterilization, setCheckedSterilization] = useState(false);
  const [checkedCooling, setCheckedCooling] = useState(false);
  const [checkedInoculation, setCheckedInoculation] = useState(false);
  const [checkedHeating, setCheckedHeating] = useState(false);
  const [checkedHeater, setCheckedHeater] = useState(false);
  const [checkedHeaterLow, setCheckedHeaterLow] = useState(false);
  const [checkedAgitator, setCheckedAgitator] = useState(false);
  const [isAgitatorModalOpen, setIsAgitatorModalOpen] = useState(false);

  // Detail input states
  const [sterilizationTemp, setSterilizationTemp] = useState('');
  const [sterilizationTime, setSterilizationTime] = useState('');
  const [coolingTemp, setCoolingTemp] = useState('');
  const [inoculationTemp, setInoculationTemp] = useState('');
  const [heatingTemp, setHeatingTemp] = useState('');
  const [heaterTemp, setHeaterTemp] = useState('');

  // 1. Filtered plans for dropdown (Only those starting in the current week)
  const currentWeekPlans = useMemo(() => {
    const today = new Date();
    const day = today.getDay(); // 0 is Sunday, 1 is Monday...
    // Calculate difference to Monday of current week
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
      // If we are editing, always keep the already selected plan in option
      if (isEditing && p.id === selectedPlanId) return true;
      return p.startDate >= startStr && p.startDate <= endStr;
    });
  }, [plans, isEditing, selectedPlanId]);

  // Selected plan and product details (fermentation report targets the base plain product)
  const selectedPlanDetails = useMemo(() => {
    if (!selectedPlanId) return null;
    const plan = plans.find(p => p.id === selectedPlanId);
    if (!plan) return null;

    const planItems = plan.items && Array.isArray(plan.items) && plan.items.length > 0 
      ? plan.items 
      : [{ productId: plan.productId, totalQty: plan.totalQty }];

    // Resolve Base Product (Plain) for Fermentation Reports
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

    // Calculate total base yogurt weight needed for this fermentation batch
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

    const computedIngredients = (product.ingredients || []).map(ing => {
      const neededQtyG = totalInputWeightG * (ing.ratio / 100);
      const neededQtyKg = neededQtyG / 1000;
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

    return {
      plan,
      product,
      baseProduct,
      totalWeightG: totalBaseYogurtG,
      totalInputWeightG,
      computedIngredients,
      planItems
    };
  }, [selectedPlanId, plans, products]);

  // When plan changes, initialize details with product default settings
  useEffect(() => {
    if (selectedPlanDetails && !isEditing) {
      const prod = selectedPlanDetails.product;
      setSterilizationTemp(prod.defaultSterilizationTemp !== undefined ? prod.defaultSterilizationTemp : 85);
      setSterilizationTime(prod.defaultSterilizationTime !== undefined ? prod.defaultSterilizationTime : 30);
      setCoolingTemp(prod.defaultCoolingTemp !== undefined ? prod.defaultCoolingTemp : 40);
      setInoculationTemp(prod.defaultInoculationTemp !== undefined ? prod.defaultInoculationTemp : 42);
      setHeatingTemp(prod.defaultHeatingTemp !== undefined ? prod.defaultHeatingTemp : 43);
      setHeaterTemp(prod.defaultHeaterTemp !== undefined ? prod.defaultHeaterTemp : 44);
      
      // Reset checkboxes
      setCheckedSterilization(false);
      setCheckedCooling(false);
      setCheckedInoculation(false);
      setCheckedHeating(false);
      setCheckedHeater(false);
      setCheckedHeaterLow(false);
      setCheckedAgitator(false);
    }
  }, [selectedPlanDetails, isEditing]);

  // Handle report selection for view/edit
  const handleSelectReport = (report) => {
    setSelectedReportId(report.id);
    setIsEditing(true);
    setSelectedPlanId(report.planId);
    setWorkerName(report.workerName);

    // Load checked items
    const checked = report.checkedItems || [];
    setCheckedSterilization(checked.includes('sterilization'));
    setCheckedCooling(checked.includes('cooling'));
    setCheckedInoculation(checked.includes('inoculation'));
    setCheckedHeating(checked.includes('heating'));
    setCheckedHeater(checked.includes('heater'));
    setCheckedHeaterLow(checked.includes('heater_low'));
    setCheckedAgitator(checked.includes('agitator'));

    // Load detail inputs
    const d = report.details || {};
    setSterilizationTemp(d.sterilizationTemp || 85);
    setSterilizationTime(d.sterilizationTime || 30);
    setCoolingTemp(d.coolingTemp || 40);
    setInoculationTemp(d.inoculationTemp || 42);
    setHeatingTemp(d.heatingTemp || 43);
    setHeaterTemp(d.heaterTemp || 44);
  };

  const handleToggleAgitator = (e) => {
    const nextValIsOn = e.target.checked;
    if (!nextValIsOn) {
      // Switching from ON to OFF: open modal
      setIsAgitatorModalOpen(true);
    } else {
      // Switching from OFF to ON: turn ON immediately
      setCheckedAgitator(false);
    }
  };

  // Reset form
  const handleResetForm = () => {
    setSelectedReportId(null);
    setIsEditing(false);
    setSelectedPlanId('');
    setWorkerName('');
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
      type: activeReportType,
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
      alert('리포트가 안전하게 수정되었습니다.');
    } else {
      addReport(reportData);
      alert('리포트가 안전하게 등록되었습니다.');
    }

    handleResetForm();
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

  return (
    <div className="recipe-split" style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }}>
      
      {/* Category selector */}
      <div className="glass-card" style={{ padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
            className="btn-secondary" 
            disabled 
            style={{ flex: 1, justifyBox: 'center', padding: '12px', borderRadius: '10px', opacity: 0.6, cursor: 'not-allowed', fontSize: '0.92rem', fontWeight: 600 }}
            title="유청분리 리포트는 추후 지원 예정입니다."
          >
            💧 유청분리 (준비 중)
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '24px' }} className="report-grid-container">
        
        {/* CSS grid replacement in layout and toggle switch styles */}
        <style dangerouslySetInnerHTML={{__html: `
          @media (min-width: 1024px) {
            .report-grid-container {
              grid-template-columns: 1fr 1.3fr !important;
            }
          }
          
          /* Custom Toggle Switch Styles */
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
        `}} />

        {/* Left: Report History List */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', height: 'fit-content' }}>
          <h3 style={{ fontSize: '1.15rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)', marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>작성된 발효 리포트 이력</span>
            <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-outfit)', fontWeight: 600, color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', padding: '2px 8px', borderRadius: '12px' }}>
              TOTAL {filteredReports.length}
            </span>
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '600px', overflowY: 'auto', paddingRight: '4px' }}>
            {filteredReports.length === 0 ? (
              <div className="empty-state" style={{ padding: '40px 20px' }}>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-muted)' }}>작성된 리포트가 없습니다.</p>
              </div>
            ) : (
              filteredReports.map(rep => (
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
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                    <span>확인자: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rep.workerName}</strong></span>
                    <span style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-muted)' }}>{formatReportDate(rep.createdAt)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Report Form */}
        <div className="glass-card" style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{ borderBottom: '1px solid var(--border-color)', paddingBottom: '12px', marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ fontSize: '1.2rem', fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>
              {isEditing ? '발효 리포트 수정 / 상세조회' : '신규 발효 리포트 작성'}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 16px', fontSize: '0.82rem', marginBottom: '12px', color: 'var(--text-secondary)', borderBottom: '1px dashed var(--border-color)', paddingBottom: '10px' }}>
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
                    </tbody>
                  </table>
                </div>

                {/* Secondary Base Product Recipe Table */}
                {selectedPlanDetails.baseProductDetails && (
                  <div style={{ marginTop: '14px', borderTop: '1px dashed var(--border-color)', paddingTop: '10px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--color-primary)' }}>
                        [베이스 제품 필요 배합표] {selectedPlanDetails.baseProductDetails.product.name}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        베이스 필요량: {selectedPlanDetails.baseProductDetails.neededBaseFinishedKg.toFixed(2)} kg (수율: {selectedPlanDetails.baseProductDetails.baseYield}%)
                      </span>
                    </div>
                    <div className="wysh-table-wrapper" style={{ overflowX: 'auto', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                      <table className="wysh-table" style={{ width: '100%', fontSize: '0.8rem' }}>
                        <thead>
                          <tr>
                            <th style={{ padding: '8px', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>베이스 원재료명</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>비율</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)' }}>필요량(g)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedPlanDetails.baseProductDetails.computedBaseIngredients.map((bIng, bIdx) => (
                            <tr key={bIdx} style={{ borderBottom: '1px solid var(--border-color)' }}>
                              <td style={{ padding: '8px', fontWeight: 500, color: 'var(--text-primary)' }}>{bIng.name}</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)' }}>{bIng.ratio}%</td>
                              <td style={{ padding: '8px', textAlign: 'right', fontWeight: 600, fontFamily: 'var(--font-outfit)', color: 'var(--text-primary)' }}>{bIng.displayG} g</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Record details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '4px' }}>
                2. 작업 내용 기록 (확인 항목 체크 및 입력)
              </label>

              {/* Sterilization */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <input 
                  type="checkbox" 
                  id="chk-sterilization" 
                  checked={checkedSterilization} 
                  onChange={(e) => setCheckedSterilization(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-sterilization" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)', minWidth: '40px' }}>살균:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={sterilizationTemp} 
                    onChange={(e) => setSterilizationTemp(e.target.value)}
                    style={{ width: '70px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                    disabled={!selectedPlanId}
                  />
                  <span>°C 에서</span>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={sterilizationTime} 
                    onChange={(e) => setSterilizationTime(e.target.value)}
                    style={{ width: '70px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                    disabled={!selectedPlanId}
                  />
                  <span>분 완료</span>
                </div>
              </div>

              {/* Cooling */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <input 
                  type="checkbox" 
                  id="chk-cooling" 
                  checked={checkedCooling} 
                  onChange={(e) => setCheckedCooling(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-cooling" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>냉각 설정 온도:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={coolingTemp} 
                    onChange={(e) => setCoolingTemp(e.target.value)}
                    style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                    disabled={!selectedPlanId}
                  />
                  <span>°C</span>
                </div>
              </div>

              {/* Inoculation */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <input 
                  type="checkbox" 
                  id="chk-inoculation" 
                  checked={checkedInoculation} 
                  onChange={(e) => setCheckedInoculation(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-inoculation" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>유산균 접종:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={inoculationTemp} 
                    onChange={(e) => setInoculationTemp(e.target.value)}
                    style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                    disabled={!selectedPlanId}
                  />
                  <span>°C 에서 접종 완료</span>
                </div>
              </div>

              {/* Heating */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <input 
                  type="checkbox" 
                  id="chk-heating" 
                  checked={checkedHeating} 
                  onChange={(e) => setCheckedHeating(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-heating" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>가열 설정 온도:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="number" 
                    className="form-control" 
                    value={heatingTemp} 
                    onChange={(e) => setHeatingTemp(e.target.value)}
                    style={{ width: '75px', height: '32px', textAlign: 'center', padding: '4px', fontFamily: 'var(--font-outfit)', fontWeight: 600 }}
                    disabled={!selectedPlanId}
                  />
                  <span>°C</span>
                </div>
              </div>

              {/* Heater */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--bg-secondary)', borderRadius: '8px', border: '1px solid var(--border-color)', flexWrap: 'wrap' }}>
                <input 
                  type="checkbox" 
                  id="chk-heater" 
                  checked={checkedHeater} 
                  onChange={(e) => setCheckedHeater(e.target.checked)}
                  style={{ width: '18px', height: '18px', cursor: 'pointer' }}
                />
                <label htmlFor="chk-heater" style={{ fontSize: '0.88rem', fontWeight: 600, cursor: 'pointer', color: 'var(--text-primary)' }}>히터 설정 온도:</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                  <input 
                    type="number" 
                    className="form-control" 
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

            {/* Signature name */}
            <div className="form-group" style={{ marginTop: '8px' }}>
              <label htmlFor="report-worker-name" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
                3. 확인자 서명
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

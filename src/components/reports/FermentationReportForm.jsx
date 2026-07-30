import React from 'react';

const FermentationReportForm = ({
  selectedPlanId,
  selectedPlanDetails,
  checkedSterilization,
  setCheckedSterilization,
  sterilizationTemp,
  setSterilizationTemp,
  sterilizationTime,
  setSterilizationTime,
  checkedCooling,
  setCheckedCooling,
  coolingTemp,
  setCoolingTemp,
  checkedInoculation,
  setCheckedInoculation,
  inoculationTemp,
  setInoculationTemp,
  checkedHeating,
  setCheckedHeating,
  heatingTemp,
  setHeatingTemp,
  checkedHeater,
  setCheckedHeater,
  heaterTemp,
  setHeaterTemp,
  checkedHeaterLow,
  setCheckedHeaterLow,
  checkedAgitator,
  handleToggleAgitator
}) => {
  return (
    <>
      {/* Step 2: Selected Plan Summary (Recipe details hidden for security) */}
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
            <span>선택된 생산 계획 기본 정보</span>
          </h4>
          <div className="recipe-summary-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px 12px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            <div>
              기준 베이스 제품: <strong style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginTop: '2px' }}>{selectedPlanDetails.product?.name || '베이스 제품'}</strong>
            </div>
            <div>
              생산 수량: <strong style={{ color: 'var(--text-primary)', fontWeight: 600, fontFamily: 'var(--font-outfit)', display: 'block', marginTop: '2px' }}>{(selectedPlanDetails.plan?.totalQty || 0).toLocaleString()} 개</strong>
            </div>
            <div>
              가동 발효기: <strong style={{ color: 'var(--text-primary)', fontWeight: 600, display: 'block', marginTop: '2px' }}>{selectedPlanDetails.plan?.fermenterType === 'large' ? '대형 발효기' : (selectedPlanDetails.plan?.fermenterType === 'small' ? '소형 발효기' : (selectedPlanDetails.plan?.fermenterType || '발효조'))}</strong>
            </div>
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
  );
};

export default FermentationReportForm;

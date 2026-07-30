import React from 'react';

const WheyReportForm = ({
  wheyConsistency,
  setWheyConsistency,
  wheyConsistencyMemo,
  setWheyConsistencyMemo,
  wheyForeignMatter,
  setWheyForeignMatter,
  wheyForeignMatterDetail,
  setWheyForeignMatterDetail,
  wheyBattCount,
  setWheyBattCount,
  wheyLastBattWeightG,
  setWheyLastBattWeightG,
  wheyCalculations,
  selectedPlanDetails,
  wheyTempUpper,
  setWheyTempUpper,
  wheyTempLower,
  setWheyTempLower,
  wheyPh,
  setWheyPh,
  renderPhGauge
}) => {
  return (
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
        {wheyCalculations && (
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
        )}
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

        {renderPhGauge && renderPhGauge(wheyPh)}
      </div>
    </>
  );
};

export default WheyReportForm;

import React from 'react';

const PLAN_SELECT_HINTS = {
  fermentation: '(이번 주 생산 계획만 표출됩니다)',
  whey_separation: '(발효 완료 & 유청분리 미작성 계획만 표출됩니다)',
  bottling: '(유청분리 완료 & 병입 미작성 계획만 표출됩니다)',
  sensory: '(병입 완료 생산 계획 및 제품별 표출됩니다)'
};

const EMPTY_PLAN_MESSAGES = {
  fermentation: '이번 주 예정된 생산 계획이 없습니다.',
  whey_separation: '유청분리 작성 대상 생산 계획이 없습니다.',
  bottling: '병입 작성 대상 생산 계획이 없습니다.'
};

// Step 1: 작업한 생산 계획 (관능검사는 생산 계획 + 제품) 선택
const ReportPlanSelect = ({
  activeReportType,
  isEditing,
  selectedPlanId,
  onPlanChange,
  availablePlans,
  selectedTargetKey,
  onSensoryTargetChange,
  availableSensoryTargets
}) => (
  <div className="form-group">
    <label htmlFor="report-plan-select" style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '6px' }}>
      1. 작업한 생산 계획 선택
      <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--color-primary)', marginLeft: '8px' }}>
        {PLAN_SELECT_HINTS[activeReportType]}
      </span>
    </label>
    {activeReportType === 'sensory' ? (
      <select
        className="form-control"
        id="report-plan-select"
        value={selectedTargetKey}
        onChange={(e) => onSensoryTargetChange(e.target.value)}
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
        onChange={(e) => onPlanChange(e.target.value)}
        disabled={isEditing}
        required
        style={{ height: '42px', fontSize: '0.88rem' }}
      >
        <option value="">-- 생산 계획을 선택하세요 --</option>
        {availablePlans.length === 0 ? (
          <option disabled value="">
            {EMPTY_PLAN_MESSAGES[activeReportType]}
          </option>
        ) : (
          availablePlans.map(p => (
            <option key={p.id} value={p.id}>{p.name} ({p.startDate})</option>
          ))
        )}
      </select>
    )}
  </div>
);

export default ReportPlanSelect;

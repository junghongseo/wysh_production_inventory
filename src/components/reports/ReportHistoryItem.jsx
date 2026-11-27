import React from 'react';
import { useAuth } from '../../AuthContext';
import { formatReportDate } from '../../utils/reportCalculations';

// Whey separation summary badges
const WheySummary = ({ details }) => {
  const targetMin = details.targetMin || 4.20;
  const targetMax = details.targetMax || 4.58;
  const repPh = details.phValue;

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
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', fontSize: '0.76rem', wordBreak: 'keep-all' }}>
      <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
        묽기: {details.consistency}
      </span>
      <span style={{ background: details.foreignMatter ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)', color: details.foreignMatter ? '#ef4444' : '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 600 }}>
        {details.foreignMatter ? '⚠️ 이물질 발견' : '✓ 이물질 없음'}
      </span>
      <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
        추출량: {((details.totalYieldG || 0) / 1000).toFixed(1)}kg ({details.lossRatePercent || 0}% 로스)
      </span>
      <span style={{
        background: phBadgeBg,
        color: phBadgeColor,
        padding: '2px 8px',
        borderRadius: '6px',
        fontWeight: 700,
        fontFamily: 'var(--font-outfit)'
      }}>
        pH {details.phValue}
      </span>
    </div>
  );
};

const MultiItemRow = ({ item }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--text-primary)', fontWeight: 600, flexWrap: 'wrap', gap: '4px' }}>
    <span style={{ wordBreak: 'keep-all' }}>{item?.productName} ({item?.stockedQty}개 입고)</span>
    <span style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)', fontWeight: 700, whiteSpace: 'nowrap' }}>📅 소비기한: {item?.expiryDate}</span>
  </div>
);

// Bottling summary badges
const BottlingSummary = ({ details }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', wordBreak: 'keep-all' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      <span style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '2px 8px', borderRadius: '6px', fontWeight: 700 }}>
        🍾 병입 완료
      </span>
      <span style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
        수율: {details.actualYield}% (목표 {details.targetYield}%)
      </span>
    </div>

    {!details.isMultiItem ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
        <span style={{ background: 'var(--bg-tertiary)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 700, fontFamily: 'var(--font-outfit)' }}>
          입고량: {details.actualStockedQty}개 {details.remainsG ? `(+남은 ${details.remainsG}g)` : ''}
        </span>
        {details.expiryDate && (
          <span style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-primary)', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, fontFamily: 'var(--font-outfit)' }}>
            📅 소비기한: {details.expiryDate}
          </span>
        )}
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '8px' }}>
        <MultiItemRow item={details.item1} />
        <MultiItemRow item={details.item2} />
      </div>
    )}

    {details.bottlingMemo && (
      <div>
        <span style={{ background: 'rgba(234, 179, 8, 0.1)', color: '#ca8a04', padding: '2px 8px', borderRadius: '6px', fontWeight: 600, wordBreak: 'keep-all' }}>
          📝 {details.bottlingMemo}
        </span>
      </div>
    )}
  </div>
);

// Sensory evaluation summary badges
const SensorySummary = ({ details }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '0.76rem', wordBreak: 'keep-all' }}>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
      <span style={{
        background: details.sensoryStatus === 'completed' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(245, 158, 11, 0.15)',
        color: details.sensoryStatus === 'completed' ? '#10b981' : '#b45309',
        padding: '2px 8px',
        borderRadius: '6px',
        fontWeight: 700
      }}>
        {details.sensoryStatus === 'completed' ? '✓ 최종 완료 (2인 평가)' : '⏳ 1차 완료 (2차 평가 대기)'}
      </span>
    </div>
    {details.evaluator1 && (
      <div style={{ background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '8px', borderLeft: '3px solid var(--color-primary)' }}>
        <strong style={{ color: 'var(--text-primary)' }}>평가자 1 ({details.evaluator1.name}):</strong> {details.evaluator1.note}
      </div>
    )}
    {details.evaluator2 && (
      <div style={{ background: 'var(--bg-tertiary)', padding: '6px 10px', borderRadius: '8px', borderLeft: '3px solid #10b981' }}>
        <strong style={{ color: 'var(--text-primary)' }}>평가자 2 ({details.evaluator2.name}):</strong> {details.evaluator2.note}
      </div>
    )}
  </div>
);

// 리포트 이력 카드 1건
const ReportHistoryItem = ({ rep, isSelected, planName, productColor, canConfirmAll, onSelect, onConfirm, onDelete }) => {
  const { profilesById } = useAuth();
  // 실제로 입력한 계정 (과거 기록은 없음 → 확인자 텍스트만 표시)
  const enteredBy = rep.createdBy ? profilesById[rep.createdBy]?.display_name || null : null;
  const displayName = rep.type === 'sensory' && rep.details?.productName && rep.details?.isMultiItem
    ? `${planName}_${rep.details.productName}`
    : planName;

  return (
    <div
      className={`product-item ${isSelected ? 'active' : ''}`}
      onClick={() => onSelect(rep)}
      style={{
        cursor: 'pointer',
        padding: '16px',
        borderRadius: '12px',
        borderLeft: rep.confirmed
          ? `5px solid var(--color-${productColor})`
          : '5px solid #f59e0b',
        background: isSelected
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
            title={displayName}
          >
            {displayName}
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
          {(canConfirmAll || rep.type === 'sensory') && !rep.confirmed && (
            <button
              className="btn-primary"
              onClick={(e) => onConfirm(rep, e)}
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
          {/* 삭제는 보고서 확인 권한자만 (DB 정책과 같은 규칙) */}
          {canConfirmAll && (
          <button
            className="btn-delete-tiny"
            onClick={(e) => onDelete(rep.id, e)}
            style={{ padding: '4px', opacity: 0.7 }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
          )}
        </div>
      </div>

      {rep.type === 'whey_separation' && rep.details && <WheySummary details={rep.details} />}
      {rep.type === 'bottling' && rep.details && <BottlingSummary details={rep.details} />}
      {rep.type === 'sensory' && rep.details && <SensorySummary details={rep.details} />}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.78rem', color: 'var(--text-secondary)', borderTop: '1px dashed var(--border-color)', paddingTop: '6px', flexWrap: 'wrap', gap: '4px' }}>
        <span>확인자: <strong style={{ color: 'var(--text-primary)', fontWeight: 600 }}>{rep.workerName || '—'}</strong>{enteredBy && enteredBy !== rep.workerName && <> · 입력: {enteredBy}</>}</span>
        <span style={{ fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)', fontWeight: 500 }}>{formatReportDate(rep.createdAt)}</span>
      </div>
    </div>
  );
};

export default ReportHistoryItem;

import React from 'react';

// 유청분리 리포트의 pH 게이지 (제품별 적정 범위 + 누적 평균 대비 차이)
const PhGauge = ({ value, config, historicalAvgPh }) => {
  const targetAvg = historicalAvgPh !== null ? historicalAvgPh : config.defaultAvg;
  const val = parseFloat(value);

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

export default PhGauge;

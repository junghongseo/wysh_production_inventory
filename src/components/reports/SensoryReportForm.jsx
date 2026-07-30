import React from 'react';

const SensoryReportForm = ({
  selectedPlanId,
  sensoryAutoData,
  selectedPlanDetails,
  eval1Note,
  setEval1Note,
  eval1Name,
  setEval1Name,
  eval2Note,
  setEval2Note,
  eval2Name,
  setEval2Name,
  sensoryStatus
}) => {
  return (
    <>
      {/* Auto-fetched Read-Only Info Card */}
      {selectedPlanId && sensoryAutoData && (
        <div style={{
          padding: '16px',
          background: 'var(--bg-tertiary)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span>📌 이전 공정 자동 연동 정보</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)' }}>(발효 및 유청분리 리포트 기준)</span>
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>제품명</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                {selectedPlanDetails?.product?.name || '제품정보 없음'}
              </strong>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>살균 방법</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary)' }}>
                {sensoryAutoData.sterilizationTemp}°C / {sensoryAutoData.sterilizationTime}분 완료
              </strong>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>가열 설정 온도</span>
              <strong style={{ fontSize: '0.88rem', color: 'var(--color-primary)' }}>
                {sensoryAutoData.heatingTemp}°C
              </strong>
            </div>
            <div style={{ background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block' }}>pH</span>
              <strong style={{ fontSize: '0.88rem', color: '#9333ea' }}>
                {sensoryAutoData.phValue}
              </strong>
            </div>
          </div>
        </div>
      )}

      {/* Evaluator 1 Section */}
      <div style={{
        padding: '16px',
        background: 'var(--bg-tertiary)',
        borderRadius: '12px',
        border: (eval1Name && eval1Note) ? '2px solid #10b981' : '2px solid #f59e0b',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            👤 1차 관능평가 (평가자 1)
          </h4>
          {eval1Name && eval1Note && (
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
              ✓ 작성완료
            </span>
          )}
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            관능평가 소감 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(예: 질감 좋음, 산미 좋음 등)</span>
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder="질감, 산미/풍미, 종합의견 등을 자유롭게 작성하세요."
            value={eval1Note}
            onChange={(e) => setEval1Note(e.target.value)}
            required
            style={{ fontSize: '0.88rem', resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            평가자 1 서명 (이름)
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="예: 홍길동 (본인의 이름을 입력하세요)"
            value={eval1Name}
            onChange={(e) => setEval1Name(e.target.value)}
            required
            style={{ height: '40px', fontSize: '0.88rem' }}
          />
        </div>
      </div>

      {/* Evaluator 2 Section */}
      <div style={{
        padding: '16px',
        background: 'var(--bg-tertiary)',
        borderRadius: '12px',
        border: (eval2Name && eval2Note) ? '2px solid #10b981' : '1px solid var(--border-color)',
        opacity: (!eval1Name || !eval1Note) && sensoryStatus !== 'partial' && sensoryStatus !== 'completed' ? 0.6 : 1,
        display: 'flex',
        flexDirection: 'column',
        gap: '12px'
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            👤 2차 관능평가 (평가자 2)
          </h4>
          {(!eval1Name || !eval1Note) && sensoryStatus !== 'partial' && sensoryStatus !== 'completed' ? (
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              🔒 1차 평가 작성/저장 후 입력 가능
            </span>
          ) : (eval2Name && eval2Note && (
            <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 700 }}>
              ✓ 작성완료
            </span>
          ))}
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            관능평가 소감 <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(예: 질감 살짝 묽음, 산미 약간 있음 등)</span>
          </label>
          <textarea
            className="form-control"
            rows="3"
            placeholder={(!eval1Name || !eval1Note) && sensoryStatus !== 'partial' && sensoryStatus !== 'completed' ? "1차 평가 저장 후 입력 가능합니다." : "2차 평가 소감을 작성하세요."}
            value={eval2Note}
            onChange={(e) => setEval2Note(e.target.value)}
            disabled={(!eval1Name || !eval1Note) && sensoryStatus !== 'partial' && sensoryStatus !== 'completed'}
            style={{ fontSize: '0.88rem', resize: 'vertical' }}
          />
        </div>

        <div className="form-group">
          <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '4px' }}>
            평가자 2 서명 (이름)
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="예: 김철수 (본인의 이름을 입력하세요)"
            value={eval2Name}
            onChange={(e) => setEval2Name(e.target.value)}
            disabled={(!eval1Name || !eval1Note) && sensoryStatus !== 'partial' && sensoryStatus !== 'completed'}
            style={{ height: '40px', fontSize: '0.88rem' }}
          />
        </div>
      </div>
    </>
  );
};

export default SensoryReportForm;

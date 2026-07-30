import React from 'react';

const BottlingReportForm = ({
  selectedPlanDetails,
  bottlingCalculations,
  bottlingCount,
  setBottlingCount,
  bottlingRemainsG,
  setBottlingRemainsG,
  item1BottlingCount,
  setItem1BottlingCount,
  item1BottlingRemainsG,
  setItem1BottlingRemainsG,
  item2BottlingCount,
  setItem2BottlingCount,
  item2BottlingRemainsG,
  setItem2BottlingRemainsG,
  bottlingMemo,
  setBottlingMemo,
  bottlingDeductionQty,
  setBottlingDeductionQty,
  item1DeductionQty,
  setItem1DeductionQty,
  item2DeductionQty,
  setItem2DeductionQty
}) => {
  if (!selectedPlanDetails || !bottlingCalculations) return null;

  return (
    <div style={{ padding: '16px', background: 'var(--bg-tertiary)', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      
      {/* Single Item vs 2-Item Form Input */}
      {!bottlingCalculations.isMultiItem ? (
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            2. 병입 수량 및 남은 양 입력 (단종 생산)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>병입 완제품 수량 (개)</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="예: 112"
                value={bottlingCount}
                onChange={(e) => setBottlingCount(e.target.value)}
                required
                min="0"
                style={{ height: '40px', fontSize: '0.88rem' }}
              />
            </div>
            <div className="form-group">
              <label style={{ fontSize: '0.84rem', fontWeight: 600 }}>미달 남은 양 (g)</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="예: 215"
                value={bottlingRemainsG}
                onChange={(e) => setBottlingRemainsG(e.target.value)}
                min="0"
                style={{ height: '40px', fontSize: '0.88rem' }}
              />
            </div>
          </div>
        </div>
      ) : (
        <div>
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px' }}>
            2. 2종 동시 생산 병입 수량 입력
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Item 1 */}
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-primary)', marginBottom: '8px' }}>
                품목 1: {bottlingCalculations.item1.productName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>병입 수량 (개)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="예: 112"
                    value={item1BottlingCount}
                    onChange={(e) => setItem1BottlingCount(e.target.value)}
                    required
                    min="0"
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>미달 남은 양 (g)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="예: 215"
                    value={item1BottlingRemainsG}
                    onChange={(e) => setItem1BottlingRemainsG(e.target.value)}
                    min="0"
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  />
                </div>
              </div>
            </div>

            {/* Item 2 */}
            <div style={{ padding: '12px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
              <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--color-primary)', marginBottom: '8px' }}>
                품목 2: {bottlingCalculations.item2.productName}
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>병입 수량 (개)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="예: 96"
                    value={item2BottlingCount}
                    onChange={(e) => setItem2BottlingCount(e.target.value)}
                    required
                    min="0"
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>미달 남은 양 (g)</label>
                  <input 
                    type="number" 
                    className="form-control" 
                    placeholder="예: 180"
                    value={item2BottlingRemainsG}
                    onChange={(e) => setItem2BottlingRemainsG(e.target.value)}
                    min="0"
                    style={{ height: '38px', fontSize: '0.86rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Real-time Yield Display */}
      <div style={{ padding: '12px 16px', background: 'rgba(2, 132, 199, 0.08)', borderRadius: '10px', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
            🎯 목표 수율: <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-outfit)' }}>{bottlingCalculations.targetYield}%</strong>
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '2px' }}>
            {bottlingCalculations.isMultiItem ? '두 제품 베이스 요거트 환산 총량 기준' : '원재료 총량 대비 계산된 수율'}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>실제 수율</span>
          <div style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)' }}>
            {bottlingCalculations.actualYield || 0}%
          </div>
        </div>
      </div>

      {/* Special Notes & Deductions */}
      <div>
        <h4 style={{ fontSize: '0.92rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '8px' }}>
          3. 특이사항 및 실제 입고 수량
        </h4>
        <div className="form-group" style={{ marginBottom: '10px' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 600 }}>특이사항 (예: 질감 확인용 1개 4층 쇼케이스 냉장고에 보관)</label>
          <input 
            type="text" 
            className="form-control" 
            placeholder="특이사항이 있을 경우 입력하세요"
            value={bottlingMemo}
            onChange={(e) => setBottlingMemo(e.target.value)}
            style={{ height: '38px', fontSize: '0.86rem' }}
          />
        </div>

        {!bottlingCalculations.isMultiItem ? (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '12px', borderRadius: '10px', border: '1px solid var(--border-color)' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label style={{ fontSize: '0.8rem', fontWeight: 600 }}>제외/샘플 수량 (개)</label>
              <input 
                type="number" 
                className="form-control" 
                placeholder="0"
                value={bottlingDeductionQty}
                onChange={(e) => setBottlingDeductionQty(e.target.value)}
                min="0"
                style={{ height: '38px', fontSize: '0.86rem' }}
              />
            </div>
            <div>
              <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>실제 입고 수량</div>
              <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-outfit)' }}>
                {bottlingCalculations.actualStockedQty || 0} 개
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>{bottlingCalculations.item1.productName} 제외 수량</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="0"
                  value={item1DeductionQty}
                  onChange={(e) => setItem1DeductionQty(e.target.value)}
                  min="0"
                  style={{ height: '36px', fontSize: '0.84rem' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>실제 입고 수량</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-outfit)' }}>
                  {bottlingCalculations.item1.stockedQty || 0} 개
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', alignItems: 'center', background: 'var(--bg-secondary)', padding: '10px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600 }}>{bottlingCalculations.item2.productName} 제외 수량</label>
                <input 
                  type="number" 
                  className="form-control" 
                  placeholder="0"
                  value={item2DeductionQty}
                  onChange={(e) => setItem2DeductionQty(e.target.value)}
                  min="0"
                  style={{ height: '36px', fontSize: '0.84rem' }}
                />
              </div>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>실제 입고 수량</div>
                <div style={{ fontSize: '1.05rem', fontWeight: 800, color: 'var(--color-success)', fontFamily: 'var(--font-outfit)' }}>
                  {bottlingCalculations.item2.stockedQty || 0} 개
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Expiration Date Display */}
      <div style={{ padding: '12px 14px', background: 'var(--bg-secondary)', borderRadius: '10px', border: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span>📅</span>
          <span>자동 지정 소비기한</span>
        </div>
        {!bottlingCalculations.isMultiItem ? (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.84rem' }}>
            <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{bottlingCalculations.productName}</span>
            <strong style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)', fontSize: '0.92rem' }}>
              {bottlingCalculations.expiryDate}
            </strong>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.84rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>품목 1: {bottlingCalculations.item1.productName}</span>
              <strong style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)', fontSize: '0.92rem' }}>
                {bottlingCalculations.item1.expiryDate}
              </strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--bg-tertiary)', borderRadius: '8px', fontSize: '0.84rem' }}>
              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>품목 2: {bottlingCalculations.item2.productName}</span>
              <strong style={{ color: 'var(--color-primary)', fontFamily: 'var(--font-outfit)', fontSize: '0.92rem' }}>
                {bottlingCalculations.item2.expiryDate}
              </strong>
            </div>
          </div>
        )}
      </div>

    </div>
  );
};

export default BottlingReportForm;

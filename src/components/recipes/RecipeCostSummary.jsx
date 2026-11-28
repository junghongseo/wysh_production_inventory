import React from 'react';
import { computeCostRatio } from '../../utils/costCalculator';
import { formatWon, formatPercent } from './costFormat';

const DISCOUNTS = [
  { rate: 0, label: '정가' },
  { rate: 0.05, label: '5% 할인' },
  { rate: 0.1, label: '10% 할인' }
];

// 레시피 편집기 하단 원가·원가율 요약 카드 (관리자 전용)
const RecipeCostSummary = ({ costResult, isSubIngredient, salePrice, onSalePriceChange }) => {
  const {
    complete, missing, unitCost, partialUnitCost, costPerGram, partialCostPerGram, weight,
    ingredientsComplete, ingredientUnitCost, packagingCost, packagingLines = []
  } = costResult;
  const priceNum = parseFloat(salePrice) || 0;

  return (
    <div style={{ marginTop: '24px', background: 'rgba(16, 185, 129, 0.04)', border: '1px solid rgba(16, 185, 129, 0.25)', borderRadius: '8px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>💰 원가 분석</h5>
        <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{isSubIngredient ? '원재료비만 포함' : '원재료비 + 부자재비'} · 단가표 VAT 제외 단가 기준</span>
      </div>

      {!complete && (
        <div style={{ background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)', color: '#b45309', borderRadius: '6px', padding: '8px 10px', fontSize: '0.8rem', marginBottom: '12px' }}>
          <strong>⚠ 원가 미완성 — 단가 확인 필요 {missing.length}건:</strong> {missing.join(', ')}
          <div style={{ marginTop: '2px', color: 'var(--text-secondary)' }}>
            단가를 확인할 수 있는 항목만 합산한 부분 원가 (VAT 제외):{isSubIngredient ? `1kg당 ${formatWon(partialCostPerGram * 1000)}원` : `1개당 ${formatWon(partialUnitCost)}원`}
          </div>
        </div>
      )}

      {isSubIngredient ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <Stat label="반제품 1g당 원가 (VAT 제외)" value={complete ? `${formatWon(costPerGram)}원` : '-'} />
          <Stat label="반제품 1kg당 원가 (VAT 제외)" value={complete ? `${formatWon(costPerGram * 1000)}원` : '-'} />
        </div>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px', marginBottom: '10px' }}>
            <Stat label={`1개 원재료비 (${weight || 0}g 기준)`} value={ingredientsComplete ? `${formatWon(ingredientUnitCost)}원` : '-'} />
            <Stat label={`1개 부자재비 (${packagingLines.length}개 항목)`} value={packagingCost !== null && packagingCost !== undefined ? `${formatWon(packagingCost)}원` : '-'} />
            <Stat label="1개 총원가 (VAT 제외)" value={complete ? `${formatWon(unitCost)}원` : '-'} highlight />
          </div>
          {packagingLines.length === 0 && (
            <p style={{ margin: '0 0 10px 0', fontSize: '0.78rem', color: '#b45309' }}>
              부자재 구성이 비어 있어 원재료비만으로 원가율을 계산합니다.
            </p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '12px' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label htmlFor="edit-product-sale-price" style={{ fontSize: '0.78rem' }}>판매가 (VAT 포함, 원)</label>
              <input
                type="number" inputMode="decimal"
                className="form-control"
                id="edit-product-sale-price"
                min="0"
                step="10"
                value={salePrice}
                onChange={(e) => onSalePriceChange(e.target.value)}
                onFocus={(e) => e.target.select()}
                placeholder="예: 5900"
              />
            </div>
          </div>

          {priceNum > 0 ? (
            <div className="wysh-table-wrapper">
              <table className="wysh-table" style={{ fontSize: '0.82rem' }}>
                <thead>
                  <tr>
                    <th>구분</th>
                    <th style={{ textAlign: 'right' }}>판매가 (VAT 포함)</th>
                    <th style={{ textAlign: 'right' }}>공급가 (VAT 제외)</th>
                    <th style={{ textAlign: 'right' }}>원가율 (원·부자재)</th>
                    <th style={{ textAlign: 'right' }}>원가율 (원재료만)</th>
                    <th style={{ textAlign: 'right' }}>개당 마진 (VAT 제외)</th>
                  </tr>
                </thead>
                <tbody>
                  {DISCOUNTS.map(d => {
                    const r = computeCostRatio(complete ? unitCost : null, priceNum, d.rate);
                    const rIng = computeCostRatio(ingredientsComplete ? ingredientUnitCost : null, priceNum, d.rate);
                    const netPrice = priceNum * (1 - d.rate) / 1.1;
                    return (
                      <tr key={d.label}>
                        <td style={{ fontWeight: 600 }}>{d.label}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{formatWon(priceNum * (1 - d.rate))}원</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{formatWon(netPrice)}원</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', fontWeight: 800, color: 'var(--color-primary)' }}>
                          {r ? `${formatPercent(r.costRatio)}%` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)', color: 'var(--text-secondary)' }}>
                          {rIng ? `${formatPercent(rIng.costRatio)}%` : '-'}
                        </td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--font-outfit)' }}>{r ? `${formatWon(r.margin)}원` : '-'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
              판매가를 입력하면 정가·5%·10% 할인 시 원가율이 계산됩니다. 판매가는 저장 버튼을 눌러야 보관됩니다.
            </p>
          )}
        </>
      )}
    </div>
  );
};

const Stat = ({ label, value, highlight }) => (
  <div style={{ padding: '10px 12px', background: 'var(--bg-secondary)', border: highlight ? '1px solid rgba(16, 185, 129, 0.5)' : '1px solid var(--border-color)', borderRadius: '8px' }}>
    <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{label}</div>
    <div style={{ fontSize: '1.15rem', fontWeight: 800, fontFamily: 'var(--font-outfit)', color: 'var(--text-primary)' }}>{value}</div>
  </div>
);

export default RecipeCostSummary;

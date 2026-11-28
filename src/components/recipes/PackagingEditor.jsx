import React from 'react';
import { getPackagingCostPerPiece } from '../../utils/costCalculator';
import { formatWon } from './costFormat';

// 레시피 편집기의 부자재 구성 (관리자 전용)
// packaging: [{ materialId, qty }] — 제품 1개(판매 단위)에 들어가는 부자재
const PackagingEditor = ({ packaging, onChange, packagingMaterials, costLines = [], packagingCost, partialPackagingCost }) => {
  const usedIds = new Set(packaging.map(p => p.materialId));
  const firstUnused = packagingMaterials.find(m => !usedIds.has(m.id));

  const handleAdd = () => {
    if (!firstUnused) return;
    onChange([...packaging, { materialId: firstUnused.id, qty: 1 }]);
  };
  const handleChange = (idx, field, value) => {
    onChange(packaging.map((item, i) => (i === idx ? { ...item, [field]: value } : item)));
  };
  const handleRemove = (idx) => {
    onChange(packaging.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ marginTop: '24px', background: 'rgba(147, 51, 234, 0.04)', border: '1px solid rgba(147, 51, 234, 0.22)', borderRadius: '8px', padding: '16px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px', gap: '8px', flexWrap: 'wrap' }}>
        <h5 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>📦 부자재 구성 (제품 1개 기준)</h5>
        <button
          type="button"
          className="btn-secondary"
          onClick={handleAdd}
          disabled={!firstUnused}
          title={firstUnused ? '' : '단가표의 부자재를 모두 추가했습니다'}
          style={{ padding: '4px 10px', fontSize: '0.8rem' }}
        >
          + 부자재 추가
        </button>
      </div>

      {packagingMaterials.length === 0 && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          단가표에 등록된 부자재가 없습니다. "원/부자재 단가" 탭에서 먼저 등록하세요.
        </p>
      )}

      {packaging.length === 0 && packagingMaterials.length > 0 && (
        <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
          용기·라벨·포장재·택배비 등 제품 1개에 들어가는 부자재를 추가하면 원가율에 포함됩니다.
        </p>
      )}

      {packaging.map((item, idx) => {
        const line = costLines[idx];
        const selected = packagingMaterials.find(m => m.id === item.materialId);
        const perPiece = getPackagingCostPerPiece(selected);
        return (
          <div key={idx} style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap' }}>
            <select
              className="form-control"
              value={item.materialId}
              onChange={(e) => handleChange(idx, 'materialId', e.target.value)}
              style={{ flex: '1 1 200px', minWidth: 0, height: '38px', fontSize: '0.85rem' }}
            >
              {!selected && <option value={item.materialId}>⚠ 삭제된 부자재</option>}
              {packagingMaterials.map(m => (
                <option key={m.id} value={m.id} disabled={m.id !== item.materialId && usedIds.has(m.id)}>
                  {m.name}
                </option>
              ))}
            </select>
            <div style={{ position: 'relative', width: '90px' }}>
              <input
                type="number" inputMode="decimal"
                className="form-control"
                value={item.qty}
                min="0"
                step="any"
                onChange={(e) => handleChange(idx, 'qty', e.target.value)}
                onFocus={(e) => e.target.select()}
                aria-label="사용량"
                style={{ height: '38px', paddingRight: '28px', fontSize: '0.85rem' }}
              />
              <span style={{ position: 'absolute', right: '8px', top: '10px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>{selected?.unit || '개'}</span>
            </div>
            <div style={{ width: '130px', textAlign: 'right', fontSize: '0.8rem', fontFamily: 'var(--font-outfit)' }}>
              <div style={{ fontWeight: 700 }}>{line?.cost !== null && line?.cost !== undefined ? `${formatWon(line.cost)}원` : '-'}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>{perPiece !== null ? `개당 ${formatWon(perPiece)}원` : '단가 확인 필요'}</div>
            </div>
            <button type="button" className="btn-icon" onClick={() => handleRemove(idx)} title="부자재 삭제" style={{ borderColor: 'rgba(248,113,113,0.2)' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          </div>
        );
      })}

      {packaging.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', fontSize: '0.85rem', marginTop: '4px' }}>
          <span style={{ color: 'var(--text-secondary)' }}>부자재비 합계 (VAT 제외)</span>
          <strong style={{ fontFamily: 'var(--font-outfit)' }}>
            {packagingCost !== null && packagingCost !== undefined ? `${formatWon(packagingCost)}원` : `${formatWon(partialPackagingCost)}원 (일부)`}
          </strong>
        </div>
      )}
    </div>
  );
};

export default PackagingEditor;

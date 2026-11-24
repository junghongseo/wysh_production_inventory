import React from 'react';
import { FREE_MATERIAL_ID, nameSimilarity } from '../../utils/costCalculator';
import { formatGram, formatWon } from './costFormat';

const STATUS_STYLES = {
  ok: { color: '#047857', background: 'rgba(16, 185, 129, 0.08)', border: '1px solid rgba(16, 185, 129, 0.2)' },
  auto: { color: '#0369a1', background: 'rgba(2, 132, 199, 0.06)', border: '1px solid rgba(2, 132, 199, 0.2)' },
  warn: { color: '#b45309', background: 'rgba(245, 158, 11, 0.08)', border: '1px solid rgba(245, 158, 11, 0.35)' }
};

// 선택칸 값: '' (연결 없음/자동) | 'sub:<반제품 id>' | 'mat:<단가표 id>' | FREE_MATERIAL_ID
const currentLinkValue = (ingredient) => {
  if (ingredient.subProductId) return `sub:${ingredient.subProductId}`;
  if (ingredient.materialId === FREE_MATERIAL_ID) return FREE_MATERIAL_ID;
  if (ingredient.materialId) return `mat:${ingredient.materialId}`;
  return '';
};

// 레시피 원재료 한 줄 아래: 연결 상태 + 원가 + 통합 연결 선택(반제품 / 단가표 원재료 / 0원 처리)
const IngredientCostLine = ({ line, ingredient, rawMaterials, subProducts = [], lockLink, showPerUnit, onSelectLink }) => {
  const { source } = line;
  const isProduct = source.type === 'product';
  const isSub = isProduct && (source.product.isSubIngredient || source.product.category === 'sub_ingredient');

  let tone = 'ok';
  let label;
  if (isProduct) {
    label = `🔗 ${isSub ? '반제품' : '베이스 제품'}: ${source.product.name}`;
    if (line.costPerGram === null) tone = 'warn';
  } else if (source.type === 'free') {
    label = source.matchStatus === 'learned' ? '🔁 0원 처리 (다른 제품 연결 적용)' : '0원 처리';
    if (source.matchStatus === 'learned') tone = 'auto';
  } else if (source.type === 'material') {
    if (source.matchStatus === 'learned') {
      tone = 'auto';
      label = `🔁 다른 제품 연결 적용: ${source.material.name}`;
    } else if (source.matchStatus === 'auto') {
      tone = 'auto';
      label = `≈ 자동 매칭: ${source.material.name}`;
    } else {
      label = `✓ 단가표: ${source.material.name}`;
    }
    if (line.costPerGram === null) tone = 'warn';
  } else {
    tone = 'warn';
    label = source.materialMissing
      ? '⚠ 연결된 단가표 항목이 삭제됨'
      : (source.matchStatus === 'conflict' ? '⚠ 제품마다 다르게 연결됨 — 하나를 선택하세요' : '⚠ 미연결 — 반제품 또는 단가표 원재료를 선택하세요');
  }

  let costText = '';
  if (line.costPerGram === null) {
    costText = isProduct ? '하위 레시피 원가 미완성' : (source.type === 'material' ? '단가표 가격·포장량 확인 필요' : '');
  } else if (showPerUnit) {
    costText = `1개당 ${formatGram(line.gramsPerUnit)}g · ${formatWon(line.costPerUnit)}원`;
  } else {
    costText = `반제품 1kg당 ${formatGram(line.gramsPerOutputGram * 1000)}g · ${formatWon(line.costPerOutputGram * 1000)}원`;
  }
  if (line.costPerGram !== null && source.type === 'material') {
    costText += ` (10g당 ${formatWon(line.costPerGram * 10)}원)`;
  }

  // 추천 후보: 단가표 후보 + 이름이 비슷한 반제품
  const subCandidates = source.type === 'unlinked'
    ? subProducts
      .map(s => ({ s, score: nameSimilarity(ingredient.name, s.name) }))
      .filter(c => c.score >= 0.35)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
      .map(c => c.s)
    : [];
  const materialCandidates = source.candidates || [];
  const hasCandidates = subCandidates.length + materialCandidates.length > 0;

  const value = currentLinkValue(ingredient);
  let emptyLabel = '연결 선택…';
  if (!value && source.type !== 'unlinked') {
    emptyLabel = source.matchStatus === 'learned' ? '다른 제품 연결 따름' : '이름 자동 매칭';
  }

  return (
    <div style={{
      ...STATUS_STYLES[tone],
      marginTop: '4px',
      padding: '4px 8px',
      borderRadius: '6px',
      fontSize: '0.75rem',
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: '6px 10px'
    }}>
      <span style={{ fontWeight: 700 }}>{label}</span>
      {costText && <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-outfit)' }}>{costText}</span>}
      {!lockLink && (
        <select
          className="form-control"
          value={value}
          onChange={(e) => onSelectLink(e.target.value)}
          title="이 원재료를 반제품 또는 원/부자재 단가표 항목에 연결"
          style={{ marginLeft: 'auto', width: 'auto', maxWidth: '240px', fontSize: '0.75rem', padding: '2px 6px', height: 'auto' }}
        >
          <option value="">{emptyLabel}</option>
          {hasCandidates && (
            <optgroup label="추천 후보">
              {subCandidates.map(s => <option key={`cs-${s.id}`} value={`sub:${s.id}`}>[반제품] {s.name}</option>)}
              {materialCandidates.map(m => <option key={`cm-${m.id}`} value={`mat:${m.id}`}>{m.name}</option>)}
            </optgroup>
          )}
          {subProducts.length > 0 && (
            <optgroup label="반제품">
              {subProducts.map(s => <option key={`s-${s.id}`} value={`sub:${s.id}`}>{s.name}</option>)}
            </optgroup>
          )}
          <optgroup label="단가표 원재료">
            {rawMaterials.map(m => <option key={`m-${m.id}`} value={`mat:${m.id}`}>{m.name}</option>)}
          </optgroup>
          <option value={FREE_MATERIAL_ID}>0원 처리 (정제수 등)</option>
        </select>
      )}
    </div>
  );
};

export default IngredientCostLine;

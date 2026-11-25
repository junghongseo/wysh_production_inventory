// 원가 계산 순수 함수 모음 (UI와 분리)
// - 원재료 단가표(materialCosts) 항목 → g당 단가(VAT 제외)
// - 레시피 원재료 → 단가표 항목 / 반제품 / 베이스 제품 연결
// - 제품 1개 원가, 판매가(VAT 포함) 대비 원가율 계산

export const VAT_RATE = 0.1;

// 원가 계산에서 0원으로 처리하는 특수 연결값 (정제수 등 단가표에 없는 무상 원재료)
export const FREE_MATERIAL_ID = '__free__';

const GRAM_FACTORS = { g: 1, kg: 1000, ml: 1, L: 1000 };

export const excludeVat = (price, taxType) => {
  const p = parseFloat(price) || 0;
  return taxType === 'taxable' ? p / (1 + VAT_RATE) : p;
};

// 원재료 단가표 항목의 g당 단가 (VAT 제외). 계산 불가 시 null
// 1L = 1000g, 1ml = 1g (비중 차이 무시)
export const getMaterialCostPerGram = (material) => {
  if (!material) return null;
  const factor = GRAM_FACTORS[material.unit];
  if (!factor) return null;
  const qty = parseFloat(material.packageQty) || 0;
  const price = parseFloat(material.priceVatInclusive) || 0;
  if (qty <= 0 || price <= 0) return null;
  return excludeVat(price, material.taxType) / (qty * factor);
};

// ---- 이름 매칭 ----

const SYNONYMS = [
  [/파우더/g, '분말'],
  [/메스/g, '매스']
];

// 띄어쓰기, 괄호·기호, 대소문자, 흔한 표기 차이를 정리한 비교용 이름
export const normalizeName = (name) => {
  let s = String(name || '').toLowerCase();
  SYNONYMS.forEach(([re, to]) => { s = s.replace(re, to); });
  return s.replace(/[\s()[\]{}\-_.,·/]/g, '');
};

const bigrams = (s) => {
  const out = [];
  for (let i = 0; i < s.length - 1; i++) out.push(s.slice(i, i + 2));
  return out;
};

// 0~1 유사도 (bigram Dice 계수, 포함 관계는 가산)
export const nameSimilarity = (a, b) => {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) {
    return 0.6 + 0.4 * (Math.min(na.length, nb.length) / Math.max(na.length, nb.length));
  }
  const ba = bigrams(na);
  const bb = bigrams(nb);
  if (ba.length === 0 || bb.length === 0) return 0;
  const pool = [...bb];
  let hits = 0;
  ba.forEach(g => {
    const idx = pool.indexOf(g);
    if (idx >= 0) { hits++; pool.splice(idx, 1); }
  });
  return (2 * hits) / (ba.length + bb.length);
};

// 레시피 원재료 이름 → 단가표 원재료 매칭
// status: 'exact' (이름 완전 일치) | 'auto' (정규화 후 유일 일치) | 'ambiguous' | 'none'
export const matchMaterialByName = (name, materials = []) => {
  const raws = materials.filter(m => m.category === 'raw');
  const trimmed = String(name || '').trim();
  const candidatesOf = () => raws
    .map(m => ({ material: m, score: nameSimilarity(trimmed, m.name) }))
    .filter(c => c.score >= 0.35)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (!trimmed) return { status: 'none', material: null, candidates: [] };

  const exact = raws.filter(m => String(m.name).trim() === trimmed);
  if (exact.length === 1) return { status: 'exact', material: exact[0], candidates: [] };

  const norm = normalizeName(trimmed);
  const normalized = raws.filter(m => normalizeName(m.name) === norm);
  if (normalized.length === 1) return { status: 'auto', material: normalized[0], candidates: [] };
  if (normalized.length > 1 || exact.length > 1) {
    return { status: 'ambiguous', material: null, candidates: candidatesOf() };
  }
  return { status: 'none', material: null, candidates: candidatesOf() };
};

// ---- 다른 제품에서 학습한 연결 ----

// 모든 제품 레시피에서 "원재료 이름 → 단가표 연결(materialId)"을 모은다.
// 한 제품에서 "알룰로스 분말 → 알룰로스"로 연결·저장하면 다른 제품의 같은 이름 재료에도 적용된다.
// 반환: Map<정규화 이름, { materialIds: Set<string> }> (존재하는 단가표 항목 또는 0원 처리만)
export const buildLearnedLinks = (products = [], materials = []) => {
  const validIds = new Set(materials.map(m => m.id));
  const links = new Map();
  products.forEach(p => {
    (p.ingredients || []).forEach(ing => {
      if (!ing || !ing.materialId || ing.subProductId) return;
      if (ing.materialId !== FREE_MATERIAL_ID && !validIds.has(ing.materialId)) return;
      // 현재 이름 + 단가표 이름으로 바꾸기 전 이름(originalName) 모두 학습
      const keys = new Set([normalizeName(ing.name), normalizeName(ing.originalName)].filter(Boolean));
      keys.forEach(key => {
        if (!links.has(key)) links.set(key, { materialIds: new Set() });
        links.get(key).materialIds.add(ing.materialId);
      });
    });
  });
  return links;
};

// ---- 원재료 출처 결정 ----

const isSubProduct = (p) => p && (p.isSubIngredient || p.category === 'sub_ingredient');

// 레시피 원재료 한 줄이 무엇을 가리키는지 결정
// 반환: { type: 'product' | 'material' | 'free' | 'unlinked', product?, material?, matchStatus, candidates }
// matchStatus: 'linked' | 'learned' (다른 제품의 연결 적용) | 'exact' | 'auto' | 'conflict' | 'ambiguous' | 'none'
export const resolveIngredientSource = (ing, index, ownerProduct, products = [], materials = [], learnedLinks = null) => {
  if (ing.subProductId) {
    const sub = products.find(p => p.id === ing.subProductId);
    if (sub) return { type: 'product', product: sub, matchStatus: 'linked', candidates: [] };
  }
  const isFlavorOwner = ownerProduct && ownerProduct.isFlavor && !isSubProduct(ownerProduct);
  if (isFlavorOwner && index === 0 && ownerProduct.baseProductId) {
    const base = products.find(p => p.id === ownerProduct.baseProductId);
    if (base) return { type: 'product', product: base, matchStatus: 'linked', candidates: [] };
  }
  if (ing.materialId === FREE_MATERIAL_ID) {
    return { type: 'free', matchStatus: 'linked', candidates: [] };
  }
  if (ing.materialId) {
    const mat = materials.find(m => m.id === ing.materialId);
    if (mat) return { type: 'material', material: mat, matchStatus: 'linked', candidates: [] };
    // 연결했던 단가표 항목이 삭제된 경우 → 이름 매칭으로 재시도
  }
  // 이름이 정확히 같은 다른 제품/반제품
  const sameNameProduct = products.find(p => p.id !== ownerProduct?.id && String(p.name).trim() === String(ing.name || '').trim());
  if (sameNameProduct) return { type: 'product', product: sameNameProduct, matchStatus: 'linked', candidates: [] };

  // 다른 제품에서 같은 이름 재료를 연결해 둔 경우 그 연결을 따른다
  const learned = (learnedLinks || buildLearnedLinks(products, materials)).get(normalizeName(ing.name));
  if (learned && learned.materialIds.size === 1) {
    const [learnedId] = [...learned.materialIds];
    if (learnedId === FREE_MATERIAL_ID) return { type: 'free', matchStatus: 'learned', candidates: [] };
    const mat = materials.find(m => m.id === learnedId);
    return { type: 'material', material: mat, matchStatus: 'learned', candidates: [] };
  }
  if (learned && learned.materialIds.size > 1) {
    // 제품마다 다른 단가표 항목으로 연결된 경우 → 자동 적용하지 않고 후보로 제시
    const conflictMaterials = materials.filter(m => learned.materialIds.has(m.id));
    return { type: 'unlinked', matchStatus: 'conflict', candidates: conflictMaterials, materialMissing: !!ing.materialId };
  }

  const match = matchMaterialByName(ing.name, materials);
  if (match.material) {
    return { type: 'material', material: match.material, matchStatus: match.status, candidates: [] };
  }
  return {
    type: 'unlinked',
    matchStatus: match.status,
    candidates: match.candidates.map(c => c.material),
    materialMissing: !!ing.materialId
  };
};

// ---- 제품 원가 ----

const yieldFactor = (product) => {
  const y = parseFloat(product?.yield);
  return y > 0 ? y / 100 : 1;
};

// 제품(또는 반제품) 완성품 1g당 원가 (VAT 제외)
// 수율: 투입 원재료 총중량 × 수율% = 완성품 중량 → 완성품 g당 원가 = 투입 g당 원가 ÷ 수율
export const computeProductCostPerGram = (product, products = [], materials = [], visiting = new Set(), learnedLinks = null) => {
  const learned = learnedLinks || buildLearnedLinks(products, materials);
  if (!product) return { costPerGram: null, complete: false, missing: [], lines: [] };
  if (visiting.has(product.id)) {
    return { costPerGram: null, complete: false, missing: [`순환 참조: ${product.name}`], lines: [] };
  }
  const nextVisiting = new Set(visiting);
  nextVisiting.add(product.id);

  const yf = yieldFactor(product);
  const missing = [];
  let inputCostPerGram = 0;

  const lines = (product.ingredients || []).map((ing, idx) => {
    const ratio = parseFloat(ing.ratio) || 0;
    const source = resolveIngredientSource(ing, idx, product, products, materials, learned);
    let costPerGram = null;
    let subMissing = [];
    if (source.type === 'material') {
      costPerGram = getMaterialCostPerGram(source.material);
      if (costPerGram === null) subMissing = [`${ing.name} (단가표 가격/포장량 확인 필요)`];
    } else if (source.type === 'free') {
      costPerGram = 0;
    } else if (source.type === 'product') {
      const sub = computeProductCostPerGram(source.product, products, materials, nextVisiting, learned);
      costPerGram = sub.complete ? sub.costPerGram : null;
      if (!sub.complete) subMissing = sub.missing.length > 0 ? sub.missing : [ing.name];
    } else {
      subMissing = [ing.name];
    }
    missing.push(...subMissing);
    // 완성품 1g을 만들 때 이 원재료가 투입되는 g
    const gramsPerOutputGram = (ratio / 100) / yf;
    const costPerOutputGram = costPerGram === null ? null : costPerGram * gramsPerOutputGram;
    if (costPerOutputGram !== null) inputCostPerGram += costPerOutputGram;
    return { name: ing.name, ratio, source, costPerGram, gramsPerOutputGram, costPerOutputGram };
  });

  const complete = missing.length === 0;
  return {
    costPerGram: complete ? inputCostPerGram : null,
    partialCostPerGram: inputCostPerGram,
    complete,
    missing: [...new Set(missing)],
    lines
  };
};

// ---- 부자재 ----

// 부자재 단가표 항목의 개당 단가 (VAT 제외). 계산 불가 시 null
export const getPackagingCostPerPiece = (material) => {
  if (!material || material.category !== 'packaging') return null;
  const qty = parseFloat(material.packageQty) || 0;
  const price = parseFloat(material.priceVatInclusive) || 0;
  if (qty <= 0 || price <= 0) return null;
  return excludeVat(price, material.taxType) / qty;
};

// 제품 1개에 들어가는 부자재비 (VAT 제외)
// product.packaging: [{ materialId, qty }] — 제품 1개(판매 단위) 기준 사용량
// 부자재비는 제품 1개 단위로만 더한다 (g당 원가에 섞지 않음 → 베이스 제품의 용기값이 플레이버로 전파되지 않음)
export const computePackagingCost = (product, materials = []) => {
  const missing = [];
  let total = 0;
  const lines = (Array.isArray(product?.packaging) ? product.packaging : []).map(item => {
    const qty = parseFloat(item?.qty) || 0;
    const material = materials.find(m => m.id === item?.materialId) || null;
    const costPerPiece = getPackagingCostPerPiece(material);
    if (!material) missing.push('삭제된 부자재 (구성에서 제거 필요)');
    else if (costPerPiece === null) missing.push(`${material.name} (단가표 가격/포장량 확인 필요)`);
    const cost = costPerPiece === null ? null : costPerPiece * qty;
    if (cost !== null) total += cost;
    return { materialId: item?.materialId, material, qty, costPerPiece, cost };
  });
  const complete = missing.length === 0;
  return { lines, complete, missing, packagingCost: complete ? total : null, partialPackagingCost: total };
};

// 제품 1개 원가 (단일 용량 중량 기준) = 원재료비 + 부자재비
export const computeProductUnitCost = (product, products = [], materials = []) => {
  const weight = parseFloat(product?.weight) || 0;
  const result = computeProductCostPerGram(product, products, materials);
  const lines = result.lines.map(l => ({
    ...l,
    gramsPerUnit: l.gramsPerOutputGram * weight,
    costPerUnit: l.costPerOutputGram === null ? null : l.costPerOutputGram * weight
  }));
  const isSub = product && (product.isSubIngredient || product.category === 'sub_ingredient');
  const packaging = isSub
    ? { lines: [], complete: true, missing: [], packagingCost: 0, partialPackagingCost: 0 }
    : computePackagingCost(product, materials);
  const ingredientUnitCost = result.complete ? result.costPerGram * weight : null;
  const partialIngredientUnitCost = result.partialCostPerGram * weight;
  const complete = result.complete && packaging.complete;
  return {
    ...result,
    weight,
    lines,
    complete,
    missing: [...new Set([...result.missing, ...packaging.missing])],
    ingredientsComplete: result.complete,
    ingredientUnitCost,
    partialIngredientUnitCost,
    packagingLines: packaging.lines,
    packagingCost: packaging.packagingCost,
    partialPackagingCost: packaging.partialPackagingCost,
    unitCost: complete ? ingredientUnitCost + packaging.packagingCost : null,
    partialUnitCost: partialIngredientUnitCost + packaging.partialPackagingCost
  };
};

// 판매가(VAT 포함) 대비 원가율. 할인율은 0~1
export const computeCostRatio = (unitCost, salePriceVatInclusive, discountRate = 0) => {
  const price = parseFloat(salePriceVatInclusive) || 0;
  if (price <= 0 || unitCost === null || unitCost === undefined) return null;
  const discountedPrice = price * (1 - discountRate);
  const netPrice = discountedPrice / (1 + VAT_RATE);
  return {
    discountRate,
    discountedPrice,
    netPrice,
    costRatio: (unitCost / netPrice) * 100,
    margin: netPrice - unitCost
  };
};

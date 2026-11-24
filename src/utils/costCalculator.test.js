import {
  FREE_MATERIAL_ID,
  getMaterialCostPerGram,
  normalizeName,
  matchMaterialByName,
  computeProductCostPerGram,
  computeProductUnitCost,
  computeCostRatio,
  buildLearnedLinks
} from './costCalculator.js';

let totalPassed = 0;
let totalFailed = 0;
const assert = (cond, msg) => {
  if (cond) { totalPassed++; console.log(`✅ ${msg}`); }
  else { totalFailed++; console.error(`❌ FAIL: ${msg}`); process.exitCode = 1; }
};
const near = (a, b, eps = 1e-6) => a !== null && Math.abs(a - b) < eps;

// 테스트용 단가표 (가격은 계산 검증용 임의 값)
const materials = [
  { id: 'm-milk', category: 'raw', name: '탈지분유', unit: 'kg', packageQty: 20, priceVatInclusive: 220000, taxType: 'taxable' }, // 10원/g
  { id: 'm-fiber', category: 'raw', name: '식이섬유', unit: 'g', packageQty: 1000, priceVatInclusive: 30000, taxType: 'exempt' }, // 30원/g
  { id: 'm-allu', category: 'raw', name: '알룰로스 분말', unit: 'kg', packageQty: 1, priceVatInclusive: 11000, taxType: 'taxable' }, // 10원/g
  { id: 'm-cacao', category: 'raw', name: '카카오 매스', unit: 'kg', packageQty: 1, priceVatInclusive: 22000, taxType: 'taxable' }, // 20원/g
  { id: 'm-syrup', category: 'raw', name: '시럽', unit: 'L', packageQty: 2, priceVatInclusive: 4000, taxType: 'exempt' }, // 2원/g
  { id: 'm-cup', category: 'packaging', name: '컵', unit: '개', packageQty: 100, priceVatInclusive: 11000, taxType: 'taxable' }
];

// 1. 단가 계산
console.log('\n--- 1. g당 단가 ---');
assert(near(getMaterialCostPerGram(materials[0]), 10), '과세 kg 단위: 220,000원/20kg → VAT 제외 10원/g');
assert(near(getMaterialCostPerGram(materials[1]), 30), '면세 g 단위: VAT 그대로 30원/g');
assert(near(getMaterialCostPerGram(materials[4]), 2), 'L 단위는 1L=1000g: 4,000원/2L → 2원/g');
assert(getMaterialCostPerGram(materials[5]) === null, '부자재(개)는 g당 단가 없음');
assert(getMaterialCostPerGram({ unit: 'kg', packageQty: 0, priceVatInclusive: 100 }) === null, '포장량 0이면 null');

// 2. 이름 매칭
console.log('\n--- 2. 이름 매칭 ---');
assert(normalizeName('알룰로스 분말') === normalizeName('알룰로스분말'), '띄어쓰기 무시');
assert(normalizeName('바닐라빈 파우더') === normalizeName('바닐라빈분말'), '파우더 = 분말');
assert(matchMaterialByName('탈지분유', materials).status === 'exact', '완전 일치 → exact');
const autoMatch = matchMaterialByName('카카오 메스', materials);
assert(autoMatch.status === 'auto' && autoMatch.material.id === 'm-cacao', '카카오 메스 → 카카오 매스 자동 매칭');
const noneMatch = matchMaterialByName('알룰로스', materials);
assert(noneMatch.status === 'none' && noneMatch.candidates[0]?.material.id === 'm-allu', '부분 일치는 자동 연결 대신 후보로 제시');
assert(matchMaterialByName('컵', materials).status === 'none', '부자재는 원재료 매칭 대상 아님');

// 3. 제품 원가
console.log('\n--- 3. 제품 원가 ---');
const plain = {
  id: 'prod-1', name: '위시그릭 019', category: 'plain', isFlavor: false, weight: 100, yield: 28,
  ingredients: [
    { name: '정제수', ratio: 80, materialId: FREE_MATERIAL_ID },
    { name: '탈지분유', ratio: 18 },
    { name: '식이섬유', ratio: 2, materialId: 'm-fiber' }
  ]
};
const paste = {
  id: 'sub-1', name: '불카밀 페이스트', category: 'sub_ingredient', isSubIngredient: true, yield: 100,
  ingredients: [
    { name: '카카오 메스', ratio: 50 },
    { name: '알룰로스 분말', ratio: 50 }
  ]
};
const flavor = {
  id: 'prod-2', name: '블랙카카오 밀키웨이', category: 'flavor', isFlavor: true, baseProductId: 'prod-1', weight: 100, yield: 100,
  ingredients: [
    { name: '위시그릭 019', ratio: 70 },
    { name: '불카밀 페이스트', ratio: 20, subProductId: 'sub-1' },
    { name: '알룰로스분말', ratio: 10 }
  ]
};
const products = [plain, paste, flavor];

// 투입 1g 원가 = 0.8*0 + 0.18*10 + 0.02*30 = 2.4원 → 수율 28% → 완성품 1g 원가 = 2.4/0.28
const plainCost = computeProductCostPerGram(plain, products, materials);
assert(plainCost.complete, '플레인 원가 계산 완료');
assert(near(plainCost.costPerGram, 2.4 / 0.28), '플레인 g당 원가 = 투입 원가 ÷ 수율 (2.4 / 0.28)');

const pasteCost = computeProductCostPerGram(paste, products, materials);
assert(near(pasteCost.costPerGram, 15), '반제품 g당 원가 = 0.5*20 + 0.5*10 = 15원');

const flavorUnit = computeProductUnitCost(flavor, products, materials);
const expectedFlavorPerG = 0.7 * (2.4 / 0.28) + 0.2 * 15 + 0.1 * 10;
assert(flavorUnit.complete, '플레이버 원가 계산 완료');
assert(near(flavorUnit.unitCost, expectedFlavorPerG * 100), '플레이버 1개(100g) 원가 = 베이스 + 반제품 + 원재료');
assert(near(flavorUnit.lines[0].gramsPerUnit, 70), '1개당 베이스 투입량 70g');

const plainUnit = computeProductUnitCost(plain, products, materials);
assert(near(plainUnit.lines[1].gramsPerUnit, 18 / 0.28), '플레인 1개당 원재료 투입량은 수율 반영 (18g / 0.28)');

// 4. 미연결 원재료
console.log('\n--- 4. 미연결 처리 ---');
const broken = { ...flavor, id: 'prod-x', ingredients: [...flavor.ingredients, { name: '바닐라빈 파우더', ratio: 0 }] };
const brokenUnit = computeProductUnitCost(broken, [...products, broken], materials);
assert(!brokenUnit.complete && brokenUnit.unitCost === null, '단가 미연결 재료가 있으면 원가 미완성');
assert(brokenUnit.missing.includes('바닐라빈 파우더'), '미연결 재료 이름 보고');
assert(near(brokenUnit.partialUnitCost, flavorUnit.unitCost), '부분 원가는 연결된 재료만 합산');

const loopA = { id: 'a', name: 'A', isSubIngredient: true, ingredients: [{ name: 'B', ratio: 100, subProductId: 'b' }] };
const loopB = { id: 'b', name: 'B', isSubIngredient: true, ingredients: [{ name: 'A', ratio: 100, subProductId: 'a' }] };
const loopCost = computeProductCostPerGram(loopA, [loopA, loopB], materials);
assert(!loopCost.complete, '순환 참조 반제품은 미완성 처리 (무한루프 없음)');

// 5. 원가율
console.log('\n--- 5. 원가율 ---');
const r0 = computeCostRatio(1000, 5500, 0);
assert(near(r0.netPrice, 5000) && near(r0.costRatio, 20), '판매가 5,500원(VAT포함) → 공급가 5,000원, 원가 1,000원 → 20%');
const r10 = computeCostRatio(1000, 5500, 0.1);
assert(near(r10.netPrice, 4500) && near(r10.costRatio, 1000 / 4500 * 100), '10% 할인 시 공급가 4,500원 기준 원가율');
assert(near(computeCostRatio(1000, 5500, 0.05).margin, 5225 / 1.1 - 1000), '5% 할인 시 마진');
assert(computeCostRatio(1000, 0) === null, '판매가 없으면 null');
assert(computeCostRatio(null, 5500) === null, '원가 미완성이면 null');

// 6. 다른 제품에서 학습한 연결
console.log('\n--- 6. 학습한 연결 ---');
const linkedA = {
  id: 'fa', name: '플레이버A', isFlavor: false, weight: 100, yield: 100,
  ingredients: [
    { name: '알룰로스', ratio: 50, materialId: 'm-allu' },
    { name: '정제수', ratio: 50, materialId: FREE_MATERIAL_ID }
  ]
};
const unlinkedB = {
  id: 'fb', name: '플레이버B', isFlavor: false, weight: 100, yield: 100,
  ingredients: [
    { name: ' 알룰로스 ', ratio: 50 },
    { name: '정 제 수', ratio: 50 }
  ]
};
const learnedProducts = [linkedA, unlinkedB];
const learnedLinks = buildLearnedLinks(learnedProducts, materials);
assert(learnedLinks.get(normalizeName('알룰로스')).materialIds.has('m-allu'), '연결 정보 수집');
const bCost = computeProductUnitCost(unlinkedB, learnedProducts, materials);
assert(bCost.lines[0].source.matchStatus === 'learned' && bCost.lines[0].source.material.id === 'm-allu', '다른 제품의 연결(알룰로스→알룰로스 분말)을 이름이 같은 재료에 적용');
assert(bCost.lines[1].source.type === 'free', '0원 처리도 다른 제품에 적용');
assert(bCost.complete && near(bCost.unitCost, 50 * 10), '학습한 연결로 원가 완성 (50g × 10원)');

const conflictC = { ...unlinkedB, id: 'fc', ingredients: [{ name: '알룰로스', ratio: 100, materialId: 'm-cacao' }] };
const conflictProducts = [linkedA, unlinkedB, conflictC];
const conflictCost = computeProductUnitCost(unlinkedB, conflictProducts, materials);
assert(conflictCost.lines[0].source.matchStatus === 'conflict', '제품마다 다르게 연결된 이름은 자동 적용하지 않음');
assert(conflictCost.lines[0].source.candidates.length === 2, '충돌한 연결들을 후보로 제시');
assert(computeProductUnitCost(conflictC, conflictProducts, materials).lines[0].source.material.id === 'm-cacao', '직접 연결한 줄은 충돌과 무관하게 유지');

// 단가표 이름으로 바뀐 재료도 옛 이름(originalName)으로 다른 제품에 연결 전파
const renamedA = { id: 'ra', name: 'RA', weight: 100, yield: 100, ingredients: [{ name: '알룰로스 분말', originalName: '알룰로스가루', ratio: 100, materialId: 'm-allu' }] };
const oldNameB = { id: 'rb', name: 'RB', weight: 100, yield: 100, ingredients: [{ name: '알룰로스가루', ratio: 100 }] };
const renamedCost = computeProductUnitCost(oldNameB, [renamedA, oldNameB], materials);
assert(renamedCost.lines[0].source.matchStatus === 'learned' && renamedCost.lines[0].source.material.id === 'm-allu', '이름이 바뀐 재료의 옛 이름으로도 다른 제품 연결 적용');

const deletedLink =buildLearnedLinks([{ id: 'x', ingredients: [{ name: '없는재료', ratio: 100, materialId: 'm-deleted' }] }], materials);
assert(!deletedLink.has(normalizeName('없는재료')), '삭제된 단가표 항목 연결은 학습하지 않음');

console.log(`\n🎉 Total: ${totalPassed} passed, ${totalFailed} failed`);

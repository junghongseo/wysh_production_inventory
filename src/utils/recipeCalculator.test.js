import { 
  formatQtyG, 
  computeIngredients, 
  computeSubIngredientRecipe, 
  computeStandardYogurtRecipe, 
  calculateRecipeDetails 
} from './recipeCalculator.js';

// Mock Products
const mockProducts = [
  {
    id: 'prod-1',
    name: '위시그릭 019',
    category: 'plain',
    isFlavor: false,
    weight: 130,
    yield: 28,
    ingredients: [
      { name: '정제수', ratio: 85.143 },
      { name: '탈지분유', ratio: 13.86 },
      { name: '식이섬유', ratio: 0.99 },
      { name: '발효 유산균', ratio: 0.004 },
      { name: '기능성 유산균(BLC 1)', ratio: 0.003 }
    ]
  },
  {
    id: 'prod-2',
    name: '블랙카카오밀키웨이',
    category: 'flavor',
    isFlavor: true,
    baseProductId: 'prod-1',
    weight: 130,
    yield: 100,
    ingredients: [
      { name: '위시그릭 019', ratio: 70 },
      { name: '아몬드초코페이스트', ratio: 30, subProductId: 'prod-sub-1' }
    ]
  },
  {
    id: 'prod-sub-1',
    name: '아몬드초코페이스트',
    category: 'sub_ingredient',
    isSubIngredient: true,
    isFlavor: false,
    weight: 0,
    yield: 100,
    ingredients: [
      { name: '아몬드 페이스트', ratio: 60 },
      { name: '다크 초콜릿', ratio: 40 }
    ]
  }
];

let totalPassed = 0;
let totalFailed = 0;

function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    totalFailed++;
    throw new Error(message);
  } else {
    console.log(`✅ PASS: ${message}`);
    totalPassed++;
  }
}

console.log('=== [Golden Baseline Test Start] ===');

// Test 1: formatQtyG formatting rules
assert(formatQtyG(0.004, 0.004, true) === '0.0', '유산균 0.004g => 0.0g 표시');
assert(formatQtyG(1234.56, 50, false) === '1,235', '50% 함량 1234.56g => 1,235g 반올림 표시');
assert(formatQtyG(0.99, 0.99, false) === '1.0', '1% 이하 함량 소수점 1자리 표시');

// Test 2: Single Plain Yogurt Plan
const plainPlan = {
  id: 'P-01',
  planType: 'yogurt',
  productId: 'prod-1',
  totalQty: 100
};
const plainResult = calculateRecipeDetails(plainPlan, mockProducts);
assert(!plainResult.isSubIngredientPlan, '단일 플레인 계획은 isSubIngredientPlan = false');
assert(plainResult.itemDetailsList.length === 1, '품목 1개');
assert(plainResult.combinedBaseDetails.totalCombinedBaseYogurtG === 13000, '총 베이스 필요량 13,000g (13kg)');
assert(plainResult.combinedBaseDetails.totalCombinedBaseYogurtKg === 13, '총 베이스 필요량 13kg');
assert(plainResult.combinedBaseDetails.baseYield === 28, '베이스 수율 28%');
const expectedInputG = 13000 / 0.28;
assert(Math.abs(plainResult.combinedBaseDetails.totalBaseInputWeightG - expectedInputG) < 0.01, '원유/유산균 총량 수치 검증');
assert(plainResult.combinedBaseDetails.computedCombinedBaseIngredients.length === 5, '베이스 원재료 5개 계산');
assert(plainResult.combinedBaseDetails.baseRatioSum === 100, '베이스 원재료 비율 합계 100%');

// Test 3: Single Flavor Yogurt Plan with 25 units (tests 20 units and remainder 5 units)
const flavorPlan = {
  id: 'P-02',
  planType: 'yogurt',
  productId: 'prod-2',
  totalQty: 25
};
const flavorResult = calculateRecipeDetails(flavorPlan, mockProducts);
assert(flavorResult.itemDetailsList.length === 1, '품목 1개');
const flavorDetail = flavorResult.itemDetailsList[0];
// total weight = 25 * 130 = 3250g. yield = 100. input = 3250g. base ratio = 70% => needed base = 2275g.
assert(flavorDetail.baseYogurtNeededG === 2275, '플레이버 25개에 필요한 베이스 요거트는 2,275g');
assert(flavorResult.combinedBaseDetails.totalCombinedBaseYogurtG === 2275, '합산 베이스 요거트 2,275g');
assert(flavorDetail.details20Qty !== null, '20개 기준 배합 존재');
assert(flavorDetail.details20Qty.qty === 20, '20개 기준');
assert(flavorDetail.detailsRemainderQty !== null, '잔여 5개 기준 배합 존재');
assert(flavorDetail.detailsRemainderQty.qty === 5, '잔여 5개');

// Test 4: 2-Item Concurrent Production (Plain 50 + Flavor 50)
const multiPlan = {
  id: 'P-03',
  planType: 'yogurt',
  items: [
    { productId: 'prod-1', totalQty: 50 },
    { productId: 'prod-2', totalQty: 50 }
  ]
};
const multiResult = calculateRecipeDetails(multiPlan, mockProducts);
assert(multiResult.itemDetailsList.length === 2, '품목 2개');
assert(multiResult.displayItemDetailsList.length === 1, '2종 동시 생산 시 display 목록에는 플레이버만 출력 (플레인은 합산 배합표로 통합)');
// Plain 50: 50 * 130 = 6500g base
// Flavor 50: 50 * 130 = 6500g total => 70% base = 4550g base
// Total Combined Base = 6500 + 4550 = 11050g (11.05kg)
assert(multiResult.combinedBaseDetails.totalCombinedBaseYogurtG === 11050, '2종 합산 베이스 중량 = 11,050g (6500g + 4550g)');
assert(multiResult.combinedBaseDetails.totalCombinedBaseYogurtKg === 11.05, '2종 합산 베이스 = 11.05kg');

// Test 5: Sub-Ingredient Plan (3-table calculations)
const subPlan = {
  id: 'P-04',
  planType: 'sub_ingredient',
  subProductId: 'prod-sub-1',
  targetYogurtProductId: 'prod-2',
  targetYogurtQty: 100
};
const subResult = calculateRecipeDetails(subPlan, mockProducts);
assert(subResult.isSubIngredientPlan === true, '반제품 계획 플래그 true');
assert(subResult.table1Items.length === 2, '반제품 원재료 2개 (Table 1)');
assert(subResult.table2Items.length === 2, 'Table 2 2개');
assert(subResult.table3Items.length === 2, 'Table 3 2개');
// 1 yogurt = 130g, subRatio = 30% => 39g sub per 1 yogurt
assert(subResult.subWeightPer1YogurtG === 39, '1개당 반제품 39g');
assert(subResult.subWeightPer20YogurtG === 780, '20개당 반제품 780g');
assert(subResult.totalSubWeightG === 3900, '100개분 총 반제품 3,900g');

console.log(`\n🎉 ALL TESTS PASSED! Total: ${totalPassed}, Failed: ${totalFailed}`);

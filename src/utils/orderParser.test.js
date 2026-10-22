import { cleanItemName, parseRawOrderRows } from './orderParser.js';

console.log('=== [OrderParser Test Start] ===');

function assert(condition, msg) {
  if (!condition) {
    console.error(`❌ FAIL: ${msg}`);
    throw new Error(msg);
  } else {
    console.log(`✅ PASS: ${msg}`);
  }
}

// Test 1: cleanItemName
assert(cleanItemName('[RENEWAL] 위시그릭 플레인 330g') === '위시그릭 플레인', '접두사/접미사 제거');
assert(cleanItemName('블랙카카오밀키웨이 350ml') === '블랙카카오밀키웨이', '용량 접미사 제거');
assert(cleanItemName('피스타치오 20g') === '피스타치오', '20g 접미사 제거');

// Test 2: parseRawOrderRows with mock sheet
const mockJsonData = [
  ['스마트스토어 주문서 목록'],
  ['주문번호', '상품명', '수량', '구매자명'],
  ['ORD-001', '[RENEWAL] 위시그릭 플레인 330g', '2', '홍길동'],
  ['ORD-001', '블랙카카오밀키웨이 350g', '1', '홍길동'],
  ['ORD-002', '위시그릭 플레인 330g', '1', '이순신'],
  ['ORD-003', '피스타치오 350g', '3', '강감찬']
];

const parsed = parseRawOrderRows(mockJsonData);
assert(parsed.totalPackageCount === 3, '주문건수 3건');
assert(parsed.totalProductQty === 7, '총 제품수량 7개 (2+1+1+3)');
assert(parsed.qtyBreakdown.count1 === 1, '1개 주문 1건 (ORD-002)');
assert(parsed.qtyBreakdown.count3Plus === 2, '3개 이상 주문 2건 (ORD-001, ORD-003)');
assert(parsed.productTotals.find(p => p.name === '위시그릭 플레인').qty === 3, '위시그릭 플레인 총 3개');

// Test 3: [확장주문검색] 포맷처럼 '주문수량'과 '상품수량' 열이 동시에 존재할 때 '상품수량'을 우선 반영하는지 검증
const extendedSearchMockData = [
  ['관리번호', '주문번호', '상품명', '주문수량', '상품수량', '송장번호'],
  ['1001', 'ORD-101', '위시크림 바닐라', '1', '2', 'INV-9001'],
  ['1002', 'ORD-102', '위시그릭 플레인', '1', '3', 'INV-9002']
];
const parsedExtended = parseRawOrderRows(extendedSearchMockData);
assert(parsedExtended.totalProductQty === 5, '[확장주문검색] 주문수량(1+1=2)이 아닌 상품수량(2+3=5) 기준으로 집계');
assert(parsedExtended.qtyBreakdown.count2 === 1, '[확장주문검색] 상품수량 2개 주문건 1건');
assert(parsedExtended.qtyBreakdown.count3Plus === 1, '[확장주문검색] 상품수량 3개 이상 주문건 1건');

console.log('\n🎉 ALL ORDER PARSER TESTS PASSED!');

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

console.log('\n🎉 ALL ORDER PARSER TESTS PASSED!');

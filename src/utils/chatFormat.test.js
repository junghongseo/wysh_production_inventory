import { formatChatMessage, escapeHtml } from './chatFormat.js';

let totalPassed = 0;
let totalFailed = 0;
const assert = (cond, msg) => {
  if (cond) { totalPassed++; console.log(`  ✅ ${msg}`); }
  else { totalFailed++; console.error(`  ❌ ${msg}`); }
};
const html = (text) => formatChatMessage(text).__html;

console.log('\n[escapeHtml]');
assert(escapeHtml('<b>&"\'') === '&lt;b&gt;&amp;&quot;&#39;', '특수문자 이스케이프');

console.log('\n[formatChatMessage - 보안]');
const xss = html('<img src=x onerror="alert(1)">');
assert(!xss.includes('<img'), 'img 태그가 그대로 들어가지 않음');
assert(xss.includes('&lt;img'), 'img 태그는 글자로 보임');
assert(!html('<script>alert(1)</script>').includes('<script'), 'script 태그 무력화');
assert(!html('**<svg onload=alert(1)>**').includes('<svg'), '굵게 서식 안의 태그도 무력화');

console.log('\n[formatChatMessage - 기존 서식 유지]');
assert(html('') === '', '빈 문자열');
assert(html('**재고**').includes('<strong') && html('**재고**').includes('재고</strong>'), '굵게');
assert(html('## 요약').includes('<div') && html('## 요약').includes('요약</div>'), '제목');
assert(html('- 항목') === '• 항목', '불릿');
assert(html('a\nb') === 'a<br />b', '줄바꿈');
assert(html('`P-01`').includes('<code') && html('`P-01`').includes('P-01</code>'), '인라인 코드');
assert(html('---').includes('<hr'), '구분선');
assert(html('3 > 2 & 1 < 2') === '3 &gt; 2 &amp; 1 &lt; 2', '부등호·앰퍼샌드는 글자로 보임');

console.log(`\n${totalFailed === 0 ? '🎉 ALL TESTS PASSED!' : '💥 SOME TESTS FAILED'} Total: ${totalPassed + totalFailed}, Failed: ${totalFailed}`);
if (totalFailed > 0) process.exit(1);

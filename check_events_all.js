import * as XLSX from 'xlsx';
import * as fs from 'fs';

const filePath = './sample data/확장주문검색_20260709100921_36166302.xls';
const text = fs.readFileSync(filePath, 'utf-8');

const htmlIndex = text.indexOf('<html');
if (htmlIndex !== -1) {
  const cleanedText = text.substring(htmlIndex);
  const workbookCleaned = XLSX.read(cleanedText, { type: 'string' });
  const ws = workbookCleaned.Sheets[workbookCleaned.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });
  
  const headers = raw[0];
  const pNameIdx = headers.indexOf('상품명');
  const spNameIdx = headers.indexOf('판매처 상품명');
  
  console.log('Index | 주문번호 | 상품명 | 판매처 상품명 | 상품코드 | 바코드 | 판매처 상품코드');
  for (let i = 1; i < raw.length; i++) {
    const row = raw[i];
    const pName = String(row[pNameIdx]).trim();
    const spName = String(row[spNameIdx]).trim();
    
    if (pName.includes('이벤트') || spName.includes('이벤트')) {
      const code = row[headers.indexOf('상품코드')];
      const barcode = row[headers.indexOf('바코드')];
      const sellCode = row[headers.indexOf('판매처 상품코드')];
      const orderNum = row[headers.indexOf('주문번호')];
      console.log(`${i} | ${orderNum} | "${pName}" | "${spName}" | "${code}" | "${barcode}" | "${sellCode}"`);
    }
  }
}

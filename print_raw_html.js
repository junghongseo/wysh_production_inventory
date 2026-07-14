import * as fs from 'fs';

const filePath = './sample data/확장주문검색_20260709100921_36166302.xls';
const text = fs.readFileSync(filePath, 'utf-8');

// Find the tr blocks
const trRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
let match;
let count = 0;

while ((match = trRegex.exec(text)) !== null) {
  const trContent = match[1];
  if (trContent.includes('984092') || trContent.includes('984091')) {
    console.log(`\n=== Found TR for match ===`);
    console.log(match[0].trim());
  }
}

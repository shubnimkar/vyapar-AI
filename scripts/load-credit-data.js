#!/usr/bin/env node

// Load credit data into localStorage
const fs = require('fs');
const path = require('path');

const dataPath = '/tmp/credit-data.json';
const storageKey = 'vyapar-credit-entries';

if (!fs.existsSync(dataPath)) {
  console.error('❌ Credit data file not found. Run seed-credit-data.sh first.');
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

console.log('📊 Credit Data Loaded:');
console.log(`  Total entries: ${data.length}`);

const paid = data.filter(e => e.isPaid).length;
const unpaid = data.filter(e => !e.isPaid).length;

console.log(`  Paid: ${paid}`);
console.log(`  Unpaid: ${unpaid}`);

// Calculate overdue
const now = new Date();
const overdue = data.filter(e => !e.isPaid && new Date(e.dueDate) < now).length;
console.log(`  Overdue: ${overdue}`);

console.log('');
console.log('✅ Data ready to load');
console.log('');
console.log('To load into browser:');
console.log(`  localStorage.setItem('${storageKey}', JSON.stringify(${JSON.stringify(data)}))`);
console.log('');
console.log('Or copy this command:');
console.log(`  localStorage.setItem('${storageKey}', '${JSON.stringify(data).replace(/'/g, "\\'")}'); location.reload();`);


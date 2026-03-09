#!/usr/bin/env node

/**
 * Check Browser Session Diagnostic
 * 
 * This script helps diagnose why credit data isn't appearing in the browser.
 * 
 * Run this in your browser console on the Vyapar AI app:
 * 
 * 1. Open browser DevTools (F12)
 * 2. Go to Console tab
 * 3. Paste and run this code:
 */

console.log(`
// ============================================
// BROWSER SESSION DIAGNOSTIC
// ============================================

// 1. Check localStorage for session
const sessionData = localStorage.getItem('vyapar-session');
console.log('Session Data:', sessionData ? JSON.parse(sessionData) : 'NO SESSION');

// 2. Check localStorage for credit entries
const creditEntries = localStorage.getItem('vyapar-credit-entries');
console.log('Credit Entries in localStorage:', creditEntries ? JSON.parse(creditEntries).length : 0);

// 3. Check what userId is being used
if (sessionData) {
  const session = JSON.parse(sessionData);
  console.log('Current userId:', session.userId);
  console.log('Expected userId:', 'cfca655b-410f-454c-8169-574ce37415da');
  console.log('Match:', session.userId === 'cfca655b-410f-454c-8169-574ce37415da');
}

// 4. Test API call directly
fetch('/api/credit?userId=cfca655b-410f-454c-8169-574ce37415da')
  .then(r => r.json())
  .then(data => {
    console.log('Direct API call result:', {
      success: data.success,
      count: data.count,
      dataLength: data.data?.length,
      firstEntry: data.data?.[0]
    });
  })
  .catch(err => console.error('API call failed:', err));

// 5. Check if there's a username mismatch
console.log('Username in session:', sessionData ? JSON.parse(sessionData).username : 'NO SESSION');
console.log('Expected username:', 'vyapar_demo');
`);

console.log('\n✅ Copy the code above and paste it into your browser console while on the Vyapar AI app');
console.log('\n📋 Instructions:');
console.log('1. Open the Vyapar AI app in your browser');
console.log('2. Press F12 to open DevTools');
console.log('3. Go to the Console tab');
console.log('4. Copy and paste the code block above');
console.log('5. Press Enter to run it');
console.log('6. Share the output with me\n');

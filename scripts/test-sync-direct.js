#!/usr/bin/env node

// Direct test of credit sync API
const fetch = require('node-fetch');

async function testSync() {
  console.log('Testing credit sync API...\n');
  
  try {
    const response = await fetch('http://localhost:3000/api/credit?userId=vyapar_demo');
    const result = await response.json();
    
    console.log('Response status:', response.status);
    console.log('Response OK:', response.ok);
    console.log('Result success:', result.success);
    console.log('Result data type:', typeof result.data);
    console.log('Result data is array:', Array.isArray(result.data));
    console.log('Result data length:', result.data?.length);
    console.log('Result count:', result.count);
    console.log('\nFirst 3 entries:');
    console.log(JSON.stringify(result.data?.slice(0, 3), null, 2));
    
    // Test localStorage simulation
    console.log('\n--- Simulating localStorage merge ---');
    const cloudEntries = result.data || [];
    console.log('Cloud entries count:', cloudEntries.length);
    
    const localEntries = []; // Simulate empty localStorage
    const localMap = new Map(localEntries.map(e => [e.id, e]));
    
    let addedCount = 0;
    for (const cloudEntry of cloudEntries) {
      const localEntry = localMap.get(cloudEntry.id);
      if (!localEntry) {
        addedCount++;
      }
    }
    
    console.log('Would add', addedCount, 'entries to localStorage');
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testSync();

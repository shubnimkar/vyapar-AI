#!/usr/bin/env ts-node

/**
 * Cache Loader Script: Demo Segment Data
 * 
 * Loads demo segment data into localStorage cache for offline demo
 * This enables benchmark comparison to work without network connectivity
 * 
 * Usage:
 *   npm run load:segment-cache
 *   or
 *   ts-node scripts/load-segment-cache.ts
 * 
 * Note: This script is intended for browser environments.
 * For Node.js testing, use the loadDemoDataToCache() function directly
 * with a localStorage mock.
 */

import { loadDemoDataToCache } from '../lib/demoSegmentData';

async function main() {
  console.log('📦 Loading segment data to cache...\n');
  
  try {
    loadDemoDataToCache();
    console.log('\n✅ Segment data loaded to cache successfully!');
    console.log('💡 Benchmark comparison will now work offline');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to load segment data to cache:', error);
    process.exit(1);
  }
}

// Only run if executed directly (not imported)
if (require.main === module) {
  main();
}

export { main };

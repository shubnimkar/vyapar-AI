#!/usr/bin/env ts-node

/**
 * Seed Demo Benchmark Data to DynamoDB
 * 
 * This script populates DynamoDB with demo segment benchmark data
 * for all 20 segment combinations (4 city tiers × 5 business types)
 * 
 * Usage:
 *   npm run seed-benchmark
 *   or
 *   ts-node scripts/seed-benchmark-data.ts
 */

import { seedDemoData } from '../lib/demoSegmentData';
import { logger } from '../lib/logger';

async function main() {
  console.log('🌱 Starting benchmark data seeding...\n');
  
  try {
    await seedDemoData();
    console.log('\n✅ Benchmark data seeded successfully!');
    console.log('\nYou can now:');
    console.log('  1. Complete your profile (city tier + business type)');
    console.log('  2. Add daily entries');
    console.log('  3. View benchmark comparison on dashboard\n');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Failed to seed benchmark data:', error);
    logger.error('Benchmark seeding failed', { error });
    process.exit(1);
  }
}

main();

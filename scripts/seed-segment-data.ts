#!/usr/bin/env node

/**
 * Seed Script: Demo Segment Data
 * 
 * Seeds DynamoDB with demo segment benchmark data for all 15 combinations
 * (3 city tiers × 5 business types)
 * 
 * Usage:
 *   npm run seed:segments
 *   or
 *   node scripts/seed-segment-data.js
 * 
 * Requirements:
 * - AWS credentials configured (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
 * - DynamoDB table exists (DYNAMODB_TABLE_NAME env var)
 */

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const { seedDemoData } = require('../lib/demoSegmentData');

async function main() {
  console.log('🌱 Starting segment data seeding...\n');
  
  try {
    await seedDemoData();
    console.log('\n✅ Segment data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Segment data seeding failed:', error);
    process.exit(1);
  }
}

main();


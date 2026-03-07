#!/usr/bin/env node

/**
 * Test Script: Demo Segment Data Generation
 * 
 * Tests the demo data generation without requiring DynamoDB connection
 * Validates all 15 segment combinations are generated with correct data
 */

// Simple test implementation
const cityTiers = ['tier1', 'tier2', 'tier3'];
const businessTypes = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];

// Health score ranges by tier
const healthScoreRanges = {
  tier1: [60, 80],
  tier2: [50, 70],
  tier3: [40, 60]
};

// Margin ranges by business type
const marginRanges = {
  kirana: [0.15, 0.25],
  salon: [0.20, 0.30],
  pharmacy: [0.10, 0.20],
  restaurant: [0.05, 0.15],
  other: [0.10, 0.25]
};

// Sample size ranges by tier
const sampleSizeRanges = {
  tier1: [200, 500],
  tier2: [100, 300],
  tier3: [50, 150]
};

function formatSegmentKey(cityTier, businessType) {
  return `SEGMENT#${cityTier}#${businessType}`;
}

function generateDemoSegmentData() {
  const demoData = [];
  
  for (const tier of cityTiers) {
    for (const type of businessTypes) {
      const segmentKey = formatSegmentKey(tier, type);
      
      // Generate realistic values within ranges
      const [minHealth, maxHealth] = healthScoreRanges[tier];
      const medianHealthScore = Math.floor(minHealth + (maxHealth - minHealth) * 0.5);
      
      const [minMargin, maxMargin] = marginRanges[type];
      const medianMargin = Number((minMargin + (maxMargin - minMargin) * 0.5).toFixed(3));
      
      const [minSample, maxSample] = sampleSizeRanges[tier];
      const sampleSize = Math.floor(minSample + (maxSample - minSample) * 0.6);
      
      demoData.push({
        segmentKey,
        medianHealthScore,
        medianMargin,
        sampleSize,
        lastUpdated: new Date().toISOString()
      });
    }
  }
  
  return demoData;
}

function validateDemoData(demoData) {
  const errors = [];
  
  // Check count
  if (demoData.length !== 15) {
    errors.push(`Expected 15 segments, got ${demoData.length}`);
  }
  
  // Validate each segment
  demoData.forEach((segment, index) => {
    // Validate segment key format
    if (!segment.segmentKey.match(/^SEGMENT#(tier1|tier2|tier3)#(kirana|salon|pharmacy|restaurant|other)$/)) {
      errors.push(`Invalid segment key format: ${segment.segmentKey}`);
    }
    
    // Validate health score range
    if (segment.medianHealthScore < 40 || segment.medianHealthScore > 80) {
      errors.push(`Health score out of range [40-80]: ${segment.medianHealthScore} for ${segment.segmentKey}`);
    }
    
    // Validate margin range
    if (segment.medianMargin < 0.05 || segment.medianMargin > 0.30) {
      errors.push(`Margin out of range [0.05-0.30]: ${segment.medianMargin} for ${segment.segmentKey}`);
    }
    
    // Validate sample size range
    if (segment.sampleSize < 50 || segment.sampleSize > 500) {
      errors.push(`Sample size out of range [50-500]: ${segment.sampleSize} for ${segment.segmentKey}`);
    }
    
    // Validate timestamp
    if (!segment.lastUpdated || isNaN(Date.parse(segment.lastUpdated))) {
      errors.push(`Invalid timestamp for ${segment.segmentKey}`);
    }
  });
  
  return errors;
}

function main() {
  console.log('🧪 Testing Demo Segment Data Generation\n');
  
  // Generate demo data
  console.log('📊 Generating demo data...');
  const demoData = generateDemoSegmentData();
  console.log(`✓ Generated ${demoData.length} segment records\n`);
  
  // Validate demo data
  console.log('✅ Validating demo data...');
  const errors = validateDemoData(demoData);
  
  if (errors.length > 0) {
    console.error('❌ Validation failed:\n');
    errors.forEach(error => console.error(`  - ${error}`));
    process.exit(1);
  }
  
  console.log('✓ All validations passed\n');
  
  // Display sample data
  console.log('📋 Sample segments:');
  console.log('─'.repeat(80));
  demoData.slice(0, 5).forEach(segment => {
    console.log(`${segment.segmentKey}`);
    console.log(`  Health Score: ${segment.medianHealthScore}`);
    console.log(`  Margin: ${(segment.medianMargin * 100).toFixed(1)}%`);
    console.log(`  Sample Size: ${segment.sampleSize}`);
    console.log('');
  });
  
  console.log(`... and ${demoData.length - 5} more segments\n`);
  
  // Summary
  console.log('📈 Summary:');
  console.log(`  Total segments: ${demoData.length}`);
  console.log(`  City tiers: ${cityTiers.length}`);
  console.log(`  Business types: ${businessTypes.length}`);
  console.log(`  Coverage: ${cityTiers.length} × ${businessTypes.length} = ${demoData.length} ✓`);
  
  console.log('\n✅ Demo data generation test completed successfully!');
  process.exit(0);
}

main();

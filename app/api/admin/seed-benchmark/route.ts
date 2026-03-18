import { NextResponse } from 'next/server';
import { seedDemoData } from '@/lib/demoSegmentData';
import { logger } from '@/lib/logger';

/**
 * Admin endpoint to seed benchmark data to DynamoDB
 * 
 * POST /api/admin/seed-benchmark
 * 
 * Seeds all 20 segment combinations (4 city tiers × 5 business types)
 * with realistic demo data
 */
export async function POST() {
  try {
    logger.info('Starting benchmark data seeding via API...');
    
    await seedDemoData();
    
    logger.info('Benchmark data seeded successfully');
    
    return NextResponse.json({
      success: true,
      message: 'Benchmark data seeded successfully',
      segments: 20  // 4 tiers (tier1/tier2/tier3/rural) × 5 business types
    });
  } catch (error) {
    logger.error('Failed to seed benchmark data', { error });
    
    return NextResponse.json(
      {
        success: false,
        code: 'SEED_FAILED',
        message: 'Failed to seed benchmark data'
      },
      { status: 500 }
    );
  }
}

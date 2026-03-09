#!/usr/bin/env node

/**
 * Seed Daily Entry Data Directly to DynamoDB
 * 
 * Generates 60 days of realistic daily business entries for demo purposes.
 * 
 * Usage:
 *   node scripts/seed-daily-entries.js [userId]
 * 
 * Default userId: cfca655b-410f-454c-8169-574ce37415da
 */

const path = require('path');

// Load environment variables
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });

// Import AWS SDK
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');

// DynamoDB Configuration
const REGION = process.env.DYNAMODB_REGION || process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;

// Create DynamoDB client
const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {}),
  },
});

// Create Document client
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

/**
 * Generate realistic daily entry data
 */
function generateDailyEntry(userId, date, dayIndex) {
  // Base values with some variation
  const baseSales = 15000 + Math.random() * 10000;
  const baseExpense = 8000 + Math.random() * 5000;
  
  // Add weekly patterns (weekends are busier)
  const dayOfWeek = new Date(date).getDay();
  const weekendMultiplier = (dayOfWeek === 0 || dayOfWeek === 6) ? 1.3 : 1.0;
  
  const totalSales = Math.round(baseSales * weekendMultiplier);
  const totalExpense = Math.round(baseExpense * weekendMultiplier);
  const estimatedProfit = totalSales - totalExpense;
  const profitMargin = totalSales > 0 ? (estimatedProfit / totalSales) * 100 : 0;
  const expenseRatio = totalSales > 0 ? (totalExpense / totalSales) * 100 : 0;
  
  const entryId = `entry_${date}_${Math.random().toString(36).substring(2, 11)}`;
  const now = new Date().toISOString();
  
  return {
    userId,
    entryId,
    date,
    totalSales,
    totalExpense,
    cashInHand: Math.round(5000 + Math.random() * 10000),
    estimatedProfit,
    profitMargin: Math.round(profitMargin * 100) / 100,
    expenseRatio: Math.round(expenseRatio * 100) / 100,
    notes: dayIndex % 7 === 0 ? 'Good sales day' : undefined,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Save daily entry to DynamoDB
 */
async function saveDailyEntry(entry) {
  // Calculate TTL (90 days from entry date)
  const entryDate = new Date(entry.date);
  const ttlDate = new Date(entryDate);
  ttlDate.setDate(ttlDate.getDate() + 90);
  const ttl = Math.floor(ttlDate.getTime() / 1000);

  const item = {
    PK: `USER#${entry.userId}`,
    SK: `ENTRY#${entry.date}`,
    entityType: 'ENTRY',
    ...entry,
    ttl,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

/**
 * Main function
 */
async function main() {
  // Get userId from command line or use default
  const userId = process.argv[2] || 'cfca655b-410f-454c-8169-574ce37415da';
  
  console.log('🌱 Seeding Daily Entry Data to DynamoDB...');
  console.log(`  User ID: ${userId}`);
  console.log(`  Table: ${TABLE_NAME}`);
  console.log(`  Region: ${REGION}`);
  console.log('');
  
  // Generate 60 days of data (ending today)
  const entries = [];
  const today = new Date();
  
  for (let i = 59; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    const entry = generateDailyEntry(userId, dateStr, i);
    entries.push(entry);
  }
  
  console.log(`📊 Generated ${entries.length} daily entries`);
  console.log(`  Date range: ${entries[0].date} to ${entries[entries.length - 1].date}`);
  console.log('');
  
  // Seed each entry to DynamoDB
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i];
    
    try {
      await saveDailyEntry(entry);
      successCount++;
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Seeded ${i + 1}/${entries.length} entries...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Failed to seed entry ${entry.date}:`, error.message);
    }
  }
  
  console.log('');
  console.log('✅ Seeding complete!');
  console.log(`  Success: ${successCount}/${entries.length}`);
  console.log(`  Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('');
    console.log('⚠️  Some entries failed to seed. Check AWS credentials and DynamoDB table.');
    process.exit(1);
  }
  
  // Calculate summary
  const totalSales = entries.reduce((sum, e) => sum + e.totalSales, 0);
  const totalExpense = entries.reduce((sum, e) => sum + e.totalExpense, 0);
  const totalProfit = totalSales - totalExpense;
  const avgDailySales = Math.round(totalSales / entries.length);
  const avgDailyProfit = Math.round(totalProfit / entries.length);
  
  console.log('');
  console.log('📊 Daily Entry Summary:');
  console.log(`  Total entries: ${entries.length} days`);
  console.log(`  Total sales: ₹${totalSales.toLocaleString('en-IN')}`);
  console.log(`  Total expenses: ₹${totalExpense.toLocaleString('en-IN')}`);
  console.log(`  Total profit: ₹${totalProfit.toLocaleString('en-IN')}`);
  console.log(`  Avg daily sales: ₹${avgDailySales.toLocaleString('en-IN')}`);
  console.log(`  Avg daily profit: ₹${avgDailyProfit.toLocaleString('en-IN')}`);
  console.log('');
  console.log('🚀 Data is now in DynamoDB and ready for demo!');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

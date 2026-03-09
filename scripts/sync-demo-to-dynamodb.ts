/**
 * Sync Demo Data to DynamoDB
 * 
 * This script syncs the demo data from localStorage to DynamoDB
 * so that Lambda functions (like cashflow predictor) can access it.
 * 
 * Usage:
 * 1. Load demo data first: Run loadDemoData() in browser console
 * 2. Then run this script: node scripts/sync-demo-to-dynamodb.ts
 * 
 * Or run directly in browser after loading demo data:
 * syncDemoToDynamoDB()
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, BatchWriteCommand } from '@aws-sdk/lib-dynamodb';

const AWS_REGION = process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';
const DEMO_USER_ID = 'demo-user-shopify';

// Initialize DynamoDB client
const dynamoClient = new DynamoDBClient({
  region: AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

/**
 * Sync daily entries from localStorage to DynamoDB
 */
export async function syncDailyEntriesToDynamoDB() {
  console.log('🔄 Syncing daily entries to DynamoDB...');
  
  // Get entries from localStorage (browser only)
  if (typeof window === 'undefined') {
    console.error('❌ This function must run in a browser environment');
    return;
  }
  
  const entriesJson = localStorage.getItem('vyapar-daily-entries');
  if (!entriesJson) {
    console.error('❌ No daily entries found in localStorage');
    console.log('💡 Run loadDemoData() first to load demo data');
    return;
  }
  
  const entries = JSON.parse(entriesJson);
  console.log(`📊 Found ${entries.length} entries to sync`);
  
  let successCount = 0;
  let errorCount = 0;
  
  // Sync each entry to DynamoDB
  for (const entry of entries) {
    try {
      const item = {
        PK: `USER#${DEMO_USER_ID}`,
        SK: `ENTRY#${entry.date}`,
        userId: DEMO_USER_ID,
        entryId: entry.entryId,
        date: entry.date,
        type: 'daily_entry',
        totalSales: entry.totalSales,
        totalExpense: entry.totalExpense,
        cashInHand: entry.cashInHand || 0,
        estimatedProfit: entry.estimatedProfit,
        expenseRatio: entry.expenseRatio,
        profitMargin: entry.profitMargin,
        notes: entry.notes || '',
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt || entry.createdAt,
      };
      
      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      });
      
      await docClient.send(command);
      successCount++;
      
      if (successCount % 10 === 0) {
        console.log(`   ✓ Synced ${successCount}/${entries.length} entries...`);
      }
    } catch (error) {
      console.error(`   ✗ Failed to sync entry ${entry.date}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n✅ Sync complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { success: successCount, errors: errorCount };
}

/**
 * Sync credit entries from localStorage to DynamoDB
 */
export async function syncCreditEntriesToDynamoDB() {
  console.log('🔄 Syncing credit entries to DynamoDB...');
  
  if (typeof window === 'undefined') {
    console.error('❌ This function must run in a browser environment');
    return;
  }
  
  const creditsJson = localStorage.getItem('vyapar-credit-entries');
  if (!creditsJson) {
    console.log('ℹ️  No credit entries found in localStorage');
    return;
  }
  
  const credits = JSON.parse(creditsJson);
  console.log(`📊 Found ${credits.length} credit entries to sync`);
  
  let successCount = 0;
  let errorCount = 0;
  
  for (const credit of credits) {
    try {
      const item = {
        PK: `USER#${DEMO_USER_ID}`,
        SK: `CREDIT#${credit.creditId}`,
        userId: DEMO_USER_ID,
        creditId: credit.creditId,
        type: 'credit_entry',
        customerName: credit.customerName,
        amount: credit.amount,
        dueDate: credit.dueDate,
        isPaid: credit.isPaid,
        paidAt: credit.paidAt || null,
        notes: credit.notes || '',
        createdAt: credit.createdAt,
        updatedAt: credit.updatedAt || credit.createdAt,
      };
      
      const command = new PutCommand({
        TableName: TABLE_NAME,
        Item: item,
      });
      
      await docClient.send(command);
      successCount++;
    } catch (error) {
      console.error(`   ✗ Failed to sync credit ${credit.creditId}:`, error);
      errorCount++;
    }
  }
  
  console.log(`\n✅ Credit sync complete!`);
  console.log(`   Success: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  
  return { success: successCount, errors: errorCount };
}

/**
 * Main sync function - syncs all demo data
 */
export async function syncAllDemoData() {
  console.log('='.repeat(60));
  console.log('🚀 SYNCING DEMO DATA TO DYNAMODB');
  console.log('='.repeat(60));
  console.log();
  
  try {
    // Sync daily entries
    const dailyResult = await syncDailyEntriesToDynamoDB();
    console.log();
    
    // Sync credit entries
    const creditResult = await syncCreditEntriesToDynamoDB();
    console.log();
    
    console.log('='.repeat(60));
    console.log('✅ ALL DATA SYNCED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log();
    console.log('💡 Now you can use features that require DynamoDB:');
    console.log('   - Cash Flow Prediction');
    console.log('   - Expense Alerts');
    console.log('   - Scheduled Reports');
    console.log();
    
    return {
      daily: dailyResult,
      credit: creditResult,
    };
  } catch (error) {
    console.error('❌ Sync failed:', error);
    throw error;
  }
}

// Make functions available in browser console
if (typeof window !== 'undefined') {
  (window as any).syncDemoToDynamoDB = syncAllDemoData;
  (window as any).syncDailyEntries = syncDailyEntriesToDynamoDB;
  (window as any).syncCreditEntries = syncCreditEntriesToDynamoDB;
  
  console.log('💡 Sync functions available:');
  console.log('   - syncDemoToDynamoDB()  : Sync all demo data');
  console.log('   - syncDailyEntries()    : Sync daily entries only');
  console.log('   - syncCreditEntries()   : Sync credit entries only');
}

// Run if executed directly
if (require.main === module) {
  syncAllDemoData()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}

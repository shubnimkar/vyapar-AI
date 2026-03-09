#!/usr/bin/env node

/**
 * Seed Credit Data Directly to DynamoDB
 * 
 * This script reads generated credit data from /tmp/credit-data.json
 * and writes it directly to DynamoDB using AWS SDK directly.
 * 
 * Usage:
 *   node scripts/seed-credit-dynamodb.js [userId]
 * 
 * Default userId: demo-user-001
 */

const fs = require('fs');
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

// Helper function to save credit entry
async function saveCreditEntry(entry) {
  // Calculate TTL (30 days after paid, or no TTL if pending)
  let ttl;
  if (entry.isPaid && entry.paidDate) {
    const paidDate = new Date(entry.paidDate);
    const ttlDate = new Date(paidDate);
    ttlDate.setDate(ttlDate.getDate() + 30);
    ttl = Math.floor(ttlDate.getTime() / 1000);
  }

  const item = {
    PK: `USER#${entry.userId}`,
    SK: `CREDIT#${entry.id}`,
    entityType: 'CREDIT',
    ...entry,
    ttl,
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
  );
}

// Main function
async function main() {
  
  // Get userId from command line or use default
  const userId = process.argv[2] || 'demo-user-001';
  const dataPath = '/tmp/credit-data.json';
  
  console.log('🌱 Seeding Credit Data to DynamoDB...');
  console.log(`  User ID: ${userId}`);
  console.log(`  Table: ${process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai'}`);
  console.log(`  Region: ${process.env.AWS_REGION || 'ap-south-1'}`);
  console.log('');
  
  // Check if data file exists
  if (!fs.existsSync(dataPath)) {
    console.error('❌ Credit data file not found at /tmp/credit-data.json');
    console.error('   Run: bash scripts/seed-credit-data.sh first');
    process.exit(1);
  }
  
  // Load credit data
  const creditData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
  console.log(`📊 Loaded ${creditData.length} credit entries from file`);
  console.log('');
  
  // Seed each entry to DynamoDB
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < creditData.length; i++) {
    const entry = creditData[i];
    
    try {
      // Transform entry to match DynamoDB schema
      const dbEntry = {
        userId: userId,
        id: entry.id,
        customerName: entry.customerName,
        phoneNumber: entry.phoneNumber,
        amount: entry.amount,
        dateGiven: entry.dateGiven,
        dueDate: entry.dueDate,
        isPaid: entry.isPaid,
        paidDate: entry.paidDate || entry.paidAt,
        lastReminderAt: entry.lastReminderAt,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt || entry.createdAt,
      };
      
      // Save to DynamoDB
      await saveCreditEntry(dbEntry);
      successCount++;
      
      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`  ✓ Seeded ${i + 1}/${creditData.length} entries...`);
      }
    } catch (error) {
      errorCount++;
      console.error(`  ✗ Failed to seed entry ${entry.id}:`, error.message);
    }
  }
  
  console.log('');
  console.log('✅ Seeding complete!');
  console.log(`  Success: ${successCount}/${creditData.length}`);
  console.log(`  Errors: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log('');
    console.log('⚠️  Some entries failed to seed. Check AWS credentials and DynamoDB table.');
    process.exit(1);
  }
  
  // Calculate summary
  const paid = creditData.filter(e => e.isPaid).length;
  const unpaid = creditData.filter(e => !e.isPaid).length;
  const now = new Date();
  const overdue = creditData.filter(e => !e.isPaid && new Date(e.dueDate) < now).length;
  
  console.log('');
  console.log('📊 Credit Data Summary:');
  console.log(`  Total entries: ${creditData.length}`);
  console.log(`  Paid credits: ${paid}`);
  console.log(`  Unpaid credits: ${unpaid}`);
  console.log(`  Overdue credits: ${overdue}`);
  console.log('');
  console.log('🚀 Data is now in DynamoDB and ready for demo!');
}

// Run the script
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

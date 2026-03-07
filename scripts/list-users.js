#!/usr/bin/env node

/**
 * List all users from DynamoDB
 * 
 * Usage: node scripts/list-users.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, ScanCommand } = require('@aws-sdk/lib-dynamodb');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const region = process.env.DYNAMODB_REGION || process.env.AWS_S3_REGION || 'ap-south-1';
const tableName = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';

const dynamoClient = new DynamoDBClient({
  region,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
  },
});

const docClient = DynamoDBDocumentClient.from(dynamoClient);

async function listUsers() {
  try {
    console.log(`\n🔍 Scanning DynamoDB table: ${tableName}`);
    console.log(`📍 Region: ${region}\n`);

    // Scan for all items with PK starting with USER#
    const command = new ScanCommand({
      TableName: tableName,
      FilterExpression: 'begins_with(PK, :userPrefix) AND SK = :profileSK',
      ExpressionAttributeValues: {
        ':userPrefix': 'USER#',
        ':profileSK': 'PROFILE'
      }
    });

    const response = await docClient.send(command);

    if (!response.Items || response.Items.length === 0) {
      console.log('❌ No users found in the database.\n');
      return;
    }

    console.log(`✅ Found ${response.Items.length} user(s):\n`);
    console.log('═'.repeat(80));

    response.Items.forEach((item, index) => {
      console.log(`\n👤 User ${index + 1}:`);
      console.log('─'.repeat(80));
      console.log(`  User ID:        ${item.PK.replace('USER#', '')}`);
      console.log(`  Username:       ${item.userName || 'N/A'}`);
      console.log(`  Phone:          ${item.phoneNumber || 'N/A'}`);
      console.log(`  Shop Name:      ${item.shopName || 'N/A'}`);
      console.log(`  Business Type:  ${item.business_type || 'N/A'}`);
      console.log(`  City Tier:      ${item.city_tier || 'N/A'}`);
      console.log(`  Language:       ${item.language || 'N/A'}`);
      console.log(`  Explanation:    ${item.explanation_mode || 'N/A'}`);
      console.log(`  Active:         ${item.isActive ? '✓' : '✗'}`);
      console.log(`  Created:        ${item.createdAt || 'N/A'}`);
      console.log(`  Last Active:    ${item.lastActiveAt || 'N/A'}`);
    });

    console.log('\n' + '═'.repeat(80));
    console.log(`\n📊 Total Users: ${response.Items.length}\n`);

  } catch (error) {
    console.error('\n❌ Error listing users:', error.message);
    
    if (error.name === 'UnrecognizedClientException' || 
        error.name === 'CredentialsProviderError' ||
        error.name === 'InvalidSignatureException') {
      console.error('\n⚠️  AWS credentials not configured properly.');
      console.error('   Please check your .env.local file.\n');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error(`\n⚠️  Table "${tableName}" not found.`);
      console.error('   Please create the table or check the table name.\n');
    }
    
    process.exit(1);
  }
}

// Run the script
listUsers();

#!/usr/bin/env node

/**
 * Create a test user in DynamoDB
 * 
 * Usage: node scripts/create-test-user.js
 */

const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, PutCommand } = require('@aws-sdk/lib-dynamodb');
const crypto = require('crypto');

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

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function createTestUser() {
  try {
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    const testUser = {
      PK: `USER#${userId}`,
      SK: 'PROFILE',
      entityType: 'PROFILE',
      
      // User identification
      id: userId,
      userName: 'testuser',
      phoneNumber: '+919876543210',
      passwordHash: hashPassword('test123'), // Password: test123
      
      // Shop details
      shopName: 'Test Kirana Store',
      business_type: 'kirana',
      city_tier: 'tier1',
      
      // Preferences
      language: 'en',
      explanation_mode: 'simple',
      
      // Status
      isActive: true,
      subscriptionTier: 'free',
      
      // Timestamps
      createdAt: now,
      lastActiveAt: now,
      updatedAt: now,
      
      // Preferences object
      preferences: {
        dataRetentionDays: 90,
        autoArchive: false,
        notificationsEnabled: true,
        currency: 'INR'
      }
    };

    console.log('\n🔧 Creating test user in DynamoDB...');
    console.log(`📍 Table: ${tableName}`);
    console.log(`📍 Region: ${region}\n`);

    const command = new PutCommand({
      TableName: tableName,
      Item: testUser
    });

    await docClient.send(command);

    console.log('✅ Test user created successfully!\n');
    console.log('═'.repeat(80));
    console.log('\n📋 User Details:');
    console.log('─'.repeat(80));
    console.log(`  User ID:        ${userId}`);
    console.log(`  Username:       testuser`);
    console.log(`  Password:       test123`);
    console.log(`  Phone:          +919876543210`);
    console.log(`  Shop Name:      Test Kirana Store`);
    console.log(`  Business Type:  kirana`);
    console.log(`  City Tier:      tier1`);
    console.log(`  Language:       en`);
    console.log(`  Explanation:    simple`);
    console.log('\n' + '═'.repeat(80));
    console.log('\n💡 You can now login with:');
    console.log('   Username: testuser');
    console.log('   Password: test123\n');

  } catch (error) {
    console.error('\n❌ Error creating test user:', error.message);
    
    if (error.name === 'UnrecognizedClientException' || 
        error.name === 'CredentialsProviderError' ||
        error.name === 'InvalidSignatureException') {
      console.error('\n⚠️  AWS credentials not configured properly.');
      console.error('   Please check your .env.local file.\n');
    } else if (error.name === 'ResourceNotFoundException') {
      console.error(`\n⚠️  Table "${tableName}" not found.`);
      console.error('   Please create the table first.\n');
    }
    
    process.exit(1);
  }
}

// Run the script
createTestUser();

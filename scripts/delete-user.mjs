#!/usr/bin/env node
/**
 * Delete all DynamoDB data for a given username.
 * Usage: node scripts/delete-user.mjs <username>
 *
 * Deletes:
 *  - USER#<username> METADATA       (auth record)
 *  - PROFILE#<userId> METADATA      (profile)
 *  - All ENTRY#<userId> items       (daily entries)
 *  - All CREDIT#<userId> items      (credit entries)
 *  - All USER#<userId> INDEX# items (stress/affordability indices)
 *  - All SESSION#* items for userId (AI sessions via scan)
 *  - EMAIL_LOOKUP#<email>           (email index, if present)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, QueryCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load env
config({ path: resolve(process.cwd(), '.env.local') });

const username = process.argv[2];
if (!username) {
  console.error('Usage: node scripts/delete-user.mjs <username>');
  process.exit(1);
}

const REGION = process.env.DYNAMODB_REGION || process.env.AWS_S3_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';

const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    ...(process.env.AWS_SESSION_TOKEN ? { sessionToken: process.env.AWS_SESSION_TOKEN } : {}),
  },
});
const db = DynamoDBDocumentClient.from(client, { marshallOptions: { removeUndefinedValues: true } });

async function deleteItem(pk, sk) {
  await db.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK: pk, SK: sk } }));
  console.log(`  deleted  PK=${pk}  SK=${sk}`);
}

async function deleteAllByPK(pk) {
  const result = await db.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk',
    ExpressionAttributeValues: { ':pk': pk },
  }));
  for (const item of result.Items || []) {
    await deleteItem(item.PK, item.SK);
  }
}

async function run() {
  const usernameLower = username.toLowerCase();
  const userPK = `USER#${usernameLower}`;

  console.log(`\nLooking up user: ${usernameLower}`);

  // 1. Fetch user record to get userId and email
  const userResult = await db.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { PK: userPK, SK: 'METADATA' },
  }));

  if (!userResult.Item) {
    console.error(`User "${username}" not found in DynamoDB.`);
    process.exit(1);
  }

  const { userId, email } = userResult.Item;
  console.log(`Found user  userId=${userId}  email=${email || 'none'}`);

  // 2. Delete user auth record
  console.log('\n--- Deleting user auth record ---');
  await deleteItem(userPK, 'METADATA');

  // 3. Delete profile
  console.log('\n--- Deleting profile ---');
  await deleteAllByPK(`PROFILE#${userId}`);

  // 4. Delete daily entries
  console.log('\n--- Deleting daily entries ---');
  await deleteAllByPK(`ENTRY#${userId}`);

  // 5. Delete credit entries
  console.log('\n--- Deleting credit entries ---');
  await deleteAllByPK(`CREDIT#${userId}`);

  // 5. Delete stress/affordability index entries (USER#<userId> + SK begins_with INDEX#)
  console.log('\n--- Deleting index entries ---');
  const indexItems = await db.send(new QueryCommand({
    TableName: TABLE_NAME,
    KeyConditionExpression: 'PK = :pk AND begins_with(SK, :skPrefix)',
    ExpressionAttributeValues: { ':pk': `USER#${userId}`, ':skPrefix': 'INDEX#' },
  }));
  for (const item of indexItems.Items || []) {
    await deleteItem(item.PK, item.SK);
  }
  if (!indexItems.Items?.length) console.log('  none found');

  // 6. Delete sessions (scan for SESSION#* items belonging to this userId)
  console.log('\n--- Deleting sessions ---');
  const sessionScan = await db.send(new ScanCommand({
    TableName: TABLE_NAME,
    FilterExpression: 'begins_with(PK, :prefix) AND userId = :uid',
    ExpressionAttributeValues: { ':prefix': 'SESSION#', ':uid': userId },
  }));
  for (const item of sessionScan.Items || []) {
    await deleteItem(item.PK, item.SK);
  }
  if (!sessionScan.Items?.length) console.log('  none found');

  // 8. Delete email lookup records (both PK formats)
  if (email) {
    console.log('\n--- Deleting email lookup ---');
    await deleteItem(`EMAIL_LOOKUP#${email.toLowerCase()}`, 'METADATA');
    await deleteItem(`EMAIL#${email.toLowerCase()}`, 'METADATA');
  }

  console.log(`\nDone. User "${username}" has been removed from the database.`);
}

run().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});

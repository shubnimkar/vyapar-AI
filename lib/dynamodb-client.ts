// DynamoDB Client for Vyapar AI
// Replaces MongoDB with AWS DynamoDB for hackathon requirement

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} from '@aws-sdk/lib-dynamodb';

// ============================================
// DynamoDB Configuration
// ============================================

const REGION = process.env.AWS_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';

// Create DynamoDB client
const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

// Create Document client for easier operations
const docClient = DynamoDBDocumentClient.from(client, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertEmptyValues: false,
  },
});

// ============================================
// Table Schema Design (Single Table)
// ============================================

/**
 * Primary Key Structure:
 * - PK: Partition Key (e.g., USER#userId, PROFILE#userId, ENTRY#userId)
 * - SK: Sort Key (e.g., METADATA, DATE#2024-01-15, CREDIT#creditId)
 * 
 * GSI1:
 * - GSI1PK: For secondary access patterns
 * - GSI1SK: For sorting/filtering
 * 
 * Entity Types:
 * - USER: User authentication data
 * - PROFILE: User profile information
 * - ENTRY: Daily business entries
 * - CREDIT: Credit tracking records
 */

// ============================================
// Helper Functions
// ============================================

/**
 * Generate partition key for entity
 */
function generatePK(entityType: string, id: string): string {
  return `${entityType}#${id}`;
}

/**
 * Generate sort key for entity
 */
function generateSK(entityType: string, id?: string): string {
  return id ? `${entityType}#${id}` : entityType;
}

/**
 * Parse entity ID from key
 */
function parseId(key: string): string {
  return key.split('#')[1] || '';
}

// ============================================
// DynamoDB Operations
// ============================================

export class DynamoDBService {
  /**
   * Put item into DynamoDB
   */
  static async putItem(item: Record<string, any>): Promise<void> {
    try {
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            ...item,
            updatedAt: new Date().toISOString(),
          },
        })
      );
      console.log('[DynamoDB] Item created/updated:', item.PK, item.SK);
    } catch (error) {
      console.error('[DynamoDB] Put item error:', error);
      throw new Error('Failed to save item to DynamoDB');
    }
  }

  /**
   * Get item from DynamoDB
   */
  static async getItem(pk: string, sk: string): Promise<Record<string, any> | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
        })
      );
      return result.Item || null;
    } catch (error) {
      console.error('[DynamoDB] Get item error:', error);
      throw new Error('Failed to retrieve item from DynamoDB');
    }
  }

  /**
   * Update item in DynamoDB
   */
  static async updateItem(
    pk: string,
    sk: string,
    updates: Record<string, any>
  ): Promise<void> {
    try {
      const updateExpressions: string[] = [];
      const expressionAttributeNames: Record<string, string> = {};
      const expressionAttributeValues: Record<string, any> = {};

      Object.entries(updates).forEach(([key, value], index) => {
        const attrName = `#attr${index}`;
        const attrValue = `:val${index}`;
        updateExpressions.push(`${attrName} = ${attrValue}`);
        expressionAttributeNames[attrName] = key;
        expressionAttributeValues[attrValue] = value;
      });

      // Add updatedAt timestamp
      updateExpressions.push('#updatedAt = :updatedAt');
      expressionAttributeNames['#updatedAt'] = 'updatedAt';
      expressionAttributeValues[':updatedAt'] = new Date().toISOString();

      await docClient.send(
        new UpdateCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
          UpdateExpression: `SET ${updateExpressions.join(', ')}`,
          ExpressionAttributeNames: expressionAttributeNames,
          ExpressionAttributeValues: expressionAttributeValues,
        })
      );
      console.log('[DynamoDB] Item updated:', pk, sk);
    } catch (error) {
      console.error('[DynamoDB] Update item error:', error);
      throw new Error('Failed to update item in DynamoDB');
    }
  }

  /**
   * Delete item from DynamoDB
   */
  static async deleteItem(pk: string, sk: string): Promise<void> {
    try {
      await docClient.send(
        new DeleteCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
        })
      );
      console.log('[DynamoDB] Item deleted:', pk, sk);
    } catch (error) {
      console.error('[DynamoDB] Delete item error:', error);
      throw new Error('Failed to delete item from DynamoDB');
    }
  }

  /**
   * Query items by partition key
   */
  static async queryByPK(
    pk: string,
    skPrefix?: string
  ): Promise<Record<string, any>[]> {
    try {
      const params: any = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk',
        ExpressionAttributeValues: {
          ':pk': pk,
        },
      };

      if (skPrefix) {
        params.KeyConditionExpression += ' AND begins_with(SK, :skPrefix)';
        params.ExpressionAttributeValues[':skPrefix'] = skPrefix;
      }

      const result = await docClient.send(new QueryCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error('[DynamoDB] Query error:', error);
      throw new Error('Failed to query items from DynamoDB');
    }
  }

  /**
   * Scan table (use sparingly - expensive operation)
   */
  static async scanTable(
    filterExpression?: string,
    expressionAttributeValues?: Record<string, any>
  ): Promise<Record<string, any>[]> {
    try {
      const params: any = {
        TableName: TABLE_NAME,
      };

      if (filterExpression) {
        params.FilterExpression = filterExpression;
        params.ExpressionAttributeValues = expressionAttributeValues;
      }

      const result = await docClient.send(new ScanCommand(params));
      return result.Items || [];
    } catch (error) {
      console.error('[DynamoDB] Scan error:', error);
      throw new Error('Failed to scan table');
    }
  }
}

// ============================================
// Profile Operations
// ============================================

export interface UserProfile {
  userId: string;
  shopName: string;
  userName: string;
  businessType?: string;
  city?: string;
  phoneNumber?: string;
  language: string;
  createdAt: string;
  updatedAt: string;
}

export class ProfileService {
  /**
   * Create or update user profile
   */
  static async saveProfile(profile: UserProfile): Promise<void> {
    const item = {
      PK: generatePK('PROFILE', profile.userId),
      SK: 'METADATA',
      entityType: 'PROFILE',
      ...profile,
      createdAt: profile.createdAt || new Date().toISOString(),
    };
    await DynamoDBService.putItem(item);
  }

  /**
   * Get user profile
   */
  static async getProfile(userId: string): Promise<UserProfile | null> {
    const item = await DynamoDBService.getItem(
      generatePK('PROFILE', userId),
      'METADATA'
    );
    
    if (!item) return null;

    return {
      userId: item.userId,
      shopName: item.shopName,
      userName: item.userName,
      businessType: item.businessType,
      city: item.city,
      phoneNumber: item.phoneNumber,
      language: item.language,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Update user profile
   */
  static async updateProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<void> {
    await DynamoDBService.updateItem(
      generatePK('PROFILE', userId),
      'METADATA',
      updates
    );
  }

  /**
   * Delete user profile
   */
  static async deleteProfile(userId: string): Promise<void> {
    await DynamoDBService.deleteItem(
      generatePK('PROFILE', userId),
      'METADATA'
    );
  }
}

// ============================================
// Daily Entry Operations
// ============================================

export interface DailyEntry {
  userId: string;
  entryId: string;
  date: string; // YYYY-MM-DD format
  totalSales: number;
  totalExpense: number;
  cashInHand?: number;
  notes?: string;
  // Calculated fields
  estimatedProfit: number;
  expenseRatio: number;
  profitMargin: number;
  createdAt: string;
  updatedAt: string;
  ttl?: number; // For automatic expiration (90 days)
}

export class DailyEntryService {
  /**
   * Save daily entry (create or update)
   */
  static async saveEntry(entry: DailyEntry): Promise<void> {
    // Calculate TTL (90 days from entry date)
    const entryDate = new Date(entry.date);
    const ttlDate = new Date(entryDate);
    ttlDate.setDate(ttlDate.getDate() + 90);
    const ttl = Math.floor(ttlDate.getTime() / 1000);

    const item = {
      PK: generatePK('USER', entry.userId),
      SK: generateSK('ENTRY', entry.date), // Use date as SK for easy querying
      entityType: 'ENTRY',
      ...entry,
      ttl,
      createdAt: entry.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await DynamoDBService.putItem(item);
  }

  /**
   * Get single entry by date
   */
  static async getEntry(userId: string, date: string): Promise<DailyEntry | null> {
    const item = await DynamoDBService.getItem(
      generatePK('USER', userId),
      generateSK('ENTRY', date)
    );
    
    if (!item) return null;

    return {
      userId: item.userId,
      entryId: item.entryId,
      date: item.date,
      totalSales: item.totalSales,
      totalExpense: item.totalExpense,
      cashInHand: item.cashInHand,
      notes: item.notes,
      estimatedProfit: item.estimatedProfit,
      expenseRatio: item.expenseRatio,
      profitMargin: item.profitMargin,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    };
  }

  /**
   * Get entries for user by date range
   */
  static async getEntries(
    userId: string,
    startDate?: string,
    endDate?: string
  ): Promise<DailyEntry[]> {
    const items = await DynamoDBService.queryByPK(
      generatePK('USER', userId),
      'ENTRY#'
    );

    let entries = items.map((item) => ({
      userId: item.userId,
      entryId: item.entryId,
      date: item.date,
      totalSales: item.totalSales,
      totalExpense: item.totalExpense,
      cashInHand: item.cashInHand,
      notes: item.notes,
      estimatedProfit: item.estimatedProfit,
      expenseRatio: item.expenseRatio,
      profitMargin: item.profitMargin,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
    }));

    // Filter by date range if provided
    if (startDate) {
      entries = entries.filter((e) => e.date >= startDate);
    }
    if (endDate) {
      entries = entries.filter((e) => e.date <= endDate);
    }

    // Sort by date descending (newest first)
    entries.sort((a, b) => b.date.localeCompare(a.date));

    return entries;
  }

  /**
   * Delete entry
   */
  static async deleteEntry(userId: string, date: string): Promise<void> {
    await DynamoDBService.deleteItem(
      generatePK('USER', userId),
      generateSK('ENTRY', date)
    );
  }

  /**
   * Get entries count for user
   */
  static async getEntriesCount(userId: string): Promise<number> {
    const entries = await this.getEntries(userId);
    return entries.length;
  }
}

// ============================================
// Credit Tracking Operations (Udhaar)
// ============================================

export interface CreditEntry {
  userId: string;
  id: string; // credit_timestamp_random
  customerName: string;
  amount: number;
  dueDate: string; // ISO date string
  isPaid: boolean;
  createdAt: string;
  paidAt?: string;
  ttl?: number; // For automatic expiration (30 days after paid)
}

export class CreditEntryService {
  /**
   * Save credit entry (create or update)
   */
  static async saveEntry(entry: CreditEntry): Promise<void> {
    // Calculate TTL (30 days after paid, or no TTL if pending)
    let ttl: number | undefined;
    if (entry.isPaid && entry.paidAt) {
      const paidDate = new Date(entry.paidAt);
      const ttlDate = new Date(paidDate);
      ttlDate.setDate(ttlDate.getDate() + 30);
      ttl = Math.floor(ttlDate.getTime() / 1000);
    }

    const item = {
      PK: generatePK('USER', entry.userId),
      SK: generateSK('CREDIT', entry.id),
      entityType: 'CREDIT',
      ...entry,
      ttl,
      createdAt: entry.createdAt || new Date().toISOString(),
    };
    await DynamoDBService.putItem(item);
  }

  /**
   * Get single credit entry by ID
   */
  static async getEntry(userId: string, id: string): Promise<CreditEntry | null> {
    const item = await DynamoDBService.getItem(
      generatePK('USER', userId),
      generateSK('CREDIT', id)
    );
    
    if (!item) return null;

    return {
      userId: item.userId,
      id: item.id,
      customerName: item.customerName,
      amount: item.amount,
      dueDate: item.dueDate,
      isPaid: item.isPaid,
      createdAt: item.createdAt,
      paidAt: item.paidAt,
    };
  }

  /**
   * Get all credit entries for user
   */
  static async getEntries(userId: string): Promise<CreditEntry[]> {
    const items = await DynamoDBService.queryByPK(
      generatePK('USER', userId),
      'CREDIT#'
    );

    const entries = items.map((item) => ({
      userId: item.userId,
      id: item.id,
      customerName: item.customerName,
      amount: item.amount,
      dueDate: item.dueDate,
      isPaid: item.isPaid,
      createdAt: item.createdAt,
      paidAt: item.paidAt,
    }));

    // Sort by createdAt descending (newest first)
    entries.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    return entries;
  }

  /**
   * Delete credit entry
   */
  static async deleteEntry(userId: string, id: string): Promise<void> {
    await DynamoDBService.deleteItem(
      generatePK('USER', userId),
      generateSK('CREDIT', id)
    );
  }
}

// ============================================
// User Operations (Authentication)
// ============================================

export interface UserRecord {
  userId: string;
  username: string;              // Original case
  passwordHash: string;          // bcrypt hash
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  loginCount: number;
}

export class UserService {
  /**
   * Create user account
   */
  static async createUser(user: UserRecord): Promise<void> {
    const item = {
      PK: generatePK('USER', user.username.toLowerCase()),
      SK: 'METADATA',
      entityType: 'USER',
      GSI1PK: generatePK('USER', user.userId),
      GSI1SK: 'METADATA',
      ...user,
      createdAt: user.createdAt || new Date().toISOString(),
      loginCount: 0,
    };
    await DynamoDBService.putItem(item);
  }

  /**
   * Get user by username (case-insensitive)
   */
  static async getUserByUsername(username: string): Promise<UserRecord | null> {
    const item = await DynamoDBService.getItem(
      generatePK('USER', username.toLowerCase()),
      'METADATA'
    );
    
    if (!item) return null;

    return {
      userId: item.userId,
      username: item.username,
      passwordHash: item.passwordHash,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastLoginAt: item.lastLoginAt,
      loginCount: item.loginCount || 0,
    };
  }

  /**
   * Get user by userId
   */
  static async getUserById(userId: string): Promise<UserRecord | null> {
    // Query GSI1 for userId lookup
    const items = await DynamoDBService.queryByPK(
      generatePK('USER', userId),
      undefined
    );
    
    if (!items || items.length === 0) return null;
    
    const item = items[0];
    return {
      userId: item.userId,
      username: item.username,
      passwordHash: item.passwordHash,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      lastLoginAt: item.lastLoginAt,
      loginCount: item.loginCount || 0,
    };
  }

  /**
   * Update login statistics
   */
  static async updateLoginStats(userId: string, username: string): Promise<void> {
    const user = await this.getUserByUsername(username);
    if (!user) return;

    await DynamoDBService.updateItem(
      generatePK('USER', username.toLowerCase()),
      'METADATA',
      {
        lastLoginAt: new Date().toISOString(),
        loginCount: (user.loginCount || 0) + 1,
      }
    );
  }

  /**
   * Check if username exists (case-insensitive)
   */
  static async usernameExists(username: string): Promise<boolean> {
    const user = await this.getUserByUsername(username);
    return user !== null;
  }
}

// ============================================
// Export Services
// ============================================

export default {
  DynamoDBService,
  UserService,
  ProfileService,
  DailyEntryService,
  CreditEntryService,
};

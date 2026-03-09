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
import { logger } from './logger';

// ============================================
// DynamoDB Configuration
// ============================================

const REGION = process.env.DYNAMODB_REGION || process.env.AWS_S3_REGION || 'ap-south-1';
const TABLE_NAME = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';
const AWS_SESSION_TOKEN = process.env.AWS_SESSION_TOKEN;

// Create DynamoDB client (uses ap-south-1 where table is located)
const client = new DynamoDBClient({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    ...(AWS_SESSION_TOKEN ? { sessionToken: AWS_SESSION_TOKEN } : {}),
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
 * Check if error is an AWS credential error
 */
function isCredentialError(error: unknown): boolean {
  if (error && typeof error === 'object' && 'name' in error) {
    const errorName = (error as { name: string }).name;
    return errorName === 'UnrecognizedClientException' || 
           errorName === 'CredentialsProviderError' ||
           errorName === 'InvalidSignatureException';
  }
  return false;
}

// ============================================
// DynamoDB Operations
// ============================================

export class DynamoDBService {
  /**
   * Put item into DynamoDB
   */
  static async putItem(item: Record<string, unknown>): Promise<void> {
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
      logger.debug('Item created/updated', { PK: item.PK, SK: item.SK });
    } catch (error) {
      // Handle AWS credential errors gracefully
      if (isCredentialError(error)) {
        logger.warn('AWS credentials not configured, skipping cloud save');
        return;
      }
      logger.error('Put item error', { error });
      throw new Error('Failed to save item to DynamoDB');
    }
  }

  /**
   * Get item from DynamoDB
   */
  static async getItem(pk: string, sk: string): Promise<Record<string, unknown> | null> {
    try {
      const result = await docClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { PK: pk, SK: sk },
        })
      );
      return result.Item || null;
    } catch (error) {
      // Handle AWS credential errors gracefully
      if (isCredentialError(error)) {
        logger.warn('AWS credentials not configured, operating in offline mode');
        return null;
      }
      logger.error('Get item error', { error });
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
      logger.debug('Item updated', { pk, sk });
    } catch (error) {
      if (isCredentialError(error)) {
        logger.warn('AWS credentials not configured, skipping cloud update');
        return;
      }
      logger.error('Update item error', { error });
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
      logger.debug('Item deleted', { pk, sk });
    } catch (error) {
      if (isCredentialError(error)) {
        logger.warn('AWS credentials not configured, skipping cloud delete');
        return;
      }
      logger.error('Delete item error', { error });
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
      if (isCredentialError(error)) {
        logger.warn('AWS credentials not configured, returning empty results');
        return [];
      }
      logger.error('Query error', { error });
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
      if (isCredentialError(error)) {
        logger.warn('AWS credentials not configured, returning empty results');
        return [];
      }
      logger.error('Scan error', { error });
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
  business_type?: string;
  city_tier?: string | null;
  explanation_mode?: string;
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
      userId: item.userId as string,
      shopName: item.shopName as string,
      userName: item.userName as string,
      phoneNumber: item.phoneNumber as string | undefined,
      language: item.language as string,
      businessType: item.businessType as string | undefined,
      city: item.city as string | undefined,
      business_type: (item.business_type || item.businessType) as string | undefined,
      city_tier: item.city_tier as string | null | undefined,
      explanation_mode: (item.explanation_mode || 'simple') as string,
      createdAt: (item.createdAt || new Date().toISOString()) as string,
      updatedAt: (item.updatedAt || new Date().toISOString()) as string,
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


  /**
   * Validate business_type field
   */
  static validateBusinessType(type: string): boolean {
    const validTypes = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
    return validTypes.includes(type);
  }

  /**
   * Validate city_tier field (optional)
   */
  static validateCityTier(tier: string | null): boolean {
    if (tier === null) return true;
    const validTiers = ['tier1', 'tier2', 'tier3', 'rural'];
    return validTiers.includes(tier);
  }

  /**
   * Validate explanation_mode field
   */
  static validateExplanationMode(mode: string): boolean {
    const validModes = ['simple', 'detailed'];
    return validModes.includes(mode);
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
  // Daily Health Coach suggestions
  suggestions?: Array<{
    id: string;
    created_at: string;
    severity: 'critical' | 'warning' | 'info';
    title: string;
    description: string;
    dismissed_at?: string;
    title_key: string;                 // Translation key for title
    description_key: string;           // Translation key for description
    description_params?: Record<string, string>;  // Parameters for description interpolation
    rule_type: 'high_credit' | 'margin_drop' | 'low_cash' | 'healthy_state';
    context_data?: Record<string, any>;
  }>;
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
      userId: item.userId as string,
      entryId: item.entryId as string,
      date: item.date as string,
      totalSales: item.totalSales as number,
      totalExpense: item.totalExpense as number,
      cashInHand: item.cashInHand as number | undefined,
      notes: item.notes as string | undefined,
      estimatedProfit: item.estimatedProfit as number,
      expenseRatio: item.expenseRatio as number,
      profitMargin: item.profitMargin as number,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
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
      userId: item.userId as string,
      entryId: item.entryId as string,
      date: item.date as string,
      totalSales: item.totalSales as number,
      totalExpense: item.totalExpense as number,
      cashInHand: item.cashInHand as number | undefined,
      notes: item.notes as string | undefined,
      estimatedProfit: item.estimatedProfit as number,
      expenseRatio: item.expenseRatio as number,
      profitMargin: item.profitMargin as number,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
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
  phoneNumber?: string; // Optional, for WhatsApp reminders
  amount: number;
  dateGiven: string; // ISO date string
  dueDate: string; // ISO date string
  isPaid: boolean;
  createdAt: string;
  updatedAt: string;
  paidDate?: string; // ISO date string (renamed from paidAt for consistency with types.ts)
  lastReminderAt?: string; // ISO date string - when last WhatsApp reminder was sent
  ttl?: number; // For automatic expiration (30 days after paid)
}

export class CreditEntryService {
  /**
   * Save credit entry (create or update)
   */
  static async saveEntry(entry: CreditEntry): Promise<void> {
    // Calculate TTL (30 days after paid, or no TTL if pending)
    let ttl: number | undefined;
    if (entry.isPaid && entry.paidDate) {
      const paidDate = new Date(entry.paidDate);
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
      updatedAt: entry.updatedAt || new Date().toISOString(),
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
      userId: item.userId as string,
      id: item.id as string,
      customerName: item.customerName as string,
      phoneNumber: item.phoneNumber as string | undefined,
      amount: item.amount as number,
      dateGiven: item.dateGiven as string,
      dueDate: item.dueDate as string,
      isPaid: item.isPaid as boolean,
      paidDate: item.paidDate as string | undefined,
      lastReminderAt: item.lastReminderAt as string | undefined,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
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
      userId: item.userId as string,
      id: item.id as string,
      customerName: item.customerName as string,
      phoneNumber: item.phoneNumber as string | undefined,
      amount: item.amount as number,
      dateGiven: item.dateGiven as string,
      dueDate: item.dueDate as string,
      isPaid: item.isPaid as boolean,
      paidDate: item.paidDate as string | undefined,
      lastReminderAt: item.lastReminderAt as string | undefined,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
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
      userId: item.userId as string,
      username: item.username as string,
      passwordHash: item.passwordHash as string,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
      lastLoginAt: item.lastLoginAt as string | undefined,
      loginCount: (item.loginCount as number) || 0,
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
      userId: item.userId as string,
      username: item.username as string,
      passwordHash: item.passwordHash as string,
      createdAt: item.createdAt as string,
      updatedAt: item.updatedAt as string,
      lastLoginAt: item.lastLoginAt as string | undefined,
      loginCount: (item.loginCount as number) || 0,
    };
  }

  /**
   * Update login statistics
   */
  static async updateLoginStats(_userId: string, username: string): Promise<void> {
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

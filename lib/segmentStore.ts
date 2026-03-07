import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb';
import { SegmentData, CityTier, BusinessType } from './types';
import { formatSegmentKey } from './finance/segmentKeyFormatter';
import { logger } from './logger';

/**
 * DynamoDB client for segment data operations
 * 
 * Uses single-table design with:
 * - PK: SEGMENT#{city_tier}#{business_type}
 * - SK: METADATA
 * 
 * Follows AWS architecture rules from vyapar-rules.md
 */
export class SegmentStore {
  private client: DynamoDBDocumentClient;
  private tableName: string;
  
  constructor() {
    const region = process.env.DYNAMODB_REGION || process.env.AWS_S3_REGION || 'ap-south-1';
    const awsSessionToken = process.env.AWS_SESSION_TOKEN;
    
    const dynamoClient = new DynamoDBClient({
      region,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
        ...(awsSessionToken ? { sessionToken: awsSessionToken } : {}),
      },
    });
    
    this.client = DynamoDBDocumentClient.from(dynamoClient, {
      marshallOptions: {
        removeUndefinedValues: true,
        convertEmptyValues: false,
      },
    });
    
    this.tableName = process.env.DYNAMODB_TABLE_NAME || 'vyapar-ai';
  }
  
  /**
   * Check if error is an AWS credential error
   */
  private isCredentialError(error: unknown): boolean {
    if (error && typeof error === 'object' && 'name' in error) {
      const errorName = (error as { name: string }).name;
      return errorName === 'UnrecognizedClientException' || 
             errorName === 'CredentialsProviderError' ||
             errorName === 'InvalidSignatureException';
    }
    return false;
  }
  
  /**
   * Get segment data from DynamoDB
   * 
   * Returns null if not found or on error
   * Handles credential errors gracefully (offline mode)
   */
  async getSegmentData(
    cityTier: CityTier,
    businessType: BusinessType
  ): Promise<SegmentData | null> {
    try {
      const segmentKey = formatSegmentKey(cityTier, businessType);
      
      const command = new GetCommand({
        TableName: this.tableName,
        Key: {
          PK: segmentKey,
          SK: 'METADATA'
        }
      });
      
      const response = await this.client.send(command);
      
      if (!response.Item) {
        logger.debug('Segment data not found', { segmentKey });
        return null;
      }
      
      const item = response.Item;
      
      // Validate required fields
      if (!item.medianHealthScore || !item.medianMargin || !item.sampleSize) {
        logger.warn('Incomplete segment data', { segmentKey });
        return null;
      }
      
      return {
        segmentKey: item.PK as string,
        medianHealthScore: item.medianHealthScore as number,
        medianMargin: item.medianMargin as number,
        sampleSize: item.sampleSize as number,
        lastUpdated: item.lastUpdated as string
      };
    } catch (error) {
      // Handle AWS credential errors gracefully (offline mode)
      if (this.isCredentialError(error)) {
        logger.warn('AWS credentials not configured, operating in offline mode');
        return null;
      }
      
      logger.error('Failed to get segment data from DynamoDB', { error });
      return null;
    }
  }
  
  /**
   * Save segment data to DynamoDB
   * 
   * Returns true on success, false on failure
   * Handles credential errors gracefully
   */
  async saveSegmentData(segmentData: SegmentData): Promise<boolean> {
    try {
      const command = new PutCommand({
        TableName: this.tableName,
        Item: {
          PK: segmentData.segmentKey,
          SK: 'METADATA',
          entityType: 'SEGMENT',
          medianHealthScore: segmentData.medianHealthScore,
          medianMargin: segmentData.medianMargin,
          sampleSize: segmentData.sampleSize,
          lastUpdated: segmentData.lastUpdated,
          updatedAt: new Date().toISOString()
        }
      });
      
      await this.client.send(command);
      logger.debug('Segment data saved', { segmentKey: segmentData.segmentKey });
      return true;
    } catch (error) {
      // Handle AWS credential errors gracefully
      if (this.isCredentialError(error)) {
        logger.warn('AWS credentials not configured, skipping cloud save');
        return false;
      }
      
      logger.error('Failed to save segment data to DynamoDB', { error });
      return false;
    }
  }
}

// Username Validator Service
// Validates username format and checks availability in DynamoDB

import { DynamoDBService } from './dynamodb-client';

// ============================================
// Types and Interfaces
// ============================================

export interface UsernameValidationResult {
  valid: boolean;
  error?: string;
  available?: boolean;
}

// ============================================
// Username Validator
// ============================================

export class UsernameValidator {
  // Username format: alphanumeric + underscore, 3-20 characters
  private static readonly USERNAME_REGEX = /^[a-zA-Z0-9_]{3,20}$/;

  /**
   * Validate username format
   * Requirements: 2.1, 2.2
   */
  static validateFormat(username: string): UsernameValidationResult {
    // Check if username is empty
    if (!username || username.trim().length === 0) {
      return {
        valid: false,
        error: 'Username is required',
      };
    }

    // Check format: alphanumeric + underscore, 3-20 characters
    if (!this.USERNAME_REGEX.test(username)) {
      // Determine specific error
      if (username.length < 3) {
        return {
          valid: false,
          error: 'Username must be at least 3 characters',
        };
      }
      if (username.length > 20) {
        return {
          valid: false,
          error: 'Username must be at most 20 characters',
        };
      }
      return {
        valid: false,
        error: 'Username can only contain letters, numbers, and underscores',
      };
    }

    return {
      valid: true,
    };
  }

  /**
   * Check username availability in DynamoDB
   * Requirements: 2.3, 2.4
   * 
   * Uses case-insensitive comparison by storing usernames in lowercase
   * in the partition key while preserving original case in attributes
   */
  static async checkAvailability(username: string): Promise<UsernameValidationResult> {
    try {
      // First validate format
      const formatResult = this.validateFormat(username);
      if (!formatResult.valid) {
        return formatResult;
      }

      // Check availability in DynamoDB (case-insensitive)
      const normalizedUsername = username.toLowerCase();
      const pk = `USER#${normalizedUsername}`;
      const sk = 'METADATA';

      const existingUser = await DynamoDBService.getItem(pk, sk);

      if (existingUser) {
        return {
          valid: true,
          available: false,
          error: 'Username already taken',
        };
      }

      return {
        valid: true,
        available: true,
      };
    } catch (error) {
      console.error('[UsernameValidator] Error checking availability:', error);
      return {
        valid: false,
        error: 'Unable to check username availability',
      };
    }
  }

  /**
   * Sanitize username
   * Trims whitespace and converts to lowercase for storage
   */
  static sanitize(username: string): string {
    return username.trim().toLowerCase();
  }
}

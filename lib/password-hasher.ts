/**
 * Password Hasher Service
 * 
 * Handles password hashing and verification using bcrypt.
 * Uses bcryptjs library with 10 salt rounds for security.
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4, 11.1, 11.2, 11.3, 11.4
 */

import bcrypt from 'bcryptjs';

const SALT_ROUNDS = 10;

// Password strength requirements
const MIN_LENGTH = 8;
const UPPERCASE_REGEX = /[A-Z]/;
const LOWERCASE_REGEX = /[a-z]/;
const NUMBER_REGEX = /[0-9]/;

export interface PasswordHashResult {
  success: boolean;
  hash?: string;
  error?: string;
}

export interface PasswordVerifyResult {
  success: boolean;
  match: boolean;
  error?: string;
}

export interface PasswordStrengthResult {
  valid: boolean;
  errors: string[];
}

export class PasswordHasher {
  /**
   * Hash a password using bcrypt with 10 salt rounds
   * 
   * @param password - Plain text password to hash
   * @returns Promise resolving to hash result
   */
  static async hash(password: string): Promise<PasswordHashResult> {
    try {
      if (!password || typeof password !== 'string') {
        return {
          success: false,
          error: 'Invalid password input'
        };
      }

      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      
      return {
        success: true,
        hash
      };
    } catch (error) {
      console.error('Password hashing error:', error);
      return {
        success: false,
        error: 'Failed to hash password'
      };
    }
  }

  /**
   * Verify a password against a stored hash
   * 
   * @param password - Plain text password to verify
   * @param hash - Stored bcrypt hash to compare against
   * @returns Promise resolving to verification result
   */
  static async verify(password: string, hash: string): Promise<PasswordVerifyResult> {
    try {
      if (!password || typeof password !== 'string') {
        return {
          success: false,
          match: false,
          error: 'Invalid password input'
        };
      }

      if (!hash || typeof hash !== 'string') {
        return {
          success: false,
          match: false,
          error: 'Invalid hash input'
        };
      }

      const match = await bcrypt.compare(password, hash);
      
      return {
        success: true,
        match
      };
    } catch (error) {
      console.error('Password verification error:', error);
      return {
        success: false,
        match: false,
        error: 'Failed to verify password'
      };
    }
  }

  /**
   * Validate password strength according to requirements
   * 
   * Requirements:
   * - Minimum 8 characters
   * - At least one uppercase letter
   * - At least one lowercase letter
   * - At least one number
   * 
   * @param password - Password to validate
   * @returns Validation result with specific errors
   */
  static validateStrength(password: string): PasswordStrengthResult {
    const errors: string[] = [];

    if (!password || typeof password !== 'string') {
      return {
        valid: false,
        errors: ['Password is required']
      };
    }

    if (password.length < MIN_LENGTH) {
      errors.push(`Password must be at least ${MIN_LENGTH} characters long`);
    }

    if (!UPPERCASE_REGEX.test(password)) {
      errors.push('Password must contain at least one uppercase letter');
    }

    if (!LOWERCASE_REGEX.test(password)) {
      errors.push('Password must contain at least one lowercase letter');
    }

    if (!NUMBER_REGEX.test(password)) {
      errors.push('Password must contain at least one number');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}

// Unit tests for Username Validator Service

import { UsernameValidator } from '../username-validator';
import { DynamoDBService } from '../dynamodb-client';

// Mock DynamoDB service
jest.mock('../dynamodb-client', () => ({
  DynamoDBService: {
    getItem: jest.fn(),
  },
}));

describe('UsernameValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('validateFormat', () => {
    it('should accept valid usernames', () => {
      const validUsernames = [
        'abc',
        'user123',
        'john_doe',
        'test_user_123',
        'a1b2c3',
        'username_with_20ch',
      ];

      validUsernames.forEach((username) => {
        const result = UsernameValidator.validateFormat(username);
        expect(result.valid).toBe(true);
        expect(result.error).toBeUndefined();
      });
    });

    it('should reject usernames that are too short', () => {
      const result = UsernameValidator.validateFormat('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
    });

    it('should reject usernames that are too long', () => {
      const result = UsernameValidator.validateFormat('a'.repeat(21));
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at most 20 characters');
    });

    it('should reject usernames with special characters', () => {
      const invalidUsernames = [
        'user@name',
        'user-name',
        'user.name',
        'user name',
        'user!name',
        'user#name',
      ];

      invalidUsernames.forEach((username) => {
        const result = UsernameValidator.validateFormat(username);
        expect(result.valid).toBe(false);
        expect(result.error).toBe('Username can only contain letters, numbers, and underscores');
      });
    });

    it('should reject empty usernames', () => {
      const result = UsernameValidator.validateFormat('');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should reject whitespace-only usernames', () => {
      const result = UsernameValidator.validateFormat('   ');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username is required');
    });

    it('should accept usernames with underscores', () => {
      const result = UsernameValidator.validateFormat('user_name');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept usernames with numbers', () => {
      const result = UsernameValidator.validateFormat('user123');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should accept usernames with mixed case', () => {
      const result = UsernameValidator.validateFormat('UserName');
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('checkAvailability', () => {
    it('should return available for non-existent username', async () => {
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue(null);

      const result = await UsernameValidator.checkAvailability('newuser');
      expect(result.valid).toBe(true);
      expect(result.available).toBe(true);
      expect(result.error).toBeUndefined();
      expect(DynamoDBService.getItem).toHaveBeenCalledWith('USER#newuser', 'METADATA');
    });

    it('should return unavailable for existing username', async () => {
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue({
        PK: 'USER#existinguser',
        SK: 'METADATA',
        username: 'existinguser',
      });

      const result = await UsernameValidator.checkAvailability('existinguser');
      expect(result.valid).toBe(true);
      expect(result.available).toBe(false);
      expect(result.error).toBe('Username already taken');
    });

    it('should perform case-insensitive check', async () => {
      (DynamoDBService.getItem as jest.Mock).mockResolvedValue({
        PK: 'USER#johndoe',
        SK: 'METADATA',
        username: 'JohnDoe',
      });

      const result = await UsernameValidator.checkAvailability('JohnDoe');
      expect(result.valid).toBe(true);
      expect(result.available).toBe(false);
      expect(result.error).toBe('Username already taken');
      expect(DynamoDBService.getItem).toHaveBeenCalledWith('USER#johndoe', 'METADATA');
    });

    it('should validate format before checking availability', async () => {
      const result = await UsernameValidator.checkAvailability('ab');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Username must be at least 3 characters');
      expect(DynamoDBService.getItem).not.toHaveBeenCalled();
    });

    it('should handle DynamoDB errors gracefully', async () => {
      (DynamoDBService.getItem as jest.Mock).mockRejectedValue(new Error('DynamoDB error'));

      const result = await UsernameValidator.checkAvailability('testuser');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Unable to check username availability');
    });
  });

  describe('sanitize', () => {
    it('should trim whitespace and convert to lowercase', () => {
      expect(UsernameValidator.sanitize('  UserName  ')).toBe('username');
    });

    it('should convert to lowercase', () => {
      expect(UsernameValidator.sanitize('JohnDoe')).toBe('johndoe');
    });

    it('should trim leading whitespace', () => {
      expect(UsernameValidator.sanitize('  username')).toBe('username');
    });

    it('should trim trailing whitespace', () => {
      expect(UsernameValidator.sanitize('username  ')).toBe('username');
    });

    it('should handle already lowercase usernames', () => {
      expect(UsernameValidator.sanitize('username')).toBe('username');
    });

    it('should preserve underscores', () => {
      expect(UsernameValidator.sanitize('user_name')).toBe('user_name');
    });

    it('should preserve numbers', () => {
      expect(UsernameValidator.sanitize('user123')).toBe('user123');
    });
  });
});

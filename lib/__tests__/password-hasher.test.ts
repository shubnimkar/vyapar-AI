/**
 * Unit tests for Password Hasher Service
 * 
 * Tests basic functionality of password hashing and verification
 */

import { PasswordHasher } from '../password-hasher';

describe('PasswordHasher', () => {
  describe('hash', () => {
    it('should successfully hash a valid password', async () => {
      const password = 'TestPass123';
      const result = await PasswordHasher.hash(password);
      
      expect(result.success).toBe(true);
      expect(result.hash).toBeDefined();
      expect(result.hash).not.toBe(password);
      expect(result.error).toBeUndefined();
    });

    it('should generate bcrypt hash with correct format', async () => {
      const password = 'TestPass123';
      const result = await PasswordHasher.hash(password);
      
      expect(result.success).toBe(true);
      expect(result.hash).toMatch(/^\$2[aby]\$10\$/);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'TestPass123';
      const result1 = await PasswordHasher.hash(password);
      const result2 = await PasswordHasher.hash(password);
      
      expect(result1.success).toBe(true);
      expect(result2.success).toBe(true);
      expect(result1.hash).not.toBe(result2.hash);
    });

    it('should handle empty password', async () => {
      const result = await PasswordHasher.hash('');
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should handle invalid input types', async () => {
      const result = await PasswordHasher.hash(null as any);
      
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verify', () => {
    it('should verify correct password', async () => {
      const password = 'TestPass123';
      const hashResult = await PasswordHasher.hash(password);
      const verifyResult = await PasswordHasher.verify(password, hashResult.hash!);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.match).toBe(true);
      expect(verifyResult.error).toBeUndefined();
    });

    it('should reject incorrect password', async () => {
      const password = 'TestPass123';
      const wrongPassword = 'WrongPass456';
      const hashResult = await PasswordHasher.hash(password);
      const verifyResult = await PasswordHasher.verify(wrongPassword, hashResult.hash!);
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.match).toBe(false);
    });

    it('should handle empty password', async () => {
      const hashResult = await PasswordHasher.hash('TestPass123');
      const verifyResult = await PasswordHasher.verify('', hashResult.hash!);
      
      expect(verifyResult.success).toBe(false);
      expect(verifyResult.match).toBe(false);
      expect(verifyResult.error).toBeDefined();
    });

    it('should handle invalid hash', async () => {
      const verifyResult = await PasswordHasher.verify('TestPass123', 'invalid-hash');
      
      expect(verifyResult.success).toBe(true);
      expect(verifyResult.match).toBe(false);
    });
  });

  describe('validateStrength', () => {
    it('should accept strong password', () => {
      const result = PasswordHasher.validateStrength('TestPass123');
      
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password too short', () => {
      const result = PasswordHasher.validateStrength('Test1');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must be at least 8 characters long');
    });

    it('should reject password without uppercase', () => {
      const result = PasswordHasher.validateStrength('testpass123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one uppercase letter');
    });

    it('should reject password without lowercase', () => {
      const result = PasswordHasher.validateStrength('TESTPASS123');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one lowercase letter');
    });

    it('should reject password without number', () => {
      const result = PasswordHasher.validateStrength('TestPassword');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password must contain at least one number');
    });

    it('should return multiple errors for weak password', () => {
      const result = PasswordHasher.validateStrength('test');
      
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(1);
    });

    it('should handle empty password', () => {
      const result = PasswordHasher.validateStrength('');
      
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });
  });
});

/**
 * Unit tests for Stress Index input validation
 * 
 * Tests validateStressInputs() function for:
 * - NaN detection
 * - Undefined detection
 * - Negative value detection
 * - Valid input acceptance
 */

import { validateStressInputs } from '../calculateStressIndex';

describe('validateStressInputs', () => {
  describe('Valid inputs', () => {
    it('should accept valid positive values', () => {
      const result = validateStressInputs(0.5, 1.2, 0.3);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept zero values', () => {
      const result = validateStressInputs(0, 0, 0);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept very large values', () => {
      const result = validateStressInputs(10.5, 100.0, 5.0);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept decimal values', () => {
      const result = validateStressInputs(0.123, 1.456, 0.789);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });
  });

  describe('NaN detection', () => {
    it('should reject NaN creditRatio', () => {
      const result = validateStressInputs(NaN, 1.2, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('creditRatio must be a valid number');
    });

    it('should reject NaN cashBuffer', () => {
      const result = validateStressInputs(0.5, NaN, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('cashBuffer must be a valid number');
    });

    it('should reject NaN expenseVolatility', () => {
      const result = validateStressInputs(0.5, 1.2, NaN);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('expenseVolatility must be a valid number');
    });

    it('should reject multiple NaN values', () => {
      const result = validateStressInputs(NaN, NaN, NaN);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('creditRatio must be a valid number');
      expect(result.errors).toContain('cashBuffer must be a valid number');
      expect(result.errors).toContain('expenseVolatility must be a valid number');
    });
  });

  describe('Undefined detection', () => {
    it('should reject undefined creditRatio', () => {
      const result = validateStressInputs(undefined as any, 1.2, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('creditRatio must be a valid number');
    });

    it('should reject undefined cashBuffer', () => {
      const result = validateStressInputs(0.5, undefined as any, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('cashBuffer must be a valid number');
    });

    it('should reject undefined expenseVolatility', () => {
      const result = validateStressInputs(0.5, 1.2, undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('expenseVolatility must be a valid number');
    });

    it('should reject all undefined values', () => {
      const result = validateStressInputs(undefined as any, undefined as any, undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
    });
  });

  describe('Negative value detection', () => {
    it('should reject negative creditRatio', () => {
      const result = validateStressInputs(-0.5, 1.2, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('creditRatio cannot be negative');
    });

    it('should reject negative cashBuffer', () => {
      const result = validateStressInputs(0.5, -1.2, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('cashBuffer cannot be negative');
    });

    it('should reject negative expenseVolatility', () => {
      const result = validateStressInputs(0.5, 1.2, -0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('expenseVolatility cannot be negative');
    });

    it('should reject all negative values', () => {
      const result = validateStressInputs(-0.5, -1.2, -0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('creditRatio cannot be negative');
      expect(result.errors).toContain('cashBuffer cannot be negative');
      expect(result.errors).toContain('expenseVolatility cannot be negative');
    });
  });

  describe('Combined error scenarios', () => {
    it('should detect both NaN and negative values', () => {
      const result = validateStressInputs(NaN, -1.2, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(2);
      expect(result.errors).toContain('creditRatio must be a valid number');
      expect(result.errors).toContain('cashBuffer cannot be negative');
    });

    it('should detect NaN, undefined, and negative values', () => {
      const result = validateStressInputs(NaN, undefined as any, -0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);
      expect(result.errors).toContain('creditRatio must be a valid number');
      expect(result.errors).toContain('cashBuffer must be a valid number');
      expect(result.errors).toContain('expenseVolatility cannot be negative');
    });

    it('should handle all possible error conditions', () => {
      const result = validateStressInputs(-0.5, NaN, undefined as any);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('Edge cases', () => {
    it('should accept very small positive values', () => {
      const result = validateStressInputs(0.0001, 0.0001, 0.0001);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should accept Infinity as valid (though unusual)', () => {
      const result = validateStressInputs(Infinity, 1.2, 0.3);
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual([]);
    });

    it('should reject negative Infinity', () => {
      const result = validateStressInputs(-Infinity, 1.2, 0.3);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('creditRatio cannot be negative');
    });
  });

  describe('Return structure', () => {
    it('should always return an object with isValid and errors properties', () => {
      const result = validateStressInputs(0.5, 1.2, 0.3);
      
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('errors');
      expect(typeof result.isValid).toBe('boolean');
      expect(Array.isArray(result.errors)).toBe(true);
    });

    it('should return empty errors array for valid inputs', () => {
      const result = validateStressInputs(0.5, 1.2, 0.3);
      
      expect(result.errors).toEqual([]);
      expect(result.errors.length).toBe(0);
    });

    it('should return non-empty errors array for invalid inputs', () => {
      const result = validateStressInputs(-0.5, NaN, 0.3);
      
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});

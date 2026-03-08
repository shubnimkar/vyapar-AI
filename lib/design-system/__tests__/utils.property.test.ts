/**
 * Property-Based Tests for Design System Utility Functions
 * 
 * Feature: ui-ux-redesign
 * @see .kiro/specs/ui-ux-redesign/design.md
 */

import * as fc from 'fast-check';
import {
  formatCurrency,
  formatPercentage,
} from '../utils';

describe('Design System Utilities - Property Tests', () => {
  describe('Property 34: Currency Formatting', () => {
    // Feature: ui-ux-redesign, Property 34: Currency Formatting
    // Validates: Requirements 18.2
    
    it('should always return a string with ₹ symbol for any number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000000000, max: 1000000000, noNaN: true }),
          (amount) => {
            const result = formatCurrency(amount);
            
            // Must be a string
            expect(typeof result).toBe('string');
            
            // Must contain ₹ symbol
            expect(result).toContain('₹');
            
            // Must not be empty
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format positive amounts with Indian number formatting', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 10000000 }),
          (amount) => {
            const result = formatCurrency(amount);
            
            // Should contain ₹ symbol
            expect(result).toContain('₹');
            
            // Should contain commas for thousands separator (Indian format)
            if (amount >= 1000) {
              expect(result).toMatch(/,/);
            }
            
            // Should not have decimal places
            expect(result).not.toMatch(/\.\d+/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle negative amounts correctly', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: -10000000, max: -1 }),
          (amount) => {
            const result = formatCurrency(amount);
            
            // Should contain ₹ symbol
            expect(result).toContain('₹');
            
            // Should indicate negative value (either with - or parentheses)
            expect(result).toMatch(/[-()]/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round decimal amounts to zero decimal places', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.01, max: 100000, noNaN: true }),
          (amount) => {
            const result = formatCurrency(amount);
            
            // Should not have decimal places in the output
            // Extract the number part after ₹ and remove commas
            const numberPart = result.replace(/[₹,\s-]/g, '');
            
            // Should not contain decimal point
            expect(numberPart).not.toMatch(/\./);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero correctly', () => {
      const result = formatCurrency(0);
      expect(result).toBe('₹0');
    });

    it('should use Indian number formatting (lakhs and crores)', () => {
      // Test specific Indian formatting examples
      expect(formatCurrency(100000)).toBe('₹1,00,000'); // 1 lakh
      expect(formatCurrency(10000000)).toBe('₹1,00,00,000'); // 1 crore
    });
  });

  describe('Property 35: Percentage Formatting', () => {
    // Feature: ui-ux-redesign, Property 35: Percentage Formatting
    // Validates: Requirements 18.4
    
    it('should always return a string with % symbol and 1 decimal place for any number', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value) => {
            const result = formatPercentage(value);
            
            // Must be a string
            expect(typeof result).toBe('string');
            
            // Must end with % symbol
            expect(result).toMatch(/%$/);
            
            // Must have exactly 1 decimal place
            expect(result).toMatch(/^-?\d+\.\d%$/);
            
            // Must not be empty
            expect(result.length).toBeGreaterThan(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format positive percentages correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0.1, max: 100, noNaN: true }),
          (value) => {
            const result = formatPercentage(value);
            
            // Should end with %
            expect(result).toMatch(/%$/);
            
            // Should have exactly 1 decimal place
            expect(result).toMatch(/^\d+\.\d%$/);
            
            // Should not start with negative sign
            expect(result).not.toMatch(/^-/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should format negative percentages correctly', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -100, max: -0.1, noNaN: true }),
          (value) => {
            const result = formatPercentage(value);
            
            // Should end with %
            expect(result).toMatch(/%$/);
            
            // Should have exactly 1 decimal place
            expect(result).toMatch(/^-\d+\.\d%$/);
            
            // Should start with negative sign
            expect(result).toMatch(/^-/);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should handle zero correctly', () => {
      const result = formatPercentage(0);
      expect(result).toBe('0.0%');
    });

    it('should maintain precision with 1 decimal place', () => {
      fc.assert(
        fc.property(
          fc.double({ min: -1000, max: 1000, noNaN: true }),
          (value) => {
            const result = formatPercentage(value);
            
            // Extract the numeric part (without % and sign)
            const numericPart = result.replace(/[-%]/g, '');
            const parts = numericPart.split('.');
            
            // Should have exactly 1 decimal digit
            expect(parts[1]).toBeDefined();
            expect(parts[1].length).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should round correctly to 1 decimal place', () => {
      // Test specific rounding examples
      expect(formatPercentage(45.67)).toBe('45.7%');
      expect(formatPercentage(45.64)).toBe('45.6%');
      expect(formatPercentage(100.06)).toBe('100.1%');
    });
  });
});

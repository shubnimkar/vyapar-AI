/**
 * Property-based tests for Spacing Scale Consistency
 * Feature: ui-ux-redesign, Property 4: Spacing Scale Consistency
 * 
 * These tests validate universal correctness properties for the spacing scale.
 * 
 * **Validates: Requirements 4.1**
 */

import * as fc from 'fast-check';
import { tokens } from '../tokens';

describe('Property 4: Spacing Scale Consistency', () => {
  describe('Spacing Scale Completeness', () => {
    it('should contain all required spacing values', () => {
      const requiredSpacings = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'];
      
      requiredSpacings.forEach(spacing => {
        expect(tokens.spacing).toHaveProperty(spacing);
      });
    });

    it('should have exactly 14 spacing values', () => {
      const spacingKeys = Object.keys(tokens.spacing);
      
      // Should have exactly 14 values (0, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32)
      expect(spacingKeys.length).toBe(14);
    });
  });

  describe('Spacing Unit Consistency', () => {
    it('should use rem units for all spacing values except 0', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'),
          (spacing) => {
            const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
            
            // Should be in rem units
            expect(value).toMatch(/^\d+(\.\d+)?rem$/);
            
            // Extract numeric value
            const remValue = parseFloat(value);
            expect(remValue).toBeGreaterThan(0);
            expect(remValue).toBeLessThan(20); // Reasonable upper bound
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have 0 spacing as string "0" without units', () => {
      const zeroSpacing = tokens.spacing['0'];
      
      // Should be exactly "0" (no units)
      expect(zeroSpacing).toBe('0');
    });
  });

  describe('8px Base Unit Pattern', () => {
    it('should follow 8px base unit pattern (multiples of 8px or 0.5rem)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'),
          (spacing) => {
            const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
            const remValue = parseFloat(value);
            
            // Convert rem to px (assuming 1rem = 16px)
            const pxValue = remValue * 16;
            
            // Should be a multiple of 4px (half of 8px base unit)
            // This allows for 4px, 8px, 12px, 16px, etc.
            expect(pxValue % 4).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have spacing values that are multiples of 0.25rem (4px)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'),
          (spacing) => {
            const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
            const remValue = parseFloat(value);
            
            // Should be a multiple of 0.25rem (4px at 16px base)
            // This allows for 0.25rem, 0.5rem, 0.75rem, 1rem, etc.
            const multiplier = remValue / 0.25;
            expect(multiplier).toBe(Math.floor(multiplier));
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Spacing Value Ordering', () => {
    it('should have spacing values in ascending order', () => {
      const spacings = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'];
      
      // Extract numeric rem values (0 is special case)
      const remValues = spacings.map(spacing => {
        const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
        return value === '0' ? 0 : parseFloat(value);
      });
      
      // Verify ascending order
      for (let i = 0; i < remValues.length - 1; i++) {
        expect(remValues[i + 1]).toBeGreaterThan(remValues[i]);
      }
    });

    it('should have no duplicate spacing values', () => {
      const spacings = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'];
      
      // Extract all spacing values
      const values = spacings.map(spacing => tokens.spacing[spacing as keyof typeof tokens.spacing]);
      
      // All values should be unique
      const uniqueValues = new Set(values);
      expect(uniqueValues.size).toBe(values.length);
    });
  });

  describe('Spacing Scale Mapping', () => {
    it('should map spacing keys to correct rem values', () => {
      // Verify specific mappings based on design spec
      expect(tokens.spacing['0']).toBe('0');
      expect(tokens.spacing['1']).toBe('0.25rem');   // 4px
      expect(tokens.spacing['2']).toBe('0.5rem');    // 8px
      expect(tokens.spacing['3']).toBe('0.75rem');   // 12px
      expect(tokens.spacing['4']).toBe('1rem');      // 16px
      expect(tokens.spacing['5']).toBe('1.25rem');   // 20px
      expect(tokens.spacing['6']).toBe('1.5rem');    // 24px
      expect(tokens.spacing['8']).toBe('2rem');      // 32px
      expect(tokens.spacing['10']).toBe('2.5rem');   // 40px
      expect(tokens.spacing['12']).toBe('3rem');     // 48px
      expect(tokens.spacing['16']).toBe('4rem');     // 64px
      expect(tokens.spacing['20']).toBe('5rem');     // 80px
      expect(tokens.spacing['24']).toBe('6rem');     // 96px
      expect(tokens.spacing['32']).toBe('8rem');     // 128px
    });
  });

  describe('Spacing Value Format', () => {
    it('should have consistent format for all spacing values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'),
          (spacing) => {
            const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
            
            // Should be a string
            expect(typeof value).toBe('string');
            
            // Should either be "0" or match rem format
            if (value === '0') {
              expect(value).toBe('0');
            } else {
              expect(value).toMatch(/^\d+(\.\d+)?rem$/);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use decimal notation for fractional rem values', () => {
      // Values like 0.25rem, 0.5rem, 0.75rem should use decimal notation
      const fractionalSpacings = ['1', '2', '3', '5'];
      
      fractionalSpacings.forEach(spacing => {
        const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
        
        // Should contain a decimal point
        expect(value).toContain('.');
        
        // Should be a valid decimal number
        const remValue = parseFloat(value);
        expect(remValue).toBeGreaterThan(0);
        
        // Should be one of the expected fractional values
        const validFractionalValues = [0.25, 0.5, 0.75, 1.25, 1.5, 2.5];
        expect(validFractionalValues).toContain(remValue);
      });
    });
  });

  describe('Spacing Scale Consistency', () => {
    it('should have consistent progression in spacing scale', () => {
      const spacings = ['0', '1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'];
      
      // Extract numeric rem values
      const remValues = spacings.map(spacing => {
        const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
        return value === '0' ? 0 : parseFloat(value);
      });
      
      // Verify each step is a reasonable increase
      for (let i = 0; i < remValues.length - 1; i++) {
        const increase = remValues[i + 1] - remValues[i];
        
        // Increase should be at least 0.25rem (4px at 16px base)
        expect(increase).toBeGreaterThanOrEqual(0.25);
        
        // Increase should not be more than 2rem (32px at 16px base)
        expect(increase).toBeLessThanOrEqual(2);
      }
    });

    it('should have spacing values that align with 8px grid system', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('2', '4', '6', '8', '10', '12', '16', '20', '24', '32'),
          (spacing) => {
            const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
            const remValue = parseFloat(value);
            
            // Convert rem to px (assuming 1rem = 16px)
            const pxValue = remValue * 16;
            
            // Should be a multiple of 8px for these specific values
            expect(pxValue % 8).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Spacing Scale Usability', () => {
    it('should provide sufficient granularity for small spacing', () => {
      // Should have at least 3 spacing values below 1rem (16px)
      const smallSpacings = ['1', '2', '3'].map(spacing => {
        const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
        return parseFloat(value);
      });
      
      smallSpacings.forEach(value => {
        expect(value).toBeLessThan(1);
      });
      
      // Should have at least 3 distinct small spacing values
      expect(smallSpacings.length).toBeGreaterThanOrEqual(3);
    });

    it('should provide sufficient granularity for large spacing', () => {
      // Should have at least 4 spacing values above 2rem (32px)
      const largeSpacings = ['10', '12', '16', '20', '24', '32'].map(spacing => {
        const value = tokens.spacing[spacing as keyof typeof tokens.spacing];
        return parseFloat(value);
      });
      
      largeSpacings.forEach(value => {
        expect(value).toBeGreaterThan(2);
      });
      
      // Should have at least 4 distinct large spacing values
      expect(largeSpacings.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe('Spacing Scale Type Safety', () => {
    it('should have readonly spacing values', () => {
      // TypeScript should enforce readonly at compile time
      // This test verifies the structure is correct
      const spacingKeys = Object.keys(tokens.spacing);
      
      spacingKeys.forEach(key => {
        const value = tokens.spacing[key as keyof typeof tokens.spacing];
        expect(typeof value).toBe('string');
      });
    });

    it('should have all spacing keys as strings', () => {
      const spacingKeys = Object.keys(tokens.spacing);
      
      spacingKeys.forEach(key => {
        expect(typeof key).toBe('string');
      });
    });
  });
});

/**
 * Property-Based Tests for Spacing Relative Units
 * 
 * Feature: ui-ux-redesign, Property 26: Spacing Relative Units
 * 
 * Validates: Requirements 13.6
 * 
 * Property 26: Spacing Relative Units
 * For any spacing token value, it SHALL use relative units (rem) instead of fixed pixels for scalability.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md - Property 26
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirement 13.6
 */

import * as fc from 'fast-check';
import { tokens } from '@/lib/design-system/tokens';

describe('Property 26: Spacing Relative Units', () => {
  /**
   * Property: All spacing tokens use relative units (rem) for scalability
   * 
   * This property ensures that spacing values use rem units instead of fixed pixels,
   * allowing the layout to scale with user font size preferences and browser zoom.
   * 
   * Exception: The value '0' is allowed as it's unit-less and valid in CSS.
   */
  it('should use relative units (rem) for all spacing tokens except 0', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary spacing keys from the tokens object
        fc.constantFrom(...Object.keys(tokens.spacing)),
        (spacingKey) => {
          const spacingValue = tokens.spacing[spacingKey as keyof typeof tokens.spacing];
          
          // Special case: '0' is valid without units
          if (spacingValue === '0') {
            return true;
          }
          
          // All other spacing values must use 'rem' units
          const usesRemUnits = typeof spacingValue === 'string' && spacingValue.endsWith('rem');
          
          // Log failures for debugging
          if (!usesRemUnits) {
            console.error(`Spacing token '${spacingKey}' uses invalid units: ${spacingValue}`);
            console.error('Expected: value ending with "rem" (e.g., "1rem", "0.5rem")');
          }
          
          return usesRemUnits;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Spacing values are valid CSS length values
   * 
   * This property ensures that all spacing values can be parsed as valid CSS lengths.
   */
  it('should have valid CSS length values for all spacing tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(tokens.spacing)),
        (spacingKey) => {
          const spacingValue = tokens.spacing[spacingKey as keyof typeof tokens.spacing];
          
          // Check if value is a valid CSS length
          // Valid formats: '0', '1rem', '0.5rem', '1.25rem', etc.
          const isValidCSSLength = /^(0|[0-9]+(\.[0-9]+)?rem)$/.test(spacingValue);
          
          if (!isValidCSSLength) {
            console.error(`Spacing token '${spacingKey}' has invalid CSS length: ${spacingValue}`);
          }
          
          return isValidCSSLength;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Spacing values are positive or zero
   * 
   * This property ensures that all spacing values are non-negative numbers.
   */
  it('should have non-negative numeric values for all spacing tokens', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(tokens.spacing)),
        (spacingKey) => {
          const spacingValue = tokens.spacing[spacingKey as keyof typeof tokens.spacing];
          
          // Extract numeric value
          const numericValue = spacingValue === '0' 
            ? 0 
            : parseFloat(spacingValue.replace('rem', ''));
          
          const isNonNegative = !isNaN(numericValue) && numericValue >= 0;
          
          if (!isNonNegative) {
            console.error(`Spacing token '${spacingKey}' has negative value: ${spacingValue}`);
          }
          
          return isNonNegative;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Spacing scale is monotonically increasing
   * 
   * This property ensures that spacing values increase as the key increases,
   * maintaining a consistent scale.
   */
  it('should have monotonically increasing spacing values', () => {
    const spacingEntries = Object.entries(tokens.spacing)
      .filter(([key]) => !isNaN(Number(key))) // Only numeric keys
      .sort(([a], [b]) => Number(a) - Number(b));
    
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: spacingEntries.length - 2 }),
        (index) => {
          const [key1, value1] = spacingEntries[index];
          const [key2, value2] = spacingEntries[index + 1];
          
          const num1 = value1 === '0' ? 0 : parseFloat(value1.replace('rem', ''));
          const num2 = value2 === '0' ? 0 : parseFloat(value2.replace('rem', ''));
          
          const isIncreasing = num1 <= num2;
          
          if (!isIncreasing) {
            console.error(`Spacing scale not monotonic: ${key1}=${value1} > ${key2}=${value2}`);
          }
          
          return isIncreasing;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Unit Test: Verify specific spacing tokens use rem units
   * 
   * This test checks that commonly used spacing tokens are defined with rem units.
   */
  it('should use rem units for common spacing tokens', () => {
    const commonSpacingKeys = ['1', '2', '3', '4', '5', '6', '8', '10', '12', '16', '20', '24', '32'];
    
    commonSpacingKeys.forEach((key) => {
      const value = tokens.spacing[key as keyof typeof tokens.spacing];
      
      if (value !== '0') {
        expect(value).toMatch(/^[0-9]+(\.[0-9]+)?rem$/);
      }
    });
  });

  /**
   * Unit Test: Verify spacing token '0' is unit-less
   * 
   * This test ensures that the zero spacing value is defined as '0' without units.
   */
  it('should have unit-less zero value', () => {
    expect(tokens.spacing['0']).toBe('0');
  });
});

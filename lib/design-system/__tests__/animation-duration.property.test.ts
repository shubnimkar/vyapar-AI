/**
 * Property-Based Tests for Animation Duration Tokens
 * 
 * Feature: ui-ux-redesign, Property 32: Animation Duration Tokens
 * 
 * Validates: Requirements 15.1, 15.8
 * 
 * Property 32: Animation Duration Tokens
 * For any animation duration token, the value SHALL be less than or equal to 500ms 
 * to avoid perceived slowness.
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md - Property 32
 * @see .kiro/specs/ui-ux-redesign/requirements.md - Requirements 15.1, 15.8
 */

import * as fc from 'fast-check';
import { tokens } from '@/lib/design-system/tokens';

describe('Property 32: Animation Duration Tokens', () => {
  /**
   * Property: All animation duration tokens are <= 500ms
   * 
   * This property ensures that animations don't feel sluggish by limiting
   * the maximum duration to 500ms.
   */
  it('should have animation durations <= 500ms to avoid perceived slowness', () => {
    fc.assert(
      fc.property(
        // Generate arbitrary duration keys from the tokens object
        fc.constantFrom(...Object.keys(tokens.animation.duration)),
        (durationKey) => {
          const durationValue = tokens.animation.duration[durationKey as keyof typeof tokens.animation.duration];
          
          // Parse the duration value (e.g., "150ms" -> 150)
          const numericValue = parseInt(durationValue.replace('ms', ''), 10);
          
          // Check that duration is <= 500ms
          const isWithinLimit = numericValue <= 500;
          
          // Log failures for debugging
          if (!isWithinLimit) {
            console.error(`Animation duration '${durationKey}' exceeds 500ms: ${durationValue}`);
            console.error('Animations longer than 500ms can feel sluggish to users');
          }
          
          return isWithinLimit;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Animation duration values are valid CSS time values
   * 
   * This property ensures that all duration values can be parsed as valid CSS time values.
   */
  it('should have valid CSS time values for all animation durations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(tokens.animation.duration)),
        (durationKey) => {
          const durationValue = tokens.animation.duration[durationKey as keyof typeof tokens.animation.duration];
          
          // Check if value is a valid CSS time value (e.g., "150ms", "0.3s")
          const isValidCSSTime = /^[0-9]+(\.[0-9]+)?(ms|s)$/.test(durationValue);
          
          if (!isValidCSSTime) {
            console.error(`Animation duration '${durationKey}' has invalid CSS time value: ${durationValue}`);
          }
          
          return isValidCSSTime;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Animation duration values are positive
   * 
   * This property ensures that all duration values are positive numbers.
   */
  it('should have positive numeric values for all animation durations', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...Object.keys(tokens.animation.duration)),
        (durationKey) => {
          const durationValue = tokens.animation.duration[durationKey as keyof typeof tokens.animation.duration];
          
          // Extract numeric value
          const numericValue = parseInt(durationValue.replace('ms', ''), 10);
          
          const isPositive = !isNaN(numericValue) && numericValue > 0;
          
          if (!isPositive) {
            console.error(`Animation duration '${durationKey}' has non-positive value: ${durationValue}`);
          }
          
          return isPositive;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Animation durations are monotonically increasing
   * 
   * This property ensures that fast < base < slow for consistent naming.
   */
  it('should have monotonically increasing duration values (fast < base < slow)', () => {
    const fast = parseInt(tokens.animation.duration.fast.replace('ms', ''), 10);
    const base = parseInt(tokens.animation.duration.base.replace('ms', ''), 10);
    const slow = parseInt(tokens.animation.duration.slow.replace('ms', ''), 10);
    
    const isMonotonic = fast < base && base < slow;
    
    if (!isMonotonic) {
      console.error('Animation durations are not monotonic:');
      console.error(`fast: ${fast}ms, base: ${base}ms, slow: ${slow}ms`);
    }
    
    expect(isMonotonic).toBe(true);
  });

  /**
   * Unit Test: Verify specific duration values
   * 
   * This test checks that the defined duration values match the design spec.
   */
  it('should have correct duration values as per design spec', () => {
    expect(tokens.animation.duration.fast).toBe('150ms');
    expect(tokens.animation.duration.base).toBe('300ms');
    expect(tokens.animation.duration.slow).toBe('500ms');
  });

  /**
   * Unit Test: Verify all durations are within performance budget
   * 
   * This test ensures that all durations meet the performance requirement.
   */
  it('should have all durations within 500ms performance budget', () => {
    const durations = Object.values(tokens.animation.duration);
    
    durations.forEach((duration) => {
      const numericValue = parseInt(duration.replace('ms', ''), 10);
      expect(numericValue).toBeLessThanOrEqual(500);
    });
  });
});

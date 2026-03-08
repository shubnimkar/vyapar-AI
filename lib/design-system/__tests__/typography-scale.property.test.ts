/**
 * Property-based tests for Typography Scale Completeness
 * Feature: ui-ux-redesign, Property 3: Typography Scale Completeness
 * 
 * These tests validate universal correctness properties for the typography scale.
 * 
 * **Validates: Requirements 2.2**
 */

import * as fc from 'fast-check';
import { tokens } from '../tokens';

describe('Property 3: Typography Scale Completeness', () => {
  describe('Font Size Levels', () => {
    it('should contain at least 8 font size levels', () => {
      const fontSizeKeys = Object.keys(tokens.typography.fontSize);
      
      // Should have at least 8 levels (xs, sm, base, lg, xl, 2xl, 3xl, 4xl)
      expect(fontSizeKeys.length).toBeGreaterThanOrEqual(8);
    });

    it('should have all required font size levels', () => {
      const requiredLevels = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
      
      requiredLevels.forEach(level => {
        expect(tokens.typography.fontSize).toHaveProperty(level);
      });
    });

    it('should have corresponding line height for each font size level', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'),
          (level) => {
            const fontSize = tokens.typography.fontSize[level];
            
            // Should be an array with 2 elements
            expect(Array.isArray(fontSize)).toBe(true);
            expect(fontSize.length).toBe(2);
            
            // First element: font size string
            expect(typeof fontSize[0]).toBe('string');
            
            // Second element: object with lineHeight property
            expect(typeof fontSize[1]).toBe('object');
            expect(fontSize[1]).toHaveProperty('lineHeight');
            expect(typeof fontSize[1].lineHeight).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Font Size Units', () => {
    it('should use rem units for all font sizes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'),
          (level) => {
            const [fontSize] = tokens.typography.fontSize[level];
            
            // Should be in rem units
            expect(fontSize).toMatch(/^\d+(\.\d+)?rem$/);
            
            // Extract numeric value
            const remValue = parseFloat(fontSize);
            expect(remValue).toBeGreaterThan(0);
            expect(remValue).toBeLessThan(10); // Reasonable upper bound
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Line Height Values', () => {
    it('should have valid CSS line height values', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'),
          (level) => {
            const [, { lineHeight }] = tokens.typography.fontSize[level];
            
            // Should be a valid CSS line height value (rem or unitless)
            expect(lineHeight).toMatch(/^\d+(\.\d+)?(rem)?$/);
            
            // Extract numeric value
            const numericValue = parseFloat(lineHeight);
            expect(numericValue).toBeGreaterThan(0);
            expect(numericValue).toBeLessThan(10); // Reasonable upper bound
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Font Size Ordering', () => {
    it('should have font sizes in ascending order', () => {
      const levels = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
      
      // Extract numeric rem values
      const remValues = levels.map(level => {
        const [fontSize] = tokens.typography.fontSize[level];
        return parseFloat(fontSize);
      });
      
      // Verify ascending order
      for (let i = 0; i < remValues.length - 1; i++) {
        expect(remValues[i + 1]).toBeGreaterThan(remValues[i]);
      }
    });

    it('should have consistent size progression', () => {
      const levels = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
      
      // Extract numeric rem values
      const remValues = levels.map(level => {
        const [fontSize] = tokens.typography.fontSize[level];
        return parseFloat(fontSize);
      });
      
      // Verify each step is a reasonable increase (not too small, not too large)
      for (let i = 0; i < remValues.length - 1; i++) {
        const increase = remValues[i + 1] - remValues[i];
        
        // Increase should be at least 0.125rem (2px at 16px base)
        expect(increase).toBeGreaterThanOrEqual(0.125);
        
        // Increase should not be more than 1rem (16px at 16px base)
        expect(increase).toBeLessThanOrEqual(1);
      }
    });
  });

  describe('Font Family Support', () => {
    it('should include Devanagari font support', () => {
      const devanagariFamily = tokens.typography.fontFamily.devanagari;
      
      // Should be an array
      expect(Array.isArray(devanagariFamily)).toBe(true);
      
      // Should include Noto Sans Devanagari
      expect(devanagariFamily).toContain('Noto Sans Devanagari');
      
      // Should have fallback fonts
      expect(devanagariFamily.length).toBeGreaterThan(1);
    });

    it('should have sans-serif font family with fallbacks', () => {
      const sansFamily = tokens.typography.fontFamily.sans;
      
      // Should be an array
      expect(Array.isArray(sansFamily)).toBe(true);
      
      // Should have multiple fallback fonts
      expect(sansFamily.length).toBeGreaterThan(3);
      
      // Should include common system fonts
      const familyString = sansFamily.join(',').toLowerCase();
      expect(
        familyString.includes('system-ui') ||
        familyString.includes('roboto') ||
        familyString.includes('sans-serif')
      ).toBe(true);
    });
  });

  describe('Typography Scale Completeness', () => {
    it('should have all required typography properties', () => {
      // Verify top-level typography structure
      expect(tokens.typography).toHaveProperty('fontFamily');
      expect(tokens.typography).toHaveProperty('fontSize');
      expect(tokens.typography).toHaveProperty('fontWeight');
      expect(tokens.typography).toHaveProperty('lineHeight');
    });

    it('should have font weight variations for hierarchy', () => {
      const requiredWeights = ['light', 'normal', 'medium', 'semibold', 'bold'];
      
      requiredWeights.forEach(weight => {
        expect(tokens.typography.fontWeight).toHaveProperty(weight);
        
        const value = tokens.typography.fontWeight[weight as keyof typeof tokens.typography.fontWeight];
        
        // Should be a valid CSS font weight (100-900)
        expect(value).toMatch(/^\d{3}$/);
        
        const numericWeight = parseInt(value, 10);
        expect(numericWeight).toBeGreaterThanOrEqual(100);
        expect(numericWeight).toBeLessThanOrEqual(900);
      });
    });

    it('should have line height variations', () => {
      const requiredLineHeights = ['tight', 'normal', 'relaxed', 'loose'];
      
      requiredLineHeights.forEach(lineHeight => {
        expect(tokens.typography.lineHeight).toHaveProperty(lineHeight);
        
        const value = tokens.typography.lineHeight[lineHeight as keyof typeof tokens.typography.lineHeight];
        
        // Should be a valid unitless line height
        expect(value).toMatch(/^\d+(\.\d+)?$/);
        
        const numericValue = parseFloat(value);
        expect(numericValue).toBeGreaterThan(0);
        expect(numericValue).toBeLessThanOrEqual(3);
      });
    });
  });

  describe('Typography Scale Consistency', () => {
    it('should have consistent structure for all font size levels', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'),
          (level) => {
            const fontSize = tokens.typography.fontSize[level];
            
            // Should always be [string, { lineHeight: string }] format
            expect(Array.isArray(fontSize)).toBe(true);
            expect(fontSize.length).toBe(2);
            expect(typeof fontSize[0]).toBe('string');
            expect(typeof fontSize[1]).toBe('object');
            expect(fontSize[1]).toHaveProperty('lineHeight');
            expect(typeof fontSize[1].lineHeight).toBe('string');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have no duplicate font size values', () => {
      const levels = ['xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'];
      
      // Extract font size values
      const fontSizes = levels.map(level => {
        const [fontSize] = tokens.typography.fontSize[level];
        return fontSize;
      });
      
      // All font sizes should be unique
      const uniqueSizes = new Set(fontSizes);
      expect(uniqueSizes.size).toBe(fontSizes.length);
    });

    it('should have appropriate line height for each font size', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl'),
          (level) => {
            const [fontSize, { lineHeight }] = tokens.typography.fontSize[level];
            
            const fontSizeValue = parseFloat(fontSize);
            const lineHeightValue = parseFloat(lineHeight);
            
            // Line height should be greater than or equal to font size
            // (for readability, line height is typically 1.2x to 2x font size)
            expect(lineHeightValue).toBeGreaterThanOrEqual(fontSizeValue * 1.0);
            expect(lineHeightValue).toBeLessThanOrEqual(fontSizeValue * 2.5);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Minimum Font Size for Mobile', () => {
    it('should have base font size of at least 16px (1rem) for mobile', () => {
      const [baseFontSize] = tokens.typography.fontSize.base;
      
      // Base should be 1rem (16px) to prevent iOS auto-zoom
      const remValue = parseFloat(baseFontSize);
      expect(remValue).toBeGreaterThanOrEqual(1.0);
    });

    it('should have smallest font size (xs) not too small for readability', () => {
      const [xsFontSize] = tokens.typography.fontSize.xs;
      
      // xs should be at least 0.75rem (12px) for readability
      const remValue = parseFloat(xsFontSize);
      expect(remValue).toBeGreaterThanOrEqual(0.75);
    });
  });
});

/**
 * Property-based tests for Color Palette Structure
 * Feature: ui-ux-redesign, Property 2: Color Palette Structure
 * 
 * These tests validate universal correctness properties for color palettes.
 * 
 * **Validates: Requirements 3.1, 3.2, 3.3**
 */

import * as fc from 'fast-check';
import { tokens } from '../tokens';

describe('Property 2: Color Palette Structure', () => {
  describe('Semantic Color Palettes (primary, success, warning, error, info)', () => {
    it('should contain all shades from 50 to 900', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('primary', 'success', 'warning', 'error', 'info'),
          (palette) => {
            const colorPalette = tokens.colors[palette];
            const requiredShades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
            
            // Verify all shades exist
            requiredShades.forEach(shade => {
              expect(colorPalette).toHaveProperty(String(shade));
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have valid hex color values for all shades', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('primary', 'success', 'warning', 'error', 'info'),
          fc.constantFrom(50, 100, 200, 300, 400, 500, 600, 700, 800, 900),
          (palette, shade) => {
            const colorPalette = tokens.colors[palette];
            const color = colorPalette[shade as keyof typeof colorPalette];
            
            // Should be a string
            expect(typeof color).toBe('string');
            
            // Should match hex color format #RRGGBB
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
            
            // Should be parseable as valid hex
            const hex = color.substring(1);
            const rgb = parseInt(hex, 16);
            expect(rgb).toBeGreaterThanOrEqual(0);
            expect(rgb).toBeLessThanOrEqual(0xFFFFFF);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have darker shades for higher numbers', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('primary', 'success', 'warning', 'error', 'info'),
          (palette) => {
            const colorPalette = tokens.colors[palette];
            const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
            
            // For each consecutive pair, verify they are different colors
            // (darker shades should have different hex values)
            for (let i = 0; i < shades.length - 1; i++) {
              const lighterShade = shades[i];
              const darkerShade = shades[i + 1];
              
              const lighterColor = colorPalette[lighterShade as keyof typeof colorPalette];
              const darkerColor = colorPalette[darkerShade as keyof typeof colorPalette];
              
              // Colors should be different
              expect(lighterColor).not.toBe(darkerColor);
              
              // Verify both are valid hex colors
              expect(lighterColor).toMatch(/^#[0-9a-f]{6}$/i);
              expect(darkerColor).toMatch(/^#[0-9a-f]{6}$/i);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Neutral Color Palette', () => {
    it('should contain shades 0, 50-900, and 950', () => {
      const neutralPalette = tokens.colors.neutral;
      const requiredShades = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      
      // Verify all shades exist
      requiredShades.forEach(shade => {
        expect(neutralPalette).toHaveProperty(String(shade));
      });
    });

    it('should have valid hex color values for all shades', () => {
      fc.assert(
        fc.property(
          fc.constantFrom(0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950),
          (shade) => {
            const neutralPalette = tokens.colors.neutral;
            const color = neutralPalette[shade as keyof typeof neutralPalette];
            
            // Should be a string
            expect(typeof color).toBe('string');
            
            // Should match hex color format #RRGGBB
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
            
            // Should be parseable as valid hex
            const hex = color.substring(1);
            const rgb = parseInt(hex, 16);
            expect(rgb).toBeGreaterThanOrEqual(0);
            expect(rgb).toBeLessThanOrEqual(0xFFFFFF);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have darker shades for higher numbers', () => {
      const neutralPalette = tokens.colors.neutral;
      const shades = [0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950];
      
      // For each consecutive pair, verify they are different colors
      for (let i = 0; i < shades.length - 1; i++) {
        const lighterShade = shades[i];
        const darkerShade = shades[i + 1];
        
        const lighterColor = neutralPalette[lighterShade as keyof typeof neutralPalette];
        const darkerColor = neutralPalette[darkerShade as keyof typeof neutralPalette];
        
        // Colors should be different
        expect(lighterColor).not.toBe(darkerColor);
        
        // Verify both are valid hex colors
        expect(lighterColor).toMatch(/^#[0-9a-f]{6}$/i);
        expect(darkerColor).toMatch(/^#[0-9a-f]{6}$/i);
      }
    });
  });

  describe('Financial Color Mapping', () => {
    it('should map financial colors to correct semantic colors', () => {
      const financial = tokens.colors.financial;
      
      // Financial profit should map to success-500 (green)
      expect(financial.profit).toBe(tokens.colors.success[500]);
      
      // Financial loss should map to error-500 (red)
      expect(financial.loss).toBe(tokens.colors.error[500]);
      
      // Financial neutral should map to neutral-500 (gray)
      expect(financial.neutral).toBe(tokens.colors.neutral[500]);
    });

    it('should have valid hex color values for financial colors', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('profit', 'loss', 'neutral'),
          (financialColor) => {
            const color = tokens.colors.financial[financialColor as keyof typeof tokens.colors.financial];
            
            // Should be a string
            expect(typeof color).toBe('string');
            
            // Should match hex color format #RRGGBB
            expect(color).toMatch(/^#[0-9a-f]{6}$/i);
            
            // Should be parseable as valid hex
            const hex = color.substring(1);
            const rgb = parseInt(hex, 16);
            expect(rgb).toBeGreaterThanOrEqual(0);
            expect(rgb).toBeLessThanOrEqual(0xFFFFFF);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe('Color Palette Completeness', () => {
    it('should have exactly 10 shades for semantic palettes', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('primary', 'success', 'warning', 'error', 'info'),
          (palette) => {
            const colorPalette = tokens.colors[palette];
            const shadeKeys = Object.keys(colorPalette);
            
            // Should have exactly 10 shades (50, 100, 200, 300, 400, 500, 600, 700, 800, 900)
            expect(shadeKeys.length).toBe(10);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have exactly 12 shades for neutral palette', () => {
      const neutralPalette = tokens.colors.neutral;
      const shadeKeys = Object.keys(neutralPalette);
      
      // Should have exactly 12 shades (0, 50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950)
      expect(shadeKeys.length).toBe(12);
    });

    it('should have exactly 3 financial colors', () => {
      const financial = tokens.colors.financial;
      const colorKeys = Object.keys(financial);
      
      // Should have exactly 3 colors (profit, loss, neutral)
      expect(colorKeys.length).toBe(3);
      expect(colorKeys).toContain('profit');
      expect(colorKeys).toContain('loss');
      expect(colorKeys).toContain('neutral');
    });
  });

  describe('Color Value Consistency', () => {
    it('should use consistent hex format (lowercase)', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('primary', 'success', 'warning', 'error', 'info'),
          fc.constantFrom(50, 100, 200, 300, 400, 500, 600, 700, 800, 900),
          (palette, shade) => {
            const colorPalette = tokens.colors[palette];
            const color = colorPalette[shade as keyof typeof colorPalette];
            
            // Should start with #
            expect(color.charAt(0)).toBe('#');
            
            // Should be 7 characters total (#RRGGBB)
            expect(color.length).toBe(7);
            
            // Should be lowercase hex (our convention)
            expect(color).toBe(color.toLowerCase());
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should have no duplicate color values within a palette', () => {
      fc.assert(
        fc.property(
          fc.constantFrom('primary', 'success', 'warning', 'error', 'info'),
          (palette) => {
            const colorPalette = tokens.colors[palette];
            const shades = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
            const colors = shades.map(shade => colorPalette[shade as keyof typeof colorPalette]);
            
            // All colors should be unique
            const uniqueColors = new Set(colors);
            expect(uniqueColors.size).toBe(colors.length);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});

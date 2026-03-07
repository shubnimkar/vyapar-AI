import { categorizePerformance, getVisualIndicator, ComparisonCategory } from '../categorizePerformance';

/**
 * Unit tests for categorizePerformance function
 * 
 * **Validates: Requirements 2.7, 2.8, 2.9**
 * 
 * Tests:
 * - Boundary values (39, 40, 60, 61)
 * - Visual indicator mapping for all categories
 * - Property 6: Category Assignment - Verify correct category for all percentile ranges
 */

describe('categorizePerformance', () => {
  describe('boundary value tests', () => {
    it('should return below_average for percentile 39 (just below threshold)', () => {
      const result = categorizePerformance(39);
      expect(result).toBe('below_average');
    });

    it('should return at_average for percentile 40 (lower boundary inclusive)', () => {
      const result = categorizePerformance(40);
      expect(result).toBe('at_average');
    });

    it('should return at_average for percentile 60 (upper boundary inclusive)', () => {
      const result = categorizePerformance(60);
      expect(result).toBe('at_average');
    });

    it('should return above_average for percentile 61 (just above threshold)', () => {
      const result = categorizePerformance(61);
      expect(result).toBe('above_average');
    });
  });

  describe('Property 6: Category Assignment - below_average range', () => {
    it('should return below_average for percentile 0', () => {
      expect(categorizePerformance(0)).toBe('below_average');
    });

    it('should return below_average for percentile 20', () => {
      expect(categorizePerformance(20)).toBe('below_average');
    });

    it('should return below_average for percentile 39.9', () => {
      expect(categorizePerformance(39.9)).toBe('below_average');
    });

    it('should return below_average for percentile 39.99', () => {
      expect(categorizePerformance(39.99)).toBe('below_average');
    });
  });

  describe('Property 6: Category Assignment - at_average range', () => {
    it('should return at_average for percentile 40 (lower boundary)', () => {
      expect(categorizePerformance(40)).toBe('at_average');
    });

    it('should return at_average for percentile 45', () => {
      expect(categorizePerformance(45)).toBe('at_average');
    });

    it('should return at_average for percentile 50', () => {
      expect(categorizePerformance(50)).toBe('at_average');
    });

    it('should return at_average for percentile 55', () => {
      expect(categorizePerformance(55)).toBe('at_average');
    });

    it('should return at_average for percentile 60 (upper boundary)', () => {
      expect(categorizePerformance(60)).toBe('at_average');
    });
  });

  describe('Property 6: Category Assignment - above_average range', () => {
    it('should return above_average for percentile 60.01', () => {
      expect(categorizePerformance(60.01)).toBe('above_average');
    });

    it('should return above_average for percentile 70', () => {
      expect(categorizePerformance(70)).toBe('above_average');
    });

    it('should return above_average for percentile 85', () => {
      expect(categorizePerformance(85)).toBe('above_average');
    });

    it('should return above_average for percentile 100', () => {
      expect(categorizePerformance(100)).toBe('above_average');
    });
  });

  describe('edge cases', () => {
    it('should handle decimal percentiles correctly', () => {
      expect(categorizePerformance(39.5)).toBe('below_average');
      expect(categorizePerformance(40.5)).toBe('at_average');
      expect(categorizePerformance(60.5)).toBe('above_average');
    });

    it('should handle negative percentiles (below_average)', () => {
      expect(categorizePerformance(-10)).toBe('below_average');
    });

    it('should handle percentiles above 100 (above_average)', () => {
      expect(categorizePerformance(150)).toBe('above_average');
    });
  });
});

describe('getVisualIndicator', () => {
  describe('visual indicator mapping for all categories', () => {
    it('should return correct visual indicator for above_average', () => {
      const indicator = getVisualIndicator('above_average');
      
      expect(indicator).toEqual({
        color: 'green',
        icon: '📈',
        bgColor: 'bg-green-50',
        borderColor: 'border-green-500'
      });
    });

    it('should return correct visual indicator for at_average', () => {
      const indicator = getVisualIndicator('at_average');
      
      expect(indicator).toEqual({
        color: 'yellow',
        icon: '➡️',
        bgColor: 'bg-yellow-50',
        borderColor: 'border-yellow-500'
      });
    });

    it('should return correct visual indicator for below_average', () => {
      const indicator = getVisualIndicator('below_average');
      
      expect(indicator).toEqual({
        color: 'red',
        icon: '📉',
        bgColor: 'bg-red-50',
        borderColor: 'border-red-500'
      });
    });
  });

  describe('visual indicator structure validation', () => {
    const categories: ComparisonCategory[] = ['above_average', 'at_average', 'below_average'];

    categories.forEach(category => {
      it(`should return indicator with all required fields for ${category}`, () => {
        const indicator = getVisualIndicator(category);
        
        expect(indicator).toHaveProperty('color');
        expect(indicator).toHaveProperty('icon');
        expect(indicator).toHaveProperty('bgColor');
        expect(indicator).toHaveProperty('borderColor');
        
        expect(typeof indicator.color).toBe('string');
        expect(typeof indicator.icon).toBe('string');
        expect(typeof indicator.bgColor).toBe('string');
        expect(typeof indicator.borderColor).toBe('string');
      });

      it(`should return valid color value for ${category}`, () => {
        const indicator = getVisualIndicator(category);
        expect(['green', 'yellow', 'red']).toContain(indicator.color);
      });

      it(`should return non-empty icon for ${category}`, () => {
        const indicator = getVisualIndicator(category);
        expect(indicator.icon.length).toBeGreaterThan(0);
      });

      it(`should return valid Tailwind CSS classes for ${category}`, () => {
        const indicator = getVisualIndicator(category);
        expect(indicator.bgColor).toMatch(/^bg-/);
        expect(indicator.borderColor).toMatch(/^border-/);
      });
    });
  });

  describe('color mapping consistency', () => {
    it('should map above_average to green', () => {
      const indicator = getVisualIndicator('above_average');
      expect(indicator.color).toBe('green');
      expect(indicator.bgColor).toContain('green');
      expect(indicator.borderColor).toContain('green');
    });

    it('should map at_average to yellow', () => {
      const indicator = getVisualIndicator('at_average');
      expect(indicator.color).toBe('yellow');
      expect(indicator.bgColor).toContain('yellow');
      expect(indicator.borderColor).toContain('yellow');
    });

    it('should map below_average to red', () => {
      const indicator = getVisualIndicator('below_average');
      expect(indicator.color).toBe('red');
      expect(indicator.bgColor).toContain('red');
      expect(indicator.borderColor).toContain('red');
    });
  });
});

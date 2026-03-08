/**
 * Unit Tests for Design System Utility Functions
 * 
 * @see .kiro/specs/ui-ux-redesign/design.md
 */

import {
  cn,
  formatCurrency,
  formatPercentage,
  getFinancialColor,
  getFinancialBgColor,
} from '../utils';

describe('Design System Utilities', () => {
  describe('cn() - Class Name Merger', () => {
    it('should merge multiple class strings', () => {
      expect(cn('px-4 py-2', 'text-red-500')).toBe('px-4 py-2 text-red-500');
    });

    it('should handle conditional classes', () => {
      expect(cn('px-4', true && 'py-2')).toBe('px-4 py-2');
      expect(cn('px-4', false && 'py-2')).toBe('px-4');
    });

    it('should deduplicate Tailwind classes with proper precedence', () => {
      expect(cn('px-4 py-2', 'px-6')).toBe('py-2 px-6');
    });

    it('should handle arrays and objects', () => {
      expect(cn(['px-4', 'py-2'])).toBe('px-4 py-2');
      expect(cn({ 'px-4': true, 'py-2': false })).toBe('px-4');
    });
  });

  describe('formatCurrency() - Indian Currency Formatting', () => {
    it('should format positive amounts with ₹ symbol and Indian formatting', () => {
      expect(formatCurrency(100000)).toBe('₹1,00,000');
      expect(formatCurrency(1000)).toBe('₹1,000');
      expect(formatCurrency(10)).toBe('₹10');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-5000)).toBe('-₹5,000');
    });

    it('should round to zero decimal places', () => {
      expect(formatCurrency(1234.56)).toBe('₹1,235');
      expect(formatCurrency(1234.44)).toBe('₹1,234');
    });

    it('should handle zero', () => {
      expect(formatCurrency(0)).toBe('₹0');
    });

    it('should handle large numbers', () => {
      expect(formatCurrency(10000000)).toBe('₹1,00,00,000');
    });
  });

  describe('formatPercentage() - Percentage Formatting', () => {
    it('should format with 1 decimal place and % symbol', () => {
      expect(formatPercentage(45.678)).toBe('45.7%');
      expect(formatPercentage(100)).toBe('100.0%');
      expect(formatPercentage(0)).toBe('0.0%');
    });

    it('should handle negative percentages', () => {
      expect(formatPercentage(-12.34)).toBe('-12.3%');
    });

    it('should round to 1 decimal place', () => {
      expect(formatPercentage(45.67)).toBe('45.7%');
      expect(formatPercentage(45.64)).toBe('45.6%');
    });
  });

  describe('getFinancialColor() - Financial Text Color', () => {
    it('should return profit color for positive values', () => {
      expect(getFinancialColor(1000)).toBe('text-financial-profit');
      expect(getFinancialColor(0.01)).toBe('text-financial-profit');
    });

    it('should return loss color for negative values', () => {
      expect(getFinancialColor(-500)).toBe('text-financial-loss');
      expect(getFinancialColor(-0.01)).toBe('text-financial-loss');
    });

    it('should return neutral color for zero', () => {
      expect(getFinancialColor(0)).toBe('text-financial-neutral');
    });
  });

  describe('getFinancialBgColor() - Financial Background Color', () => {
    it('should return success background for positive values', () => {
      expect(getFinancialBgColor(1000)).toBe('bg-success-50');
      expect(getFinancialBgColor(0.01)).toBe('bg-success-50');
    });

    it('should return error background for negative values', () => {
      expect(getFinancialBgColor(-500)).toBe('bg-error-50');
      expect(getFinancialBgColor(-0.01)).toBe('bg-error-50');
    });

    it('should return neutral background for zero', () => {
      expect(getFinancialBgColor(0)).toBe('bg-neutral-50');
    });
  });
});

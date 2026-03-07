/**
 * Unit Tests: Segment Key Formatter
 * 
 * Tests for pure functions that format and parse segment keys.
 * Validates Requirements 1.2, 1.6, 1.7
 */

import {
  formatSegmentKey,
  parseSegmentKey,
  isValidCityTier,
  isValidBusinessType,
  type CityTier,
  type BusinessType
} from '../segmentKeyFormatter';

describe('segmentKeyFormatter', () => {
  describe('formatSegmentKey', () => {
    it('should format tier1 kirana segment key', () => {
      const result = formatSegmentKey('tier1', 'kirana');
      expect(result).toBe('SEGMENT#tier1#kirana');
    });

    it('should format tier2 salon segment key', () => {
      const result = formatSegmentKey('tier2', 'salon');
      expect(result).toBe('SEGMENT#tier2#salon');
    });

    it('should format tier3 pharmacy segment key', () => {
      const result = formatSegmentKey('tier3', 'pharmacy');
      expect(result).toBe('SEGMENT#tier3#pharmacy');
    });

    it('should format all 15 valid segment combinations', () => {
      const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
      const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
      
      const expectedKeys = [
        'SEGMENT#tier1#kirana', 'SEGMENT#tier1#salon', 'SEGMENT#tier1#pharmacy', 'SEGMENT#tier1#restaurant', 'SEGMENT#tier1#other',
        'SEGMENT#tier2#kirana', 'SEGMENT#tier2#salon', 'SEGMENT#tier2#pharmacy', 'SEGMENT#tier2#restaurant', 'SEGMENT#tier2#other',
        'SEGMENT#tier3#kirana', 'SEGMENT#tier3#salon', 'SEGMENT#tier3#pharmacy', 'SEGMENT#tier3#restaurant', 'SEGMENT#tier3#other'
      ];
      
      const results: string[] = [];
      for (const tier of cityTiers) {
        for (const type of businessTypes) {
          results.push(formatSegmentKey(tier, type));
        }
      }
      
      expect(results).toEqual(expectedKeys);
    });
  });

  describe('parseSegmentKey', () => {
    it('should parse valid segment key', () => {
      const result = parseSegmentKey('SEGMENT#tier1#kirana');
      expect(result).toEqual({
        cityTier: 'tier1',
        businessType: 'kirana'
      });
    });

    it('should parse tier2 salon key', () => {
      const result = parseSegmentKey('SEGMENT#tier2#salon');
      expect(result).toEqual({
        cityTier: 'tier2',
        businessType: 'salon'
      });
    });

    it('should parse tier3 restaurant key', () => {
      const result = parseSegmentKey('SEGMENT#tier3#restaurant');
      expect(result).toEqual({
        cityTier: 'tier3',
        businessType: 'restaurant'
      });
    });

    it('should return null for invalid format (missing prefix)', () => {
      const result = parseSegmentKey('tier1#kirana');
      expect(result).toBeNull();
    });

    it('should return null for invalid format (wrong prefix)', () => {
      const result = parseSegmentKey('INVALID#tier1#kirana');
      expect(result).toBeNull();
    });

    it('should return null for invalid format (too few parts)', () => {
      const result = parseSegmentKey('SEGMENT#tier1');
      expect(result).toBeNull();
    });

    it('should return null for invalid format (too many parts)', () => {
      const result = parseSegmentKey('SEGMENT#tier1#kirana#extra');
      expect(result).toBeNull();
    });

    it('should return null for invalid city tier', () => {
      const result = parseSegmentKey('SEGMENT#tier4#kirana');
      expect(result).toBeNull();
    });

    it('should return null for invalid business type', () => {
      const result = parseSegmentKey('SEGMENT#tier1#invalid');
      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseSegmentKey('');
      expect(result).toBeNull();
    });

    it('should return null for malformed key', () => {
      const result = parseSegmentKey('SEGMENT##');
      expect(result).toBeNull();
    });
  });

  describe('round-trip (format then parse)', () => {
    it('should preserve values through format and parse', () => {
      const cityTier: CityTier = 'tier1';
      const businessType: BusinessType = 'kirana';
      
      const formatted = formatSegmentKey(cityTier, businessType);
      const parsed = parseSegmentKey(formatted);
      
      expect(parsed).toEqual({ cityTier, businessType });
    });

    it('should preserve all 15 combinations through round-trip', () => {
      const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
      const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
      
      for (const tier of cityTiers) {
        for (const type of businessTypes) {
          const formatted = formatSegmentKey(tier, type);
          const parsed = parseSegmentKey(formatted);
          
          expect(parsed).toEqual({
            cityTier: tier,
            businessType: type
          });
        }
      }
    });
  });

  describe('isValidCityTier', () => {
    it('should return true for tier1', () => {
      expect(isValidCityTier('tier1')).toBe(true);
    });

    it('should return true for tier2', () => {
      expect(isValidCityTier('tier2')).toBe(true);
    });

    it('should return true for tier3', () => {
      expect(isValidCityTier('tier3')).toBe(true);
    });

    it('should return false for tier4', () => {
      expect(isValidCityTier('tier4')).toBe(false);
    });

    it('should return false for invalid string', () => {
      expect(isValidCityTier('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidCityTier('')).toBe(false);
    });

    it('should return false for uppercase', () => {
      expect(isValidCityTier('TIER1')).toBe(false);
    });
  });

  describe('isValidBusinessType', () => {
    it('should return true for kirana', () => {
      expect(isValidBusinessType('kirana')).toBe(true);
    });

    it('should return true for salon', () => {
      expect(isValidBusinessType('salon')).toBe(true);
    });

    it('should return true for pharmacy', () => {
      expect(isValidBusinessType('pharmacy')).toBe(true);
    });

    it('should return true for restaurant', () => {
      expect(isValidBusinessType('restaurant')).toBe(true);
    });

    it('should return true for other', () => {
      expect(isValidBusinessType('other')).toBe(true);
    });

    it('should return false for invalid type', () => {
      expect(isValidBusinessType('invalid')).toBe(false);
    });

    it('should return false for empty string', () => {
      expect(isValidBusinessType('')).toBe(false);
    });

    it('should return false for uppercase', () => {
      expect(isValidBusinessType('KIRANA')).toBe(false);
    });
  });
});

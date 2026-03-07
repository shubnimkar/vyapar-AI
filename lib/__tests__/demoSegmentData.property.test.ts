import fc from 'fast-check';
import { generateDemoSegmentData } from '../demoSegmentData';
import { CityTier, BusinessType } from '../types';

describe('Feature: segment-benchmark, Demo Data Property Tests', () => {
  describe('Property 18: Coverage Completeness', () => {
    it('should generate all 15 segment combinations', () => {
      const demoData = generateDemoSegmentData();
      
      const cityTiers: CityTier[] = ['tier1', 'tier2', 'tier3'];
      const businessTypes: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
      
      // Verify all combinations exist
      for (const tier of cityTiers) {
        for (const type of businessTypes) {
          const segmentKey = `SEGMENT#${tier}#${type}`;
          const exists = demoData.some(d => d.segmentKey === segmentKey);
          expect(exists).toBe(true);
        }
      }
      
      // Verify exactly 15 segments (no duplicates)
      expect(demoData.length).toBe(15);
    });
    
    it('should have unique segment keys', () => {
      const demoData = generateDemoSegmentData();
      const segmentKeys = demoData.map(d => d.segmentKey);
      const uniqueKeys = new Set(segmentKeys);
      
      expect(uniqueKeys.size).toBe(segmentKeys.length);
    });
  });
  
  describe('Property 19: Data Validity', () => {
    it('should have all medianHealthScore values in [40, 80]', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const demoData = generateDemoSegmentData();
          
          return demoData.every(segment => 
            segment.medianHealthScore >= 40 && 
            segment.medianHealthScore <= 80
          );
        }),
        { numRuns: 10 }
      );
    });
    
    it('should have all medianMargin values in [0.05, 0.30]', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const demoData = generateDemoSegmentData();
          
          return demoData.every(segment => 
            segment.medianMargin >= 0.05 && 
            segment.medianMargin <= 0.30
          );
        }),
        { numRuns: 10 }
      );
    });
    
    it('should have all sampleSize values in [50, 500]', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const demoData = generateDemoSegmentData();
          
          return demoData.every(segment => 
            segment.sampleSize >= 50 && 
            segment.sampleSize <= 500
          );
        }),
        { numRuns: 10 }
      );
    });
    
    it('should have all sampleSize values as integers', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const demoData = generateDemoSegmentData();
          
          return demoData.every(segment => 
            Number.isInteger(segment.sampleSize)
          );
        }),
        { numRuns: 10 }
      );
    });
    
    it('should have all medianMargin values as valid numbers', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const demoData = generateDemoSegmentData();
          
          return demoData.every(segment => 
            typeof segment.medianMargin === 'number' &&
            !isNaN(segment.medianMargin) &&
            isFinite(segment.medianMargin)
          );
        }),
        { numRuns: 10 }
      );
    });
    
    it('should have all lastUpdated as valid ISO timestamps', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const demoData = generateDemoSegmentData();
          
          return demoData.every(segment => {
            const date = new Date(segment.lastUpdated);
            return date.toString() !== 'Invalid Date';
          });
        }),
        { numRuns: 10 }
      );
    });
  });
  
  describe('Business logic validation', () => {
    it('should have tier1 health scores higher than tier2 and tier3', () => {
      const demoData = generateDemoSegmentData();
      
      const tier1Scores = demoData
        .filter(d => d.segmentKey.includes('#tier1#'))
        .map(d => d.medianHealthScore);
      
      const tier2Scores = demoData
        .filter(d => d.segmentKey.includes('#tier2#'))
        .map(d => d.medianHealthScore);
      
      const tier3Scores = demoData
        .filter(d => d.segmentKey.includes('#tier3#'))
        .map(d => d.medianHealthScore);
      
      const minTier1 = Math.min(...tier1Scores);
      const maxTier2 = Math.max(...tier2Scores);
      const maxTier3 = Math.max(...tier3Scores);
      
      // Tier1 minimum should be >= tier2 maximum (ranges don't overlap)
      expect(minTier1).toBeGreaterThanOrEqual(maxTier2);
      
      // Tier2 minimum should be >= tier3 maximum (ranges don't overlap)
      const minTier2 = Math.min(...tier2Scores);
      expect(minTier2).toBeGreaterThanOrEqual(maxTier3);
    });
    
    it('should have salon margins higher than restaurant margins', () => {
      const demoData = generateDemoSegmentData();
      
      const salonMargins = demoData
        .filter(d => d.segmentKey.endsWith('#salon'))
        .map(d => d.medianMargin);
      
      const restaurantMargins = demoData
        .filter(d => d.segmentKey.endsWith('#restaurant'))
        .map(d => d.medianMargin);
      
      const minSalon = Math.min(...salonMargins);
      const maxRestaurant = Math.max(...restaurantMargins);
      
      // Salon margins should be higher than restaurant margins
      expect(minSalon).toBeGreaterThan(maxRestaurant);
    });
    
    it('should have tier1 sample sizes larger than tier3', () => {
      const demoData = generateDemoSegmentData();
      
      const tier1Samples = demoData
        .filter(d => d.segmentKey.includes('#tier1#'))
        .map(d => d.sampleSize);
      
      const tier3Samples = demoData
        .filter(d => d.segmentKey.includes('#tier3#'))
        .map(d => d.sampleSize);
      
      const minTier1 = Math.min(...tier1Samples);
      const maxTier3 = Math.max(...tier3Samples);
      
      // Tier1 should have larger sample sizes
      expect(minTier1).toBeGreaterThan(maxTier3);
    });
  });
  
  describe('Determinism', () => {
    it('should generate identical data across multiple calls', () => {
      fc.assert(
        fc.property(fc.constant(null), () => {
          const data1 = generateDemoSegmentData();
          const data2 = generateDemoSegmentData();
          
          // Should have same length
          if (data1.length !== data2.length) return false;
          
          // Should have identical values for each segment
          for (let i = 0; i < data1.length; i++) {
            if (data1[i].segmentKey !== data2[i].segmentKey) return false;
            if (data1[i].medianHealthScore !== data2[i].medianHealthScore) return false;
            if (data1[i].medianMargin !== data2[i].medianMargin) return false;
            if (data1[i].sampleSize !== data2[i].sampleSize) return false;
          }
          
          return true;
        }),
        { numRuns: 20 }
      );
    });
  });
});

/**
 * Segment Key Formatter
 * 
 * Pure functions for formatting and parsing segment keys.
 * Follows the Hybrid Intelligence Principle: deterministic, no side effects.
 * 
 * Segment Key Format: SEGMENT#{city_tier}#{business_type}
 * Example: SEGMENT#tier1#kirana
 */

/**
 * Valid city tier values
 */
export type CityTier = 'tier1' | 'tier2' | 'tier3' | 'rural';

/**
 * Valid business type values
 */
export type BusinessType = 'kirana' | 'salon' | 'pharmacy' | 'restaurant' | 'other';

/**
 * Format segment key from city tier and business type
 * 
 * Pure function - deterministic output, no side effects
 * 
 * @param cityTier - City tier classification
 * @param businessType - Business category
 * @returns Formatted segment key
 * 
 * @example
 * formatSegmentKey('tier1', 'kirana') // Returns: 'SEGMENT#tier1#kirana'
 */
export function formatSegmentKey(
  cityTier: CityTier,
  businessType: BusinessType
): string {
  return `SEGMENT#${cityTier}#${businessType}`;
}

/**
 * Parse segment key into components
 * 
 * Pure function - deterministic output, no side effects
 * 
 * @param segmentKey - Formatted segment key
 * @returns Parsed components or null if invalid
 * 
 * @example
 * parseSegmentKey('SEGMENT#tier1#kirana') // Returns: { cityTier: 'tier1', businessType: 'kirana' }
 * parseSegmentKey('INVALID') // Returns: null
 */
export function parseSegmentKey(
  segmentKey: string
): { cityTier: CityTier; businessType: BusinessType } | null {
  const parts = segmentKey.split('#');
  
  if (parts.length !== 3 || parts[0] !== 'SEGMENT') {
    return null;
  }
  
  const cityTier = parts[1] as CityTier;
  const businessType = parts[2] as BusinessType;
  
  if (!isValidCityTier(cityTier) || !isValidBusinessType(businessType)) {
    return null;
  }
  
  return { cityTier, businessType };
}

/**
 * Validate city tier value
 * 
 * Pure function - deterministic output, no side effects
 * 
 * @param value - Value to validate
 * @returns True if value is a valid CityTier
 * 
 * @example
 * isValidCityTier('tier1') // Returns: true
 * isValidCityTier('tier4') // Returns: false
 */
export function isValidCityTier(value: string): value is CityTier {
  return ['tier1', 'tier2', 'tier3', 'rural'].includes(value);
}

/**
 * Validate business type value
 * 
 * Pure function - deterministic output, no side effects
 * 
 * @param value - Value to validate
 * @returns True if value is a valid BusinessType
 * 
 * @example
 * isValidBusinessType('kirana') // Returns: true
 * isValidBusinessType('invalid') // Returns: false
 */
export function isValidBusinessType(value: string): value is BusinessType {
  return ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'].includes(value);
}

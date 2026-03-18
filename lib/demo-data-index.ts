import { BusinessType, CityTier } from './types';

const VALID_BUSINESS_TYPES: BusinessType[] = ['kirana', 'salon', 'pharmacy', 'restaurant', 'other'];
const VALID_CITY_TIERS: CityTier[] = ['tier1', 'tier2', 'tier3', 'rural'];

function normalize(biz: string | undefined, tier: string | undefined): { biz: BusinessType; tier: CityTier } {
  const b = VALID_BUSINESS_TYPES.includes(biz as BusinessType) ? (biz as BusinessType) : 'kirana';
  const t = VALID_CITY_TIERS.includes(tier as CityTier) ? (tier as CityTier) : 'tier2';
  return { biz: b, tier: t };
}

export function getDemoDataPaths(
  businessType?: string,
  cityTier?: string
): { sales: string; expenses: string; inventory: string } {
  const { biz, tier } = normalize(businessType, cityTier);
  return {
    sales: `/demo-data/${biz}-${tier}-sales.csv`,
    expenses: `/demo-data/${biz}-${tier}-expenses.csv`,
    inventory: `/demo-data/${biz}-${tier}-inventory.csv`,
  };
}

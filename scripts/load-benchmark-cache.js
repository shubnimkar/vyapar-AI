/**
 * Load benchmark data into localStorage cache
 * 
 * Run this in the browser console to populate localStorage
 * with benchmark data for offline use
 */

const segments = [
  // Tier 1
  { tier: 'tier1', type: 'kirana', health: 70, margin: 0.200, sample: 340 },
  { tier: 'tier1', type: 'salon', health: 70, margin: 0.250, sample: 340 },
  { tier: 'tier1', type: 'pharmacy', health: 70, margin: 0.150, sample: 340 },
  { tier: 'tier1', type: 'restaurant', health: 70, margin: 0.100, sample: 340 },
  { tier: 'tier1', type: 'other', health: 70, margin: 0.175, sample: 340 },
  
  // Tier 2
  { tier: 'tier2', type: 'kirana', health: 60, margin: 0.200, sample: 220 },
  { tier: 'tier2', type: 'salon', health: 60, margin: 0.250, sample: 220 },
  { tier: 'tier2', type: 'pharmacy', health: 60, margin: 0.150, sample: 220 },
  { tier: 'tier2', type: 'restaurant', health: 60, margin: 0.100, sample: 220 },
  { tier: 'tier2', type: 'other', health: 60, margin: 0.175, sample: 220 },
  
  // Tier 3
  { tier: 'tier3', type: 'kirana', health: 50, margin: 0.200, sample: 110 },
  { tier: 'tier3', type: 'salon', health: 50, margin: 0.250, sample: 110 },
  { tier: 'tier3', type: 'pharmacy', health: 50, margin: 0.150, sample: 110 },
  { tier: 'tier3', type: 'restaurant', health: 50, margin: 0.100, sample: 110 },
  { tier: 'tier3', type: 'other', health: 50, margin: 0.175, sample: 110 },
];

const now = new Date().toISOString();

segments.forEach(seg => {
  const cacheKey = `vyapar_segment_${seg.tier}_${seg.type}`;
  const data = {
    segmentKey: `SEGMENT#${seg.tier}#${seg.type}`,
    medianHealthScore: seg.health,
    medianMargin: seg.margin,
    sampleSize: seg.sample,
    lastUpdated: now,
    cachedAt: now
  };
  
  localStorage.setItem(cacheKey, JSON.stringify(data));
  console.log(`✓ Cached ${seg.tier} ${seg.type}`);
});

console.log('\n✅ All 15 segments cached successfully!');
console.log('Refresh the page to see benchmark data.');

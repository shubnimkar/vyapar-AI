/**
 * Demo Data Loader for Vyapar AI
 * 
 * Loads comprehensive demo data into localStorage for demonstration.
 * This script populates all features with realistic data for a single demo user.
 * 
 * Usage:
 * 1. Run in browser console: Copy and paste this script
 * 2. Or import in a Next.js page and call loadDemoData()
 * 
 * Features populated:
 * - User Profile & Preferences
 * - 90 days of Daily Entries with suggestions
 * - Credit Tracking with overdue entries
 * - Stress & Affordability Indices
 * - Segment Benchmark Cache
 * - Pending Transactions
 * - Language & Persona Settings
 */

import { COMPLETE_DEMO_DATA, getDemoDataSummary } from './generate-demo-data';

// ============================================
// localStorage Keys (from application)
// ============================================

const STORAGE_KEYS = {
  // Core data
  DAILY_ENTRIES: 'vyapar-daily-entries',
  CREDIT_ENTRIES: 'vyapar-credit-entries',
  INDICES: 'vyapar_indices',
  SEGMENT_CACHE: 'vyapar-segment-cache',
  PENDING_TRANSACTIONS: 'vyapar-pending-transactions',
  
  // Sync status
  DAILY_SYNC_STATUS: 'vyapar-daily-sync-status',
  CREDIT_SYNC_STATUS: 'vyapar-credit-sync-status',
  
  // User preferences
  LANGUAGE: 'vyapar-language',
  BUSINESS_TYPE: 'vyapar-business-type',
  CITY_TIER: 'vyapar-city-tier',
  EXPLANATION_MODE: 'vyapar-explanation-mode',
  
  // Session (for demo purposes)
  USER_SESSION: 'vyapar-user-session',
};

// ============================================
// Load Daily Entries
// ============================================

function loadDailyEntries() {
  const entries = COMPLETE_DEMO_DATA.dailyEntries;
  
  try {
    localStorage.setItem(STORAGE_KEYS.DAILY_ENTRIES, JSON.stringify(entries));
    console.log(`✅ Loaded ${entries.length} daily entries`);
    
    // Set sync status
    localStorage.setItem(STORAGE_KEYS.DAILY_SYNC_STATUS, JSON.stringify({
      lastSyncTime: new Date().toISOString(),
      pendingCount: 0,
      errorCount: 0,
    }));
    
    return entries.length;
  } catch (error) {
    console.error('❌ Failed to load daily entries:', error);
    return 0;
  }
}

// ============================================
// Load Credit Entries
// ============================================

function loadCreditEntries() {
  const credits = COMPLETE_DEMO_DATA.creditEntries.map(credit => ({
    ...credit,
    syncStatus: 'synced' as const,
  }));
  
  try {
    localStorage.setItem(STORAGE_KEYS.CREDIT_ENTRIES, JSON.stringify(credits));
    console.log(`✅ Loaded ${credits.length} credit entries`);
    
    const overdueCount = credits.filter(c => 
      !c.isPaid && new Date(c.dueDate) < new Date()
    ).length;
    console.log(`   📌 ${overdueCount} overdue credits for Follow-up Panel`);
    
    // Set sync status
    localStorage.setItem(STORAGE_KEYS.CREDIT_SYNC_STATUS, JSON.stringify({
      lastSyncTime: new Date().toISOString(),
      pendingCount: 0,
      errorCount: 0,
    }));
    
    return credits.length;
  } catch (error) {
    console.error('❌ Failed to load credit entries:', error);
    return 0;
  }
}

// ============================================
// Load Indices
// ============================================

function loadIndices() {
  const indices = COMPLETE_DEMO_DATA.indices;
  
  try {
    localStorage.setItem(STORAGE_KEYS.INDICES, JSON.stringify(indices));
    console.log(`✅ Loaded ${indices.length} stress & affordability indices`);
    
    const latestIndex = indices[indices.length - 1];
    console.log(`   📊 Latest Stress Index: ${latestIndex.stressIndex.score}/100`);
    console.log(`   💰 Latest Affordability: ${latestIndex.affordabilityIndex.score}/100`);
    
    return indices.length;
  } catch (error) {
    console.error('❌ Failed to load indices:', error);
    return 0;
  }
}

// ============================================
// Load Segment Benchmark Cache
// ============================================

function loadSegmentCache() {
  const segmentData = COMPLETE_DEMO_DATA.segmentData;
  
  try {
    // Store as array with single segment
    const cache = [segmentData];
    localStorage.setItem(STORAGE_KEYS.SEGMENT_CACHE, JSON.stringify(cache));
    console.log(`✅ Loaded segment benchmark cache`);
    console.log(`   🎯 Segment: ${segmentData.segmentKey}`);
    console.log(`   📈 Median Health: ${segmentData.medianHealthScore}/100`);
    console.log(`   💹 Median Margin: ${(segmentData.medianMargin * 100).toFixed(1)}%`);
    console.log(`   👥 Sample Size: ${segmentData.sampleSize} businesses`);
    
    return 1;
  } catch (error) {
    console.error('❌ Failed to load segment cache:', error);
    return 0;
  }
}

// ============================================
// Load Pending Transactions
// ============================================

function loadPendingTransactions() {
  const transactions = COMPLETE_DEMO_DATA.pendingTransactions;
  
  try {
    localStorage.setItem(STORAGE_KEYS.PENDING_TRANSACTIONS, JSON.stringify(transactions));
    console.log(`✅ Loaded ${transactions.length} pending transactions`);
    
    transactions.forEach((txn, idx) => {
      console.log(`   ${idx + 1}. ${txn.type} - ₹${txn.amount} (${txn.source})`);
    });
    
    return transactions.length;
  } catch (error) {
    console.error('❌ Failed to load pending transactions:', error);
    return 0;
  }
}

// ============================================
// Load User Preferences
// ============================================

function loadUserPreferences() {
  const user = COMPLETE_DEMO_DATA.user;
  
  try {
    // Language
    localStorage.setItem(STORAGE_KEYS.LANGUAGE, user.language);
    
    // Business Type
    localStorage.setItem(STORAGE_KEYS.BUSINESS_TYPE, user.business_type);
    
    // City Tier
    if (user.city_tier) {
      localStorage.setItem(STORAGE_KEYS.CITY_TIER, user.city_tier);
    }
    
    // Explanation Mode
    localStorage.setItem(STORAGE_KEYS.EXPLANATION_MODE, user.explanation_mode);
    
    console.log(`✅ Loaded user preferences`);
    console.log(`   🗣️  Language: ${user.language}`);
    console.log(`   🏪 Business: ${user.business_type}`);
    console.log(`   🌆 City Tier: ${user.city_tier}`);
    console.log(`   📖 Explanation: ${user.explanation_mode}`);
    
    return 4;
  } catch (error) {
    console.error('❌ Failed to load user preferences:', error);
    return 0;
  }
}

// ============================================
// Load User Profile (for demo)
// ============================================

function loadUserProfile() {
  const user = COMPLETE_DEMO_DATA.user;
  
  try {
    // Create profile data matching UserProfile type
    const profile = {
      id: user.id,
      phoneNumber: user.phoneNumber,
      shopName: user.shopName,
      userName: user.userName,
      language: user.language,
      businessType: user.businessType,
      city: user.city,
      business_type: user.business_type,
      city_tier: user.city_tier,
      explanation_mode: user.explanation_mode,
      createdAt: user.createdAt,
      lastActiveAt: user.lastActiveAt,
      isActive: user.isActive,
      subscriptionTier: user.subscriptionTier,
      preferences: user.preferences,
    };
    
    // Save profile to localStorage as fallback
    localStorage.setItem('vyapar-user-profile', JSON.stringify(profile));
    console.log(`✅ Loaded user profile`);
    console.log(`   👤 Name: ${user.userName}`);
    console.log(`   🏪 Shop: ${user.shopName}`);
    console.log(`   🏢 Business: ${user.business_type}`);
    console.log(`   🌆 City Tier: ${user.city_tier}`);
    
    return 1;
  } catch (error) {
    console.error('❌ Failed to load user profile:', error);
    return 0;
  }
}

// ============================================
// Load User Session (for demo)
// ============================================

function loadUserSession() {
  const user = COMPLETE_DEMO_DATA.user;
  
  try {
    // Create authenticated session (30 days expiry for demo)
    const expiresAt = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    
    const session = {
      userId: user.id,
      username: user.userName,
      expiresAt,
      rememberDevice: true,
    };
    
    // Save to the correct session key used by SessionManager
    localStorage.setItem('vyapar-user-session', JSON.stringify(session));
    console.log(`✅ Loaded authenticated session`);
    console.log(`   👤 User: ${user.userName}`);
    console.log(`   🆔 User ID: ${user.id}`);
    console.log(`   ⏰ Expires: ${new Date(expiresAt * 1000).toLocaleDateString()}`);
    
    return 1;
  } catch (error) {
    console.error('❌ Failed to load user session:', error);
    return 0;
  }
}

// ============================================
// Clear All Demo Data
// ============================================

export function clearDemoData() {
  console.log('🧹 Clearing all demo data...');
  
  Object.values(STORAGE_KEYS).forEach(key => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`Failed to remove ${key}:`, error);
    }
  });
  
  console.log('✅ All demo data cleared');
}

// ============================================
// Main Load Function
// ============================================

export function loadDemoData() {
  console.log('='.repeat(60));
  console.log('🚀 VYAPAR AI - LOADING DEMO DATA');
  console.log('='.repeat(60));
  console.log();
  
  // Check if localStorage is available
  if (typeof window === 'undefined' || !window.localStorage) {
    console.error('❌ localStorage is not available');
    return false;
  }
  
  // Clear existing data first
  console.log('🧹 Clearing existing data...');
  clearDemoData();
  console.log();
  
  // Load all data
  console.log('📦 Loading demo data...');
  console.log();
  
  const counts = {
    dailyEntries: loadDailyEntries(),
    creditEntries: loadCreditEntries(),
    indices: loadIndices(),
    segmentCache: loadSegmentCache(),
    pendingTransactions: loadPendingTransactions(),
    preferences: loadUserPreferences(),
    profile: loadUserProfile(),
    session: loadUserSession(),
  };
  
  console.log();
  console.log('='.repeat(60));
  console.log('✅ DEMO DATA LOADED SUCCESSFULLY');
  console.log('='.repeat(60));
  console.log();
  
  // Print summary
  const summary = getDemoDataSummary();
  
  console.log('📊 Summary:');
  console.log(`   Daily Entries: ${counts.dailyEntries}`);
  console.log(`   Credit Entries: ${counts.creditEntries}`);
  console.log(`   Indices: ${counts.indices}`);
  console.log(`   Pending Transactions: ${counts.pendingTransactions}`);
  console.log();
  
  console.log('💰 Latest Metrics:');
  console.log(`   Sales: ₹${summary.latestMetrics.latestEntry.totalSales.toLocaleString('en-IN')}`);
  console.log(`   Expenses: ₹${summary.latestMetrics.latestEntry.totalExpense.toLocaleString('en-IN')}`);
  console.log(`   Profit: ₹${summary.latestMetrics.latestEntry.estimatedProfit.toLocaleString('en-IN')}`);
  console.log(`   Margin: ${(summary.latestMetrics.latestEntry.profitMargin * 100).toFixed(1)}%`);
  console.log(`   Outstanding Credit: ₹${summary.latestMetrics.totalOutstandingCredit.toLocaleString('en-IN')}`);
  console.log();
  
  console.log('🎯 Demo Features Ready:');
  console.log('   ✅ Daily Health Coach with suggestions');
  console.log('   ✅ Udhaar Follow-up Panel with overdue credits');
  console.log('   ✅ Stress & Affordability Indices');
  console.log('   ✅ Segment Benchmark comparison');
  console.log('   ✅ Click-to-Add pending transactions');
  console.log('   ✅ 90 days of historical data');
  console.log();
  
  console.log('🔄 Next Steps:');
  console.log('   1. Refresh the page to see demo data');
  console.log('   2. Navigate to dashboard to see all features');
  console.log('   3. Check Follow-up Panel for overdue credits');
  console.log('   4. View Indices Dashboard for stress/affordability');
  console.log('   5. Check Pending Transactions for click-to-add');
  console.log();
  
  return true;
}

// ============================================
// Verify Demo Data
// ============================================

export function verifyDemoData() {
  console.log('🔍 Verifying demo data...');
  console.log();
  
  const checks = {
    dailyEntries: !!localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES),
    creditEntries: !!localStorage.getItem(STORAGE_KEYS.CREDIT_ENTRIES),
    indices: !!localStorage.getItem(STORAGE_KEYS.INDICES),
    segmentCache: !!localStorage.getItem(STORAGE_KEYS.SEGMENT_CACHE),
    pendingTransactions: !!localStorage.getItem(STORAGE_KEYS.PENDING_TRANSACTIONS),
    language: !!localStorage.getItem(STORAGE_KEYS.LANGUAGE),
    businessType: !!localStorage.getItem(STORAGE_KEYS.BUSINESS_TYPE),
    session: !!localStorage.getItem(STORAGE_KEYS.USER_SESSION),
  };
  
  const allPresent = Object.values(checks).every(v => v);
  
  Object.entries(checks).forEach(([key, present]) => {
    console.log(`   ${present ? '✅' : '❌'} ${key}`);
  });
  
  console.log();
  
  if (allPresent) {
    console.log('✅ All demo data verified successfully');
    
    // Print data counts
    try {
      const dailyEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.DAILY_ENTRIES) || '[]');
      const creditEntries = JSON.parse(localStorage.getItem(STORAGE_KEYS.CREDIT_ENTRIES) || '[]');
      const indices = JSON.parse(localStorage.getItem(STORAGE_KEYS.INDICES) || '[]');
      const pendingTxns = JSON.parse(localStorage.getItem(STORAGE_KEYS.PENDING_TRANSACTIONS) || '[]');
      
      console.log();
      console.log('📊 Data Counts:');
      console.log(`   Daily Entries: ${dailyEntries.length}`);
      console.log(`   Credit Entries: ${creditEntries.length}`);
      console.log(`   Indices: ${indices.length}`);
      console.log(`   Pending Transactions: ${pendingTxns.length}`);
    } catch (error) {
      console.error('Failed to parse data:', error);
    }
  } else {
    console.log('❌ Some demo data is missing');
    console.log('💡 Run loadDemoData() to load all data');
  }
  
  return allPresent;
}

// ============================================
// Export for Browser Console
// ============================================

if (typeof window !== 'undefined') {
  (window as any).loadDemoData = loadDemoData;
  (window as any).clearDemoData = clearDemoData;
  (window as any).verifyDemoData = verifyDemoData;
  
  console.log('💡 Demo data functions available:');
  console.log('   - loadDemoData()    : Load all demo data');
  console.log('   - clearDemoData()   : Clear all demo data');
  console.log('   - verifyDemoData()  : Verify data is loaded');
}

// ============================================
// CLI Execution
// ============================================

if (require.main === module) {
  loadDemoData();
}

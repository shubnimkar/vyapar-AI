'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function DemoPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState<string>('');
  const [error, setError] = useState<string>('');

  const loadDemoData = async () => {
    setLoading(true);
    setError('');
    setStatus('Loading demo data...');

    try {
      // Import the loader functions
      const { loadDemoData: load } = await import('@/scripts/load-demo-data');
      const { getDemoDataSummary } = await import('@/scripts/generate-demo-data');
      
      // Load the data
      const success = load();
      
      if (success) {
        const summary = getDemoDataSummary();
        setStatus(`✅ Demo data loaded successfully!
        
📊 Summary:
• Daily Entries: ${summary.counts.dailyEntries}
• Credit Entries: ${summary.counts.creditEntries} (${summary.counts.overdueCredits} overdue)
• Pending Transactions: ${summary.counts.pendingTransactions}
• Reports: ${summary.counts.reports}

💰 Latest Metrics:
• Sales: ₹${summary.latestMetrics.latestEntry.totalSales.toLocaleString('en-IN')}
• Expenses: ₹${summary.latestMetrics.latestEntry.totalExpense.toLocaleString('en-IN')}
• Profit: ₹${summary.latestMetrics.latestEntry.estimatedProfit.toLocaleString('en-IN')}
• Outstanding Credit: ₹${summary.latestMetrics.totalOutstandingCredit.toLocaleString('en-IN')}

🎯 All features are now ready for demo!`);
      } else {
        setError('Failed to load demo data. Check console for details.');
      }
    } catch (err) {
      console.error('Demo data loading error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const clearDemoData = async () => {
    setLoading(true);
    setError('');
    setStatus('Clearing demo data...');

    try {
      const { clearDemoData: clear } = await import('@/scripts/load-demo-data');
      clear();
      setStatus('✅ Demo data cleared successfully!');
    } catch (err) {
      console.error('Demo data clearing error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const verifyDemoData = async () => {
    setLoading(true);
    setError('');
    setStatus('Verifying demo data...');

    try {
      const { verifyDemoData: verify } = await import('@/scripts/load-demo-data');
      const allPresent = verify();
      
      if (allPresent) {
        setStatus('✅ All demo data verified successfully!');
      } else {
        setStatus('⚠️ Some demo data is missing. Run "Load Demo Data" to fix.');
      }
    } catch (err) {
      console.error('Demo data verification error:', err);
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-lg shadow-xl p-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Vyapar AI - Demo Data Loader
          </h1>
          <p className="text-gray-600 mb-8">
            Load comprehensive demo data for all features to prepare for your presentation.
          </p>

          <div className="space-y-4 mb-8">
            <button
              onClick={loadDemoData}
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Loading...
                </>
              ) : (
                '🚀 Load Demo Data'
              )}
            </button>

            <button
              onClick={verifyDemoData}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              🔍 Verify Demo Data
            </button>

            <button
              onClick={clearDemoData}
              disabled={loading}
              className="w-full bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              🧹 Clear Demo Data
            </button>

            <button
              onClick={() => router.push('/')}
              className="w-full bg-gray-600 hover:bg-gray-700 text-white font-semibold py-4 px-6 rounded-lg transition-colors"
            >
              ← Back to Dashboard
            </button>
          </div>

          {status && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-4">
              <pre className="text-sm text-gray-800 whitespace-pre-wrap font-mono">
                {status}
              </pre>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <p className="text-red-800 font-semibold">Error:</p>
              <p className="text-red-700 mt-2">{error}</p>
            </div>
          )}

          <div className="mt-8 bg-gray-50 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              📋 What Gets Loaded:
            </h2>
            <ul className="space-y-2 text-gray-700">
              <li>✅ Demo user profile (Rajesh Sharma, Sharma Kirana Store)</li>
              <li>✅ 90 days of daily entries with realistic variance</li>
              <li>✅ 6 credit entries (3 overdue for Follow-up Panel)</li>
              <li>✅ 30 days of Stress & Affordability Indices</li>
              <li>✅ Segment benchmark data (Tier 1 Kirana, 1247 businesses)</li>
              <li>✅ 3 pending transactions (receipt, CSV, voice)</li>
              <li>✅ 4 weekly reports with insights</li>
              <li>✅ 7-day cash flow predictions</li>
              <li>✅ 2 expense alerts</li>
              <li>✅ User preferences (language, business type, etc.)</li>
            </ul>
          </div>

          <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              🎯 Demo Walkthrough:
            </h2>
            <ol className="space-y-2 text-gray-700 list-decimal list-inside">
              <li>Load demo data using the button above</li>
              <li>Refresh the page to see all data populated</li>
              <li>Navigate to Dashboard to see health score and suggestions</li>
              <li>Check Follow-up Panel for 3 overdue credits</li>
              <li>View Indices Dashboard for stress/affordability metrics</li>
              <li>Check Pending Transactions for click-to-add feature</li>
              <li>View Segment Benchmark comparison</li>
              <li>Check Reports page for weekly insights</li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

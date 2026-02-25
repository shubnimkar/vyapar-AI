'use client';

import { useState, useEffect } from 'react';
import LanguageSelector from '@/components/LanguageSelector';
import FileUpload from '@/components/FileUpload';
import InsightsDisplay from '@/components/InsightsDisplay';
import QAChat from '@/components/QAChat';
import Charts from '@/components/Charts';
import Recommendations from '@/components/Recommendations';
import Alerts from '@/components/Alerts';
import Benchmark from '@/components/Benchmark';
import ShareWhatsApp from '@/components/ShareWhatsApp';
import ExportPDF from '@/components/ExportPDF';
import { Language, BusinessInsights, FileType, BenchmarkData } from '@/lib/types';
import { t } from '@/lib/translations';

export default function Home() {
  const [language, setLanguage] = useState<Language>('en');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Set<FileType>>(new Set());
  const [insights, setInsights] = useState<BusinessInsights | null>(null);
  const [benchmark, setBenchmark] = useState<BenchmarkData | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load language preference from localStorage on mount
  useEffect(() => {
    const savedLang = localStorage.getItem('vyapar-lang') as Language;
    if (savedLang && ['en', 'hi', 'mr'].includes(savedLang)) {
      setLanguage(savedLang);
    }
  }, []);

  const handleLanguageChange = (lang: Language) => {
    setLanguage(lang);
  };

  const handleUploadComplete = (newSessionId: string, fileType: FileType) => {
    setSessionId(newSessionId);
    setUploadedFiles((prev) => new Set(prev).add(fileType));
    setError(null);
  };

  const handleAnalyze = async () => {
    if (!sessionId) {
      setError(t('uploadDataFirst', language));
      return;
    }

    setAnalyzing(true);
    setError(null);

    try {
      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          language,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setInsights(data.insights);
        setBenchmark(data.benchmark || null);
      } else {
        setError(data.error || t('analysisFailed', language));
      }
    } catch (err) {
      setError(t('analysisFailed', language));
    } finally {
      setAnalyzing(false);
    }
  };

  const handleLoadSampleData = async () => {
    const { sampleSalesData, sampleExpensesData, sampleInventoryData, createSampleFile } =
      await import('@/lib/sample-data');

    // Create sample files
    const salesFile = createSampleFile(sampleSalesData, 'sample-sales.csv');
    const expensesFile = createSampleFile(sampleExpensesData, 'sample-expenses.csv');
    const inventoryFile = createSampleFile(sampleInventoryData, 'sample-inventory.csv');

    // Upload each file
    const files = [
      { file: salesFile, type: 'sales' as FileType },
      { file: expensesFile, type: 'expenses' as FileType },
      { file: inventoryFile, type: 'inventory' as FileType },
    ];

    for (const { file, type } of files) {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('fileType', type);
      if (sessionId) {
        formData.append('sessionId', sessionId);
      }

      try {
        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        if (data.success) {
          handleUploadComplete(data.sessionId, type);
        }
      } catch (err) {
        console.error('Sample data upload failed:', err);
      }
    }
  };

  const hasUploadedData = uploadedFiles.size > 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                {t('appTitle', language)}
              </h1>
              <p className="text-sm text-gray-600 mt-1">
                {t('appSubtitle', language)}
              </p>
            </div>
            <LanguageSelector
              currentLanguage={language}
              onLanguageChange={handleLanguageChange}
            />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {/* Upload Section */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-800">
              {t('uploadCSV', language)}
            </h2>
            <button
              onClick={handleLoadSampleData}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg text-sm font-medium hover:bg-purple-600 transition-colors"
            >
              {language === 'hi'
                ? '🎯 नमूना डेटा आज़माएं'
                : language === 'mr'
                ? '🎯 नमुना डेटा वापरा'
                : '🎯 Try Sample Data'}
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FileUpload
              fileType="sales"
              sessionId={sessionId}
              language={language}
              onUploadComplete={handleUploadComplete}
            />
            <FileUpload
              fileType="expenses"
              sessionId={sessionId}
              language={language}
              onUploadComplete={handleUploadComplete}
            />
            <FileUpload
              fileType="inventory"
              sessionId={sessionId}
              language={language}
              onUploadComplete={handleUploadComplete}
            />
          </div>
        </section>

        {/* Analyze Button */}
        {hasUploadedData && (
          <section className="mb-8">
            <button
              onClick={handleAnalyze}
              disabled={analyzing}
              className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:from-blue-600 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl min-h-[56px]"
            >
              {analyzing ? t('analyzing', language) : t('analyzeButton', language)}
            </button>
          </section>
        )}

        {/* Error Display */}
        {error && (
          <div className="mb-8 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        {/* Insights Section */}
        {insights && (
          <section className="space-y-6">
            {/* Share and Export Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <ShareWhatsApp insights={insights} language={language} />
              <ExportPDF insights={insights} language={language} />
            </div>

            {/* Alerts */}
            {insights.alerts && insights.alerts.length > 0 && (
              <Alerts alerts={insights.alerts} language={language} />
            )}

            {/* Recommendations */}
            {insights.recommendations && insights.recommendations.length > 0 && (
              <Recommendations
                recommendations={insights.recommendations}
                language={language}
              />
            )}

            {/* Charts */}
            {insights.chartData && (
              <Charts chartData={insights.chartData} language={language} />
            )}

            {/* Benchmark */}
            {benchmark && <Benchmark benchmark={benchmark} language={language} />}

            {/* Original Insights */}
            <InsightsDisplay insights={insights} language={language} />
          </section>
        )}

        {/* Q&A Section */}
        {hasUploadedData && sessionId && (
          <section>
            <QAChat sessionId={sessionId} language={language} />
          </section>
        )}

        {/* Welcome Message */}
        {!hasUploadedData && (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📊</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">
              {language === 'hi'
                ? 'स्वागत है!'
                : language === 'mr'
                ? 'स्वागत आहे!'
                : 'Welcome!'}
            </h2>
            <p className="text-gray-600 max-w-md mx-auto">
              {language === 'hi'
                ? 'अपने व्यापार का विश्लेषण शुरू करने के लिए ऊपर CSV फ़ाइलें अपलोड करें'
                : language === 'mr'
                ? 'तुमच्या व्यवसायाचे विश्लेषण सुरू करण्यासाठी वर CSV फाइल्स अपलोड करा'
                : 'Upload your CSV files above to start analyzing your business health'}
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-12">
        <div className="max-w-7xl mx-auto px-4 py-6 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500">
            {language === 'hi'
              ? 'आपका डेटा सुरक्षित है - कोई भी जानकारी संग्रहीत नहीं की जाती है'
              : language === 'mr'
              ? 'तुमचा डेटा सुरक्षित आहे - कोणतीही माहिती संग्रहित केली जात नाही'
              : 'Your data is secure - no information is stored permanently'}
          </p>
        </div>
      </footer>
    </div>
  );
}

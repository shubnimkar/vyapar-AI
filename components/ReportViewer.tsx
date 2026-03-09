'use client';

import { useState, useEffect } from 'react';
import { DailyReport } from '@/lib/types';
import { logger } from '@/lib/logger';

interface ReportViewerProps {
  userId: string;
  language: 'en' | 'hi';
}

export default function ReportViewer({ userId, language }: ReportViewerProps) {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [isAutomationEnabled, setIsAutomationEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const translations = {
    en: {
      title: 'Daily Reports',
      automation: 'Automated Reports',
      enabled: 'Enabled',
      disabled: 'Disabled',
      noReports: 'No reports yet',
      viewReport: 'View Details',
      back: 'Back to List',
      sales: 'Sales',
      expenses: 'Expenses',
      profit: 'Net Profit',
      loss: 'Net Loss',
      insights: 'Insights',
      topCategories: 'Top Expense Categories',
      generatedAt: 'Generated at',
      generateNow: 'Generate Report Now',
      generating: 'Generating...',
    },
    hi: {
      title: 'दैनिक रिपोर्ट',
      automation: 'स्वचालित रिपोर्ट',
      enabled: 'सक्षम',
      disabled: 'अक्षम',
      noReports: 'अभी तक कोई रिपोर्ट नहीं',
      viewReport: 'विवरण देखें',
      back: 'सूची पर वापस जाएं',
      sales: 'बिक्री',
      expenses: 'खर्च',
      profit: 'शुद्ध लाभ',
      loss: 'शुद्ध हानि',
      insights: 'अंतर्दृष्टि',
      topCategories: 'शीर्ष व्यय श्रेणियां',
      generatedAt: 'उत्पन्न',
      generateNow: 'अभी रिपोर्ट बनाएं',
      generating: 'बना रहे हैं...',
    },
  };

  const t = translations[language];

  useEffect(() => {
    fetchReports();
  }, [userId]);

  const fetchReports = async () => {
    try {
      const response = await fetch(`/api/reports?userId=${userId}`);
      const result = await response.json();

      if (result.success) {
        setReports(result.data || []);
      }
    } catch (error) {
      logger.error('Failed to fetch reports', { error });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleAutomation = async () => {
    setIsUpdating(true);
    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          automationEnabled: !isAutomationEnabled,
        }),
      });

      const result = await response.json();

      if (result.success) {
        setIsAutomationEnabled(result.data.automationEnabled);
      }
    } catch (error) {
      logger.error('Failed to toggle automation', { error });
    } finally {
      setIsUpdating(false);
    }
  };

  const generateReportNow = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh reports list
        await fetchReports();
      } else {
        logger.error('Failed to generate report', { error: result.message });
      }
    } catch (error) {
      logger.error('Failed to generate report', { error });
    } finally {
      setIsGenerating(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateStr: string) => {
    return new Date(dateStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-gray-200 rounded w-1/3"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (selectedReport) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
        <button
          onClick={() => setSelectedReport(null)}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          ← {t.back}
        </button>

        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-2">
            {formatDate(selectedReport.date)}
          </h3>
          <p className="text-sm text-gray-600">
            {t.generatedAt}: {formatTime(selectedReport.generatedAt)}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="text-sm text-green-700 mb-1">{t.sales}</div>
            <div className="text-xl font-bold text-green-800">
              {formatCurrency(selectedReport.totalSales)}
            </div>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-sm text-red-700 mb-1">{t.expenses}</div>
            <div className="text-xl font-bold text-red-800">
              {formatCurrency(selectedReport.totalExpenses)}
            </div>
          </div>
          <div
            className={`border rounded-lg p-4 ${
              selectedReport.netProfit >= 0
                ? 'bg-blue-50 border-blue-200'
                : 'bg-orange-50 border-orange-200'
            }`}
          >
            <div
              className={`text-sm mb-1 ${
                selectedReport.netProfit >= 0 ? 'text-blue-700' : 'text-orange-700'
              }`}
            >
              {selectedReport.netProfit >= 0 ? t.profit : t.loss}
            </div>
            <div
              className={`text-xl font-bold ${
                selectedReport.netProfit >= 0 ? 'text-blue-800' : 'text-orange-800'
              }`}
            >
              {formatCurrency(Math.abs(selectedReport.netProfit))}
            </div>
          </div>
        </div>

        {selectedReport.topExpenseCategories && selectedReport.topExpenseCategories.length > 0 && (
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">{t.topCategories}</h4>
            <div className="space-y-2">
              {selectedReport.topExpenseCategories.map((cat, index) => (
                <div key={index} className="flex justify-between items-center bg-gray-50 p-3 rounded">
                  <span className="text-gray-700">{cat.category}</span>
                  <span className="font-semibold text-gray-800">
                    {formatCurrency(cat.amount)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div>
          <h4 className="font-semibold text-gray-800 mb-2">{t.insights}</h4>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-gray-700 leading-relaxed">
            {selectedReport.insights}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-800">{t.title}</h3>
        <div className="flex items-center space-x-3">
          <span className="text-sm text-gray-600">{t.automation}</span>
          <button
            onClick={toggleAutomation}
            disabled={isUpdating}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              isAutomationEnabled ? 'bg-blue-600' : 'bg-gray-300'
            } ${isUpdating ? 'opacity-50' : ''}`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                isAutomationEnabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm font-medium text-gray-700">
            {isAutomationEnabled ? t.enabled : t.disabled}
          </span>
        </div>
      </div>

      {/* Generate Report Now Button */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={generateReportNow}
          disabled={isGenerating}
          className={`w-full px-4 py-2 rounded-lg font-medium transition-colors ${
            isGenerating
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isGenerating ? t.generating : t.generateNow}
        </button>
      </div>

      {reports.length === 0 ? (
        <div className="text-center py-8 text-gray-500">{t.noReports}</div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors cursor-pointer"
              onClick={() => setSelectedReport(report)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800">
                    {formatDate(report.date)}
                  </div>
                  <div className="text-sm text-gray-600 mt-1">
                    {t.sales}: {formatCurrency(report.totalSales)} | {t.expenses}:{' '}
                    {formatCurrency(report.totalExpenses)}
                  </div>
                </div>
                <div className="text-right">
                  <div
                    className={`text-lg font-bold ${
                      report.netProfit >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {formatCurrency(report.netProfit)}
                  </div>
                  <button className="text-sm text-blue-600 hover:text-blue-700 mt-1">
                    {t.viewReport} →
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

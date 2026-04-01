'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarClock, ChevronDown, ChevronLeft, FileText, RefreshCw, TrendingDown, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { getLocalEntries } from '@/lib/daily-entry-sync';
import { DailyReport, Language, ReportsListResponse } from '@/lib/types';
import { logger } from '@/lib/logger';
import {
  cacheReportPreferences,
  cacheReports,
  getReportsLocalFirst,
  pullReportsFromCloud,
} from '@/lib/report-sync';

interface ReportViewerProps {
  userId: string;
  language: Language;
}

type ReportType = 'all' | 'daily' | 'weekly' | 'monthly';

const translations: Record<Language, Record<string, string>> = {
  en: {
    title: 'Reports',
    subtitle: 'Generate period summaries, track performance trends, and review action-ready insights.',
    automation: 'Automated reports',
    automationHint: 'Store your preferred report time for scheduled delivery.',
    automationNote: 'Report is generated only if you have daily entries for that day. If a report already exists for today, it won\'t be regenerated.',
    enabled: 'Enabled',
    disabled: 'Disabled',
    reportTime: 'Preferred report time',
    savePrefs: 'Save preferences',
    saving: 'Saving...',
    generateTitle: 'Generate report',
    generateHint: 'Create a new report from your synced or local daily entries.',
    generateNow: 'Generate now',
    generating: 'Generating...',
    refresh: 'Refresh',
    allReports: 'All reports',
    daily: 'Daily',
    weekly: 'Weekly',
    monthly: 'Monthly',
    noReports: 'No reports yet',
    noReportsHint: 'Generate your first report to start building a performance history.',
    noMatches: 'No reports match this filter yet.',
    viewReport: 'View details',
    back: 'Back to reports',
    period: 'Period',
    generatedAt: 'Generated at',
    sales: 'Sales',
    expenses: 'Expenses',
    profit: 'Net profit',
    loss: 'Net loss',
    avgSales: 'Avg daily sales',
    avgExpenses: 'Avg daily expenses',
    avgProfit: 'Avg daily profit',
    margin: 'Profit margin',
    expenseRatio: 'Expense ratio',
    entries: 'Entries used',
    closingCash: 'Closing cash',
    summary: 'Summary',
    wins: 'What went well',
    risks: 'Needs attention',
    nextSteps: 'Next steps',
    comparison: 'Compared with previous period',
    bestDay: 'Best day',
    worstDay: 'Weakest day',
    latestReports: 'Recent reports',
    insights: 'AI summary',
    overviewSales: 'Sales tracked',
    overviewProfit: 'Net result',
    overviewReports: 'Reports available',
    overviewLatest: 'Latest period',
    reportType: 'Report type',
    lastUpdated: 'Last updated',
    unavailableCash: 'Not available',
    missingData: 'Some deeper breakdowns are unavailable because daily entries currently store summary totals, not category-level expense lines.',
    generatedSuccess: 'Report generated successfully.',
    preferencesSaved: 'Report preferences saved.',
    loadFailed: 'Failed to load reports.',
    generateFailed: 'Failed to generate report.',
    saveFailed: 'Failed to save report preferences.',
    refreshFailed: 'Failed to refresh reports.',
  },
  hi: {
    title: 'रिपोर्ट',
    subtitle: 'अवधि-आधारित सारांश बनाएं, प्रदर्शन रुझान देखें और तुरंत उपयोगी सुझाव पाएं।',
    automation: 'स्वचालित रिपोर्ट',
    automationHint: 'निर्धारित रिपोर्ट डिलीवरी के लिए अपना पसंदीदा समय सहेजें।',
    automationNote: 'रिपोर्ट केवल तभी बनती है जब उस दिन की दैनिक प्रविष्टियां हों। यदि आज की रिपोर्ट पहले से मौजूद है, तो दोबारा नहीं बनेगी।',
    enabled: 'सक्षम',
    disabled: 'अक्षम',
    reportTime: 'पसंदीदा रिपोर्ट समय',
    savePrefs: 'प्राथमिकताएं सहेजें',
    saving: 'सहेज रहे हैं...',
    generateTitle: 'रिपोर्ट बनाएं',
    generateHint: 'सिंक या स्थानीय दैनिक प्रविष्टियों से नई रिपोर्ट तैयार करें।',
    generateNow: 'अभी बनाएं',
    generating: 'बना रहे हैं...',
    refresh: 'रीफ्रेश',
    allReports: 'सभी रिपोर्ट',
    daily: 'दैनिक',
    weekly: 'साप्ताहिक',
    monthly: 'मासिक',
    noReports: 'अभी तक कोई रिपोर्ट नहीं',
    noReportsHint: 'अपना प्रदर्शन इतिहास शुरू करने के लिए पहली रिपोर्ट बनाएं।',
    noMatches: 'इस फ़िल्टर के लिए अभी कोई रिपोर्ट नहीं है।',
    viewReport: 'विवरण देखें',
    back: 'रिपोर्ट सूची पर वापस',
    period: 'अवधि',
    generatedAt: 'बनाया गया',
    sales: 'बिक्री',
    expenses: 'खर्च',
    profit: 'शुद्ध लाभ',
    loss: 'शुद्ध हानि',
    avgSales: 'औसत दैनिक बिक्री',
    avgExpenses: 'औसत दैनिक खर्च',
    avgProfit: 'औसत दैनिक परिणाम',
    margin: 'लाभ मार्जिन',
    expenseRatio: 'खर्च अनुपात',
    entries: 'उपयोग की गई प्रविष्टियां',
    closingCash: 'समापन नकद',
    summary: 'सारांश',
    wins: 'क्या अच्छा रहा',
    risks: 'ध्यान देने योग्य बातें',
    nextSteps: 'अगले कदम',
    comparison: 'पिछली अवधि की तुलना में',
    bestDay: 'सबसे अच्छा दिन',
    worstDay: 'सबसे कमजोर दिन',
    latestReports: 'हाल की रिपोर्ट',
    insights: 'एआई सारांश',
    overviewSales: 'ट्रैक की गई बिक्री',
    overviewProfit: 'शुद्ध परिणाम',
    overviewReports: 'उपलब्ध रिपोर्ट',
    overviewLatest: 'नवीनतम अवधि',
    reportType: 'रिपोर्ट प्रकार',
    lastUpdated: 'आखिरी अपडेट',
    unavailableCash: 'उपलब्ध नहीं',
    missingData: 'कुछ गहरे ब्रेकडाउन उपलब्ध नहीं हैं क्योंकि दैनिक प्रविष्टियों में अभी श्रेणी-स्तर खर्च विवरण नहीं, केवल सारांश कुल हैं।',
    generatedSuccess: 'रिपोर्ट सफलतापूर्वक बनाई गई।',
    preferencesSaved: 'रिपोर्ट प्राथमिकताएं सहेजी गईं।',
    loadFailed: 'रिपोर्ट लोड नहीं हुईं।',
    generateFailed: 'रिपोर्ट बनाना विफल रहा।',
    saveFailed: 'रिपोर्ट प्राथमिकताएं सहेजना विफल रहा।',
    refreshFailed: 'रिपोर्ट रीफ्रेश नहीं हुईं।',
  },
  mr: {
    title: 'अहवाल',
    subtitle: 'कालावधी-आधारित सारांश तयार करा, कामगिरीचे ट्रेंड पाहा आणि लगेच वापरता येतील अशी निरीक्षणे मिळवा.',
    automation: 'स्वयंचलित अहवाल',
    automationHint: 'नियोजित अहवालासाठी तुमची आवडती वेळ जतन करा.',
    automationNote: 'अहवाल फक्त तेव्हाच तयार होतो जेव्हा त्या दिवसाच्या दैनिक नोंदी असतात. आजचा अहवाल आधीच तयार असल्यास, पुन्हा तयार होणार नाही.',
    enabled: 'सक्रिय',
    disabled: 'निष्क्रिय',
    reportTime: 'अहवालाची पसंतीची वेळ',
    savePrefs: 'प्राधान्ये जतन करा',
    saving: 'जतन करत आहे...',
    generateTitle: 'अहवाल तयार करा',
    generateHint: 'सिंक किंवा स्थानिक दैनिक नोंदींवरून नवीन अहवाल तयार करा.',
    generateNow: 'आता तयार करा',
    generating: 'तयार करत आहे...',
    refresh: 'रिफ्रेश',
    allReports: 'सर्व अहवाल',
    daily: 'दैनिक',
    weekly: 'साप्ताहिक',
    monthly: 'मासिक',
    noReports: 'अजून कोणताही अहवाल नाही',
    noReportsHint: 'कामगिरीचा इतिहास तयार करण्यासाठी पहिला अहवाल तयार करा.',
    noMatches: 'या फिल्टरसाठी अजून अहवाल उपलब्ध नाहीत.',
    viewReport: 'तपशील पाहा',
    back: 'अहवाल यादीकडे परत',
    period: 'कालावधी',
    generatedAt: 'तयार केलेली वेळ',
    sales: 'विक्री',
    expenses: 'खर्च',
    profit: 'निव्वळ नफा',
    loss: 'निव्वळ तोटा',
    avgSales: 'दररोज सरासरी विक्री',
    avgExpenses: 'दररोज सरासरी खर्च',
    avgProfit: 'दररोज सरासरी निकाल',
    margin: 'नफा मार्जिन',
    expenseRatio: 'खर्च प्रमाण',
    entries: 'वापरलेल्या नोंदी',
    closingCash: 'समाप्ती रोख',
    summary: 'सारांश',
    wins: 'काय चांगले झाले',
    risks: 'लक्ष देण्यासारखे',
    nextSteps: 'पुढील पावले',
    comparison: 'मागील कालावधीच्या तुलनेत',
    bestDay: 'सर्वोत्तम दिवस',
    worstDay: 'कमकुवत दिवस',
    latestReports: 'अलिकडील अहवाल',
    insights: 'एआय सारांश',
    overviewSales: 'नोंदवलेली विक्री',
    overviewProfit: 'निव्वळ निकाल',
    overviewReports: 'उपलब्ध अहवाल',
    overviewLatest: 'नवीनतम कालावधी',
    reportType: 'अहवाल प्रकार',
    lastUpdated: 'शेवटचे अद्यतन',
    unavailableCash: 'उपलब्ध नाही',
    missingData: 'काही सखोल तपशील उपलब्ध नाहीत कारण दैनिक नोंदींमध्ये सध्या श्रेणी-निहाय खर्चाऐवजी फक्त सारांश एकूण रक्कम साठवली जाते.',
    generatedSuccess: 'अहवाल यशस्वीपणे तयार झाला.',
    preferencesSaved: 'अहवाल प्राधान्ये जतन झाली.',
    loadFailed: 'अहवाल लोड करण्यात अपयश आले.',
    generateFailed: 'अहवाल तयार करण्यात अपयश आले.',
    saveFailed: 'अहवाल प्राधान्ये जतन करण्यात अपयश आले.',
    refreshFailed: 'अहवाल रिफ्रेश करण्यात अपयश आले.',
  },
};

const localeByLanguage: Record<Language, string> = {
  en: 'en-IN',
  hi: 'hi-IN',
  mr: 'mr-IN',
};

export default function ReportViewer({ userId, language }: ReportViewerProps) {
  const t = translations[language];
  const locale = localeByLanguage[language];
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [automationEnabled, setAutomationEnabled] = useState(false);
  const [reportTime, setReportTime] = useState('20:00');
  const [selectedGenerateType, setSelectedGenerateType] = useState<Exclude<ReportType, 'all'>>('daily');
  const [activeFilter, setActiveFilter] = useState<ReportType>('all');
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSavingPrefs, setIsSavingPrefs] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const reportTypes: ReportType[] = ['all', 'daily', 'weekly', 'monthly'];

  const fetchReports = async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'load') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      let result: ReportsListResponse;

      if (mode === 'refresh') {
        // Bypass cache — always pull fresh from the server
        const pulled = await pullReportsFromCloud(userId, language);
        result = pulled || { success: false, error: t.refreshFailed, data: [], automationEnabled: false, reportTime: '20:00' };
      } else {
        result = await getReportsLocalFirst(userId, language);
      }

      if (!result.success) {
        throw new Error(result.error || t.loadFailed);
      }

      setReports(result.data || []);
      setAutomationEnabled(Boolean(result.automationEnabled));
      setReportTime(result.reportTime || '20:00');
    } catch (fetchError) {
      logger.error('Failed to fetch reports', { fetchError, userId });
      setError(mode === 'load' ? t.loadFailed : t.refreshFailed);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void fetchReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, language]);

  useEffect(() => {
    if (!selectedReport) {
      return;
    }

    const localizedSelectedReport = reports.find((report) => report.id === selectedReport.id);
    if (localizedSelectedReport) {
      setSelectedReport(localizedSelectedReport);
    }
  }, [reports, selectedReport]);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [selectedReport]);

  const savePreferences = async () => {
    setIsSavingPrefs(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          automationEnabled,
          reportTime,
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t.saveFailed);
      }

      setAutomationEnabled(Boolean(result.data?.automationEnabled));
      setReportTime(result.data?.reportTime || reportTime);
      cacheReportPreferences({
        userId,
        automationEnabled: Boolean(result.data?.automationEnabled),
        reportTime: result.data?.reportTime || reportTime,
        language,
        updatedAt: new Date().toISOString(),
      });
      setNotice(t.preferencesSaved);
    } catch (saveError) {
      logger.error('Failed to save report preferences', { saveError, userId });
      setError(t.saveFailed);
    } finally {
      setIsSavingPrefs(false);
    }
  };

  const generateReport = async () => {
    setIsGenerating(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/reports/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          language,
          reportType: selectedGenerateType,
          dailyEntries: getLocalEntries(userId),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t.generateFailed);
      }

      await fetchReports('refresh');
      setNotice(t.generatedSuccess);
    } catch (generateError) {
      logger.error('Failed to generate report', { generateError, userId, reportType: selectedGenerateType });
      setError(t.generateFailed);
    } finally {
      setIsGenerating(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter((report) => activeFilter === 'all' || report.reportType === activeFilter);
  }, [activeFilter, reports]);

  const overview = useMemo(() => {
    const source = filteredReports.length > 0 ? filteredReports : reports;
    const latest = source[0];
    return {
      totalSales: source.reduce((sum, report) => sum + report.totalSales, 0),
      totalProfit: source.reduce((sum, report) => sum + report.netProfit, 0),
      totalReports: source.length,
      latestLabel: latest ? formatPeriod(latest) : '—',
    };
  }, [filteredReports, reports]);

  function formatCurrency(amount: number | null | undefined) {
    if (typeof amount !== 'number') {
      return t.unavailableCash;
    }

    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(amount);
  }

  // tabular-nums helper — kept for alignment consistency
  const numClass = '';

  function formatDate(date: string) {
    return new Date(date).toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }

  function formatDateTime(date: string) {
    return new Date(date).toLocaleString(locale, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  function formatPercent(value: number | undefined) {
    if (typeof value !== 'number') {
      return '—';
    }
    return `${(value * 100).toFixed(1)}%`;
  }

  function formatPeriod(report: DailyReport) {
    if (report.periodStart && report.periodEnd && report.periodStart !== report.periodEnd) {
      return `${formatDate(report.periodStart)} - ${formatDate(report.periodEnd)}`;
    }
    return formatDate(report.periodEnd || report.date);
  }

  if (isLoading) {
    return (
      <div className="bg-[#F9FAFB] rounded-3xl p-1">
        <Card className="rounded-3xl shadow-sm border-neutral-100">
          <div className="animate-pulse space-y-4">
            <div className="h-8 w-48 rounded bg-neutral-200" />
            <div className="grid gap-4 md:grid-cols-3">
              <div className="h-28 rounded-2xl bg-neutral-100" />
              <div className="h-28 rounded-2xl bg-neutral-100" />
              <div className="h-28 rounded-2xl bg-neutral-100" />
            </div>
            <div className="h-64 rounded-2xl bg-neutral-100" />
          </div>
        </Card>
      </div>
    );
  }

  if (selectedReport) {
    return (
      <div className="bg-[#F9FAFB] rounded-3xl p-1">
      <Card className="space-y-5 rounded-3xl bg-white shadow-sm border-neutral-100">
        {/* Back + header */}
        <div className="flex items-start justify-between gap-4">
          <Button type="button" variant="ghost" size="sm" onClick={() => setSelectedReport(null)} icon={<ChevronLeft className="h-4 w-4" />} className="px-0 text-primary-700 hover:bg-transparent">
            {t.back}
          </Button>
          <div className="text-right">
            <div className="inline-flex items-center rounded-full bg-primary-50 px-2.5 py-0.5 text-xs font-semibold text-primary-700 mb-1">
              {t[selectedReport.reportType]}
            </div>
            <p className="text-xs text-neutral-500">{formatDateTime(selectedReport.generatedAt)}</p>
          </div>
        </div>

        <h3 className="text-lg font-bold text-neutral-900">{formatPeriod(selectedReport)}</h3>

        {/* 1. P&L — large, prominent */}
        <div className="grid grid-cols-2 gap-3">
          <div className={`rounded-2xl border p-4 ${selectedReport.netProfit >= 0 ? 'border-primary-200 bg-primary-50' : 'border-warning-200 bg-warning-50'}`}>
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{selectedReport.netProfit >= 0 ? t.profit : t.loss}</p>
            <p className={`text-2xl font-bold ${numClass} ${selectedReport.netProfit >= 0 ? 'text-primary-900' : 'text-amber-900'}`}>{formatCurrency(Math.abs(selectedReport.netProfit))}</p>
          </div>
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500 mb-1">{t.sales}</p>
            <p className={`text-2xl font-bold ${numClass} text-emerald-900`}>{formatCurrency(selectedReport.totalSales)}</p>
          </div>
        </div>

        {/* 2. Secondary metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <MetricCard label={t.expenses} value={formatCurrency(selectedReport.totalExpenses)} tone="amber" />
          <MetricCard label={t.margin} value={formatPercent(selectedReport.profitMargin)} tone="slate" />
          <MetricCard label={t.avgSales} value={formatCurrency(selectedReport.averageDailySales)} tone="slate" />
          <MetricCard label={t.entries} value={`${selectedReport.entryCount || 0}`} tone="slate" />
        </div>

        {/* 3. AI Summary + action blocks */}
        {(selectedReport.summary || selectedReport.insights) && (
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400 mb-2">{t.summary}</p>
            <p className="text-sm text-neutral-700 leading-6">{selectedReport.summary || selectedReport.insights}</p>
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-3">
          <ListBlock title={t.wins} items={selectedReport.wins || []} emptyLabel="—" />
          <ListBlock title={t.risks} items={selectedReport.risks || []} emptyLabel="—" />
          <ListBlock title={t.nextSteps} items={selectedReport.nextSteps || []} emptyLabel="—" />
        </div>

        {/* 4. Detailed metrics — secondary */}
        <details className="rounded-xl border border-neutral-200">
          <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-neutral-600 select-none">{t.period} · {t.comparison}</summary>
          <div className="border-t border-neutral-100 px-4 py-4 grid gap-4 sm:grid-cols-2">
            <div className="space-y-3 text-sm text-neutral-700">
              <DetailRow label={t.avgExpenses} value={formatCurrency(selectedReport.averageDailyExpenses)} />
              <DetailRow label={t.avgProfit} value={formatCurrency(selectedReport.averageDailyProfit)} />
              <DetailRow label={t.expenseRatio} value={formatPercent(selectedReport.expenseRatio)} />
              <DetailRow label={t.closingCash} value={formatCurrency(selectedReport.closingCash)} />
              {selectedReport.bestDay && <DetailRow label={t.bestDay} value={`${formatDate(selectedReport.bestDay.date)} · ${formatCurrency(selectedReport.bestDay.profit)}`} />}
              {selectedReport.worstDay && <DetailRow label={t.worstDay} value={`${formatDate(selectedReport.worstDay.date)} · ${formatCurrency(selectedReport.worstDay.profit)}`} />}
            </div>
            {selectedReport.comparison && (
              <div className="space-y-3 text-sm text-neutral-700">
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{t.comparison}</p>
                <DetailRow label={t.sales} value={`${selectedReport.comparison.salesChangePct.toFixed(1)}%`} />
                <DetailRow label={t.expenses} value={`${selectedReport.comparison.expenseChangePct.toFixed(1)}%`} />
                <DetailRow label={selectedReport.netProfit >= 0 ? t.profit : t.loss} value={`${selectedReport.comparison.profitChangePct.toFixed(1)}%`} />
                <p className="text-xs text-neutral-400">{selectedReport.comparison.previousLabel}</p>
              </div>
            )}
          </div>
        </details>

        <div className="rounded-xl border border-warning-200 bg-warning-50 px-4 py-3 text-xs text-amber-800">{t.missingData}</div>
      </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">

      {error && <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      {/* ── Zone 1: KPI tiles ── always on top, read-only data */}
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className={`rounded-2xl border p-4 ${overview.totalProfit >= 0 ? 'border-primary-200 bg-primary-50' : 'border-warning-200 bg-warning-50'}`}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{t.overviewProfit}</p>
            {overview.totalProfit >= 0 ? <TrendingUp className="h-4 w-4 text-primary-600" /> : <TrendingDown className="h-4 w-4 text-amber-600" />}
          </div>
          <p className={`text-xl font-bold ${numClass} ${overview.totalProfit >= 0 ? 'text-primary-900' : 'text-amber-900'}`}>{formatCurrency(overview.totalProfit)}</p>
        </div>
        <OverviewCard icon={BarChart3} label={t.overviewSales} value={formatCurrency(overview.totalSales)} tone="emerald" />
        <OverviewCard icon={FileText} label={t.overviewReports} value={`${overview.totalReports}`} tone="slate" />
        <OverviewCard icon={CalendarClock} label={t.overviewLatest} value={overview.latestLabel} tone="slate" />
      </div>

      {/* ── Zone 2: List card ── filter header + rows + automation footer */}
      <div className="rounded-3xl bg-white shadow-sm border border-neutral-100 overflow-hidden">

        {/* Card header: two rows on mobile, one row on desktop */}
        <div className="px-4 pt-4 pb-3 border-b border-neutral-100 space-y-3 sm:space-y-0 sm:flex sm:items-center sm:gap-3">
          {/* Row 1 (mobile) / Left side (desktop): filter tabs */}
          <div className="flex items-center gap-1 rounded-xl bg-neutral-100 p-1 sm:flex-1">
            {reportTypes.map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFilter(type)}
                className={`flex-1 px-2 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  activeFilter === type
                    ? 'bg-[#ffe088] text-[#735c00] shadow-sm font-semibold'
                    : 'text-neutral-500 hover:text-neutral-700'
                }`}
              >
                {type === 'all' ? t.allReports : t[type]}
              </button>
            ))}
          </div>

          {/* Row 2 (mobile) / Right side (desktop): Generate split button + Refresh */}
          <div className="flex items-center gap-2 sm:shrink-0">
            <div className="relative flex items-stretch flex-1 sm:flex-none">
              <button
                type="button"
                onClick={generateReport}
                disabled={isGenerating}
                className="h-10 flex-1 sm:flex-none px-4 rounded-l-xl bg-primary-600 text-white text-xs font-semibold uppercase tracking-wide hover:bg-primary-700 disabled:opacity-50 transition-colors border-r border-primary-700"
              >
                {isGenerating ? t.generating : t.generateNow}
              </button>
              <button
                type="button"
                onClick={() => setShowTypeMenu(v => !v)}
                className="h-10 px-2.5 rounded-r-xl bg-primary-600 text-white hover:bg-primary-700 transition-colors flex items-center gap-1"
                aria-label="Select report type"
              >
                <span className="text-[10px] font-semibold text-primary-200 hidden sm:inline">{t[selectedGenerateType]}</span>
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
              {showTypeMenu && (
                <div className="absolute right-0 top-full mt-1 z-20 min-w-[120px] rounded-xl border border-neutral-200 bg-white shadow-md overflow-hidden">
                  {(['daily', 'weekly', 'monthly'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => { setSelectedGenerateType(type); setShowTypeMenu(false); }}
                      className={`w-full px-4 py-2.5 text-left text-sm transition-colors ${
                        selectedGenerateType === type
                          ? 'bg-[#ffe088] text-[#735c00] font-semibold'
                          : 'text-neutral-700 hover:bg-neutral-50'
                      }`}
                    >
                      {t[type]}
                      {selectedGenerateType === type && <span className="ml-2 text-[10px]">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Button
              type="button"
              onClick={() => void fetchReports('refresh')}
              disabled={isRefreshing}
              variant="secondary"
              size="sm"
              className="h-10 w-10 p-0 shrink-0"
              icon={<RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
            />
          </div>
        </div>

        {/* Report rows */}
        <div className="px-4 py-3">
          {reports.length === 0 ? (
            <EmptyState title={t.noReports} subtitle={t.noReportsHint} />
          ) : filteredReports.length === 0 ? (
            <EmptyState title={t.noMatches} subtitle={t.noReportsHint} />
          ) : (
            <div className="space-y-3 py-1">
              {filteredReports.map((report) => (
                <button
                  key={report.id}
                  type="button"
                  onClick={() => setSelectedReport(report)}
                  className="w-full rounded-2xl border border-neutral-100 bg-[#F9FAFB] p-4 text-left transition-all hover:border-primary-200 hover:bg-white hover:shadow-sm active:scale-[0.98]"
                >
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary-700">{t[report.reportType]}</span>
                      <span className="text-xs text-neutral-400">{formatPeriod(report)}</span>
                    </div>
                    <span className="text-neutral-300 text-sm">→</span>
                  </div>
                  {(report.summary || report.insights) && (
                    <p className="text-sm text-neutral-500 leading-5 line-clamp-2 mb-3">
                      {report.summary || report.insights}
                    </p>
                  )}
                  <div className="flex items-stretch gap-2">
                    <div className="flex-1 rounded-xl bg-white px-3 py-2 border border-neutral-100">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">{t.sales}</p>
                      <p className={`text-sm font-bold ${numClass} text-neutral-900 mt-0.5`}>{formatCurrency(report.totalSales)}</p>
                    </div>
                    <div className={`flex-[1.2] rounded-xl px-3 py-2 ${report.netProfit >= 0 ? 'bg-emerald-50' : 'bg-rose-50'}`}>
                      <p className={`text-[10px] font-bold uppercase tracking-wider ${report.netProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>{report.netProfit >= 0 ? t.profit : t.loss}</p>
                      <p className={`text-base font-bold ${numClass} mt-0.5 ${report.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-600'}`}>{formatCurrency(Math.abs(report.netProfit))}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Automation — quiet footer */}
        <div className="border-t border-neutral-100 px-4 py-3">
          <details>
            <summary className="flex cursor-pointer items-center gap-2 text-xs font-medium text-neutral-400 select-none hover:text-neutral-600 transition-colors">
              <CalendarClock className="h-3.5 w-3.5" />
              {t.automation}
              <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${automationEnabled ? 'bg-primary-50 text-primary-600' : 'bg-neutral-100 text-neutral-400'}`}>
                {automationEnabled ? t.enabled : t.disabled}
              </span>
            </summary>
            <div className="mt-3 pt-3 border-t border-neutral-100">
              <p className="text-xs text-neutral-400 mb-3">{t.automationNote}</p>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <label className="mb-1.5 block text-xs font-medium text-neutral-500">{t.reportTime}</label>
                  <input type="time" value={reportTime} onChange={(e) => setReportTime(e.target.value)} className="h-10 w-full rounded-xl border border-neutral-200 bg-white px-3 text-sm outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15" />
                </div>
                <button type="button" aria-pressed={automationEnabled} onClick={() => setAutomationEnabled(v => !v)} className={`flex h-10 items-center gap-2 rounded-xl border px-3 text-sm font-medium transition ${automationEnabled ? 'border-primary-200 bg-primary-50 text-primary-900' : 'border-neutral-200 bg-white text-neutral-700'}`}>
                  <span className={`relative inline-flex h-6 w-10 items-center rounded-full transition-colors ${automationEnabled ? 'bg-primary-600' : 'bg-neutral-300'}`}>
                    <span className={`inline-block h-4 w-4 rounded-full bg-white shadow-sm transition-transform ${automationEnabled ? 'translate-x-5' : 'translate-x-1'}`} />
                  </span>
                  {automationEnabled ? t.enabled : t.disabled}
                </button>
                <Button type="button" onClick={savePreferences} disabled={isSavingPrefs} variant="primary" size="sm">
                  {isSavingPrefs ? t.saving : t.savePrefs}
                </Button>
              </div>
            </div>
          </details>
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'blue' | 'amber' | 'slate' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'blue'
        ? 'border-primary-200 bg-primary-50 text-primary-900'
        : tone === 'amber'
          ? 'border-warning-200 bg-warning-50 text-amber-900'
          : 'border-neutral-100 bg-neutral-50 text-neutral-900';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-2 text-lg font-bold">{value}</p>
    </div>
  );
}

function OverviewCard({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: typeof BarChart3;
  label: string;
  value: string;
  tone: 'emerald' | 'blue' | 'amber' | 'slate';
}) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'blue'
        ? 'border-primary-200 bg-primary-50 text-primary-900'
        : tone === 'amber'
          ? 'border-warning-200 bg-warning-50 text-amber-900'
          : 'border-neutral-100 bg-neutral-50 text-neutral-900';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
        <Icon className="h-4 w-4 opacity-80" />
      </div>
      <p className="mt-3 text-lg font-bold">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-neutral-500">{label}</span>
      <span className="text-right font-medium text-neutral-900">{value}</span>
    </div>
  );
}

function ListBlock({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <h5 className="text-sm font-semibold text-neutral-900">{title}</h5>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-neutral-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-primary-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-neutral-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-neutral-300 px-6 py-12 text-center">
      <p className="text-section-heading text-neutral-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-body-sm text-neutral-500 leading-6">{subtitle}</p>
    </div>
  );
}

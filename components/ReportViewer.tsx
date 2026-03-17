'use client';

import { useEffect, useMemo, useState } from 'react';
import { BarChart3, CalendarClock, ChevronLeft, FileText, RefreshCw, Sparkles, TrendingDown, TrendingUp } from 'lucide-react';
import { getLocalEntries } from '@/lib/daily-entry-sync';
import { DailyReport, Language, ReportsListResponse } from '@/lib/types';
import { logger } from '@/lib/logger';

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

  const reportTypes: ReportType[] = ['all', 'daily', 'weekly', 'monthly'];

  const fetchReports = async (mode: 'load' | 'refresh' = 'load') => {
    if (mode === 'load') {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }
    setError(null);

    try {
      const response = await fetch(`/api/reports?userId=${encodeURIComponent(userId)}&language=${encodeURIComponent(language)}`);
      const result: ReportsListResponse = await response.json();

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
          dailyEntries: getLocalEntries(),
        }),
      });

      const result = await response.json();

      if (!result.success) {
        throw new Error(result.error || t.generateFailed);
      }

      await fetchReports('refresh');
      setNotice(t.generatedSuccess);

      if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
        window.dispatchEvent(new CustomEvent('reportsUpdated', { detail: result.data }));
      }
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
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-48 rounded bg-slate-200" />
          <div className="grid gap-4 md:grid-cols-3">
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="h-28 rounded-2xl bg-slate-100" />
            <div className="h-28 rounded-2xl bg-slate-100" />
          </div>
          <div className="h-64 rounded-2xl bg-slate-100" />
        </div>
      </div>
    );
  }

  if (selectedReport) {
    return (
      <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <button
          type="button"
          onClick={() => setSelectedReport(null)}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-700 hover:text-blue-800"
        >
          <ChevronLeft className="h-4 w-4" />
          {t.back}
        </button>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
              {t[selectedReport.reportType]}
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{formatPeriod(selectedReport)}</h3>
            <p className="text-sm text-slate-500">
              {t.generatedAt}: {formatDateTime(selectedReport.generatedAt)}
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label={t.sales} value={formatCurrency(selectedReport.totalSales)} tone="emerald" />
            <MetricCard label={selectedReport.netProfit >= 0 ? t.profit : t.loss} value={formatCurrency(Math.abs(selectedReport.netProfit))} tone={selectedReport.netProfit >= 0 ? 'blue' : 'amber'} />
            <MetricCard label={t.avgSales} value={formatCurrency(selectedReport.averageDailySales)} tone="slate" />
            <MetricCard label={t.margin} value={formatPercent(selectedReport.profitMargin)} tone="slate" />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-[1.2fr,0.8fr]">
          <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.summary}</h4>
            <p className="mt-3 text-base leading-7 text-slate-800">
              {selectedReport.summary || selectedReport.insights}
            </p>

            <div className="mt-5 grid gap-4 md:grid-cols-3">
              <ListBlock title={t.wins} items={selectedReport.wins || []} emptyLabel="—" />
              <ListBlock title={t.risks} items={selectedReport.risks || []} emptyLabel="—" />
              <ListBlock title={t.nextSteps} items={selectedReport.nextSteps || []} emptyLabel="—" />
            </div>
          </section>

          <section className="space-y-4">
            <div className="rounded-2xl border border-slate-200 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.period}</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <DetailRow label={t.entries} value={`${selectedReport.entryCount || 0}`} />
                <DetailRow label={t.expenses} value={formatCurrency(selectedReport.totalExpenses)} />
                <DetailRow label={t.avgExpenses} value={formatCurrency(selectedReport.averageDailyExpenses)} />
                <DetailRow label={t.avgProfit} value={formatCurrency(selectedReport.averageDailyProfit)} />
                <DetailRow label={t.expenseRatio} value={formatPercent(selectedReport.expenseRatio)} />
                <DetailRow label={t.closingCash} value={formatCurrency(selectedReport.closingCash)} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.comparison}</h4>
              {selectedReport.comparison ? (
                <div className="mt-4 space-y-3 text-sm text-slate-700">
                  <DetailRow label={t.sales} value={`${selectedReport.comparison.salesChangePct.toFixed(1)}%`} />
                  <DetailRow label={t.expenses} value={`${selectedReport.comparison.expenseChangePct.toFixed(1)}%`} />
                  <DetailRow label={selectedReport.netProfit >= 0 ? t.profit : t.loss} value={`${selectedReport.comparison.profitChangePct.toFixed(1)}%`} />
                  <p className="text-xs text-slate-500">{selectedReport.comparison.previousLabel}</p>
                </div>
              ) : (
                <p className="mt-3 text-sm text-slate-500">—</p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 p-5">
              <h4 className="text-sm font-semibold uppercase tracking-wide text-slate-500">{t.insights}</h4>
              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <DetailRow
                  label={t.bestDay}
                  value={selectedReport.bestDay ? `${formatDate(selectedReport.bestDay.date)} · ${formatCurrency(selectedReport.bestDay.profit)}` : '—'}
                />
                <DetailRow
                  label={t.worstDay}
                  value={selectedReport.worstDay ? `${formatDate(selectedReport.worstDay.date)} · ${formatCurrency(selectedReport.worstDay.profit)}` : '—'}
                />
              </div>
            </div>
          </section>
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t.missingData}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-2">
          <h3 className="text-2xl font-bold text-slate-900">{t.title}</h3>
          <p className="max-w-3xl text-sm leading-6 text-slate-600">{t.subtitle}</p>
        </div>
        <button
          type="button"
          onClick={() => void fetchReports('refresh')}
          disabled={isRefreshing}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {t.refresh}
        </button>
      </div>

      {error && <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
      {notice && <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="grid gap-4 xl:grid-cols-[1.15fr,0.85fr]">
        <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <CalendarClock className="h-5 w-5 text-blue-700" />
            <h4 className="text-lg font-semibold">{t.automation}</h4>
          </div>
          <p className="mt-2 text-sm text-slate-600">{t.automationHint}</p>
          <p className="mt-1 flex items-start gap-1.5 text-xs text-slate-500">
            <span className="mt-0.5 shrink-0 text-blue-400">ℹ</span>
            {t.automationNote}
          </p>

          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-end">
            <div className="flex-1">
              <label className="mb-2 block text-sm font-medium text-slate-700">{t.reportTime}</label>
              <input
                type="time"
                value={reportTime}
                onChange={(event) => setReportTime(event.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="button"
              aria-pressed={automationEnabled}
              onClick={() => setAutomationEnabled((value) => !value)}
              className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-medium transition ${
                automationEnabled
                  ? 'border-blue-200 bg-blue-50 text-blue-900'
                  : 'border-slate-200 bg-white text-slate-700'
              }`}
            >
              <span
                className={`relative inline-flex h-7 w-12 items-center rounded-full transition-colors ${
                  automationEnabled ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 rounded-full bg-white shadow-sm transition-transform ${
                    automationEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </span>
              <span>{automationEnabled ? t.enabled : t.disabled}</span>
            </button>
            <button
              type="button"
              onClick={savePreferences}
              disabled={isSavingPrefs}
              className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-60"
            >
              {isSavingPrefs ? t.saving : t.savePrefs}
            </button>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-200 p-5">
          <div className="flex items-center gap-2 text-slate-900">
            <Sparkles className="h-5 w-5 text-blue-700" />
            <h4 className="text-lg font-semibold">{t.generateTitle}</h4>
          </div>
          <p className="mt-2 text-sm text-slate-600">{t.generateHint}</p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <select
              value={selectedGenerateType}
              onChange={(event) => setSelectedGenerateType(event.target.value as Exclude<ReportType, 'all'>)}
              className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="daily">{t.daily}</option>
              <option value="weekly">{t.weekly}</option>
              <option value="monthly">{t.monthly}</option>
            </select>
            <button
              type="button"
              onClick={generateReport}
              disabled={isGenerating}
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-60"
            >
              {isGenerating ? t.generating : t.generateNow}
            </button>
          </div>
        </section>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <OverviewCard icon={BarChart3} label={t.overviewSales} value={formatCurrency(overview.totalSales)} tone="emerald" />
        <OverviewCard icon={overview.totalProfit >= 0 ? TrendingUp : TrendingDown} label={t.overviewProfit} value={formatCurrency(overview.totalProfit)} tone={overview.totalProfit >= 0 ? 'blue' : 'amber'} />
        <OverviewCard icon={FileText} label={t.overviewReports} value={`${overview.totalReports}`} tone="slate" />
        <OverviewCard icon={CalendarClock} label={t.overviewLatest} value={overview.latestLabel} tone="slate" />
      </div>

      <div className="flex flex-wrap gap-2">
        {reportTypes.map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => setActiveFilter(type)}
            className={`rounded-full px-4 py-2 text-sm font-medium transition-colors ${
              activeFilter === type
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {type === 'all' ? t.allReports : t[type]}
          </button>
        ))}
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h4 className="text-lg font-semibold text-slate-900">{t.latestReports}</h4>
          <span className="text-sm text-slate-500">{t.lastUpdated}: {reports[0] ? formatDateTime(reports[0].generatedAt) : '—'}</span>
        </div>

        {reports.length === 0 ? (
          <EmptyState title={t.noReports} subtitle={t.noReportsHint} />
        ) : filteredReports.length === 0 ? (
          <EmptyState title={t.noMatches} subtitle={t.noReportsHint} />
        ) : (
          <div className="space-y-3">
            {filteredReports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => setSelectedReport(report)}
                className="w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-blue-300 hover:bg-slate-50"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                        {t[report.reportType]}
                      </span>
                      <span className="text-sm text-slate-500">{formatPeriod(report)}</span>
                    </div>
                    <p className="max-w-3xl text-sm leading-6 text-slate-700">
                      {report.summary || report.insights}
                    </p>
                  </div>

                  <div className="grid min-w-[320px] gap-3 sm:grid-cols-3">
                    <MiniMetric label={t.sales} value={formatCurrency(report.totalSales)} />
                    <MiniMetric label={report.netProfit >= 0 ? t.profit : t.loss} value={formatCurrency(Math.abs(report.netProfit))} />
                    <MiniMetric label={t.viewReport} value="→" />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function MetricCard({ label, value, tone }: { label: string; value: string; tone: 'emerald' | 'blue' | 'amber' | 'slate' }) {
  const toneClass =
    tone === 'emerald'
      ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
      : tone === 'blue'
        ? 'border-blue-200 bg-blue-50 text-blue-900'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-slate-200 bg-slate-50 text-slate-900';

  return (
    <div className={`rounded-2xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-wide opacity-80">{label}</p>
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
        ? 'border-blue-200 bg-blue-50 text-blue-900'
        : tone === 'amber'
          ? 'border-amber-200 bg-amber-50 text-amber-900'
          : 'border-slate-200 bg-slate-50 text-slate-900';

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

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-slate-100 px-3 py-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="text-right font-medium text-slate-900">{value}</span>
    </div>
  );
}

function ListBlock({ title, items, emptyLabel }: { title: string; items: string[]; emptyLabel: string }) {
  return (
    <div className="rounded-2xl bg-white p-4">
      <h5 className="text-sm font-semibold text-slate-900">{title}</h5>
      {items.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-6 text-slate-700">
          {items.map((item, index) => (
            <li key={`${title}-${index}`} className="flex gap-2">
              <span className="mt-1 h-1.5 w-1.5 rounded-full bg-blue-500" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-slate-500">{emptyLabel}</p>
      )}
    </div>
  );
}

function EmptyState({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-300 px-6 py-12 text-center">
      <p className="text-lg font-semibold text-slate-900">{title}</p>
      <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">{subtitle}</p>
    </div>
  );
}

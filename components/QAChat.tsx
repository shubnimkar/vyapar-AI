'use client';

import React, { useState, useRef, useEffect } from 'react';
import { MessageSquarePlus, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CreditEntry, DailyEntry, DailyReport, InferredTransaction, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface QAChatProps {
  sessionId: string;
  language: Language;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string; sourcesUsed?: string[]; contentByLanguage?: Partial<Record<Language, string>> }>;
  dataSources?: {
    dailyEntries: number;
    creditEntries: number;
    reports: number;
    salesData: boolean;
    expensesData: boolean;
    inventoryData: boolean;
  };
  contextData?: {
    dailyEntries: DailyEntry[];
    creditEntries: CreditEntry[];
  };
  appContext?: {
    activeSection?: string;
    pendingCount?: number;
    pendingTransactions?: InferredTransaction[];
    healthScore?: number | null;
    healthBreakdown?: {
      marginScore: number;
      expenseScore: number;
      cashScore: number;
      creditScore: number;
    } | null;
    benchmark?: {
      healthScore: number;
      marginPercent: number;
      benchmarkHealthScore: number;
      benchmarkMarginPercent: number;
      category: string;
      sampleSize: number;
    } | null;
    reports?: DailyReport[];
  };
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  sourcesUsed?: string[];
  contentByLanguage?: Partial<Record<Language, string>>;
}

interface StructuredAnswer {
  conclusion?: string;
  why?: string;
  nextStep?: string;
}

function parseStructuredAnswer(content: string): StructuredAnswer | null {
  const normalized = content.trim();
  const markerPattern = /(?:^|\n)(Conclusion|Why|Next step|निष्कर्ष|क्यों|अगला कदम|का|पुढचे पाऊल):\s*/g;
  const matches = [...normalized.matchAll(markerPattern)];

  if (matches.length === 0) {
    return null;
  }

  const sections: StructuredAnswer = {};

  matches.forEach((match, index) => {
    const label = match[1];
    const valueStart = (match.index ?? 0) + match[0].length;
    const valueEnd = index + 1 < matches.length ? (matches[index + 1].index ?? normalized.length) : normalized.length;
    const value = normalized.slice(valueStart, valueEnd).trim();

    if (!value) return;

    if (label === 'Conclusion' || label === 'निष्कर्ष') sections.conclusion = value;
    if (label === 'Why' || label === 'क्यों' || label === 'का') sections.why = value;
    if (label === 'Next step' || label === 'अगला कदम' || label === 'पुढचे पाऊल') sections.nextStep = value;
  });

  return sections.conclusion || sections.why || sections.nextStep ? sections : null;
}

export default function QAChat({ sessionId, language, initialMessages, dataSources, contextData, appContext }: QAChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasHydratedInitialMessages, setHasHydratedInitialMessages] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const previousSessionIdRef = useRef<string | null>(null);
  const previousLanguageRef = useRef<Language>(language);
  const [translatingHistory, setTranslatingHistory] = useState(false);

  const availableData = dataSources ?? {
    dailyEntries: 0,
    creditEntries: 0,
    reports: 0,
    salesData: false,
    expensesData: false,
    inventoryData: false,
  };

  const hasAnyData =
    availableData.dailyEntries > 0 ||
    availableData.creditEntries > 0 ||
    availableData.reports > 0 ||
    availableData.salesData ||
    availableData.expensesData ||
    availableData.inventoryData;

  const quickQuestionKeys = [
    ...(availableData.dailyEntries > 0 ? ['qaQuick.businessWeek', 'qaQuick.marginHurt'] : []),
    ...(availableData.creditEntries > 0 ? ['qaQuick.creditFollowUp', 'qaQuick.creditBlocked'] : []),
    ...(appContext?.healthScore !== null && appContext?.healthScore !== undefined
      ? ['qaQuick.healthWhy', 'qaQuick.improveFirst']
      : []),
    ...(appContext?.pendingCount && appContext.pendingCount > 0
      ? ['qaQuick.pendingReview', 'qaQuick.pendingClear']
      : []),
    ...(availableData.reports > 0 ? ['qaQuick.reportChanged', 'qaQuick.reportSummary'] : []),
    ...(availableData.salesData ? ['qaQuick.productProfit', 'qaQuick.productBest'] : []),
    ...(availableData.expensesData ? ['qaQuick.biggestExpenses'] : []),
    ...(availableData.inventoryData ? ['qaQuick.inventoryBlocked'] : []),
  ];

  const answerLabels = {
    conclusion: t('qaConclusion', language),
    why: t('qaWhy', language),
    nextStep: t('qaNextStep', language),
  };

  const dataSourceLabels: Record<string, string> = {
    daily_entries: t('qaSource.dailyEntries', language),
    credit_entries: t('qaSource.creditEntries', language),
    pending_transactions: t('qaSource.pendingTransactions', language),
    reports: t('qaSource.reports', language),
    sales_csv: t('qaSource.salesCsv', language),
    expenses_csv: t('qaSource.expensesCsv', language),
    inventory_csv: t('qaSource.inventoryCsv', language),
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (!hasHydratedInitialMessages && messages.length === 0 && initialMessages && initialMessages.length > 0) {
      setMessages(initialMessages);
      setHasHydratedInitialMessages(true);
    }
  }, [hasHydratedInitialMessages, initialMessages, messages.length]);

  useEffect(() => {
    if (previousSessionIdRef.current === null) {
      previousSessionIdRef.current = sessionId;
      return;
    }

    if (previousSessionIdRef.current !== sessionId) {
      previousSessionIdRef.current = sessionId;
      setHasHydratedInitialMessages(false);
      setMessages([]);
    }
  }, [sessionId]);

  useEffect(() => {
    if (previousLanguageRef.current === language) {
      return;
    }

    const previousLanguage = previousLanguageRef.current;
    previousLanguageRef.current = language;

    if (messages.length === 0) {
      return;
    }

    const untranslatedMessages = messages.filter((message) => !message.contentByLanguage?.[language]);
    if (untranslatedMessages.length === 0) {
      setMessages((prev) =>
        prev.map((message) =>
          message.contentByLanguage?.[language]
            ? { ...message, content: message.contentByLanguage[language] || message.content }
            : message
        )
      );
      return;
    }

    const translateHistory = async () => {
      setTranslatingHistory(true);
      setError(null);

      try {
        const response = await fetch('/api/ask', {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionId,
            language,
            messages: messages
              .map((message, index) => ({ message, index }))
              .map(({ message, index }) => ({
                index,
                content: message.contentByLanguage?.[previousLanguage] || message.content,
                contentByLanguage: message.contentByLanguage || {},
              })),
          }),
        });

        const data = await response.json();

        if (!data.success || !Array.isArray(data.messages)) {
          setError(data.error || data.message || t('questionFailed', language));
          return;
        }

        const translatedByIndex = new Map<number, { content: string; contentByLanguage?: Partial<Record<Language, string>> }>(
          data.messages.map((message: { index: number; content: string; contentByLanguage?: Partial<Record<Language, string>> }) => [
            message.index,
            { content: message.content, contentByLanguage: message.contentByLanguage },
          ])
        );

        setMessages((prev) =>
          prev.map((message, index) => {
            const translated = translatedByIndex.get(index);
            if (!translated) {
              return message;
            }

            return {
              ...message,
              content: translated.content,
              contentByLanguage: translated.contentByLanguage || message.contentByLanguage,
            };
          })
        );
      } catch {
        setError(t('questionFailed', language));
      } finally {
        setTranslatingHistory(false);
      }
    };

    void translateHistory();
  }, [language, messages, sessionId]);

  const sectionRank: Record<string, string[]> = {
    credit: ['credit_entries'],
    pending: ['pending_transactions'],
    reports: ['reports'],
    health: ['daily_entries'],
    analysis: ['sales_csv', 'expenses_csv', 'inventory_csv'],
  };

  const prioritizedQuestions = [...quickQuestionKeys].sort((leftKey, rightKey) => {
    const preferredSources = sectionRank[appContext?.activeSection || ''] || [];
    const score = (key: string) => {
      const text = t(key, language);
      const normalized = text.toLowerCase();
      let total = 0;
      preferredSources.forEach((source) => {
        if (source === 'credit_entries' && /(credit|follow up|overdue|उधार|उधारी|फॉलो-अप|फॉलो-अप|फॉलो-अप)/i.test(normalized)) total += 2;
        if (source === 'pending_transactions' && /(pending|review|लंबित|प्रलंबित)/i.test(normalized)) total += 2;
        if (source === 'reports' && /(report|रिपोर्ट)/i.test(normalized)) total += 2;
        if (source === 'daily_entries' && /(business|profit|health|margin|व्यवसाय|लाभ|नफा|मार्जिन)/i.test(normalized)) total += 2;
        if ((source === 'sales_csv' || source === 'expenses_csv' || source === 'inventory_csv') && /(product|inventory|expense|sales|उत्पाद|इन्वेंटरी|खर्च|विक्री|बिक्री)/i.test(normalized)) total += 2;
      });
      return total;
    };

    return score(rightKey) - score(leftKey);
  }).slice(0, 4).map((key) => t(key, language));

  const clearConversation = async () => {
    setError(null);
    setLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (!data.success) {
        setError(data.error || data.message || t('questionFailed', language));
        return;
      }

      setMessages([]);
      setHasHydratedInitialMessages(true);
    } catch {
      setError(t('questionFailed', language));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!question.trim() || loading) return;

    await askQuestion(question.trim());
  };

  const askQuestion = async (userQuestion: string) => {
    setQuestion('');
    setError(null);

    // Add user message immediately
    setMessages((prev) => [...prev, { role: 'user', content: userQuestion, contentByLanguage: { [language]: userQuestion } }]);
    setLoading(true);

    try {
      const response = await fetch('/api/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId,
          question: userQuestion,
          language,
          dailyEntries: contextData?.dailyEntries || [],
          creditEntries: contextData?.creditEntries || [],
          appContext: appContext || {},
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.answer,
            sourcesUsed: data.sourcesUsed || [],
            contentByLanguage: data.contentByLanguage || { [language]: data.answer },
          },
        ]);
      } else {
        const rawError: string | undefined = data.error || data.message;

        // If the API returned a known translation key, show a friendly, specific message
        if (rawError && (rawError.startsWith('errors.') || rawError === 'qaNoData')) {
          const key =
            rawError === 'qaNoData'
              ? 'qaNoData'
              : rawError;
          setError(t(key, language));
        } else {
          setError(rawError || t('questionFailed', language));
        }
      }
    } catch {
      setError(t('questionFailed', language));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="space-y-6 rounded-3xl">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 px-3 py-1 text-sm font-medium text-blue-700">
            <Sparkles className="h-4 w-4" />
            {t('askQuestion', language)}
          </div>
          <div className="space-y-2">
            <h2 className="text-page-title text-slate-900">
              {t('askQuestion', language)}
            </h2>
            <p className="max-w-3xl text-body text-slate-500 leading-7">
              {t('qaScope', language)}
            </p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button
            type="button"
            onClick={clearConversation}
            disabled={loading}
            variant="secondary"
            size="md"
            icon={<MessageSquarePlus className="h-4 w-4" />}
          >
            {loading ? t('qaClearingConversation', language) : t('qaNewConversation', language)}
          </Button>
        )}
      </div>

      {/* Messages */}
      <div className="max-h-[34rem] space-y-4 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
        {messages.length === 0 && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center">
            {hasAnyData ? (
              <>
                <p className="mx-auto mb-5 max-w-2xl text-sm leading-6 text-slate-500">
                  {t('questionPlaceholder', language)}
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {prioritizedQuestions.map((q, idx) => (
                    <Button
                      key={idx}
                      onClick={() => askQuestion(q)}
                      disabled={loading}
                      variant="secondary"
                      size="sm"
                      className="rounded-full text-blue-700"
                    >
                      {q}
                    </Button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-500">
                {t('qaEmptyState', language)}
              </p>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {(() => {
              const structuredAnswer = msg.role === 'assistant' ? parseStructuredAnswer(msg.content) : null;
              const sourceChips = msg.sourcesUsed?.filter((source) => dataSourceLabels[source]);

              if (structuredAnswer) {
                return (
                  <div className="w-full max-w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-5 py-4 text-slate-800 shadow-sm sm:max-w-[88%]">
                    <div className="space-y-4 text-sm">
                      {sourceChips && sourceChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 pb-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{t('qaSourceHeading', language)}</p>
                          {sourceChips.map((source) => (
                            <span key={source} className="rounded-full border border-blue-100 bg-white px-2.5 py-1 text-xs font-medium text-blue-700">
                              {dataSourceLabels[source]}
                            </span>
                          ))}
                        </div>
                      )}
                      {structuredAnswer.conclusion && (
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{answerLabels.conclusion}</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{structuredAnswer.conclusion}</p>
                        </div>
                      )}
                      {structuredAnswer.why && (
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{answerLabels.why}</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{structuredAnswer.why}</p>
                        </div>
                      )}
                      {structuredAnswer.nextStep && (
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{answerLabels.nextStep}</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{structuredAnswer.nextStep}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className={`w-full max-w-full rounded-2xl px-4 py-3 shadow-sm sm:max-w-[84%] ${
                    msg.role === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'border border-slate-200 bg-white text-slate-800'
                  }`}
                >
                  {msg.role === 'assistant' && sourceChips && sourceChips.length > 0 && (
                    <div className="mb-3 flex flex-wrap items-center gap-2 border-b border-slate-100 pb-3">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{t('qaSourceHeading', language)}</p>
                      {sourceChips.map((source) => (
                        <span key={source} className="rounded-full border border-blue-100 bg-blue-50 px-2.5 py-1 text-[11px] font-medium text-blue-700">
                          {dataSourceLabels[source]}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="whitespace-pre-wrap text-sm leading-7">{msg.content}</p>
                </div>
              );
            })()}
          </div>
        ))}

        {(loading || translatingHistory) && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <p className="text-sm text-slate-500">...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Input */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder', language)}
          disabled={loading || !hasAnyData}
          className="min-h-[44px] flex-1 rounded-xl border border-neutral-200 bg-white px-4 py-2.5 text-base text-neutral-900 outline-none transition-all placeholder:text-neutral-400 focus:border-primary-500 focus:ring-2 focus:ring-primary-500/15 disabled:bg-neutral-50 disabled:text-neutral-500"
        />
        <Button
          type="submit"
          disabled={!question.trim() || loading || !hasAnyData}
          variant="primary"
          size="md"
          className="w-full sm:w-auto"
        >
          {t('sendButton', language)}
        </Button>
      </form>
    </Card>
  );
}

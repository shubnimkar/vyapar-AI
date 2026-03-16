'use client';

import { useState, useRef, useEffect } from 'react';
import { CreditEntry, DailyEntry, DailyReport, InferredTransaction, Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface QAChatProps {
  sessionId: string;
  language: Language;
  initialMessages?: Array<{ role: 'user' | 'assistant'; content: string; sourcesUsed?: string[] }>;
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

  const quickQuestions = {
    en: [
      ...(availableData.dailyEntries > 0
        ? ['How is my business doing this week?', 'What is hurting my profit margin most?']
        : []),
      ...(availableData.creditEntries > 0
        ? ['Who should I follow up with today?', 'How much money is stuck in credit?']
        : []),
      ...(appContext?.healthScore !== null && appContext?.healthScore !== undefined
        ? ['Why is my health score at this level?', 'What should I improve first in my business?']
        : []),
      ...(appContext?.pendingCount && appContext.pendingCount > 0
        ? ['How many pending transactions need review?', 'What should I clear first from pending transactions?']
        : []),
      ...(availableData.reports > 0
        ? ['What changed in my latest report?', 'Summarize my recent reports for me.']
        : []),
      ...(availableData.salesData
        ? ['Which product is most profitable?', 'Which products sell best?']
        : []),
      ...(availableData.expensesData
        ? ['What are my biggest expenses?']
        : []),
      ...(availableData.inventoryData
        ? ['How much cash is blocked in inventory?']
        : []),
    ].slice(0, 4),
    hi: [
      ...(availableData.dailyEntries > 0
        ? ['इस सप्ताह मेरा व्यवसाय कैसा चल रहा है?', 'मेरे लाभ मार्जिन को सबसे ज़्यादा क्या नुकसान पहुँचा रहा है?']
        : []),
      ...(availableData.creditEntries > 0
        ? ['मुझे आज किन ग्राहकों से फॉलो-अप करना चाहिए?', 'उधार में कितना पैसा अटका है?']
        : []),
      ...(appContext?.healthScore !== null && appContext?.healthScore !== undefined
        ? ['मेरा स्वास्थ्य स्कोर इस स्तर पर क्यों है?', 'मुझे अपने व्यवसाय में सबसे पहले क्या सुधारना चाहिए?']
        : []),
      ...(appContext?.pendingCount && appContext.pendingCount > 0
        ? ['समीक्षा के लिए कितने लंबित लेनदेन हैं?', 'लंबित लेनदेन में मुझे पहले क्या क्लियर करना चाहिए?']
        : []),
      ...(availableData.reports > 0
        ? ['मेरी नवीनतम रिपोर्ट में क्या बदला है?', 'मेरी हाल की रिपोर्टों का सार बताइए।']
        : []),
      ...(availableData.salesData
        ? ['कौन सा उत्पाद सबसे अधिक लाभदायक है?', 'कौन से उत्पाद सबसे अच्छे बिकते हैं?']
        : []),
      ...(availableData.expensesData
        ? ['मेरे सबसे बड़े खर्चे क्या हैं?']
        : []),
      ...(availableData.inventoryData
        ? ['इन्वेंटरी में कितना कैश फंसा है?']
        : []),
    ].slice(0, 4),
    mr: [
      ...(availableData.dailyEntries > 0
        ? ['या आठवड्यात माझा व्यवसाय कसा चालला आहे?', 'माझ्या नफा मार्जिनवर सर्वात जास्त परिणाम कशाचा होत आहे?']
        : []),
      ...(availableData.creditEntries > 0
        ? ['आज मला कोणाशी फॉलो-अप करायला हवा?', 'उधारीत किती पैसे अडकले आहेत?']
        : []),
      ...(appContext?.healthScore !== null && appContext?.healthScore !== undefined
        ? ['माझा हेल्थ स्कोअर या पातळीवर का आहे?', 'माझ्या व्यवसायात मी आधी काय सुधारायला हवे?']
        : []),
      ...(appContext?.pendingCount && appContext.pendingCount > 0
        ? ['पुनरावलोकनासाठी किती प्रलंबित व्यवहार आहेत?', 'प्रलंबित व्यवहारांमध्ये आधी काय क्लिअर करावे?']
        : []),
      ...(availableData.reports > 0
        ? ['माझ्या नवीनतम रिपोर्टमध्ये काय बदलले आहे?', 'माझ्या अलीकडील रिपोर्ट्सचा सारांश द्या.']
        : []),
      ...(availableData.salesData
        ? ['कोणते उत्पादन सर्वात फायदेशीर आहे?', 'कोणती उत्पादने सर्वात चांगली विकली जातात?']
        : []),
      ...(availableData.expensesData
        ? ['माझे सर्वात मोठे खर्च काय आहेत?']
        : []),
      ...(availableData.inventoryData
        ? ['इन्व्हेंटरीमध्ये किती रोख अडकली आहे?']
        : []),
    ].slice(0, 4),
  };

  const scopeText = {
    en: 'Ask about daily entries, credit follow-ups, pending items, reports, sales, expenses, and inventory.',
    hi: 'दैनिक एंट्री, उधार फॉलो-अप, लंबित आइटम, रिपोर्ट, बिक्री, खर्च और इन्वेंटरी के बारे में पूछें।',
    mr: 'दैनिक नोंदी, उधारी फॉलो-अप, प्रलंबित आयटम, रिपोर्ट, विक्री, खर्च आणि इन्व्हेंटरीबद्दल विचारा.',
  };

  const emptyStateText = {
    en: 'Add daily entries, credit records, or upload analysis CSV files to start asking questions.',
    hi: 'प्रश्न पूछना शुरू करने के लिए दैनिक एंट्री, उधार रिकॉर्ड जोड़ें या विश्लेषण CSV फ़ाइलें अपलोड करें।',
    mr: 'प्रश्न विचारायला सुरू करण्यासाठी दैनिक नोंदी, उधारी रेकॉर्ड जोडा किंवा विश्लेषण CSV फाइल्स अपलोड करा.',
  };

  const answerLabels = {
    en: { conclusion: 'Conclusion', why: 'Why', nextStep: 'Next step' },
    hi: { conclusion: 'निष्कर्ष', why: 'क्यों', nextStep: 'अगला कदम' },
    mr: { conclusion: 'निष्कर्ष', why: 'का', nextStep: 'पुढचे पाऊल' },
  };

  const dataSourceLabels: Record<Language, Record<string, string>> = {
    en: {
      daily_entries: 'Daily entries',
      credit_entries: 'Credit entries',
      pending_transactions: 'Pending transactions',
      reports: 'Reports',
      sales_csv: 'Sales CSV',
      expenses_csv: 'Expenses CSV',
      inventory_csv: 'Inventory CSV',
    },
    hi: {
      daily_entries: 'दैनिक एंट्री',
      credit_entries: 'उधार रिकॉर्ड',
      pending_transactions: 'लंबित लेनदेन',
      reports: 'रिपोर्ट',
      sales_csv: 'बिक्री CSV',
      expenses_csv: 'खर्च CSV',
      inventory_csv: 'इन्वेंटरी CSV',
    },
    mr: {
      daily_entries: 'दैनिक नोंदी',
      credit_entries: 'उधारी नोंदी',
      pending_transactions: 'प्रलंबित व्यवहार',
      reports: 'रिपोर्ट',
      sales_csv: 'विक्री CSV',
      expenses_csv: 'खर्च CSV',
      inventory_csv: 'इन्व्हेंटरी CSV',
    },
  };

  const sourceHeading = {
    en: 'Using data',
    hi: 'इस्तेमाल किया गया डेटा',
    mr: 'वापरलेला डेटा',
  };

  const conversationActions = {
    en: { newChat: 'New conversation', clearBusy: 'Clearing...' },
    hi: { newChat: 'नई बातचीत', clearBusy: 'साफ किया जा रहा है...' },
    mr: { newChat: 'नवीन संभाषण', clearBusy: 'साफ करत आहे...' },
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
    setHasHydratedInitialMessages(false);
    setMessages([]);
  }, [sessionId]);

  const sectionRank: Record<string, string[]> = {
    credit: ['credit_entries'],
    pending: ['pending_transactions'],
    reports: ['reports'],
    health: ['daily_entries'],
    analysis: ['sales_csv', 'expenses_csv', 'inventory_csv'],
  };

  const prioritizedQuestions = [...quickQuestions[language]].sort((left, right) => {
    const preferredSources = sectionRank[appContext?.activeSection || ''] || [];
    const score = (text: string) => {
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

    return score(right) - score(left);
  }).slice(0, 4);

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
    setMessages((prev) => [...prev, { role: 'user', content: userQuestion }]);
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
          { role: 'assistant', content: data.answer, sourcesUsed: data.sourcesUsed || [] },
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        {t('askQuestion', language)}
      </h2>
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-gray-600 sm:max-w-2xl">
          {scopeText[language]}
        </p>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={clearConversation}
            disabled={loading}
            className="inline-flex items-center justify-center rounded-lg border border-gray-200 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60"
          >
            {loading ? conversationActions[language].clearBusy : conversationActions[language].newChat}
          </button>
        )}
      </div>

      {/* Messages */}
      <div className="space-y-3 mb-4 max-h-[28rem] overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-4">
            {hasAnyData ? (
              <>
                <p className="text-gray-600 text-sm mb-4">
                  {t('questionPlaceholder', language)}
                </p>
                <div className="flex flex-wrap gap-2 justify-center">
                  {prioritizedQuestions.map((q, idx) => (
                    <button
                      key={idx}
                      onClick={() => askQuestion(q)}
                      disabled={loading}
                      className="px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm hover:bg-blue-100 transition-colors disabled:opacity-50"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-gray-600 text-sm">
                {emptyStateText[language]}
              </p>
            )}
          </div>
        )}

        {messages.map((msg, idx) => (
          <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {(() => {
              const structuredAnswer = msg.role === 'assistant' ? parseStructuredAnswer(msg.content) : null;
              const sourceChips = msg.sourcesUsed?.filter((source) => dataSourceLabels[language][source]);

              if (structuredAnswer) {
                return (
                  <div className="w-full max-w-full rounded-2xl border border-blue-100 bg-blue-50/70 px-4 py-3 text-gray-800 shadow-sm sm:max-w-[85%]">
                    <div className="space-y-3 text-sm">
                      {sourceChips && sourceChips.length > 0 && (
                        <div className="flex flex-wrap items-center gap-2 border-b border-blue-100 pb-3">
                          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">{sourceHeading[language]}</p>
                          {sourceChips.map((source) => (
                            <span key={source} className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-blue-700 border border-blue-100">
                              {dataSourceLabels[language][source]}
                            </span>
                          ))}
                        </div>
                      )}
                      {structuredAnswer.conclusion && (
                        <div>
                          <p className="font-semibold text-gray-900">{answerLabels[language].conclusion}</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{structuredAnswer.conclusion}</p>
                        </div>
                      )}
                      {structuredAnswer.why && (
                        <div>
                          <p className="font-semibold text-gray-900">{answerLabels[language].why}</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{structuredAnswer.why}</p>
                        </div>
                      )}
                      {structuredAnswer.nextStep && (
                        <div>
                          <p className="font-semibold text-gray-900">{answerLabels[language].nextStep}</p>
                          <p className="mt-1 whitespace-pre-wrap leading-relaxed">{structuredAnswer.nextStep}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              }

              return (
                <div
                  className={`w-full max-w-full rounded-lg px-4 py-2 sm:max-w-[80%] ${
                    msg.role === 'user'
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-100 text-gray-800'
                  }`}
                >
                  {msg.role === 'assistant' && sourceChips && sourceChips.length > 0 && (
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">{sourceHeading[language]}</p>
                      {sourceChips.map((source) => (
                        <span key={source} className="rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-blue-700 border border-blue-100">
                          {dataSourceLabels[language][source]}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                </div>
              );
            })()}
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 rounded-lg px-4 py-2">
              <p className="text-sm text-gray-600">...</p>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm mb-3">
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
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 min-h-[44px]"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading || !hasAnyData}
          className="w-full bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[44px] sm:w-auto"
        >
          {t('sendButton', language)}
        </button>
      </form>
    </div>
  );
}

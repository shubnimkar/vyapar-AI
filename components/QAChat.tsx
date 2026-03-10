'use client';

import { useState, useRef, useEffect } from 'react';
import { Language } from '@/lib/types';
import { t } from '@/lib/translations';

interface QAChatProps {
  sessionId: string;
  language: Language;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export default function QAChat({ sessionId, language }: QAChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Quick question suggestions
  const quickQuestions = {
    en: [
      'Which product is most profitable?',
      'What are my biggest expenses?',
      'How much cash is blocked in inventory?',
      'Which products sell best?',
    ],
    hi: [
      'कौन सा उत्पाद सबसे अधिक लाभदायक है?',
      'मेरे सबसे बड़े खर्चे क्या हैं?',
      'इन्वेंटरी में कितना कैश फंसा है?',
      'कौन से उत्पाद सबसे अच्छे बिकते हैं?',
    ],
    mr: [
      'कोणते उत्पादन सर्वात फायदेशीर आहे?',
      'माझे सर्वात मोठे खर्च काय आहेत?',
      'इन्व्हेंटरीमध्ये किती रोख अडकली आहे?',
      'कोणती उत्पादने सर्वात चांगली विकली जातात?',
    ],
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

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
        }),
      });

      const data = await response.json();

      if (data.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: data.answer },
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

      {/* Messages */}
      <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
        {messages.length === 0 && (
          <div className="text-center py-4">
            <p className="text-gray-600 text-sm mb-4">
              {t('questionPlaceholder', language)}
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {quickQuestions[language].map((q, idx) => (
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
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-lg px-4 py-2 ${
                msg.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
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
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder={t('questionPlaceholder', language)}
          disabled={loading}
          className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 min-h-[44px]"
        />
        <button
          type="submit"
          disabled={!question.trim() || loading}
          className="bg-blue-500 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors min-h-[44px]"
        >
          {t('sendButton', language)}
        </button>
      </form>
    </div>
  );
}

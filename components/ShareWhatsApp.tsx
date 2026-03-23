'use client';

import { BusinessInsights, Language } from '@/lib/types';
import { Button } from './ui/Button';

interface ShareWhatsAppProps {
  insights: BusinessInsights;
  language: Language;
}

export default function ShareWhatsApp({ insights, language }: ShareWhatsAppProps) {
  const cleanText = (value: string) =>
    value
      .replace(/\s+/g, ' ')
      .replace(/[*_`#>-]/g, '')
      .trim();

  const truncateAtSentence = (value: string, maxLength: number) => {
    const normalized = cleanText(value);
    if (normalized.length <= maxLength) {
      return normalized;
    }

    const shortened = normalized.slice(0, maxLength);
    const sentenceBreak = Math.max(
      shortened.lastIndexOf('. '),
      shortened.lastIndexOf('! '),
      shortened.lastIndexOf('? ')
    );

    if (sentenceBreak >= Math.floor(maxLength * 0.55)) {
      return shortened.slice(0, sentenceBreak + 1).trim();
    }

    const wordBreak = shortened.lastIndexOf(' ');
    if (wordBreak >= Math.floor(maxLength * 0.65)) {
      return `${shortened.slice(0, wordBreak).trim()}...`;
    }

    return `${shortened.trim()}...`;
  };

  const firstSentence = (value: string, maxLength: number) => {
    const normalized = cleanText(value);
    if (!normalized) {
      return '';
    }

    const sentenceMatch = normalized.match(/.+?[.!?](\s|$)/);
    if (sentenceMatch) {
      const sentence = sentenceMatch[0].trim();
      return sentence.length <= maxLength
        ? sentence
        : truncateAtSentence(sentence, maxLength);
    }

    return truncateAtSentence(normalized, maxLength);
  };

  const formatList = (items: string[], maxItems: number) => {
    const cleaned = items.map(cleanText).filter(Boolean);
    if (cleaned.length === 0) {
      return '';
    }

    return cleaned.slice(0, maxItems).join(', ');
  };

  const compactListSummary = (items: string[], maxLength: number) => {
    const raw = formatList(items, 3);
    if (!raw) {
      return '';
    }

    if (raw.includes('.') || raw.includes('!') || raw.includes('?')) {
      return firstSentence(raw, maxLength);
    }

    return raw.length <= maxLength ? raw : `${raw.slice(0, maxLength).trim()}...`;
  };

  const buildRecommendation = () => {
    const actions = [];

    if (insights.lossMakingProducts.length > 0) {
      actions.push(
        language === 'hi'
          ? 'कम चलने वाले या नुकसान देने वाले उत्पादों की समीक्षा करें'
          : language === 'mr'
          ? 'मंद विक्री किंवा तोटा देणाऱ्या उत्पादनांचा आढावा घ्या'
          : 'review slow-moving or loss-making products'
      );
    }

    if (insights.abnormalExpenses.length > 0) {
      actions.push(
        language === 'hi'
          ? 'बड़े खर्चों को दोबारा जांचें'
          : language === 'mr'
          ? 'मोठ्या खर्चांची पुन्हा तपासणी करा'
          : 'check high expenses'
      );
    }

    if (cleanText(insights.cashflowForecast)) {
      actions.push(
        language === 'hi'
          ? 'अगले 7 दिनों के कैशफ्लो पर नजर रखें'
          : language === 'mr'
          ? 'पुढील 7 दिवसांच्या रोख प्रवाहावर लक्ष ठेवा'
          : 'monitor the next 7 days of cashflow'
      );
    }

    if (actions.length === 0) {
      return language === 'hi'
        ? 'मुख्य व्यावसायिक संकेतकों की नियमित समीक्षा करें।'
        : language === 'mr'
        ? 'मुख्य व्यवसायिक संकेतकांचा नियमित आढावा घ्या.'
        : 'Review key business indicators regularly.';
    }

    const prefix =
      language === 'hi'
        ? 'अगला कदम: '
        : language === 'mr'
        ? 'पुढील पाऊल: '
        : 'Next step: ';

    const separator =
      language === 'hi' ? ' और ' : language === 'mr' ? ' आणि ' : ', and ';

    return `${prefix}${actions.join(separator)}.`;
  };

  const generateShareMessage = () => {
    const profitSummary = firstSentence(insights.trueProfitAnalysis, 120);
    const productSummary = compactListSummary(insights.lossMakingProducts, 110);
    const blockedCashSummary = firstSentence(insights.blockedInventoryCash, 110);
    const expenseSummary = firstSentence(insights.abnormalExpenses[0] || '', 110);
    const cashflowSummary = firstSentence(insights.cashflowForecast, 110);
    const recommendation = buildRecommendation();

    const messages = {
      en: [
        '*Vyapar AI Business Health Summary*',
        '',
        profitSummary ? `• *Profit:* ${profitSummary}` : '',
        productSummary ? `• *Products to review:* ${productSummary}` : '',
        blockedCashSummary ? `• *Inventory cash blocked:* ${blockedCashSummary}` : '',
        expenseSummary ? `• *Expense alert:* ${expenseSummary}` : '',
        cashflowSummary ? `• *Cashflow outlook:* ${cashflowSummary}` : '',
        '',
        recommendation,
        '',
        '_Shared from Vyapar AI_',
      ]
        .filter(Boolean)
        .join('\n'),

      hi: [
        '*Vyapar AI व्यवसाय स्वास्थ्य सारांश*',
        '',
        profitSummary ? `• *लाभ स्थिति:* ${profitSummary}` : '',
        productSummary ? `• *ध्यान देने योग्य उत्पाद:* ${productSummary}` : '',
        blockedCashSummary ? `• *स्टॉक में फंसा कैश:* ${blockedCashSummary}` : '',
        expenseSummary ? `• *खर्च अलर्ट:* ${expenseSummary}` : '',
        cashflowSummary ? `• *कैशफ्लो स्थिति:* ${cashflowSummary}` : '',
        '',
        recommendation,
        '',
        '_Vyapar AI से साझा किया गया_',
      ]
        .filter(Boolean)
        .join('\n'),

      mr: [
        '*Vyapar AI व्यवसाय आरोग्य सारांश*',
        '',
        profitSummary ? `• *नफा स्थिती:* ${profitSummary}` : '',
        productSummary ? `• *पाहण्यासारखी उत्पादने:* ${productSummary}` : '',
        blockedCashSummary ? `• *साठ्यात अडकलेली रोख:* ${blockedCashSummary}` : '',
        expenseSummary ? `• *खर्च इशारा:* ${expenseSummary}` : '',
        cashflowSummary ? `• *रोख प्रवाह स्थिती:* ${cashflowSummary}` : '',
        '',
        recommendation,
        '',
        '_Vyapar AI मधून शेअर केलेले_',
      ]
        .filter(Boolean)
        .join('\n'),
    };

    return messages[language];
  };

  const handleShare = () => {
    const message = generateShareMessage();
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    window.open(whatsappUrl, '_blank');
  };

  const buttonText =
    language === 'hi'
      ? '📱 WhatsApp पर शेयर करें'
      : language === 'mr'
      ? '📱 WhatsApp वर शेअर करा'
      : '📱 Share on WhatsApp';

  return (
    <Button
      onClick={handleShare}
      variant="secondary"
      fullWidth
      className="border-green-200 text-green-700 hover:bg-green-50"
    >
      <span className="text-2xl">💬</span>
      <span>{buttonText}</span>
    </Button>
  );
}

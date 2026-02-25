'use client';

import { BusinessInsights, Language } from '@/lib/types';

interface ShareWhatsAppProps {
  insights: BusinessInsights;
  language: Language;
}

export default function ShareWhatsApp({ insights, language }: ShareWhatsAppProps) {
  const generateShareMessage = () => {
    const messages = {
      en: `📊 *Vyapar AI Business Health Report*

💵 *True Profit:* ${insights.trueProfitAnalysis.substring(0, 100)}...

⚠️ *Loss-Making Products:* ${insights.lossMakingProducts.slice(0, 2).join(', ')}

📦 *Blocked Cash:* ${insights.blockedInventoryCash.substring(0, 80)}...

💰 *Expense Alert:* ${insights.abnormalExpenses.slice(0, 1).join('')}

📊 *Cashflow:* ${insights.cashflowForecast.substring(0, 80)}...

Get your free business health check at Vyapar AI! 🚀`,

      hi: `📊 *व्यापार AI व्यवसाय स्वास्थ्य रिपोर्ट*

💵 *असली लाभ:* ${insights.trueProfitAnalysis.substring(0, 100)}...

⚠️ *नुकसान देने वाले उत्पाद:* ${insights.lossMakingProducts.slice(0, 2).join(', ')}

📦 *फंसा हुआ कैश:* ${insights.blockedInventoryCash.substring(0, 80)}...

💰 *खर्च अलर्ट:* ${insights.abnormalExpenses.slice(0, 1).join('')}

📊 *कैशफ्लो:* ${insights.cashflowForecast.substring(0, 80)}...

व्यापार AI पर अपना मुफ्त व्यवसाय स्वास्थ्य जांच प्राप्त करें! 🚀`,

      mr: `📊 *व्यापार AI व्यवसाय आरोग्य अहवाल*

💵 *खरा नफा:* ${insights.trueProfitAnalysis.substring(0, 100)}...

⚠️ *तोटा देणारी उत्पादने:* ${insights.lossMakingProducts.slice(0, 2).join(', ')}

📦 *अडकलेली रोख:* ${insights.blockedInventoryCash.substring(0, 80)}...

💰 *खर्च अलर्ट:* ${insights.abnormalExpenses.slice(0, 1).join('')}

📊 *कॅशफ्लो:* ${insights.cashflowForecast.substring(0, 80)}...

व्यापार AI वर तुमची मोफत व्यवसाय आरोग्य तपासणी मिळवा! 🚀`,
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
    <button
      onClick={handleShare}
      className="w-full bg-green-500 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-600 transition-colors shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
    >
      <span className="text-2xl">💬</span>
      <span>{buttonText}</span>
    </button>
  );
}

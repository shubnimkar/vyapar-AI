// Translation dictionary for Vyapar AI
// Supports English, Hindi, and Marathi

import { Language } from './types';

export interface Translations {
  [key: string]: {
    en: string;
    hi: string;
    mr: string;
  };
}

export const translations: Translations = {
  // App title and branding
  appTitle: {
    en: 'Vyapar AI',
    hi: 'व्यापार AI',
    mr: 'व्यापार AI',
  },
  appSubtitle: {
    en: 'Your Business Health Assistant',
    hi: 'आपका व्यापार स्वास्थ्य सहायक',
    mr: 'तुमचा व्यवसाय आरोग्य सहाय्यक',
  },
  
  // Language selector
  selectLanguage: {
    en: 'Select Language',
    hi: 'भाषा चुनें',
    mr: 'भाषा निवडा',
  },
  
  // File upload section
  uploadCSV: {
    en: 'Upload CSV File',
    hi: 'CSV फ़ाइल अपलोड करें',
    mr: 'CSV फाइल अपलोड करा',
  },
  salesData: {
    en: 'Sales Data',
    hi: 'बिक्री डेटा',
    mr: 'विक्री डेटा',
  },
  expensesData: {
    en: 'Expenses Data',
    hi: 'खर्च डेटा',
    mr: 'खर्च डेटा',
  },
  inventoryData: {
    en: 'Inventory Data',
    hi: 'इन्वेंटरी डेटा',
    mr: 'इन्व्हेंटरी डेटा',
  },
  uploadButton: {
    en: 'Upload',
    hi: 'अपलोड करें',
    mr: 'अपलोड करा',
  },
  uploading: {
    en: 'Uploading...',
    hi: 'अपलोड हो रहा है...',
    mr: 'अपलोड होत आहे...',
  },
  
  // Analysis section
  analyzeButton: {
    en: 'Analyze My Business',
    hi: 'मेरे व्यापार का विश्लेषण करें',
    mr: 'माझ्या व्यवसायाचे विश्लेषण करा',
  },
  analyzing: {
    en: 'Analyzing...',
    hi: 'विश्लेषण हो रहा है...',
    mr: 'विश्लेषण होत आहे...',
  },
  
  // Insights section
  insights: {
    en: 'Business Insights',
    hi: 'व्यापार अंतर्दृष्टि',
    mr: 'व्यवसाय अंतर्दृष्टी',
  },
  trueProfitTitle: {
    en: 'True Profit',
    hi: 'वास्तविक लाभ',
    mr: 'खरा नफा',
  },
  lossMakingProductsTitle: {
    en: 'Loss-Making Products',
    hi: 'नुकसान देने वाले उत्पाद',
    mr: 'तोटा देणारी उत्पादने',
  },
  blockedCashTitle: {
    en: 'Blocked Cash in Inventory',
    hi: 'इन्वेंटरी में फंसा पैसा',
    mr: 'इन्व्हेंटरीमध्ये अडकलेले पैसे',
  },
  abnormalExpensesTitle: {
    en: 'Unusual Expenses',
    hi: 'असामान्य खर्च',
    mr: 'असामान्य खर्च',
  },
  cashflowForecastTitle: {
    en: '7-Day Cashflow Forecast',
    hi: '7-दिन का कैशफ्लो पूर्वानुमान',
    mr: '7-दिवसांचा कॅशफ्लो अंदाज',
  },
  listen: {
    en: 'Listen',
    hi: 'सुनें',
    mr: 'ऐका',
  },
  stop: {
    en: 'Stop',
    hi: 'रोकें',
    mr: 'थांबवा',
  },
  
  // Q&A section
  askQuestion: {
    en: 'Ask a Question',
    hi: 'प्रश्न पूछें',
    mr: 'प्रश्न विचारा',
  },
  questionPlaceholder: {
    en: 'Type your question about your business...',
    hi: 'अपने व्यापार के बारे में प्रश्न लिखें...',
    mr: 'तुमच्या व्यवसायाबद्दल प्रश्न टाइप करा...',
  },
  sendButton: {
    en: 'Send',
    hi: 'भेजें',
    mr: 'पाठवा',
  },
  voiceInput: {
    en: 'Voice Input',
    hi: 'आवाज इनपुट',
    mr: 'आवाज इनपुट',
  },
  
  // Error messages
  uploadDataFirst: {
    en: 'Please upload your business data first',
    hi: 'कृपया पहले अपना व्यापार डेटा अपलोड करें',
    mr: 'कृपया प्रथम तुमचा व्यवसाय डेटा अपलोड करा',
  },
  uploadFailed: {
    en: 'Upload failed. Please try again.',
    hi: 'अपलोड विफल। कृपया पुनः प्रयास करें।',
    mr: 'अपलोड अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },
  analysisFailed: {
    en: 'Analysis failed. Please try again.',
    hi: 'विश्लेषण विफल। कृपया पुनः प्रयास करें।',
    mr: 'विश्लेषण अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },
  questionFailed: {
    en: 'Failed to get answer. Please try again.',
    hi: 'उत्तर प्राप्त करने में विफल। कृपया पुनः प्रयास करें।',
    mr: 'उत्तर मिळवण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },
  sessionExpired: {
    en: 'Session expired. Please upload data again.',
    hi: 'सत्र समाप्त हो गया। कृपया डेटा फिर से अपलोड करें।',
    mr: 'सत्र संपले. कृपया डेटा पुन्हा अपलोड करा.',
  },
  
  // Preview
  preview: {
    en: 'Preview',
    hi: 'पूर्वावलोकन',
    mr: 'पूर्वावलोकन',
  },
  rowsUploaded: {
    en: 'rows uploaded',
    hi: 'पंक्तियाँ अपलोड की गईं',
    mr: 'ओळी अपलोड केल्या',
  },
};

/**
 * Get translated text for a key
 */
export function t(key: string, language: Language): string {
  return translations[key]?.[language] || translations[key]?.['en'] || key;
}

/**
 * Get all translations for a specific language
 */
export function getLanguageTranslations(language: Language): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const [key, value] of Object.entries(translations)) {
    result[key] = value[language];
  }
  
  return result;
}

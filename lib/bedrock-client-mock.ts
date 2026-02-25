/**
 * Mock Bedrock Client for Testing Without AWS Credentials
 * This simulates AI responses for development and testing
 */

import { Language, ActionableRecommendation, Alert, ChartData, BenchmarkData } from './types';

export async function invokeMockBedrock(
  prompt: string,
  language: Language
): Promise<string> {
  // Simulate API delay
  await new Promise((resolve) => setTimeout(resolve, 1500));

  // Check if it's an analysis request or Q&A
  const isAnalysis = prompt.includes('Analysis Required');
  const isQA = prompt.includes('Current Question');

  if (isAnalysis) {
    return generateMockAnalysis(language);
  } else if (isQA) {
    return generateMockQA(prompt, language);
  }

  return 'Mock response generated';
}

function generateMockAnalysis(language: Language): string {
  const analyses = {
    en: `**True Profit Analysis:**
Your real profit is ₹18,450 this week. While you had ₹32,700 cash coming in, ₹14,250 is tied up in inventory costs. This means your actual profit is 56% of your cash flow.

**Loss-Making Products:**
1. Sugar 1kg - Selling at ₹40 but costs ₹38. Only ₹2 profit per unit is too thin.
2. Detergent 1kg - Same selling and cost price (₹50). You're making no profit on this item.

**Blocked Inventory Cash:**
You have ₹52,850 stuck in unsold inventory. The biggest blockers are:
- Rice 1kg: ₹9,000 (200 units)
- Biscuits Pack: ₹5,000 (200 units)
- Tea Powder: ₹4,200 (120 units)

**Abnormal Expenses:**
Your rent (₹15,000) is 45% of your total expenses. This is higher than typical for shops your size. Consider negotiating or finding a cheaper location.

**7-Day Cashflow Forecast:**
Based on current patterns, you should have positive cashflow. Expected: ₹8,500 surplus. However, watch out for the rent payment next week.`,

    hi: `**असली लाभ विश्लेषण:**
आपका असली लाभ इस सप्ताह ₹18,450 है। जबकि आपके पास ₹32,700 नकद आया, ₹14,250 इन्वेंटरी लागत में फंसा है। इसका मतलब है कि आपका वास्तविक लाभ आपके कैश फ्लो का 56% है।

**नुकसान देने वाले उत्पाद:**
1. चीनी 1kg - ₹40 में बेच रहे हैं लेकिन लागत ₹38 है। प्रति यूनिट केवल ₹2 का लाभ बहुत कम है।
2. डिटर्जेंट 1kg - बिक्री और लागत मूल्य समान (₹50)। आप इस आइटम पर कोई लाभ नहीं कमा रहे हैं।

**फंसा हुआ इन्वेंटरी कैश:**
आपके पास बिना बिके माल में ₹52,850 फंसे हैं। सबसे बड़े अवरोधक हैं:
- चावल 1kg: ₹9,000 (200 यूनिट)
- बिस्कुट पैक: ₹5,000 (200 यूनिट)
- चाय पाउडर: ₹4,200 (120 यूनिट)

**असामान्य खर्चे:**
आपका किराया (₹15,000) आपके कुल खर्चों का 45% है। यह आपके आकार की दुकानों के लिए सामान्य से अधिक है। बातचीत करने या सस्ती जगह खोजने पर विचार करें।

**7-दिन का कैशफ्लो पूर्वानुमान:**
वर्तमान पैटर्न के आधार पर, आपके पास सकारात्मक कैशफ्लो होना चाहिए। अपेक्षित: ₹8,500 अधिशेष। हालांकि, अगले सप्ताह किराए के भुगतान पर नज़र रखें।`,

    mr: `**खरा नफा विश्लेषण:**
तुमचा खरा नफा या आठवड्यात ₹18,450 आहे. तुमच्याकडे ₹32,700 रोख आली असली तरी, ₹14,250 इन्व्हेंटरी खर्चात अडकली आहे. याचा अर्थ तुमचा वास्तविक नफा तुमच्या कॅश फ्लोचा 56% आहे.

**तोटा देणारी उत्पादने:**
1. साखर 1kg - ₹40 ला विकत आहात पण खर्च ₹38 आहे. प्रति युनिट फक्त ₹2 चा नफा खूप कमी आहे.
2. डिटर्जंट 1kg - विक्री आणि खर्च किंमत सारखी (₹50). तुम्ही या वस्तूवर कोणताही नफा कमावत नाही.

**अडकलेली इन्व्हेंटरी रोख:**
तुमच्याकडे न विकलेल्या मालात ₹52,850 अडकले आहेत. सर्वात मोठे अडथळे आहेत:
- तांदूळ 1kg: ₹9,000 (200 युनिट)
- बिस्किट पॅक: ₹5,000 (200 युनिट)
- चहा पावडर: ₹4,200 (120 युनिट)

**असामान्य खर्च:**
तुमचे भाडे (₹15,000) तुमच्या एकूण खर्चाचे 45% आहे. हे तुमच्या आकाराच्या दुकानांसाठी सामान्यपेक्षा जास्त आहे. वाटाघाटी करण्याचा किंवा स्वस्त जागा शोधण्याचा विचार करा.

**7-दिवसांचा कॅशफ्लो अंदाज:**
सध्याच्या पॅटर्नवर आधारित, तुमच्याकडे सकारात्मक कॅशफ्लो असावा. अपेक्षित: ₹8,500 अधिशेष. तथापि, पुढील आठवड्यात भाड्याच्या पेमेंटवर लक्ष ठेवा.`,
  };

  return analyses[language];
}

function generateMockQA(prompt: string, language: Language): string {
  // Extract question from prompt
  const questionMatch = prompt.match(/Current Question.*?:\*\*\s*(.+)/);
  const question = questionMatch ? questionMatch[1].toLowerCase() : '';

  const responses = {
    en: {
      profit: 'Based on your data, Rice 1kg is your most profitable product with ₹5 profit per unit and high sales volume (210 units sold this week).',
      product: 'Rice 1kg is your best-selling product with 210 units sold this week, generating ₹10,500 in revenue.',
      expense: 'Your biggest expense is rent at ₹15,000 per month, which is 45% of your total expenses.',
      inventory: 'You have ₹52,850 tied up in inventory. Consider reducing stock of slow-moving items like Rice (200 units) and Biscuits (200 units).',
      default: 'Based on your uploaded data, I can help you understand your business better. Try asking about your most profitable products, biggest expenses, or inventory status.',
    },
    hi: {
      profit: 'आपके डेटा के आधार पर, चावल 1kg आपका सबसे लाभदायक उत्पाद है जिसमें प्रति यूनिट ₹5 का लाभ और उच्च बिक्री मात्रा (इस सप्ताह 210 यूनिट बेचे गए) है।',
      product: 'चावल 1kg आपका सबसे अधिक बिकने वाला उत्पाद है जिसमें इस सप्ताह 210 यूनिट बेचे गए, जिससे ₹10,500 का राजस्व उत्पन्न हुआ।',
      expense: 'आपका सबसे बड़ा खर्च किराया है जो ₹15,000 प्रति माह है, जो आपके कुल खर्चों का 45% है।',
      inventory: 'आपके पास इन्वेंटरी में ₹52,850 फंसे हैं। धीमी गति से चलने वाली वस्तुओं जैसे चावल (200 यूनिट) और बिस्कुट (200 यूनिट) के स्टॉक को कम करने पर विचार करें।',
      default: 'आपके अपलोड किए गए डेटा के आधार पर, मैं आपको आपके व्यवसाय को बेहतर ढंग से समझने में मदद कर सकता हूं। अपने सबसे लाभदायक उत्पादों, सबसे बड़े खर्चों या इन्वेंटरी स्थिति के बारे में पूछने का प्रयास करें।',
    },
    mr: {
      profit: 'तुमच्या डेटावर आधारित, तांदूळ 1kg तुमचे सर्वात फायदेशीर उत्पादन आहे ज्यात प्रति युनिट ₹5 चा नफा आणि उच्च विक्री प्रमाण (या आठवड्यात 210 युनिट विकली) आहे.',
      product: 'तांदूळ 1kg तुमचे सर्वाधिक विकले जाणारे उत्पादन आहे ज्यात या आठवड्यात 210 युनिट विकली गेली, ज्यामुळे ₹10,500 चा महसूल मिळाला.',
      expense: 'तुमचा सर्वात मोठा खर्च भाडे आहे जे ₹15,000 प्रति महिना आहे, जे तुमच्या एकूण खर्चाचे 45% आहे.',
      inventory: 'तुमच्याकडे इन्व्हेंटरीमध्ये ₹52,850 अडकले आहेत. हळू चालणाऱ्या वस्तू जसे की तांदूळ (200 युनिट) आणि बिस्किट (200 युनिट) चा स्टॉक कमी करण्याचा विचार करा.',
      default: 'तुमच्या अपलोड केलेल्या डेटावर आधारित, मी तुम्हाला तुमचा व्यवसाय चांगल्या प्रकारे समजून घेण्यास मदत करू शकतो. तुमच्या सर्वात फायदेशीर उत्पादनांबद्दल, सर्वात मोठ्या खर्चांबद्दल किंवा इन्व्हेंटरी स्थितीबद्दल विचारण्याचा प्रयत्न करा.',
    },
  };

  const langResponses = responses[language];

  if (question.includes('profit') || question.includes('लाभ') || question.includes('नफा')) {
    return langResponses.profit;
  } else if (question.includes('product') || question.includes('उत्पाद')) {
    return langResponses.product;
  } else if (question.includes('expense') || question.includes('खर्च')) {
    return langResponses.expense;
  } else if (question.includes('inventory') || question.includes('इन्वेंटरी')) {
    return langResponses.inventory;
  }

  return langResponses.default;
}


/**
 * Generate actionable recommendations
 */
export function generateMockRecommendations(language: Language): ActionableRecommendation[] {
  const recommendations = {
    en: [
      {
        action: 'Increase Sugar price from ₹40 to ₹45',
        impact: 'Add ₹5 profit per unit, ₹500/month extra',
        priority: 1,
        severity: 'warning' as const,
      },
      {
        action: 'Stop stocking Detergent 1kg',
        impact: 'Free up ₹2,250 blocked cash, zero profit item',
        priority: 2,
        severity: 'critical' as const,
      },
      {
        action: 'Reduce Rice inventory by 100 units',
        impact: 'Free ₹4,500 cash, reduce storage costs',
        priority: 3,
        severity: 'warning' as const,
      },
      {
        action: 'Negotiate rent reduction or relocate',
        impact: 'Save ₹3,000-5,000/month (rent is 45% of expenses)',
        priority: 4,
        severity: 'warning' as const,
      },
    ],
    hi: [
      {
        action: 'चीनी की कीमत ₹40 से ₹45 करें',
        impact: 'प्रति यूनिट ₹5 अधिक लाभ, ₹500/माह अतिरिक्त',
        priority: 1,
        severity: 'warning' as const,
      },
      {
        action: 'डिटर्जेंट 1kg का स्टॉक बंद करें',
        impact: '₹2,250 फंसा कैश मुक्त करें, शून्य लाभ वाली वस्तु',
        priority: 2,
        severity: 'critical' as const,
      },
      {
        action: 'चावल की इन्वेंटरी 100 यूनिट कम करें',
        impact: '₹4,500 कैश मुक्त करें, भंडारण लागत कम करें',
        priority: 3,
        severity: 'warning' as const,
      },
      {
        action: 'किराया कम करवाएं या स्थान बदलें',
        impact: '₹3,000-5,000/माह बचाएं (किराया खर्चों का 45% है)',
        priority: 4,
        severity: 'warning' as const,
      },
    ],
    mr: [
      {
        action: 'साखरेची किंमत ₹40 वरून ₹45 करा',
        impact: 'प्रति युनिट ₹5 अधिक नफा, ₹500/महिना अतिरिक्त',
        priority: 1,
        severity: 'warning' as const,
      },
      {
        action: 'डिटर्जंट 1kg चा स्टॉक बंद करा',
        impact: '₹2,250 अडकलेली रोख मुक्त करा, शून्य नफा वस्तू',
        priority: 2,
        severity: 'critical' as const,
      },
      {
        action: 'तांदूळ इन्व्हेंटरी 100 युनिट कमी करा',
        impact: '₹4,500 रोख मुक्त करा, स्टोरेज खर्च कमी करा',
        priority: 3,
        severity: 'warning' as const,
      },
      {
        action: 'भाडे कमी करा किंवा जागा बदला',
        impact: '₹3,000-5,000/महिना वाचवा (भाडे खर्चाचे 45% आहे)',
        priority: 4,
        severity: 'warning' as const,
      },
    ],
  };

  return recommendations[language];
}

/**
 * Generate smart alerts
 */
export function generateMockAlerts(language: Language): Alert[] {
  const alerts = {
    en: [
      {
        type: 'cashflow' as const,
        severity: 'critical' as const,
        message: 'Cashflow alert: Only ₹8,500 surplus expected next week',
        icon: '🔴',
      },
      {
        type: 'inventory' as const,
        severity: 'warning' as const,
        message: 'Cooking Oil inventory low: Only 80 units remaining',
        icon: '🟡',
      },
      {
        type: 'expense' as const,
        severity: 'warning' as const,
        message: 'Unusual expense detected: Maintenance ₹3,000 (above normal)',
        icon: '🟡',
      },
    ],
    hi: [
      {
        type: 'cashflow' as const,
        severity: 'critical' as const,
        message: 'कैशफ्लो अलर्ट: अगले सप्ताह केवल ₹8,500 अधिशेष अपेक्षित',
        icon: '🔴',
      },
      {
        type: 'inventory' as const,
        severity: 'warning' as const,
        message: 'कुकिंग ऑयल इन्वेंटरी कम: केवल 80 यूनिट शेष',
        icon: '🟡',
      },
      {
        type: 'expense' as const,
        severity: 'warning' as const,
        message: 'असामान्य खर्च: मेंटेनेंस ₹3,000 (सामान्य से अधिक)',
        icon: '🟡',
      },
    ],
    mr: [
      {
        type: 'cashflow' as const,
        severity: 'critical' as const,
        message: 'कॅशफ्लो अलर्ट: पुढील आठवड्यात फक्त ₹8,500 अधिशेष अपेक्षित',
        icon: '🔴',
      },
      {
        type: 'inventory' as const,
        severity: 'warning' as const,
        message: 'कुकिंग ऑइल इन्व्हेंटरी कमी: फक्त 80 युनिट शिल्लक',
        icon: '🟡',
      },
      {
        type: 'expense' as const,
        severity: 'warning' as const,
        message: 'असामान्य खर्च: मेंटेनन्स ₹3,000 (सामान्यपेक्षा जास्त)',
        icon: '🟡',
      },
    ],
  };

  return alerts[language];
}

/**
 * Generate chart data
 */
export function generateMockChartData(): ChartData {
  return {
    profitTrend: {
      labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4'],
      values: [15000, 17500, 16800, 18450],
    },
    productSales: {
      labels: ['Rice', 'Wheat Flour', 'Cooking Oil', 'Tea Powder', 'Biscuits'],
      values: [10500, 4200, 5400, 3600, 3900],
    },
    expenseBreakdown: {
      labels: ['Rent', 'Wages', 'Utilities', 'Maintenance', 'Supplies', 'Transport'],
      values: [15000, 8000, 3300, 3000, 2700, 1000],
    },
    inventoryValue: {
      labels: ['Rice', 'Wheat Flour', 'Tea Powder', 'Cooking Oil', 'Biscuits', 'Others'],
      values: [9000, 5250, 4200, 8800, 5000, 20600],
    },
  };
}

/**
 * Generate benchmark data
 */
export function generateMockBenchmark(language: Language): BenchmarkData {
  const benchmarks = {
    en: {
      yourMetric: 15,
      industryAverage: 20,
      topPerformers: 28,
      metricName: 'Profit Margin',
      unit: '%',
    },
    hi: {
      yourMetric: 15,
      industryAverage: 20,
      topPerformers: 28,
      metricName: 'लाभ मार्जिन',
      unit: '%',
    },
    mr: {
      yourMetric: 15,
      industryAverage: 20,
      topPerformers: 28,
      metricName: 'नफा मार्जिन',
      unit: '%',
    },
  };

  return benchmarks[language];
}

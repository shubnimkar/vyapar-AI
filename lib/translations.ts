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

  // NEW: Trust banner
  trustBanner: {
    en: 'Your data is private. Not connected to GST or any government system.',
    hi: 'आपका डेटा निजी है। GST या किसी सरकारी सिस्टम से जुड़ा नहीं है।',
    mr: 'तुमचा डेटा खाजगी आहे। GST किंवा कोणत्याही सरकारी प्रणालीशी जोडलेला नाही.',
  },

  // NEW: Daily entry
  dailyEntry: {
    en: 'Daily Entry',
    hi: 'दैनिक प्रविष्टि',
    mr: 'दैनिक नोंद',
  },
  todaysBusiness: {
    en: "Today's Business",
    hi: 'आज का व्यापार',
    mr: 'आजचा व्यवसाय',
  },
  totalSales: {
    en: 'Total Sales Today (₹)',
    hi: 'आज की कुल बिक्री (₹)',
    mr: 'आजची एकूण विक्री (₹)',
  },
  totalExpenses: {
    en: 'Total Expenses Today (₹)',
    hi: 'आज का कुल खर्च (₹)',
    mr: 'आजचा एकूण खर्च (₹)',
  },
  cashInHand: {
    en: 'Cash in Hand (₹)',
    hi: 'हाथ में नकद (₹)',
    mr: 'हातातील रोकड (₹)',
  },
  optional: {
    en: 'Optional',
    hi: 'वैकल्पिक',
    mr: 'पर्यायी',
  },
  submitEntry: {
    en: 'Submit Entry',
    hi: 'प्रविष्टि जमा करें',
    mr: 'नोंद सबमिट करा',
  },

  // NEW: Results
  estimatedProfit: {
    en: 'Estimated Profit',
    hi: 'अनुमानित लाभ',
    mr: 'अंदाजे नफा',
  },
  expenseRatio: {
    en: 'Expense Ratio',
    hi: 'खर्च अनुपात',
    mr: 'खर्च प्रमाण',
  },
  profitMargin: {
    en: 'Profit Margin',
    hi: 'लाभ मार्जिन',
    mr: 'नफा मार्जिन',
  },

  // NEW: Health score
  healthScore: {
    en: 'Business Health Score',
    hi: 'व्यापार स्वास्थ्य स्कोर',
    mr: 'व्यवसाय आरोग्य स्कोअर',
  },
  explainScore: {
    en: 'Explain Score',
    hi: 'स्कोर समझाएं',
    mr: 'स्कोअर समजावून सांगा',
  },
  scoreBreakdown: {
    en: 'Score Breakdown',
    hi: 'स्कोर विवरण',
    mr: 'स्कोअर तपशील',
  },
  marginScore: {
    en: 'Margin Score',
    hi: 'मार्जिन स्कोर',
    mr: 'मार्जिन स्कोअर',
  },
  expenseScore: {
    en: 'Expense Score',
    hi: 'खर्च स्कोर',
    mr: 'खर्च स्कोअर',
  },
  cashScore: {
    en: 'Cash Score',
    hi: 'नकद स्कोर',
    mr: 'रोकड स्कोअर',
  },
  creditScore: {
    en: 'Credit Score',
    hi: 'उधार स्कोर',
    mr: 'उधार स्कोअर',
  },

  // NEW: Credit tracking
  creditTracking: {
    en: 'Credit Tracking (Udhaar)',
    hi: 'उधार ट्रैकिंग',
    mr: 'उधार ट्रॅकिंग',
  },
  customerName: {
    en: 'Customer Name',
    hi: 'ग्राहक का नाम',
    mr: 'ग्राहकाचे नाव',
  },
  amount: {
    en: 'Amount (₹)',
    hi: 'राशि (₹)',
    mr: 'रक्कम (₹)',
  },
  dueDate: {
    en: 'Due Date',
    hi: 'देय तिथि',
    mr: 'देय तारीख',
  },
  entryDate: {
    en: 'Entry Date',
    hi: 'प्रविष्टि तिथि',
    mr: 'नोंद तारीख',
  },
  addCredit: {
    en: 'Add Credit Entry',
    hi: 'उधार प्रविष्टि जोड़ें',
    mr: 'उधार नोंद जोडा',
  },
  totalOutstanding: {
    en: 'Total Outstanding',
    hi: 'कुल बकाया',
    mr: 'एकूण थकबाकी',
  },
  totalOverdue: {
    en: 'Total Overdue',
    hi: 'कुल अतिदेय',
    mr: 'एकूण थकीत',
  },
  overdueCustomers: {
    en: 'Overdue Customers',
    hi: 'अतिदेय ग्राहक',
    mr: 'थकीत ग्राहक',
  },
  markAsPaid: {
    en: 'Mark as Paid',
    hi: 'भुगतान किया गया चिह्नित करें',
    mr: 'पेड म्हणून चिन्हांकित करा',
  },
  paid: {
    en: 'Paid',
    hi: 'भुगतान किया गया',
    mr: 'पेड',
  },
  unpaid: {
    en: 'Unpaid',
    hi: 'अवैतनिक',
    mr: 'न भरलेले',
  },
  overdue: {
    en: 'Overdue',
    hi: 'अतिदेय',
    mr: 'थकीत',
  },
  due: {
    en: 'Due',
    hi: 'देय',
    mr: 'देय',
  },
  markPaid: {
    en: 'Mark as Paid',
    hi: 'भुगतान किया गया',
    mr: 'पेड म्हणून चिन्हांकित करा',
  },
  delete: {
    en: 'Delete',
    hi: 'हटाएं',
    mr: 'हटवा',
  },
  save: {
    en: 'Save',
    hi: 'सहेजें',
    mr: 'जतन करा',
  },
  cancel: {
    en: 'Cancel',
    hi: 'रद्द करें',
    mr: 'रद्द करा',
  },
  enterName: {
    en: 'Enter customer name',
    hi: 'ग्राहक का नाम दर्ज करें',
    mr: 'ग्राहकाचे नाव प्रविष्ट करा',
  },
  noCreditEntries: {
    en: 'No credit entries yet. Add one to start tracking.',
    hi: 'अभी तक कोई उधार प्रविष्टि नहीं। ट्रैकिंग शुरू करने के लिए एक जोड़ें।',
    mr: 'अद्याप कोणतीही उधार नोंद नाही. ट्रॅकिंग सुरू करण्यासाठी एक जोडा.',
  },
  ofSales: {
    en: 'of sales',
    hi: 'बिक्री का',
    mr: 'विक्रीचे',
  },
  quickSummary: {
    en: 'Quick Summary',
    hi: 'त्वरित सारांश',
    mr: 'द्रुत सारांश',
  },

  // NEW: Advanced mode
  advancedMode: {
    en: 'Advanced Analysis (CSV Upload)',
    hi: 'उन्नत विश्लेषण (CSV अपलोड)',
    mr: 'प्रगत विश्लेषण (CSV अपलोड)',
  },
  expandAdvanced: {
    en: 'Expand Advanced Mode',
    hi: 'उन्नत मोड विस्तृत करें',
    mr: 'प्रगत मोड विस्तृत करा',
  },
  collapseAdvanced: {
    en: 'Collapse Advanced Mode',
    hi: 'उन्नत मोड संक्षिप्त करें',
    mr: 'प्रगत मोड संकुचित करा',
  },

  // Language selector
  selectLanguage: {
    en: 'Select Language',
    hi: 'भाषा चुनें',
    mr: 'भाषा निवडा',
  },

  // Navigation
  'nav.dashboard': {
    en: 'Dashboard',
    hi: 'डैशबोर्ड',
    mr: 'डॅशबोर्ड',
  },
  'nav.entries': {
    en: 'Daily Entry',
    hi: 'दैनिक एंट्री',
    mr: 'दैनिक नोंद',
  },
  'nav.credit': {
    en: 'Credit',
    hi: 'उधारी',
    mr: 'उधार',
  },
  'nav.pending': {
    en: 'Pending',
    hi: 'लंबित',
    mr: 'प्रलंबित',
  },
  'nav.reports': {
    en: 'Reports',
    hi: 'रिपोर्ट',
    mr: 'अहवाल',
  },
  'nav.analysis': {
    en: 'Analysis',
    hi: 'विश्लेषण',
    mr: 'विश्लेषण',
  },
  'nav.chat': {
    en: 'Q&A',
    hi: 'प्रश्नोत्तर',
    mr: 'प्रश्नोत्तर',
  },
  'nav.account': {
    en: 'Account',
    hi: 'खाता',
    mr: 'खाते',
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
  sending: {
    en: 'Sending...',
    hi: 'भेज रहा है...',
    mr: 'पाठवत आहे...',
  },
  verifying: {
    en: 'Verifying...',
    hi: 'सत्यापित कर रहा है...',
    mr: 'सत्यापित करत आहे...',
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
  qaScope: {
    en: 'Ask about daily entries, credit follow-ups, pending items, reports, sales, expenses, and inventory.',
    hi: 'दैनिक एंट्री, उधार फॉलो-अप, लंबित आइटम, रिपोर्ट, बिक्री, खर्च और इन्वेंटरी के बारे में पूछें।',
    mr: 'दैनिक नोंदी, उधारी फॉलो-अप, प्रलंबित आयटम, रिपोर्ट, विक्री, खर्च आणि इन्व्हेंटरीबद्दल विचारा.',
  },
  qaEmptyState: {
    en: 'Add daily entries, credit records, or upload analysis CSV files to start asking questions.',
    hi: 'प्रश्न पूछना शुरू करने के लिए दैनिक एंट्री, उधार रिकॉर्ड जोड़ें या विश्लेषण CSV फ़ाइलें अपलोड करें।',
    mr: 'प्रश्न विचारायला सुरू करण्यासाठी दैनिक नोंदी, उधारी रेकॉर्ड जोडा किंवा विश्लेषण CSV फाइल्स अपलोड करा.',
  },
  sendButton: {
    en: 'Send',
    hi: 'भेजें',
    mr: 'पाठवा',
  },
  qaSourceHeading: {
    en: 'Using data',
    hi: 'इस्तेमाल किया गया डेटा',
    mr: 'वापरलेला डेटा',
  },
  qaNewConversation: {
    en: 'New conversation',
    hi: 'नई बातचीत',
    mr: 'नवीन संभाषण',
  },
  qaClearingConversation: {
    en: 'Clearing...',
    hi: 'साफ किया जा रहा है...',
    mr: 'साफ करत आहे...',
  },
  qaConclusion: {
    en: 'Conclusion',
    hi: 'निष्कर्ष',
    mr: 'निष्कर्ष',
  },
  qaWhy: {
    en: 'Why',
    hi: 'क्यों',
    mr: 'का',
  },
  qaNextStep: {
    en: 'Next step',
    hi: 'अगला कदम',
    mr: 'पुढचे पाऊल',
  },
  'qaSource.dailyEntries': {
    en: 'Daily entries',
    hi: 'दैनिक एंट्री',
    mr: 'दैनिक नोंदी',
  },
  'qaSource.creditEntries': {
    en: 'Credit entries',
    hi: 'उधार रिकॉर्ड',
    mr: 'उधारी नोंदी',
  },
  'qaSource.pendingTransactions': {
    en: 'Pending transactions',
    hi: 'लंबित लेनदेन',
    mr: 'प्रलंबित व्यवहार',
  },
  'qaSource.reports': {
    en: 'Reports',
    hi: 'रिपोर्ट',
    mr: 'रिपोर्ट',
  },
  'qaSource.salesCsv': {
    en: 'Sales CSV',
    hi: 'बिक्री CSV',
    mr: 'विक्री CSV',
  },
  'qaSource.expensesCsv': {
    en: 'Expenses CSV',
    hi: 'खर्च CSV',
    mr: 'खर्च CSV',
  },
  'qaSource.inventoryCsv': {
    en: 'Inventory CSV',
    hi: 'इन्वेंटरी CSV',
    mr: 'इन्व्हेंटरी CSV',
  },
  'qaQuick.businessWeek': {
    en: 'How is my business doing this week?',
    hi: 'इस सप्ताह मेरा व्यवसाय कैसा चल रहा है?',
    mr: 'या आठवड्यात माझा व्यवसाय कसा चालला आहे?',
  },
  'qaQuick.marginHurt': {
    en: 'What is hurting my profit margin most?',
    hi: 'मेरे लाभ मार्जिन को सबसे ज़्यादा क्या नुकसान पहुँचा रहा है?',
    mr: 'माझ्या नफा मार्जिनवर सर्वात जास्त परिणाम कशाचा होत आहे?',
  },
  'qaQuick.creditFollowUp': {
    en: 'Who should I follow up with today?',
    hi: 'मुझे आज किन ग्राहकों से फॉलो-अप करना चाहिए?',
    mr: 'आज मला कोणाशी फॉलो-अप करायला हवा?',
  },
  'qaQuick.creditBlocked': {
    en: 'How much money is stuck in credit?',
    hi: 'उधार में कितना पैसा अटका है?',
    mr: 'उधारीत किती पैसे अडकले आहेत?',
  },
  'qaQuick.healthWhy': {
    en: 'Why is my health score at this level?',
    hi: 'मेरा स्वास्थ्य स्कोर इस स्तर पर क्यों है?',
    mr: 'माझा हेल्थ स्कोअर या पातळीवर का आहे?',
  },
  'qaQuick.improveFirst': {
    en: 'What should I improve first in my business?',
    hi: 'मुझे अपने व्यवसाय में सबसे पहले क्या सुधारना चाहिए?',
    mr: 'माझ्या व्यवसायात मी आधी काय सुधारायला हवे?',
  },
  'qaQuick.pendingReview': {
    en: 'How many pending transactions need review?',
    hi: 'समीक्षा के लिए कितने लंबित लेनदेन हैं?',
    mr: 'पुनरावलोकनासाठी किती प्रलंबित व्यवहार आहेत?',
  },
  'qaQuick.pendingClear': {
    en: 'What should I clear first from pending transactions?',
    hi: 'लंबित लेनदेन में मुझे पहले क्या क्लियर करना चाहिए?',
    mr: 'प्रलंबित व्यवहारांमध्ये आधी काय क्लिअर करावे?',
  },
  'qaQuick.reportChanged': {
    en: 'What changed in my latest report?',
    hi: 'मेरी नवीनतम रिपोर्ट में क्या बदला है?',
    mr: 'माझ्या नवीनतम रिपोर्टमध्ये काय बदलले आहे?',
  },
  'qaQuick.reportSummary': {
    en: 'Summarize my recent reports for me.',
    hi: 'मेरी हाल की रिपोर्टों का सार बताइए।',
    mr: 'माझ्या अलीकडील रिपोर्ट्सचा सारांश द्या.',
  },
  'qaQuick.productProfit': {
    en: 'Which product is most profitable?',
    hi: 'कौन सा उत्पाद सबसे अधिक लाभदायक है?',
    mr: 'कोणते उत्पादन सर्वात फायदेशीर आहे?',
  },
  'qaQuick.productBest': {
    en: 'Which products sell best?',
    hi: 'कौन से उत्पाद सबसे अच्छे बिकते हैं?',
    mr: 'कोणती उत्पादने सर्वात चांगली विकली जातात?',
  },
  'qaQuick.biggestExpenses': {
    en: 'What are my biggest expenses?',
    hi: 'मेरे सबसे बड़े खर्चे क्या हैं?',
    mr: 'माझे सर्वात मोठे खर्च काय आहेत?',
  },
  'qaQuick.inventoryBlocked': {
    en: 'How much cash is blocked in inventory?',
    hi: 'इन्वेंटरी में कितना कैश फंसा है?',
    mr: 'इन्व्हेंटरीमध्ये किती रोख अडकली आहे?',
  },
  voiceInput: {
    en: 'Voice Input',
    hi: 'आवाज इनपुट',
    mr: 'आवाज इनपुट',
  },

  // Phone Authentication
  phoneNumber: {
    en: 'Phone Number',
    hi: 'फ़ोन नंबर',
    mr: 'फोन नंबर',
  },
  enterPhoneNumber: {
    en: 'Enter your mobile number',
    hi: 'अपना मोबाइल नंबर दर्ज करें',
    mr: 'तुमचा मोबाइल नंबर प्रविष्ट करा',
  },
  sendOTP: {
    en: 'Send OTP',
    hi: 'OTP भेजें',
    mr: 'OTP पाठवा',
  },
  verifyOTP: {
    en: 'Verify OTP',
    hi: 'OTP सत्यापित करें',
    mr: 'OTP सत्यापित करा',
  },
  resendOTP: {
    en: 'Resend OTP',
    hi: 'OTP पुनः भेजें',
    mr: 'OTP पुन्हा पाठवा',
  },
  enterOTP: {
    en: 'Enter 6-digit OTP',
    hi: '6 अंकों का OTP दर्ज करें',
    mr: '6 अंकांचा OTP प्रविष्ट करा',
  },
  otpSentTo: {
    en: 'OTP sent to',
    hi: 'OTP भेजा गया',
    mr: 'OTP पाठवला',
  },
  rememberDevice: {
    en: 'Remember this device',
    hi: 'इस डिवाइस को याद रखें',
    mr: 'हे डिव्हाइस लक्षात ठेवा',
  },
  login: {
    en: 'Login',
    hi: 'लॉगिन',
    mr: 'लॉगिन',
  },
  logout: {
    en: 'Logout',
    hi: 'लॉगआउट',
    mr: 'लॉगआउट',
  },
  profile: {
    en: 'Profile',
    hi: 'प्रोफ़ाइल',
    mr: 'प्रोफाइल',
  },
  accountCreated: {
    en: 'Account created',
    hi: 'खाता बनाया गया',
    mr: 'खाते तयार केले',
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
  qaNoData: {
    en: 'No business data is available for Q&A yet. Add daily entries, credit records, or upload analysis CSV files first.',
    hi: 'प्रश्नोत्तर के लिए अभी कोई व्यवसाय डेटा उपलब्ध नहीं है। पहले दैनिक एंट्री, उधार रिकॉर्ड जोड़ें या विश्लेषण CSV फ़ाइलें अपलोड करें।',
    mr: 'प्रश्नोत्तरासाठी अजून कोणताही व्यवसाय डेटा उपलब्ध नाही. आधी दैनिक नोंदी, उधारी रेकॉर्ड जोडा किंवा विश्लेषण CSV फाइल्स अपलोड करा.',
  },
  sessionExpired: {
    en: 'Session expired. Please upload data again.',
    hi: 'सत्र समाप्त हो गया। कृपया डेटा फिर से अपलोड करें।',
    mr: 'सत्र संपले. कृपया डेटा पुन्हा अपलोड करा.',
  },

  // Phone validation errors
  phoneInvalidFormat: {
    en: 'Please enter a valid 10-digit mobile number',
    hi: 'कृपया 10 अंकों का मोबाइल नंबर दर्ज करें',
    mr: 'कृपया 10 अंकांचा मोबाइल नंबर प्रविष्ट करा',
  },
  phoneTooShort: {
    en: 'Phone number is too short',
    hi: 'फ़ोन नंबर बहुत छोटा है',
    mr: 'फोन नंबर खूप लहान आहे',
  },
  phoneTooLong: {
    en: 'Phone number is too long',
    hi: 'फ़ोन नंबर बहुत लंबा है',
    mr: 'फोन नंबर खूप मोठा आहे',
  },
  phoneNonNumeric: {
    en: 'Phone number should contain only digits',
    hi: 'फ़ोन नंबर में केवल अंक होने चाहिए',
    mr: 'फोन नंबरमध्ये फक्त अंक असावेत',
  },

  // OTP errors
  otpInvalid: {
    en: 'Invalid OTP. Please check and try again.',
    hi: 'अमान्य OTP। कृपया जांचें और पुनः प्रयास करें।',
    mr: 'अवैध OTP. कृपया तपासा आणि पुन्हा प्रयत्न करा.',
  },
  otpExpired: {
    en: 'OTP has expired. Please request a new one.',
    hi: 'OTP समाप्त हो गया है। कृपया नया अनुरोध करें।',
    mr: 'OTP संपले आहे. कृपया नवीन विनंती करा.',
  },
  otpTooManyAttempts: {
    en: 'Too many attempts. Please request a new OTP.',
    hi: 'बहुत अधिक प्रयास। कृपया नया OTP अनुरोध करें।',
    mr: 'खूप प्रयत्न. कृपया नवीन OTP विनंती करा.',
  },
  smsDeliveryFailed: {
    en: 'Failed to send SMS. Please try again.',
    hi: 'SMS भेजने में विफल। कृपया पुनः प्रयास करें।',
    mr: 'SMS पाठवण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },
  rateLimitExceeded: {
    en: 'Too many requests. Please wait before trying again.',
    hi: 'बहुत अधिक अनुरोध। कृपया पुनः प्रयास करने से पहले प्रतीक्षा करें।',
    mr: 'खूप विनंत्या. कृपया पुन्हा प्रयत्न करण्यापूर्वी प्रतीक्षा करा.',
  },
  networkError: {
    en: 'Network error. Please check your connection.',
    hi: 'नेटवर्क त्रुटि। कृपया अपना कनेक्शन जांचें।',
    mr: 'नेटवर्क त्रुटी. कृपया तुमचे कनेक्शन तपासा.',
  },

  // Auth success messages
  otpSentSuccess: {
    en: 'OTP sent successfully',
    hi: 'OTP सफलतापूर्वक भेजा गया',
    mr: 'OTP यशस्वीरित्या पाठवला',
  },
  loginSuccess: {
    en: 'Login successful',
    hi: 'लॉगिन सफल',
    mr: 'लॉगिन यशस्वी',
  },
  logoutSuccess: {
    en: 'Logged out successfully',
    hi: 'सफलतापूर्वक लॉगआउट किया गया',
    mr: 'यशस्वीरित्या लॉगआउट केले',
  },

  // Migration messages
  migratingData: {
    en: 'Migrating your data...',
    hi: 'आपका डेटा माइग्रेट हो रहा है...',
    mr: 'तुमचा डेटा माइग्रेट होत आहे...',
  },
  migrationSuccess: {
    en: 'Data migrated successfully',
    hi: 'डेटा सफलतापूर्वक माइग्रेट किया गया',
    mr: 'डेटा यशस्वीरित्या माइग्रेट केला',
  },
  migrationFailed: {
    en: 'Data migration failed. Your data is safe, we will try again next time.',
    hi: 'डेटा माइग्रेशन विफल। आपका डेटा सुरक्षित है, हम अगली बार पुनः प्रयास करेंगे।',
    mr: 'डेटा माइग्रेशन अयशस्वी. तुमचा डेटा सुरक्षित आहे, आम्ही पुढच्या वेळी पुन्हा प्रयत्न करू.',
  },

  // Resend countdown
  resendIn: {
    en: 'Resend in',
    hi: 'पुनः भेजें',
    mr: 'पुन्हा पाठवा',
  },
  seconds: {
    en: 'seconds',
    hi: 'सेकंड',
    mr: 'सेकंद',
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

  // Profile setup
  'profile.setup.title': {
    en: 'Complete Your Profile',
    hi: 'अपनी प्रोफ़ाइल पूरी करें',
    mr: 'तुमची प्रोफाइल पूर्ण करा',
  },
  'profile.setup.shopName': {
    en: 'Shop Name',
    hi: 'दुकान का नाम',
    mr: 'दुकानाचे नाव',
  },
  'profile.setup.userName': {
    en: 'Your Name',
    hi: 'आपका नाम',
    mr: 'तुमचे नाव',
  },
  'profile.setup.language': {
    en: 'Preferred Language',
    hi: 'पसंदीदा भाषा',
    mr: 'पसंतीची भाषा',
  },
  'profile.setup.businessType': {
    en: 'Business Type',
    hi: 'व्यवसाय का प्रकार',
    mr: 'व्यवसायाचा प्रकार',
  },
  'profile.setup.city': {
    en: 'City',
    hi: 'शहर',
    mr: 'शहर',
  },
  'profile.setup.skip': {
    en: 'Skip for Now',
    hi: 'अभी छोड़ें',
    mr: 'आत्ता वगळा',
  },
  'profile.setup.complete': {
    en: 'Complete Profile',
    hi: 'प्रोफ़ाइल पूरी करें',
    mr: 'प्रोफाइल पूर्ण करा',
  },

  // Settings
  'settings.title': {
    en: 'Settings',
    hi: 'सेटिंग्स',
    mr: 'सेटिंग्ज',
  },
  'settings.profile': {
    en: 'Profile Information',
    hi: 'प्रोफ़ाइल जानकारी',
    mr: 'प्रोफाइल माहिती',
  },
  'settings.account': {
    en: 'Account Information',
    hi: 'खाता जानकारी',
    mr: 'खाते माहिती',
  },
  'settings.preferences': {
    en: 'Data Preferences',
    hi: 'डेटा प्राथमिकताएं',
    mr: 'डेटा प्राधान्ये',
  },
  'settings.retentionDays': {
    en: 'Data Retention (days)',
    hi: 'डेटा संग्रहण (दिन)',
    mr: 'डेटा संग्रहण (दिवस)',
  },
  'settings.autoArchive': {
    en: 'Auto-archive old data',
    hi: 'पुराना डेटा स्वचालित संग्रहित करें',
    mr: 'जुना डेटा स्वयं संग्रहित करा',
  },
  'settings.notifications': {
    en: 'Enable notifications',
    hi: 'सूचनाएं सक्षम करें',
    mr: 'सूचना सक्षम करा',
  },
  'settings.save': {
    en: 'Save Changes',
    hi: 'परिवर्तन सहेजें',
    mr: 'बदल जतन करा',
  },
  'settings.deleteAccount': {
    en: 'Delete Account',
    hi: 'खाता हटाएं',
    mr: 'खाते हटवा',
  },
  'settings.phone': {
    en: 'Phone',
    hi: 'फ़ोन',
    mr: 'फोन',
  },
  'settings.createdAt': {
    en: 'Member Since',
    hi: 'सदस्य बने',
    mr: 'सदस्य झाले',
  },
  'settings.lastActive': {
    en: 'Last Active',
    hi: 'अंतिम सक्रिय',
    mr: 'शेवटचे सक्रिय',
  },

  // Account deletion
  'deletion.title': {
    en: 'Delete Account',
    hi: 'खाता हटाएं',
    mr: 'खाते हटवा',
  },
  'deletion.warning': {
    en: 'This action will permanently delete your account and all associated data after 30 days. You can cancel within this period.',
    hi: 'यह क्रिया 30 दिनों के बाद आपके खाते और सभी संबंधित डेटा को स्थायी रूप से हटा देगी। आप इस अवधि के भीतर रद्द कर सकते हैं।',
    mr: 'ही क्रिया 30 दिवसांनंतर तुमचे खाते आणि सर्व संबंधित डेटा कायमचा हटवेल. तुम्ही या कालावधीत रद्द करू शकता.',
  },
  'deletion.confirm': {
    en: 'Type DELETE to confirm',
    hi: 'पुष्टि करने के लिए DELETE टाइप करें',
    mr: 'पुष्टी करण्यासाठी DELETE टाइप करा',
  },
  'deletion.scheduledFor': {
    en: 'Account deletion scheduled for',
    hi: 'खाता हटाने की तारीख',
    mr: 'खाते हटवण्याची तारीख',
  },
  'deletion.cancel': {
    en: 'Cancel Deletion',
    hi: 'हटाना रद्द करें',
    mr: 'हटवणे रद्द करा',
  },
  'deletion.confirmButton': {
    en: 'Confirm Deletion',
    hi: 'हटाना पुष्टि करें',
    mr: 'हटवणे पुष्टी करा',
  },

  // Daily Entry - New UI
  'daily.title': {
    en: 'Daily Entries',
    hi: 'दैनिक प्रविष्टियाँ',
    mr: 'दैनिक नोंदी',
  },
  'daily.addNew': {
    en: 'Add New Entry',
    hi: 'नई प्रविष्टि जोड़ें',
    mr: 'नवीन नोंद जोडा',
  },
  'daily.editEntry': {
    en: 'Edit Entry',
    hi: 'प्रविष्टि संपादित करें',
    mr: 'नोंद संपादित करा',
  },
  'daily.deleteEntry': {
    en: 'Delete Entry',
    hi: 'प्रविष्टि हटाएं',
    mr: 'नोंद हटवा',
  },
  'daily.confirmDelete': {
    en: 'Are you sure you want to delete this entry?',
    hi: 'क्या आप वाकई इस प्रविष्टि को हटाना चाहते हैं?',
    mr: 'तुम्हाला खात्री आहे की तुम्ही ही नोंद हटवू इच्छिता?',
  },
  'daily.noEntries': {
    en: 'No entries yet. Add your first daily entry to start tracking.',
    hi: 'अभी तक कोई प्रविष्टि नहीं। ट्रैकिंग शुरू करने के लिए अपनी पहली दैनिक प्रविष्टि जोड़ें।',
    mr: 'अद्याप कोणतीही नोंद नाही. ट्रॅकिंग सुरू करण्यासाठी तुमची पहिली दैनिक नोंद जोडा.',
  },
  'daily.history': {
    en: 'Entry History',
    hi: 'प्रविष्टि इतिहास',
    mr: 'नोंद इतिहास',
  },
  'daily.calendar': {
    en: 'Calendar View',
    hi: 'कैलेंडर दृश्य',
    mr: 'कॅलेंडर दृश्य',
  },
  'daily.sync': {
    en: 'Sync Now',
    hi: 'अभी सिंक करें',
    mr: 'आता सिंक करा',
  },
  'daily.syncing': {
    en: 'Syncing...',
    hi: 'सिंक हो रहा है...',
    mr: 'सिंक होत आहे...',
  },
  'daily.syncSuccess': {
    en: 'Synced successfully',
    hi: 'सफलतापूर्वक सिंक किया गया',
    mr: 'यशस्वीरित्या सिंक केले',
  },
  'daily.syncError': {
    en: 'Sync failed. Will retry later.',
    hi: 'सिंक विफल। बाद में पुनः प्रयास करेंगे।',
    mr: 'सिंक अयशस्वी. नंतर पुन्हा प्रयत्न करू.',
  },
  'daily.offlineMode': {
    en: 'Offline Mode - Changes will sync when online',
    hi: 'ऑफ़लाइन मोड - ऑनलाइन होने पर परिवर्तन सिंक होंगे',
    mr: 'ऑफलाइन मोड - ऑनलाइन असताना बदल सिंक होतील',
  },
  'daily.lastSync': {
    en: 'Last synced',
    hi: 'अंतिम सिंक',
    mr: 'शेवटचे सिंक',
  },
  'daily.pendingSync': {
    en: 'pending sync',
    hi: 'सिंक लंबित',
    mr: 'सिंक प्रलंबित',
  },
  'daily.viewDetails': {
    en: 'View Details',
    hi: 'विवरण देखें',
    mr: 'तपशील पहा',
  },
  'daily.notes': {
    en: 'Notes (Optional)',
    hi: 'नोट्स (वैकल्पिक)',
    mr: 'टिप्पण्या (पर्यायी)',
  },
  'daily.addNotes': {
    en: 'Add notes about today\'s business...',
    hi: 'आज के व्यापार के बारे में नोट्स जोड़ें...',
    mr: 'आजच्या व्यवसायाबद्दल टिप्पण्या जोडा...',
  },
  'daily.saveEntry': {
    en: 'Save Entry',
    hi: 'प्रविष्टि सहेजें',
    mr: 'नोंद जतन करा',
  },
  'daily.updateEntry': {
    en: 'Update Entry',
    hi: 'प्रविष्टि अपडेट करें',
    mr: 'नोंद अपडेट करा',
  },
  'daily.saving': {
    en: 'Saving...',
    hi: 'सहेज रहा है...',
    mr: 'जतन करत आहे...',
  },
  'daily.updating': {
    en: 'Updating...',
    hi: 'अपडेट हो रहा है...',
    mr: 'अपडेट होत आहे...',
  },
  'daily.deleting': {
    en: 'Deleting...',
    hi: 'हटा रहा है...',
    mr: 'हटवत आहे...',
  },
  'daily.entryDate': {
    en: 'Entry Date',
    hi: 'प्रविष्टि तिथि',
    mr: 'नोंद तारीख',
  },
  'daily.today': {
    en: 'Today',
    hi: 'आज',
    mr: 'आज',
  },
  'daily.yesterday': {
    en: 'Yesterday',
    hi: 'कल',
    mr: 'काल',
  },
  'daily.daysAgo': {
    en: 'days ago',
    hi: 'दिन पहले',
    mr: 'दिवसांपूर्वी',
  },
  'daily.entriesCount': {
    en: 'entries',
    hi: 'प्रविष्टियाँ',
    mr: 'नोंदी',
  },
  'daily.totalEntries': {
    en: 'Total Entries',
    hi: 'कुल प्रविष्टियाँ',
    mr: 'एकूण नोंदी',
  },

  // Business types
  'businessType.retail': {
    en: 'Retail',
    hi: 'खुदरा',
    mr: 'किरकोळ',
  },
  'businessType.wholesale': {
    en: 'Wholesale',
    hi: 'थोक',
    mr: 'घाऊक',
  },
  'businessType.services': {
    en: 'Services',
    hi: 'सेवाएं',
    mr: 'सेवा',
  },
  'businessType.manufacturing': {
    en: 'Manufacturing',
    hi: 'विनिर्माण',
    mr: 'उत्पादन',
  },
  'businessType.restaurant': {
    en: 'Restaurant',
    hi: 'रेस्टोरेंट',
    mr: 'रेस्टॉरंट',
  },
  'businessType.other': {
    en: 'Other',
    hi: 'अन्य',
    mr: 'इतर',
  },

  // Error messages
  'error.required': {
    en: 'This field is required',
    hi: 'यह फ़ील्ड आवश्यक है',
    mr: 'हे फील्ड आवश्यक आहे',
  },
  'error.invalidRetentionDays': {
    en: 'Retention days must be between 30 and 365',
    hi: 'संग्रहण दिन 30 और 365 के बीच होने चाहिए',
    mr: 'संग्रहण दिवस 30 आणि 365 दरम्यान असावेत',
  },
  'error.phoneAlreadyRegistered': {
    en: 'This phone number is already registered',
    hi: 'यह फ़ोन नंबर पहले से पंजीकृत है',
    mr: 'हा फोन नंबर आधीच नोंदणीकृत आहे',
  },
  'error.profileUpdateFailed': {
    en: 'Failed to update profile. Please try again.',
    hi: 'प्रोफ़ाइल अपडेट करने में विफल। कृपया पुनः प्रयास करें।',
    mr: 'प्रोफाइल अपडेट करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },

  // Success messages
  'success.profileUpdated': {
    en: 'Profile updated successfully',
    hi: 'प्रोफ़ाइल सफलतापूर्वक अपडेट की गई',
    mr: 'प्रोफाइल यशस्वीरित्या अपडेट केली',
  },
  'success.deletionCancelled': {
    en: 'Account deletion cancelled successfully',
    hi: 'खाता हटाना सफलतापूर्वक रद्द किया गया',
    mr: 'खाते हटवणे यशस्वीरित्या रद्द केले',
  },

  // Phone already registered
  phoneAlreadyRegistered: {
    en: 'This phone number is already registered. Please sign in instead.',
    hi: 'यह फ़ोन नंबर पहले से पंजीकृत है। कृपया साइन इन करें।',
    mr: 'हा फोन नंबर आधीच नोंदणीकृत आहे. कृपया साइन इन करा.',
  },

  // Authentication and Registration
  usernameLabel: {
    en: 'Username',
    hi: 'उपयोगकर्ता नाम',
    mr: 'वापरकर्ता नाव',
  },
  passwordLabel: {
    en: 'Password',
    hi: 'पासवर्ड',
    mr: 'पासवर्ड',
  },
  confirmPasswordLabel: {
    en: 'Confirm Password',
    hi: 'पासवर्ड की पुष्टि करें',
    mr: 'पासवर्डची पुष्टी करा',
  },
  ownerNameLabel: {
    en: 'Owner Name',
    hi: 'मालिक का नाम',
    mr: 'मालकाचे नाव',
  },
  phoneLabel: {
    en: 'Phone Number (Optional)',
    hi: 'फ़ोन नंबर (वैकल्पिक)',
    mr: 'फोन नंबर (पर्यायी)',
  },
  signupButton: {
    en: 'Create Account',
    hi: 'खाता बनाएं',
    mr: 'खाते तयार करा',
  },
  loginButton: {
    en: 'Sign In',
    hi: 'साइन इन करें',
    mr: 'साइन इन करा',
  },
  authenticationFailed: {
    en: 'Incorrect username or password. Please try again.',
    hi: 'उपयोगकर्ता नाम या पासवर्ड गलत है। कृपया दोबारा कोशिश करें।',
    mr: 'वापरकर्तानाव किंवा पासवर्ड चुकीचा आहे. कृपया पुन्हा प्रयत्न करा.',
  },
  switchToSignup: {
    en: 'Need an account? Sign up',
    hi: 'खाता चाहिए? साइन अप करें',
    mr: 'खाते आवश्यक आहे? साइन अप करा',
  },
  switchToLogin: {
    en: 'Already have an account? Sign in',
    hi: 'पहले से खाता है? साइन इन करें',
    mr: 'आधीच खाते आहे? साइन इन करा',
  },
  usernameTaken: {
    en: 'Username already taken',
    hi: 'उपयोगकर्ता नाम पहले से लिया गया है',
    mr: 'वापरकर्ता नाव आधीच घेतले आहे',
  },
  usernameAvailable: {
    en: 'Username available',
    hi: 'उपयोगकर्ता नाम उपलब्ध है',
    mr: 'वापरकर्ता नाव उपलब्ध आहे',
  },
  passwordsNoMatch: {
    en: 'Passwords do not match',
    hi: 'पासवर्ड मेल नहीं खाते',
    mr: 'पासवर्ड जुळत नाहीत',
  },
  passwordsMatch: {
    en: 'Passwords match',
    hi: 'पासवर्ड मेल खाते हैं',
    mr: 'पासवर्ड जुळतात',
  },
  weakPassword: {
    en: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number',
    hi: 'पासवर्ड कम से कम 8 अक्षर का होना चाहिए जिसमें 1 बड़ा अक्षर, 1 छोटा अक्षर और 1 संख्या हो',
    mr: 'पासवर्ड किमान 8 वर्णांचा असावा ज्यामध्ये 1 मोठे अक्षर, 1 लहान अक्षर आणि 1 संख्या असावी',
  },
  connectionError: {
    en: 'Connection error, please try again',
    hi: 'कनेक्शन त्रुटि, कृपया पुनः प्रयास करें',
    mr: 'कनेक्शन त्रुटी, कृपया पुन्हा प्रयत्न करा',
  },

  // Daily Health Coach - Suggestion translations
  'suggestions.high_credit.title': {
    en: 'Too Much Money in Credit',
    hi: 'बहुत अधिक उधार बकाया है',
    mr: 'खूप उधार थकबाकी आहे'
  },
  'suggestions.high_credit.description': {
    en: '{ratio}% of your sales is tied up in credit. Try to collect from at least 2-3 customers.',
    hi: 'आपकी बिक्री का {ratio}% उधार में फंसा है। कम से कम 2-3 ग्राहकों से भुगतान लेने की कोशिश करें।',
    mr: 'तुमच्या विक्रीचे {ratio}% उधारीत अडकले आहे. किमान 2-3 ग्राहकांकडून पैसे गोळा करण्याचा प्रयत्न करा.'
  },
  'suggestions.margin_drop.title': {
    en: 'Profit Margin is Dropping',
    hi: 'लाभ मार्जिन गिर रहा है',
    mr: 'नफा मार्जिन कमी होत आहे'
  },
  'suggestions.margin_drop.description': {
    en: 'Your margin is {current}% vs usual {avg}%. Check if expenses increased or prices need adjustment.',
    hi: 'आपका मार्जिन {current}% है जबकि सामान्य {avg}% है। जांचें कि क्या खर्च बढ़ा है या कीमतों में समायोजन की आवश्यकता है।',
    mr: 'तुमचा मार्जिन {current}% आहे तर नेहमीचा {avg}% आहे. तपासा की खर्च वाढला आहे की किंमती समायोजित करण्याची गरज आहे.'
  },
  'suggestions.low_cash.title': {
    en: 'Cash Running Low',
    hi: 'नकदी कम हो रही है',
    mr: 'रोकड कमी होत आहे'
  },
  'suggestions.low_cash.description': {
    en: 'You have only {days} days of cash buffer. Consider collecting credit or reducing expenses.',
    hi: 'आपके पास केवल {days} दिनों का नकद बफर है। उधार वसूलने या खर्च कम करने पर विचार करें।',
    mr: 'तुमच्याकडे फक्त {days} दिवसांचा रोकड बफर आहे. उधार गोळा करणे किंवा खर्च कमी करणे विचारात घ्या.'
  },
  'suggestions.healthy_state.title': {
    en: 'Business is Healthy!',
    hi: 'व्यापार स्वस्थ है!',
    mr: 'व्यवसाय निरोगी आहे!'
  },
  'suggestions.healthy_state.tip_inventory': {
    en: 'Keep it up! Consider reviewing slow-moving inventory to free up cash.',
    hi: 'बढ़िया! धीमी गति से बिकने वाली इन्वेंटरी की समीक्षा करके नकदी मुक्त करने पर विचार करें।',
    mr: 'चांगले चालू ठेवा! रोकड मुक्त करण्यासाठी हळू विकल्या जाणाऱ्या इन्व्हेंटरीचे पुनरावलोकन करा.'
  },
  'suggestions.healthy_state.tip_credit_terms': {
    en: 'Great work! You could improve cash flow by reducing credit terms from 30 to 15 days.',
    hi: 'बढ़िया काम! आप उधार की अवधि 30 से 15 दिन कम करके नकदी प्रवाह में सुधार कर सकते हैं।',
    mr: 'उत्तम काम! तुम्ही उधार कालावधी 30 वरून 15 दिवसांपर्यंत कमी करून रोकड प्रवाह सुधारू शकता.'
  },
  'suggestions.healthy_state.tip_bulk_buying': {
    en: 'Doing well! Consider bulk buying for frequently sold items to improve margins.',
    hi: 'अच्छा चल रहा है! मार्जिन सुधारने के लिए अक्सर बिकने वाली वस्तुओं की थोक खरीद पर विचार करें।',
    mr: 'चांगले चाललेय! मार्जिन सुधारण्यासाठी वारंवार विकल्या जाणाऱ्या वस्तूंची मोठ्या प्रमाणात खरेदी करा.'
  },
  'suggestions.healthy_state.tip_expense_review': {
    en: 'Excellent! Review your top 3 expenses monthly to find savings opportunities.',
    hi: 'उत्कृष्ट! बचत के अवसर खोजने के लिए अपने शीर्ष 3 खर्चों की मासिक समीक्षा करें।',
    mr: 'उत्कृष्ट! बचतीच्या संधी शोधण्यासाठी तुमच्या शीर्ष 3 खर्चांचे मासिक पुनरावलोकन करा.'
  },
  'daily.todaysSuggestion': {
    en: "Today's One Suggestion",
    hi: 'आज का एक सुझाव',
    mr: 'आजची एक सूचना'
  },
  dismiss: {
    en: 'Dismiss',
    hi: 'खारिज करें',
    mr: 'डिसमिस करा'
  },

  // Follow-Up Panel (Udhaar Follow-up Helper)
  'followUp.title': {
    en: 'Follow-up & Collections',
    hi: 'फॉलो-अप और वसूली',
    mr: 'फॉलो-अप आणि वसुली'
  },
  'followUp.noOverdue': {
    en: 'No overdue credits. Great job!',
    hi: 'कोई अतिदेय उधार नहीं। बढ़िया काम!',
    mr: 'कोणतेही थकीत उधार नाही. उत्तम काम!'
  },
  'followUp.daysOverdue': {
    en: 'days overdue',
    hi: 'दिन अतिदेय',
    mr: 'दिवस थकीत'
  },
  'followUp.sendReminder': {
    en: 'Send WhatsApp Reminder',
    hi: 'WhatsApp रिमाइंडर भेजें',
    mr: 'WhatsApp रिमाइंडर पाठवा'
  },
  'followUp.lastReminder': {
    en: 'Last reminder',
    hi: 'अंतिम रिमाइंडर',
    mr: 'शेवटचा रिमाइंडर'
  },
  'followUp.neverReminded': {
    en: 'Never reminded',
    hi: 'कभी रिमाइंडर नहीं भेजा',
    mr: 'कधीही रिमाइंडर पाठवले नाही'
  },
  'followUp.markPaid': {
    en: 'Mark as Paid',
    hi: 'भुगतान किया गया चिह्नित करें',
    mr: 'पेड म्हणून चिन्हांकित करा'
  },
  'followUp.threshold': {
    en: 'Showing credits overdue by {days}+ days',
    hi: '{days}+ दिन अतिदेय उधार दिखा रहे हैं',
    mr: '{days}+ दिवस थकीत उधार दाखवत आहे'
  },
  'followUp.totalOverdue': {
    en: 'Total Overdue',
    hi: 'कुल अतिदेय',
    mr: 'एकूण थकीत'
  },
  'followUp.oldestCredit': {
    en: 'Oldest Credit',
    hi: 'सबसे पुराना उधार',
    mr: 'सर्वात जुने उधार'
  },
  'followUp.collectionsQueue': {
    en: 'Collections Queue',
    hi: 'वसूली कतार',
    mr: 'वसुली रांग'
  },
  'followUp.collectionsSubtitle': {
    en: 'Overdue entries that need reminder or payment action.',
    hi: 'अतिदेय प्रविष्टियाँ जिन्हें रिमाइंडर या भुगतान कार्रवाई की आवश्यकता है।',
    mr: 'थकीत नोंदी ज्यांना रिमाइंडर किंवा पेमेंट कृतीची गरज आहे.'
  },
  'followUp.searchPlaceholder': {
    en: 'Search follow-ups by customer, amount, or phone...',
    hi: 'ग्राहक, राशि या फोन से फॉलो-अप खोजें...',
    mr: 'ग्राहक, रक्कम किंवा फोनने फॉलो-अप शोधा...'
  },
  'followUp.viewAll': {
    en: 'View All',
    hi: 'सभी देखें',
    mr: 'सर्व पहा'
  },
  'followUp.showLess': {
    en: 'Show Less',
    hi: 'कम दिखाएं',
    mr: 'कमी दाखवा'
  },
  'followUp.noMatching': {
    en: 'No matching follow-ups',
    hi: 'कोई मेल खाते फॉलो-अप नहीं',
    mr: 'जुळणारे फॉलो-अप नाहीत'
  },
  'followUp.tryAnotherSearch': {
    en: 'Try another search to view more follow-ups',
    hi: 'अधिक फॉलो-अप देखने के लिए दूसरा खोज शब्द आज़माएँ',
    mr: 'अधिक फॉलो-अप पाहण्यासाठी दुसरा शोध वापरून पहा'
  },
  'followUp.showingResults': {
    en: 'Showing {start} to {end} of {total} follow-ups',
    hi: '{total} फॉलो-अप में से {start} से {end} दिखा रहे हैं',
    mr: '{total} फॉलो-अपपैकी {start} ते {end} दाखवत आहे'
  },
  'followUp.synced': {
    en: 'Synced',
    hi: 'सिंक हो गया',
    mr: 'सिंक झाले'
  },
  'followUp.pendingSync': {
    en: '{count} pending',
    hi: '{count} लंबित',
    mr: '{count} प्रलंबित'
  },
  'followUp.offline': {
    en: 'Offline',
    hi: 'ऑफ़लाइन',
    mr: 'ऑफलाइन'
  },
  'followUp.syncing': {
    en: 'Syncing...',
    hi: 'सिंक हो रहा है...',
    mr: 'सिंक होत आहे...'
  },
  'followUp.loading': {
    en: 'Loading...',
    hi: 'लोड हो रहा है...',
    mr: 'लोड होत आहे...'
  },
  'followUp.networkErrorTitle': {
    en: 'Network Error',
    hi: 'नेटवर्क त्रुटि',
    mr: 'नेटवर्क त्रुटी'
  },
  'followUp.errorTitle': {
    en: 'Error',
    hi: 'त्रुटि',
    mr: 'त्रुटी'
  },
  'credit.recentActivity': {
    en: 'Recent Activity',
    hi: 'हाल की गतिविधि',
    mr: 'अलीकडील क्रियाकलाप'
  },
  'credit.totalAlerts': {
    en: 'Total Alerts',
    hi: 'कुल अलर्ट',
    mr: 'एकूण सूचना'
  },
  'credit.requiresAction': {
    en: 'REQUIRES ACTION',
    hi: 'कार्रवाई की आवश्यकता',
    mr: 'कृती आवश्यक'
  },
  'credit.updatedAgo': {
    en: 'UPDATED 5M AGO',
    hi: '5 मिनट पहले अपडेट किया गया',
    mr: '5 मिनिटांपूर्वी अपडेट केले'
  },
  'credit.criticalCount': {
    en: '3 CRITICAL',
    hi: '3 गंभीर',
    mr: '3 गंभीर'
  },
  'credit.viewAll': {
    en: 'View All',
    hi: 'सभी देखें',
    mr: 'सर्व पहा'
  },
  'credit.showLess': {
    en: 'Show Less',
    hi: 'कम दिखाएं',
    mr: 'कमी दाखवा'
  },
  'credit.status': {
    en: 'Status',
    hi: 'स्थिति',
    mr: 'स्थिती'
  },
  'credit.action': {
    en: 'Action',
    hi: 'कार्रवाई',
    mr: 'कृती'
  },
  'credit.pending': {
    en: 'Pending',
    hi: 'लंबित',
    mr: 'प्रलंबित'
  },
  'credit.showingLogs': {
    en: 'Showing {start} to {end} of {total} activity logs',
    hi: '{total} गतिविधि लॉग में से {start} से {end} दिखा रहे हैं',
    mr: '{total} क्रियाकलाप लॉगपैकी {start} ते {end} दाखवत आहे'
  },

  // WhatsApp message templates (Udhaar Follow-up Helper)
  'whatsapp.reminder.en': {
    en: 'Hello {name}, {shopReference}a gentle reminder that your payment of ₹{amount} was due on {date}. Please make the payment at your earliest convenience. Thank you.',
    hi: 'Hello {name}, {shopReference}a gentle reminder that your payment of ₹{amount} was due on {date}. Please make the payment at your earliest convenience. Thank you.',
    mr: 'Hello {name}, {shopReference}a gentle reminder that your payment of ₹{amount} was due on {date}. Please make the payment at your earliest convenience. Thank you.'
  },
  'whatsapp.reminder.hi': {
    en: 'नमस्ते {name}, {shopReference}यह एक विनम्र अनुस्मारक है कि ₹{amount} का भुगतान {date} को देय था। कृपया अपनी सुविधा अनुसार जल्द भुगतान करें। धन्यवाद।',
    hi: 'नमस्ते {name}, {shopReference}यह एक विनम्र अनुस्मारक है कि ₹{amount} का भुगतान {date} को देय था। कृपया अपनी सुविधा अनुसार जल्द भुगतान करें। धन्यवाद।',
    mr: 'नमस्ते {name}, {shopReference}यह एक विनम्र अनुस्मारक है कि ₹{amount} का भुगतान {date} को देय था। कृपया अपनी सुविधा अनुसार जल्द भुगतान करें। धन्यवाद।'
  },
  'whatsapp.reminder.mr': {
    en: 'नमस्कार {name}, {shopReference}₹{amount} चे पेमेंट {date} रोजी देय होते याची ही नम्र आठवण आहे. कृपया लवकरात लवकर पेमेंट करा. धन्यवाद.',
    hi: 'नमस्कार {name}, {shopReference}₹{amount} चे पेमेंट {date} रोजी देय होते याची ही नम्र आठवण आहे. कृपया लवकरात लवकर पेमेंट करा. धन्यवाद.',
    mr: 'नमस्कार {name}, {shopReference}₹{amount} चे पेमेंट {date} रोजी देय होते याची ही नम्र आठवण आहे. कृपया लवकरात लवकर पेमेंट करा. धन्यवाद.'
  },

  // Error messages for Follow-Up Panel
  'error.networkUnavailable': {
    en: 'Network unavailable. Changes will sync when online.',
    hi: 'नेटवर्क उपलब्ध नहीं है। ऑनलाइन होने पर परिवर्तन सिंक होंगे।',
    mr: 'नेटवर्क उपलब्ध नाही. ऑनलाइन असताना बदल सिंक होतील.',
  },
  'error.invalidPhoneNumber': {
    en: 'Invalid phone number. Please enter 10 digits.',
    hi: 'अमान्य फ़ोन नंबर। कृपया 10 अंक दर्ज करें।',
    mr: 'अवैध फोन नंबर. कृपया 10 अंक प्रविष्ट करा.',
  },
  'error.requiredField': {
    en: 'This field is required.',
    hi: 'यह फ़ील्ड आवश्यक है।',
    mr: 'हे फील्ड आवश्यक आहे.',
  },
  'error.storageQuotaExceeded': {
    en: 'Storage full. Please sync and clear old records.',
    hi: 'स्टोरेज भरा हुआ है। कृपया सिंक करें और पुराने रिकॉर्ड साफ़ करें।',
    mr: 'स्टोरेज भरले आहे. कृपया सिंक करा आणि जुने रेकॉर्ड साफ करा.',
  },
  'error.reminderFailed': {
    en: 'Failed to send reminder. Please try again.',
    hi: 'रिमाइंडर भेजने में विफल। कृपया पुनः प्रयास करें।',
    mr: 'रिमाइंडर पाठवण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },
  'error.markPaidFailed': {
    en: 'Failed to mark as paid. Please try again.',
    hi: 'भुगतान किया गया चिह्नित करने में विफल। कृपया पुनः प्रयास करें।',
    mr: 'पेड म्हणून चिन्हांकित करण्यात अयशस्वी. कृपया पुन्हा प्रयत्न करा.',
  },
  'error.syncConflict': {
    en: 'Sync conflict detected. Using latest version.',
    hi: 'सिंक विरोध का पता चला। नवीनतम संस्करण का उपयोग कर रहे हैं।',
    mr: 'सिंक संघर्ष आढळला. नवीनतम आवृत्ती वापरत आहे.',
  },
  'error.loadCreditsFailed': {
    en: 'Failed to load credits. Please refresh.',
    hi: 'उधार लोड करने में विफल। कृपया रीफ्रेश करें।',
    mr: 'उधार लोड करण्यात अयशस्वी. कृपया रीफ्रेश करा.',
  },

  // Click-to-Add Transactions - Pending Transaction Confirmation UI
  'pending.title': {
    en: 'Pending Transactions',
    hi: 'लंबित लेनदेन',
    mr: 'प्रलंबित व्यवहार',
  },
  'pending.subtitle': {
    en: 'Review and confirm transactions from receipts and CSV uploads',
    hi: 'रसीद और CSV अपलोड से लेनदेन की समीक्षा और पुष्टि करें',
    mr: 'पावती आणि CSV अपलोडमधून व्यवहारांचे पुनरावलोकन आणि पुष्टी करा',
  },
  'pending.reviewTransaction': {
    en: 'Review Transaction',
    hi: 'लेनदेन की समीक्षा करें',
    mr: 'व्यवहाराचे पुनरावलोकन करा',
  },
  'pending.of': {
    en: 'of',
    hi: 'का',
    mr: 'चा',
  },
  'pending.noTransactions': {
    en: 'No Pending Transactions',
    hi: 'कोई लंबित लेनदेन नहीं',
    mr: 'कोणतेही प्रलंबित व्यवहार नाहीत',
  },
  'pending.noTransactionsDesc': {
    en: 'Upload a receipt or CSV file to get started',
    hi: 'रसीद या CSV फ़ाइल अपलोड करें',
    mr: 'पावती किंवा CSV फाइल अपलोड करा',
  },
  'pending.source.receipt': {
    en: 'Receipt',
    hi: 'रसीद',
    mr: 'पावती',
  },
  'pending.source.csv': {
    en: 'CSV',
    hi: 'CSV',
    mr: 'CSV',
  },
  'pending.date': {
    en: 'Date',
    hi: 'तिथि',
    mr: 'तारीख',
  },
  'pending.amount': {
    en: 'Amount',
    hi: 'राशि',
    mr: 'रक्कम',
  },
  'pending.type': {
    en: 'Type',
    hi: 'प्रकार',
    mr: 'प्रकार',
  },
  'pending.type.expense': {
    en: 'Expense',
    hi: 'खर्च',
    mr: 'खर्च',
  },
  'pending.type.sale': {
    en: 'Sale',
    hi: 'बिक्री',
    mr: 'विक्री',
  },
  'pending.vendor': {
    en: 'Vendor',
    hi: 'विक्रेता',
    mr: 'विक्रेता',
  },
  'pending.vendorPlaceholder': {
    en: 'Vendor name',
    hi: 'विक्रेता का नाम',
    mr: 'विक्रेत्याचे नाव',
  },
  'pending.category': {
    en: 'Category',
    hi: 'श्रेणी',
    mr: 'श्रेणी',
  },
  'pending.categoryPlaceholder': {
    en: 'Category',
    hi: 'श्रेणी',
    mr: 'श्रेणी',
  },
  'pending.edit': {
    en: 'Edit',
    hi: 'संपादित करें',
    mr: 'संपादित करा',
  },
  'pending.discard': {
    en: 'Discard',
    hi: 'हटाएं',
    mr: 'टाकून द्या',
  },
  'pending.later': {
    en: 'Later',
    hi: 'बाद में',
    mr: 'नंतर',
  },
  'pending.add': {
    en: 'Add',
    hi: 'जोड़ें',
    mr: 'जोडा',
  },
  'pending.adding': {
    en: 'Adding...',
    hi: 'जोड़ रहे हैं...',
    mr: 'जोडत आहे...',
  },
  'pending.backToDashboard': {
    en: 'Back to Dashboard',
    hi: 'डैशबोर्ड पर वापस जाएं',
    mr: 'डॅशबोर्डवर परत जा',
  },
  'pending.pendingCount': {
    en: 'pending transaction',
    hi: 'लंबित लेनदेन',
    mr: 'प्रलंबित व्यवहार',
  },
  'pending.pendingCountPlural': {
    en: 'pending transactions',
    hi: 'लंबित लेनदेन',
    mr: 'प्रलंबित व्यवहार',
  },
  'pending.reviewSection': {
    en: 'Review Transactions',
    hi: 'लेनदेन की समीक्षा करें',
    mr: 'व्यवहारांचे पुनरावलोकन करा',
  },
  'pending.uploadSection': {
    en: 'Upload New Data',
    hi: 'नया डेटा अपलोड करें',
    mr: 'नवीन डेटा अपलोड करा',
  },

  // Click-to-Add Transactions - CSV Upload UI
  'csv.title': {
    en: 'Upload CSV File',
    hi: 'CSV फ़ाइल अपलोड करें',
    mr: 'CSV फाइल अपलोड करा',
  },
  'csv.description': {
    en: 'Import multiple transactions from a CSV file',
    hi: 'CSV फ़ाइल से कई लेनदेन आयात करें',
    mr: 'CSV फाइलमधून अनेक व्यवहार आयात करा',
  },
  'csv.dragDrop': {
    en: 'Drag and drop your CSV file here, or',
    hi: 'अपनी CSV फ़ाइल यहाँ खींचें और छोड़ें, या',
    mr: 'तुमची CSV फाइल येथे ड्रॅग आणि ड्रॉप करा, किंवा',
  },
  'csv.browse': {
    en: 'browse',
    hi: 'ब्राउज़ करें',
    mr: 'ब्राउझ करा',
  },
  'csv.maxSize': {
    en: 'Maximum file size: 5MB',
    hi: 'अधिकतम फ़ाइल आकार: 5MB',
    mr: 'कमाल फाइल आकार: 5MB',
  },
  'csv.uploading': {
    en: 'Uploading...',
    hi: 'अपलोड हो रहा है...',
    mr: 'अपलोड होत आहे...',
  },
  'csv.successTitle': {
    en: 'Upload Successful!',
    hi: 'अपलोड सफल!',
    mr: 'अपलोड यशस्वी!',
  },
  'csv.successMessage': {
    en: 'transactions imported',
    hi: 'लेनदेन आयात किए गए',
    mr: 'व्यवहार आयात केले',
  },
  'csv.validRows': {
    en: 'Valid',
    hi: 'मान्य',
    mr: 'वैध',
  },
  'csv.invalidRows': {
    en: 'Invalid',
    hi: 'अमान्य',
    mr: 'अवैध',
  },
  'csv.errorTitle': {
    en: 'Upload Failed',
    hi: 'अपलोड विफल',
    mr: 'अपलोड अयशस्वी',
  },
  'csv.tryAgain': {
    en: 'Try Again',
    hi: 'पुनः प्रयास करें',
    mr: 'पुन्हा प्रयत्न करा',
  },

  // Click-to-Add Transactions - Receipt OCR UI
  'receipt.title': {
    en: 'Upload Receipt',
    hi: 'रसीद अपलोड करें',
    mr: 'पावती अपलोड करा',
  },
  'receipt.subtitle': {
    en: 'Take a photo or upload receipt image',
    hi: 'फोटो लें या रसीद इमेज अपलोड करें',
    mr: 'फोटो घ्या किंवा पावती इमेज अपलोड करा',
  },
  'receipt.uploading': {
    en: 'Uploading...',
    hi: 'अपलोड हो रहा है...',
    mr: 'अपलोड होत आहे...',
  },
  'receipt.processing': {
    en: 'Extracting data from receipt...',
    hi: 'रसीद से डेटा निकाला जा रहा है...',
    mr: 'पावतीमधून डेटा काढला जात आहे...',
  },
  'receipt.success': {
    en: 'Data extracted successfully!',
    hi: 'डेटा सफलतापूर्वक निकाला गया!',
    mr: 'डेटा यशस्वीरित्या काढला गेला!',
  },
  'receipt.error': {
    en: 'Failed to extract data',
    hi: 'डेटा निकालने में विफल',
    mr: 'डेटा काढण्यात अयशस्वी',
  },
  'receipt.useData': {
    en: 'Use This Data',
    hi: 'इस डेटा का उपयोग करें',
    mr: 'हा डेटा वापरा',
  },
  'receipt.tryAgain': {
    en: 'Try Again',
    hi: 'पुनः प्रयास करें',
    mr: 'पुन्हा प्रयत्न करा',
  },
  'receipt.cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    mr: 'रद्द करा',
  },
  'receipt.date': {
    en: 'Date',
    hi: 'तारीख',
    mr: 'तारीख',
  },
  'receipt.amount': {
    en: 'Amount',
    hi: 'राशि',
    mr: 'रक्कम',
  },
  'receipt.vendor': {
    en: 'Vendor',
    hi: 'दुकान',
    mr: 'दुकान',
  },
  'receipt.items': {
    en: 'Items',
    hi: 'वस्तुएं',
    mr: 'वस्तू',
  },
  'receipt.clickToUpload': {
    en: 'Click to upload or take photo',
    hi: 'फोटो लेने या अपलोड करने के लिए क्लिक करें',
    mr: 'फोटो घेण्यासाठी किंवा अपलोड करण्यासाठी क्लिक करा',
  },
  'receipt.maxSize': {
    en: 'Max size: 5MB',
    hi: 'अधिकतम आकार: 5MB',
    mr: 'कमाल आकार: 5MB',
  },
  'receipt.pendingSaved': {
    en: 'Transaction added to pending review',
    hi: 'लेनदेन समीक्षा के लिए जोड़ा गया',
    mr: 'व्यवहार पुनरावलोकनासाठी जोडला',
  },
  'receipt.viewPending': {
    en: 'View Pending Transactions',
    hi: 'लंबित लेनदेन देखें',
    mr: 'प्रलंबित व्यवहार पहा',
  },
  'receipt.duplicate': {
    en: 'This transaction has already been added',
    hi: 'यह लेनदेन पहले से जोड़ा जा चुका है',
    mr: 'हा व्यवहार आधीच जोडला गेला आहे',
  },
  'receipt.uploadAnother': {
    en: 'Upload Another Receipt',
    hi: 'एक और रसीद अपलोड करें',
    mr: 'दुसरी पावती अपलोड करा',
  },

  // Click-to-Add Transactions - Error Messages
  'error.csv.invalidFileType': {
    en: 'Invalid file type. Please upload a CSV file.',
    hi: 'अमान्य फ़ाइल प्रकार। कृपया CSV फ़ाइल अपलोड करें।',
    mr: 'अवैध फाइल प्रकार. कृपया CSV फाइल अपलोड करा.',
  },
  'error.csv.fileTooLarge': {
    en: 'File too large. Maximum size is 5MB.',
    hi: 'फ़ाइल बहुत बड़ी है। अधिकतम आकार 5MB है।',
    mr: 'फाइल खूप मोठी आहे. कमाल आकार 5MB आहे.',
  },
  'error.csv.noData': {
    en: 'No valid transactions found in CSV file.',
    hi: 'CSV फ़ाइल में कोई मान्य लेनदेन नहीं मिला।',
    mr: 'CSV फाइलमध्ये कोणतेही वैध व्यवहार आढळले नाहीत.',
  },
  'error.csv.invalidHeaders': {
    en: 'CSV file must contain date, amount, and type columns.',
    hi: 'CSV फ़ाइल में तिथि, राशि और प्रकार कॉलम होने चाहिए।',
    mr: 'CSV फाइलमध्ये तारीख, रक्कम आणि प्रकार स्तंभ असणे आवश्यक आहे.',
  },
  'error.csv.tooManyRows': {
    en: 'CSV file has too many rows. Maximum is 1000 rows.',
    hi: 'CSV फ़ाइल में बहुत अधिक पंक्तियाँ हैं। अधिकतम 1000 पंक्तियाँ हैं।',
    mr: 'CSV फाइलमध्ये खूप ओळी आहेत. कमाल 1000 ओळी आहेत.',
  },
  'error.ocr.timeout': {
    en: 'Receipt processing took too long. Please try again.',
    hi: 'रसीद प्रोसेसिंग में बहुत समय लगा। कृपया पुनः प्रयास करें।',
    mr: 'पावती प्रक्रिया खूप वेळ घेत आहे. कृपया पुन्हा प्रयत्न करा.',
  },
  'error.ocr.unreadable': {
    en: 'Could not read receipt. Please ensure the image is clear and well-lit.',
    hi: 'रसीद पढ़ नहीं सकी। कृपया सुनिश्चित करें कि छवि स्पष्ट और अच्छी तरह से प्रकाशित है।',
    mr: 'पावती वाचता आली नाही. कृपया प्रतिमा स्पष्ट आणि चांगल्या प्रकाशात असल्याची खात्री करा.',
  },
  'error.ocr.noData': {
    en: 'No transaction data found in receipt.',
    hi: 'रसीद में कोई लेनदेन डेटा नहीं मिला।',
    mr: 'पावतीमध्ये व्यवहार डेटा आढळला नाही.',
  },
  'error.ocr.serviceError': {
    en: 'Receipt processing service temporarily unavailable.',
    hi: 'रसीद प्रोसेसिंग सेवा अस्थायी रूप से अनुपलब्ध है।',
    mr: 'पावती प्रक्रिया सेवा तात्पुरती अनुपलब्ध आहे.',
  },
  'error.ocr.invalidFile': {
    en: 'Invalid file format. Please upload JPEG, PNG, or HEIC image.',
    hi: 'अमान्य फ़ाइल प्रारूप। कृपया JPEG, PNG, या HEIC छवि अपलोड करें।',
    mr: 'अवैध फाइल स्वरूप. कृपया JPEG, PNG, किंवा HEIC प्रतिमा अपलोड करा.',
  },
  'error.ocr.fileTooLarge': {
    en: 'Image file too large. Maximum size is 10MB.',
    hi: 'छवि फ़ाइल बहुत बड़ी है। अधिकतम आकार 10MB है।',
    mr: 'प्रतिमा फाइल खूप मोठी आहे. कमाल आकार 10MB आहे.',
  },
  'error.transaction.duplicate': {
    en: 'This transaction has already been added.',
    hi: 'यह लेनदेन पहले से जोड़ा जा चुका है।',
    mr: 'हा व्यवहार आधीच जोडला गेला आहे.',
  },
  'error.transaction.storageFull': {
    en: 'Cannot add more transactions. Please review pending transactions first.',
    hi: 'अधिक लेनदेन नहीं जोड़ सकते। कृपया पहले लंबित लेनदेन की समीक्षा करें।',
    mr: 'अधिक व्यवहार जोडू शकत नाही. कृपया प्रथम प्रलंबित व्यवहारांचे पुनरावलोकन करा.',
  },
  'error.transaction.notFound': {
    en: 'Transaction not found.',
    hi: 'लेनदेन नहीं मिला।',
    mr: 'व्यवहार सापडला नाही.',
  },
  'error.transaction.syncFailed': {
    en: 'Failed to sync transaction. Will retry when online.',
    hi: 'लेनदेन सिंक करने में विफल। ऑनलाइन होने पर पुनः प्रयास करेंगे।',
    mr: 'व्यवहार सिंक करण्यात अयशस्वी. ऑनलाइन असताना पुन्हा प्रयत्न करू.',
  },

  // Click-to-Add Transactions - Success Messages
  'success.csv.uploaded': {
    en: 'CSV file uploaded successfully',
    hi: 'CSV फ़ाइल सफलतापूर्वक अपलोड की गई',
    mr: 'CSV फाइल यशस्वीरित्या अपलोड केली',
  },
  'success.receipt.uploaded': {
    en: 'Receipt uploaded successfully',
    hi: 'रसीद सफलतापूर्वक अपलोड की गई',
    mr: 'पावती यशस्वीरित्या अपलोड केली',
  },
  'success.transaction.added': {
    en: 'Transaction added successfully',
    hi: 'लेनदेन सफलतापूर्वक जोड़ा गया',
    mr: 'व्यवहार यशस्वीरित्या जोडला',
  },
  'success.transaction.deferred': {
    en: 'Transaction deferred for later review',
    hi: 'लेनदेन बाद में समीक्षा के लिए स्थगित किया गया',
    mr: 'व्यवहार नंतरच्या पुनरावलोकनासाठी स्थगित केला',
  },
  'success.transaction.discarded': {
    en: 'Transaction discarded',
    hi: 'लेनदेन हटाया गया',
    mr: 'व्यवहार टाकून दिला',
  },

  // Click-to-Add Transactions - Info/Tips
  'info.tip': {
    en: 'Tip',
    hi: 'सुझाव',
    mr: 'टीप',
  },
  'info.uploadTip': {
    en: 'You can upload receipt photos or CSV files. The system will automatically extract transaction details.',
    hi: 'आप रसीद की तस्वीरें या CSV फ़ाइलें अपलोड कर सकते हैं। सिस्टम स्वचालित रूप से लेनदेन विवरण निकालेगा।',
    mr: 'तुम्ही पावतीचे फोटो किंवा CSV फाइल्स अपलोड करू शकता. सिस्टम आपोआप व्यवहार तपशील काढेल.',
  },

  // UI Component Translations
  // Button component
  'ui.button.loading': {
    en: 'Loading...',
    hi: 'लोड हो रहा है...',
    mr: 'लोड होत आहे...',
  },
  'ui.button.submit': {
    en: 'Submit',
    hi: 'जमा करें',
    mr: 'सबमिट करा',
  },
  'ui.button.cancel': {
    en: 'Cancel',
    hi: 'रद्द करें',
    mr: 'रद्द करा',
  },
  'ui.button.save': {
    en: 'Save',
    hi: 'सहेजें',
    mr: 'जतन करा',
  },
  'ui.button.delete': {
    en: 'Delete',
    hi: 'हटाएं',
    mr: 'हटवा',
  },
  'ui.button.edit': {
    en: 'Edit',
    hi: 'संपादित करें',
    mr: 'संपादित करा',
  },
  'ui.button.close': {
    en: 'Close',
    hi: 'बंद करें',
    mr: 'बंद करा',
  },
  'ui.button.back': {
    en: 'Back',
    hi: 'वापस',
    mr: 'मागे',
  },
  'ui.button.previous': {
    en: 'Previous',
    hi: 'पिछला',
    mr: 'मागील',
  },
  'ui.button.next': {
    en: 'Next',
    hi: 'अगला',
    mr: 'पुढे',
  },
  'ui.button.tryAgain': {
    en: 'Try Again',
    hi: 'पुनः प्रयास करें',
    mr: 'पुन्हा प्रयत्न करा',
  },
  'ui.button.goBack': {
    en: 'Go Back',
    hi: 'वापस जाएं',
    mr: 'मागे जा',
  },

  // Input component
  'ui.input.required': {
    en: 'Required',
    hi: 'आवश्यक',
    mr: 'आवश्यक',
  },
  'ui.input.optional': {
    en: 'Optional',
    hi: 'वैकल्पिक',
    mr: 'पर्यायी',
  },
  'ui.input.placeholder': {
    en: 'Enter value',
    hi: 'मान दर्ज करें',
    mr: 'मूल्य प्रविष्ट करा',
  },

  // Toast notifications
  'ui.toast.success': {
    en: 'Success',
    hi: 'सफलता',
    mr: 'यश',
  },
  'ui.toast.error': {
    en: 'Error',
    hi: 'त्रुटि',
    mr: 'त्रुटी',
  },
  'ui.toast.warning': {
    en: 'Warning',
    hi: 'चेतावनी',
    mr: 'चेतावणी',
  },
  'ui.toast.info': {
    en: 'Info',
    hi: 'जानकारी',
    mr: 'माहिती',
  },

  // Empty state
  'ui.emptyState.noData': {
    en: 'No data available',
    hi: 'कोई डेटा उपलब्ध नहीं',
    mr: 'डेटा उपलब्ध नाही',
  },
  'ui.emptyState.noResults': {
    en: 'No results found',
    hi: 'कोई परिणाम नहीं मिला',
    mr: 'परिणाम सापडले नाहीत',
  },
  'ui.emptyState.getStarted': {
    en: 'Get Started',
    hi: 'शुरू करें',
    mr: 'सुरू करा',
  },

  // Error state
  'ui.errorState.title': {
    en: 'Something went wrong',
    hi: 'कुछ गलत हो गया',
    mr: 'काहीतरी चूक झाली',
  },
  'ui.errorState.message': {
    en: 'An error occurred. Please try again.',
    hi: 'एक त्रुटि हुई। कृपया पुनः प्रयास करें।',
    mr: 'त्रुटी आली. कृपया पुन्हा प्रयत्न करा.',
  },

  // Loading state
  'ui.loading.title': {
    en: 'Loading',
    hi: 'लोड हो रहा है',
    mr: 'लोड होत आहे',
  },
  'ui.loading.pleaseWait': {
    en: 'Please wait...',
    hi: 'कृपया प्रतीक्षा करें...',
    mr: 'कृपया प्रतीक्षा करा...',
  },

  // Navigation
  'ui.nav.dashboard': {
    en: 'Dashboard',
    hi: 'डैशबोर्ड',
    mr: 'डॅशबोर्ड',
  },
  'ui.nav.entries': {
    en: 'Daily Entry',
    hi: 'दैनिक एंट्री',
    mr: 'दैनिक नोंद',
  },
  'ui.nav.credit': {
    en: 'Credit',
    hi: 'उधारी',
    mr: 'उधार',
  },
  'ui.nav.pending': {
    en: 'Pending',
    hi: 'लंबित',
    mr: 'प्रलंबित',
  },
  'ui.nav.analysis': {
    en: 'Analysis',
    hi: 'विश्लेषण',
    mr: 'विश्लेषण',
  },
  'ui.nav.chat': {
    en: 'Q&A',
    hi: 'प्रश्नोत्तर',
    mr: 'प्रश्नोत्तर',
  },
  'ui.nav.account': {
    en: 'Account',
    hi: 'खाता',
    mr: 'खाते',
  },
  'ui.nav.reports': {
    en: 'Reports',
    hi: 'रिपोर्ट',
    mr: 'अहवाल',
  },

  // PWA UI
  'ui.pwa.install': {
    en: 'Install',
    hi: 'इंस्टॉल करें',
    mr: 'इंस्टॉल करा',
  },
  'ui.pwa.installTitle': {
    en: 'Install Vyapar AI',
    hi: 'व्यापार AI इंस्टॉल करें',
    mr: 'व्यापार AI इंस्टॉल करा',
  },
  'ui.pwa.installMessage': {
    en: 'Get quick access and work offline. Install our app for the best experience!',
    hi: 'त्वरित पहुंच प्राप्त करें और ऑफ़लाइन काम करें। सर्वोत्तम अनुभव के लिए हमारा ऐप इंस्टॉल करें!',
    mr: 'जलद प्रवेश मिळवा आणि ऑफलाइन काम करा. सर्वोत्तम अनुभवासाठी आमचे अॅप इंस्टॉल करा!',
  },
  'ui.pwa.updateAvailable': {
    en: 'Update Available',
    hi: 'अपडेट उपलब्ध',
    mr: 'अपडेट उपलब्ध',
  },
  'ui.pwa.updateMessage': {
    en: 'A new version of Vyapar AI is ready. Update now to get the latest features and improvements.',
    hi: 'व्यापार AI का एक नया संस्करण तैयार है। नवीनतम सुविधाओं और सुधारों को प्राप्त करने के लिए अभी अपडेट करें।',
    mr: 'व्यापार AI ची नवीन आवृत्ती तयार आहे. नवीनतम वैशिष्ट्ये आणि सुधारणा मिळवण्यासाठी आता अपडेट करा.',
  },
  'ui.pwa.updateNow': {
    en: 'Update Now',
    hi: 'अभी अपडेट करें',
    mr: 'आता अपडेट करा',
  },
  'ui.pwa.later': {
    en: 'Later',
    hi: 'बाद में',
    mr: 'नंतर',
  },
  'ui.pwa.offline': {
    en: 'Offline',
    hi: 'ऑफ़लाइन',
    mr: 'ऑफलाइन',
  },
  'ui.pwa.online': {
    en: 'Online',
    hi: 'ऑनलाइन',
    mr: 'ऑनलाइन',
  },
  'ui.pwa.syncing': {
    en: 'Syncing',
    hi: 'सिंक हो रहा है',
    mr: 'सिंक होत आहे',
  },
  'ui.pwa.offlineTitle': {
    en: "You're Offline",
    hi: 'आप ऑफ़लाइन हैं',
    mr: 'तुम्ही ऑफलाइन आहात',
  },
  'ui.pwa.offlineMessage': {
    en: "It looks like you've lost your internet connection. Don't worry, Vyapar AI works offline!",
    hi: 'ऐसा लगता है कि आपने अपना इंटरनेट कनेक्शन खो दिया है। चिंता न करें, व्यापार AI ऑफ़लाइन काम करता है!',
    mr: 'असे दिसते की तुम्ही तुमचे इंटरनेट कनेक्शन गमावले आहे. काळजी करू नका, व्यापार AI ऑफलाइन काम करते!',
  },
  'ui.pwa.offlineFeatures': {
    en: 'Available Offline',
    hi: 'ऑफ़लाइन उपलब्ध',
    mr: 'ऑफलाइन उपलब्ध',
  },
  'ui.pwa.goToDashboard': {
    en: 'Go to Dashboard',
    hi: 'डैशबोर्ड पर जाएं',
    mr: 'डॅशबोर्डवर जा',
  },

  // Badge
  'ui.badge.new': {
    en: 'New',
    hi: 'नया',
    mr: 'नवीन',
  },
  'ui.badge.pending': {
    en: 'Pending',
    hi: 'लंबित',
    mr: 'प्रलंबित',
  },

  // Progress
  'ui.progress.complete': {
    en: 'Complete',
    hi: 'पूर्ण',
    mr: 'पूर्ण',
  },
  'ui.progress.inProgress': {
    en: 'In Progress',
    hi: 'प्रगति में',
    mr: 'प्रगतीत',
  },

  // Financial Stress & Affordability Check (user-facing names)
  'indices.stressIndex': {
    // Shown as the card title and section heading for the stress index.
    // Keep wording very simple and direct.
    en: 'Financial Stress',
    hi: 'पैसों का तनाव',
    mr: 'आर्थिक ताण'
  },
  'indices.affordabilityIndex': {
    // Shown on the Purchase Planner card and headings.
    // Phrase it as a question that matches the user’s intent.
    en: 'Can I afford this?',
    hi: 'क्या मैं यह खरीद सकता हूँ?',
    mr: 'मी हे परवडवू शकतो का?'
  },
  'indices.score': {
    en: 'Score',
    hi: 'स्कोर',
    mr: 'स्कोअर'
  },
  'indices.breakdown': {
    en: 'Breakdown',
    hi: 'विवरण',
    mr: 'तपशील'
  },
  'indices.showBreakdown': {
    en: 'Show Breakdown',
    hi: 'विवरण दिखाएं',
    mr: 'तपशील दाखवा'
  },
  'indices.hideBreakdown': {
    en: 'Hide Breakdown',
    hi: 'विवरण छुपाएं',
    mr: 'तपशील लपवा'
  },
  'indices.creditRatio': {
    en: 'Credit Ratio',
    hi: 'उधार अनुपात',
    mr: 'उधार प्रमाण'
  },
  'indices.cashBuffer': {
    en: 'Cash Buffer',
    hi: 'नकद बफर',
    mr: 'रोकड बफर'
  },
  'indices.expenseVolatility': {
    en: 'Expense Volatility',
    hi: 'खर्च अस्थिरता',
    mr: 'खर्च अस्थिरता'
  },
  'indices.calculatedAt': {
    en: 'Calculated at',
    hi: 'गणना की गई',
    mr: 'गणना केली'
  },
  'indices.plannedExpense': {
    en: 'Planned Expense',
    hi: 'नियोजित खर्च',
    mr: 'नियोजित खर्च'
  },
  'indices.enterAmount': {
    en: 'Enter amount',
    hi: 'राशि दर्ज करें',
    mr: 'रक्कम प्रविष्ट करा'
  },
  'indices.checkAffordability': {
    en: 'Check Affordability',
    hi: 'सामर्थ्य जांचें',
    mr: 'परवडणारा तपासा'
  },
  'indices.checking': {
    en: 'Checking...',
    hi: 'जांच रहा है...',
    mr: 'तपासत आहे...'
  },
  'indices.costToProfitRatio': {
    en: 'Cost to Profit Ratio',
    hi: 'लाभ के लिए लागत अनुपात',
    mr: 'नफ्यासाठी खर्च प्रमाण'
  },
  'indices.avgMonthlyProfit': {
    en: 'Avg Monthly Profit',
    hi: 'औसत मासिक लाभ',
    mr: 'सरासरी मासिक नफा'
  },
  'indices.category': {
    en: 'Category',
    hi: 'श्रेणी',
    mr: 'श्रेणी'
  },
  'indices.category.easilyAffordable': {
    en: 'Easily Affordable',
    hi: 'आसानी से सामर्थ्य',
    mr: 'सहज परवडणारे'
  },
  'indices.category.affordable': {
    en: 'Affordable',
    hi: 'सामर्थ्य',
    mr: 'परवडणारे'
  },
  'indices.category.stretch': {
    en: 'Stretch',
    hi: 'खिंचाव',
    mr: 'ताणलेले'
  },
  'indices.category.risky': {
    en: 'Risky',
    hi: 'जोखिम भरा',
    mr: 'धोकादायक'
  },
  'indices.category.notRecommended': {
    en: 'Not Recommended',
    hi: 'अनुशंसित नहीं',
    mr: 'शिफारस केलेले नाही'
  },
  'indices.explain': {
    en: 'Explain',
    hi: 'समझाएं',
    mr: 'समजावून सांगा'
  },
  'indices.explaining': {
    en: 'Explaining...',
    hi: 'समझा रहा है...',
    mr: 'समजावत आहे...'
  },
  'indices.aiExplanation': {
    en: 'AI Explanation',
    hi: 'AI स्पष्टीकरण',
    mr: 'AI स्पष्टीकरण'
  },
  'indices.close': {
    en: 'Close',
    hi: 'बंद करें',
    mr: 'बंद करा'
  },
  'indices.syncStatus.online': {
    en: 'Online',
    hi: 'ऑनलाइन',
    mr: 'ऑनलाइन'
  },
  'indices.syncStatus.offline': {
    en: 'Offline',
    hi: 'ऑफ़लाइन',
    mr: 'ऑफलाइन'
  },
  'indices.syncStatus.syncing': {
    en: 'Syncing...',
    hi: 'सिंक हो रहा है...',
    mr: 'सिंक होत आहे...'
  },
  'indices.insufficientData': {
    en: 'Need at least 7 days of data to calculate indices',
    hi: 'सूचकांक की गणना के लिए कम से कम 7 दिनों के डेटा की आवश्यकता है',
    mr: 'निर्देशांक मोजण्यासाठी किमान 7 दिवसांचा डेटा आवश्यक आहे'
  },
  'indices.addMoreData': {
    en: 'Add more daily entries to see your financial health metrics',
    hi: 'अपने वित्तीय स्वास्थ्य मेट्रिक्स देखने के लिए अधिक दैनिक प्रविष्टियाँ जोड़ें',
    mr: 'तुमचे आर्थिक आरोग्य मेट्रिक्स पाहण्यासाठी अधिक दैनिक नोंदी जोडा'
  },
  'indices.error': {
    en: 'Error calculating indices',
    hi: 'सूचकांक की गणना में त्रुटि',
    mr: 'निर्देशांक मोजण्यात त्रुटी'
  },
  'indices.invalidAmount': {
    en: 'Please enter a valid positive amount',
    hi: 'कृपया एक मान्य सकारात्मक राशि दर्ज करें',
    mr: 'कृपया वैध सकारात्मक रक्कम प्रविष्ट करा'
  },

  // Segment Benchmark translations
  'benchmark.title': {
    en: 'Business Benchmark',
    hi: 'व्यापार तुलना',
    mr: 'व्यवसाय तुलना'
  },
  'benchmark.healthScore': {
    en: 'Health Score',
    hi: 'स्वास्थ्य स्कोर',
    mr: 'आरोग्य स्कोअर'
  },
  'benchmark.profitMargin': {
    en: 'Profit Margin',
    hi: 'लाभ मार्जिन',
    mr: 'नफा मार्जिन'
  },
  'benchmark.yourBusiness': {
    en: 'Your Business',
    hi: 'आपका व्यापार',
    mr: 'तुमचा व्यवसाय'
  },
  'benchmark.segmentAverage': {
    en: 'Similar Businesses',
    hi: 'समान व्यापार',
    mr: 'समान व्यवसाय'
  },
  'benchmark.category.above_average': {
    en: 'Above Average',
    hi: 'औसत से ऊपर',
    mr: 'सरासरीपेक्षा जास्त'
  },
  'benchmark.category.at_average': {
    en: 'At Average',
    hi: 'औसत पर',
    mr: 'सरासरी'
  },
  'benchmark.category.below_average': {
    en: 'Below Average',
    hi: 'औसत से नीचे',
    mr: 'सरासरीपेक्षा कमी'
  },
  'benchmark.sampleSize': {
    en: 'Based on {count} businesses',
    hi: '{count} व्यापारों के आधार पर',
    mr: '{count} व्यवसायांवर आधारित'
  },
  'benchmark.limitedData': {
    en: 'Limited data - comparison may not be representative',
    hi: 'सीमित डेटा - तुलना प्रतिनिधि नहीं हो सकती',
    mr: 'मर्यादित डेटा - तुलना प्रतिनिधी नसू शकते'
  },
  'benchmark.staleData': {
    en: 'Data is {days} days old',
    hi: 'डेटा {days} दिन पुराना है',
    mr: 'डेटा {days} दिवस जुना आहे'
  },
  'benchmark.noData': {
    en: 'No comparison data available. Complete your profile to see benchmarks.',
    hi: 'कोई तुलना डेटा उपलब्ध नहीं है। बेंचमार्क देखने के लिए अपनी प्रोफ़ाइल पूरी करें।',
    mr: 'तुलना डेटा उपलब्ध नाही. बेंचमार्क पाहण्यासाठी तुमची प्रोफाइल पूर्ण करा.'
  },
  'benchmark.profileIncomplete': {
    en: 'Complete your profile (city tier and business type) to see benchmarks',
    hi: 'बेंचमार्क देखने के लिए अपनी प्रोफ़ाइल (शहर स्तर और व्यवसाय प्रकार) पूरी करें',
    mr: 'बेंचमार्क पाहण्यासाठी तुमची प्रोफाइल (शहर स्तर आणि व्यवसाय प्रकार) पूर्ण करा'
  },
  'benchmark.noDailyEntries': {
    en: 'Add daily entries to see your benchmark comparison',
    hi: 'अपनी बेंचमार्क तुलना देखने के लिए दैनिक प्रविष्टियाँ जोड़ें',
    mr: 'तुमची बेंचमार्क तुलना पाहण्यासाठी दैनिक नोंदी जोडा'
  },
  'benchmark.segmentUnavailable': {
    en: 'Benchmark data not available for your segment',
    hi: 'आपके खंड के लिए बेंचमार्क डेटा उपलब्ध नहीं है',
    mr: 'तुमच्या विभागासाठी बेंचमार्क डेटा उपलब्ध नाही'
  },
  'benchmark.getAiExplanation': {
    en: 'Get AI Insights',
    hi: 'AI इनसाइट्स देखें',
    mr: 'AI इनसाइट्स पाहा'
  },
  'benchmark.aiExplanation': {
    en: 'AI Explanation',
    hi: 'AI व्याख्या',
    mr: 'AI स्पष्टीकरण'
  },
  'benchmark.hide': {
    en: 'Hide',
    hi: 'छुपाएं',
    mr: 'लपवा'
  },

  // Benchmark component error messages
  'error.loginRequired': {
    en: 'Please log in to get AI explanation',
    hi: 'AI व्याख्या प्राप्त करने के लिए कृपया लॉग इन करें',
    mr: 'AI स्पष्टीकरण मिळवण्यासाठी कृपया लॉग इन करा'
  },
  'error.aiExplanationUnavailable': {
    en: 'AI explanation temporarily unavailable',
    hi: 'AI व्याख्या अस्थायी रूप से अनुपलब्ध है',
    mr: 'AI स्पष्टीकरण तात्पुरते अनुपलब्ध आहे'
  },

  // Offline Page translations
  'offline.viewCachedEntries': {
    en: 'View cached daily entries',
    hi: 'कैश की गई दैनिक प्रविष्टियाँ देखें',
    mr: 'कॅश केलेल्या दैनिक नोंदी पहा'
  },
  'offline.addNewEntries': {
    en: 'Add new entries (will sync when online)',
    hi: 'नई प्रविष्टियाँ जोड़ें (ऑनलाइन होने पर सिंक होंगी)',
    mr: 'नवीन नोंदी जोडा (ऑनलाइन असताना सिंक होतील)'
  },
  'offline.viewHealthScore': {
    en: 'View health score and indices',
    hi: 'स्वास्थ्य स्कोर और सूचकांक देखें',
    mr: 'आरोग्य स्कोअर आणि निर्देशांक पहा'
  },
  'offline.manageCredit': {
    en: 'Manage credit entries',
    hi: 'उधार प्रविष्टियाँ प्रबंधित करें',
    mr: 'उधार नोंदी व्यवस्थापित करा'
  },
  'offline.autoSyncMessage': {
    en: "Your data will automatically sync when you're back online",
    hi: 'ऑनलाइन होने पर आपका डेटा स्वचालित रूप से सिंक हो जाएगा',
    mr: 'तुम्ही ऑनलाइन परत आल्यावर तुमचा डेटा आपोआप सिंक होईल'
  },
};

/**
 * Get translated text for a key
 */
export function t(key: string, language: Language): string {
  // Runtime validation: ensure translations object exists and is properly initialized
  if (!translations || typeof translations !== 'object' || Object.keys(translations).length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[Translation Error] translations object is not defined, not an object, or empty');
    }
    return key;
  }

  // Check if the key exists in translations using hasOwnProperty for safer access
  if (!Object.prototype.hasOwnProperty.call(translations, key)) {
    if (process.env.NODE_ENV === 'development' && key.startsWith('benchmark.')) {
      console.warn(`[Translation Warning] Missing translation for key: ${key}`);
    }
    return key;
  }

  const translationEntry = translations[key];

  // Validate translation entry structure
  if (!translationEntry || typeof translationEntry !== 'object') {
    if (process.env.NODE_ENV === 'development' && key.startsWith('benchmark.')) {
      console.warn(`[Translation Warning] Invalid translation entry for key: ${key}`);
    }
    return key;
  }

  // Try requested language first with explicit property check
  let translatedText: string | undefined;

  if (Object.prototype.hasOwnProperty.call(translationEntry, language)) {
    translatedText = translationEntry[language];
  } else if (Object.prototype.hasOwnProperty.call(translationEntry, 'en')) {
    // Fallback to English
    translatedText = translationEntry['en'];
  }

  // Additional validation: ensure we got a non-empty string
  if (typeof translatedText !== 'string' || translatedText.length === 0) {
    if (process.env.NODE_ENV === 'development') {
      console.warn(`[Translation Warning] Empty or invalid translation for key: ${key}, language: ${language}`);
    }
    return key;
  }

  return translatedText;
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

/**
 * Error message translations for standardized error responses
 */
export const errorTranslations: Translations = {
  'errors.authRequired': {
    en: 'Authentication required. Please log in.',
    hi: 'प्रमाणीकरण आवश्यक है। कृपया लॉग इन करें।',
    mr: 'प्रमाणीकरण आवश्यक आहे. कृपया लॉग इन करा.'
  },
  'errors.invalidInput': {
    en: 'Invalid input. Please check your data.',
    hi: 'अमान्य इनपुट। कृपया अपना डेटा जांचें।',
    mr: 'अवैध इनपुट. कृपया तुमचा डेटा तपासा.'
  },
  'errors.usernameTaken': {
    en: 'Username already taken.',
    hi: 'उपयोगकर्ता नाम पहले से लिया गया है।',
    mr: 'वापरकर्तानाव आधीच घेतले आहे.'
  },
  'errors.weakPassword': {
    en: 'Password must be at least 8 characters with 1 uppercase, 1 lowercase, and 1 number.',
    hi: 'पासवर्ड कम से कम 8 अक्षरों का होना चाहिए जिसमें 1 बड़ा अक्षर, 1 छोटा अक्षर और 1 संख्या हो।',
    mr: 'पासवर्ड किमान 8 वर्णांचा असावा ज्यामध्ये 1 मोठे अक्षर, 1 लहान अक्षर आणि 1 संख्या असावी.'
  },
  'errors.invalidUsername': {
    en: 'Username must be 3-20 characters and contain only letters, numbers, and underscores.',
    hi: 'उपयोगकर्ता नाम 3-20 अक्षरों का होना चाहिए और केवल अक्षर, संख्या और अंडरस्कोर होने चाहिए।',
    mr: 'वापरकर्तानाव 3-20 वर्णांचे असावे आणि फक्त अक्षरे, संख्या आणि अंडरस्कोर असावेत.'
  },
  'errors.missingRequiredFields': {
    en: 'Required fields are missing.',
    hi: 'आवश्यक फ़ील्ड गायब हैं।',
    mr: 'आवश्यक फील्ड गहाळ आहेत.'
  },
  'errors.invalidFieldLength': {
    en: 'Field length is invalid.',
    hi: 'फ़ील्ड की लंबाई अमान्य है।',
    mr: 'फील्ड लांबी अवैध आहे.'
  },
  'errors.notFound': {
    en: 'Resource not found.',
    hi: 'संसाधन नहीं मिला।',
    mr: 'संसाधन सापडले नाही.'
  },
  'errors.serverError': {
    en: 'Server error. Please try again later.',
    hi: 'सर्वर त्रुटि। कृपया बाद में पुनः प्रयास करें।',
    mr: 'सर्व्हर त्रुटी. कृपया नंतर पुन्हा प्रयत्न करा.'
  },
  'errors.rateLimitExceeded': {
    en: 'Too many requests. Please wait and try again.',
    hi: 'बहुत अधिक अनुरोध। कृपया प्रतीक्षा करें और पुनः प्रयास करें।',
    mr: 'खूप विनंत्या. कृपया प्रतीक्षा करा आणि पुन्हा प्रयत्न करा.'
  },
  'errors.bodyTooLarge': {
    en: 'Request too large. Please reduce file size.',
    hi: 'अनुरोध बहुत बड़ा है। कृपया फ़ाइल का आकार कम करें।',
    mr: 'विनंती खूप मोठी आहे. कृपया फाइल आकार कमी करा.'
  },
  'errors.bedrockError': {
    en: 'AI service error. Please try again.',
    hi: 'AI सेवा त्रुटि। कृपया पुनः प्रयास करें।',
    mr: 'AI सेवा त्रुटी. कृपया पुन्हा प्रयत्न करा.'
  },
  'errors.dynamodbError': {
    en: 'Database error. Please try again.',
    hi: 'डेटाबेस त्रुटि। कृपया पुनः प्रयास करें।',
    mr: 'डेटाबेस त्रुटी. कृपया पुन्हा प्रयत्न करा.'
  },
  'errors.ocrTimeout': {
    en: 'Receipt processing took too long. Please try again.',
    hi: 'रसीद प्रोसेसिंग में बहुत समय लगा। कृपया पुनः प्रयास करें।',
    mr: 'पावती प्रक्रिया खूप वेळ घेत आहे. कृपया पुन्हा प्रयत्न करा.'
  },
  'errors.ocrUnreadable': {
    en: 'Could not read receipt. Please ensure the image is clear and well-lit.',
    hi: 'रसीद पढ़ नहीं सकी। कृपया सुनिश्चित करें कि छवि स्पष्ट और अच्छी तरह से प्रकाशित है।',
    mr: 'पावती वाचता आली नाही. कृपया प्रतिमा स्पष्ट आणि चांगल्या प्रकाशात असल्याची खात्री करा.'
  },
  'errors.ocrNoData': {
    en: 'No transaction data found in receipt.',
    hi: 'रसीद में कोई लेनदेन डेटा नहीं मिला।',
    mr: 'पावतीमध्ये व्यवहार डेटा आढळला नाही.'
  },
  'errors.ocrServiceError': {
    en: 'Receipt processing service temporarily unavailable.',
    hi: 'रसीद प्रोसेसिंग सेवा अस्थायी रूप से अनुपलब्ध है।',
    mr: 'पावती प्रक्रिया सेवा तात्पुरती अनुपलब्ध आहे.'
  },
  'errors.insufficientData': {
    en: 'Insufficient data to calculate indices. Please add at least 7 days of daily entries.',
    hi: 'सूचकांक की गणना के लिए अपर्याप्त डेटा। कृपया कम से कम 7 दिनों की दैनिक प्रविष्टियाँ जोड़ें।',
    mr: 'निर्देशांक मोजण्यासाठी अपुरा डेटा. कृपया किमान 7 दिवसांच्या दैनिक नोंदी जोडा.'
  },
  'errors.profileNotFound': {
    en: 'Profile not found. Please complete your profile.',
    hi: 'प्रोफ़ाइल नहीं मिली। कृपया अपनी प्रोफ़ाइल पूरी करें।',
    mr: 'प्रोफाइल सापडली नाही. कृपया तुमची प्रोफाइल पूर्ण करा.'
  },
  'errors.sessionNotFound': {
    en: 'This analysis session has expired. Please upload your CSV data again.',
    hi: 'यह विश्लेषण सत्र समाप्त हो चुका है। कृपया अपना CSV डेटा फिर से अपलोड करें।',
    mr: 'हे विश्लेषण सत्र संपले आहे. कृपया तुमचा CSV डेटा पुन्हा अपलोड करा.',
  },

  // AI Provider Fallback Error Messages
  'errors.aiUnavailable': {
    en: 'AI service temporarily unavailable. Please try again later.',
    hi: 'AI सेवा अस्थायी रूप से अनुपलब्ध है। कृपया बाद में पुनः प्रयास करें।',
    mr: 'AI सेवा तात्पुरती अनुपलब्ध आहे. कृपया नंतर पुन्हा प्रयत्न करा.'
  },
  'errors.aiRateLimited': {
    en: 'Too many AI requests. Please wait a moment and try again.',
    hi: 'बहुत सारे AI अनुरोध। कृपया एक क्षण प्रतीक्षा करें और पुनः प्रयास करें।',
    mr: 'खूप AI विनंत्या. कृपया थोडा वेळ थांबा आणि पुन्हा प्रयत्न करा.'
  },
  'errors.aiTimeout': {
    en: 'AI request timed out. Please try again.',
    hi: 'AI अनुरोध समय समाप्त हो गया। कृपया पुनः प्रयास करें।',
    mr: 'AI विनंती कालबाह्य झाली. कृपया पुन्हा प्रयत्न करा.'
  },
  'errors.aiAuthFailed': {
    en: 'AI service authentication failed. Please contact support.',
    hi: 'AI सेवा प्रमाणीकरण विफल रहा। कृपया सहायता से संपर्क करें।',
    mr: 'AI सेवा प्रमाणीकरण अयशस्वी झाले. कृपया समर्थनाशी संपर्क साधा.'
  },

  // Financial Health Meter & Purchase Planner translations (formerly Stress & Affordability Index)
  'indices.stressIndex': {
    en: 'Financial Health Meter',
    hi: 'आर्थिक सेहत',
    mr: 'आर्थिक आरोग्य'
  },
  'indices.affordabilityIndex': {
    en: 'Purchase Planner',
    hi: 'खरीदारी योजना',
    mr: 'खरेदी योजना'
  },
  'indices.score': {
    en: 'Score',
    hi: 'स्कोर',
    mr: 'स्कोअर'
  },
  'indices.breakdown': {
    en: 'Breakdown',
    hi: 'विवरण',
    mr: 'तपशील'
  },
  'indices.showBreakdown': {
    en: 'Show Breakdown',
    hi: 'विवरण दिखाएं',
    mr: 'तपशील दाखवा'
  },
  'indices.hideBreakdown': {
    en: 'Hide Breakdown',
    hi: 'विवरण छुपाएं',
    mr: 'तपशील लपवा'
  },
  'indices.creditRatio': {
    en: 'Credit Ratio',
    hi: 'उधार अनुपात',
    mr: 'उधार प्रमाण'
  },
  'indices.cashBuffer': {
    en: 'Cash Buffer',
    hi: 'नकद बफर',
    mr: 'रोकड बफर'
  },
  'indices.expenseVolatility': {
    en: 'Expense Volatility',
    hi: 'खर्च अस्थिरता',
    mr: 'खर्च अस्थिरता'
  },
  'indices.calculatedAt': {
    en: 'Calculated at',
    hi: 'गणना की गई',
    mr: 'गणना केली'
  },
  'indices.plannedExpense': {
    en: 'Planned Expense',
    hi: 'नियोजित खर्च',
    mr: 'नियोजित खर्च'
  },
  'indices.enterAmount': {
    en: 'Enter amount',
    hi: 'राशि दर्ज करें',
    mr: 'रक्कम प्रविष्ट करा'
  },
  'indices.checkAffordability': {
    en: 'Check Affordability',
    hi: 'सामर्थ्य जांचें',
    mr: 'परवडणारा तपासा'
  },
  'indices.checking': {
    en: 'Checking...',
    hi: 'जांच रहा है...',
    mr: 'तपासत आहे...'
  },
  'indices.costToProfitRatio': {
    en: 'Cost to Profit Ratio',
    hi: 'लाभ के लिए लागत अनुपात',
    mr: 'नफ्यासाठी खर्च प्रमाण'
  },
  'indices.avgMonthlyProfit': {
    en: 'Avg Monthly Profit',
    hi: 'औसत मासिक लाभ',
    mr: 'सरासरी मासिक नफा'
  },
  'indices.category': {
    en: 'Category',
    hi: 'श्रेणी',
    mr: 'श्रेणी'
  },
  'indices.category.easilyAffordable': {
    en: 'Easily Affordable',
    hi: 'आसानी से सामर्थ्य',
    mr: 'सहज परवडणारे'
  },
  'indices.category.affordable': {
    en: 'Affordable',
    hi: 'सामर्थ्य',
    mr: 'परवडणारे'
  },
  'indices.category.stretch': {
    en: 'Stretch',
    hi: 'खिंचाव',
    mr: 'ताणलेले'
  },
  'indices.category.risky': {
    en: 'Risky',
    hi: 'जोखिम भरा',
    mr: 'धोकादायक'
  },
  'indices.category.notRecommended': {
    en: 'Not Recommended',
    hi: 'अनुशंसित नहीं',
    mr: 'शिफारस केलेले नाही'
  },
  'indices.explain': {
    en: 'Explain',
    hi: 'समझाएं',
    mr: 'समजावून सांगा'
  },
  'indices.explaining': {
    en: 'Explaining...',
    hi: 'समझा रहा है...',
    mr: 'समजावत आहे...'
  },
  'indices.aiExplanation': {
    en: 'AI Explanation',
    hi: 'AI स्पष्टीकरण',
    mr: 'AI स्पष्टीकरण'
  },
  'indices.close': {
    en: 'Close',
    hi: 'बंद करें',
    mr: 'बंद करा'
  },
  'indices.syncStatus.online': {
    en: 'Online',
    hi: 'ऑनलाइन',
    mr: 'ऑनलाइन'
  },
  'indices.syncStatus.offline': {
    en: 'Offline',
    hi: 'ऑफ़लाइन',
    mr: 'ऑफलाइन'
  },
  'indices.syncStatus.syncing': {
    en: 'Syncing...',
    hi: 'सिंक हो रहा है...',
    mr: 'सिंक होत आहे...'
  },
  'indices.insufficientData': {
    en: 'Need at least 7 days of data to calculate indices',
    hi: 'सूचकांक की गणना के लिए कम से कम 7 दिनों के डेटा की आवश्यकता है',
    mr: 'निर्देशांक मोजण्यासाठी किमान 7 दिवसांचा डेटा आवश्यक आहे'
  },
  'indices.addMoreData': {
    en: 'Add more daily entries to see your financial health metrics',
    hi: 'अपने वित्तीय स्वास्थ्य मेट्रिक्स देखने के लिए अधिक दैनिक प्रविष्टियाँ जोड़ें',
    mr: 'तुमचे आर्थिक आरोग्य मेट्रिक्स पाहण्यासाठी अधिक दैनिक नोंदी जोडा'
  },
  'indices.error': {
    en: 'Error calculating indices',
    hi: 'सूचकांक की गणना में त्रुटि',
    mr: 'निर्देशांक मोजण्यात त्रुटी'
  },
  'indices.invalidAmount': {
    en: 'Please enter a valid positive amount',
    hi: 'कृपया एक मान्य सकारात्मक राशि दर्ज करें',
    mr: 'कृपया वैध सकारात्मक रक्कम प्रविष्ट करा'
  },
};

/**
 * Get error message in specified language with fallback to English
 * 
 * @param key - Translation key for error message (e.g., 'errors.authRequired')
 * @param language - User's preferred language
 * @returns Translated error message
 */
export function getErrorMessage(key: string, language: Language): string {
  const translations = errorTranslations[key];

  if (!translations) {
    return 'An error occurred';
  }

  return translations[language] || translations.en;
}

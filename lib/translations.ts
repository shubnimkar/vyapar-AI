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
  }
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

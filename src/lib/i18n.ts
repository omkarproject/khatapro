/**
 * SmartKhata Pro Internationalization (i18n) & Multi-Currency Engine
 * Supports searchable Indian regional languages & global currencies.
 */

export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  region: string;
  searchTerms: string;
}

export const SUPPORTED_LANGUAGES: LanguageOption[] = [
  { code: 'en', name: 'English', nativeName: 'English', region: 'Global / India', searchTerms: 'english en inglish default angrezi' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', region: 'North / Central India', searchTerms: 'hindi hi devanagari hindustani हिन्दी हिंदी' },
  { code: 'hi-en', name: 'Hinglish', nativeName: 'Hinglish (हिन्दी + English)', region: 'India Wide', searchTerms: 'hinglish mix casual vyapar devanagari roman' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', region: 'Gujarat', searchTerms: 'gujarati gu gujrat vyapar dhandho વેપાર ગુજરાતી' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', region: 'Maharashtra', searchTerms: 'marathi mr maharashtra mumbai pune vyavahar मराठी' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', region: 'West Bengal', searchTerms: 'bengali bangla bn kolkata byabsha বাংলা' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', region: 'Punjab', searchTerms: 'punjabi pa punjab gurmukhi karobar ਪੰਜਾਬੀ' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', region: 'Tamil Nadu', searchTerms: 'tamil ta chennai vanigam தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', region: 'Andhra / Telangana', searchTerms: 'telugu te hyderabad vyaparam తెలుగు' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', region: 'Karnataka', searchTerms: 'kannada kn bengaluru vyavahara ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', region: 'Kerala', searchTerms: 'malayalam ml kerala kachavadam മലയാളം' },
  { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', region: 'Odisha', searchTerms: 'odia oriya or odisha bhubaneswar byabasa ଓଡ଼ିଆ' },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', region: 'India Wide', searchTerms: 'urdu ur delhi lucknow karobar tijarat اردو' },
  { code: 'as', name: 'Assamese', nativeName: 'অসমীয়া', region: 'Assam / North East', searchTerms: 'assamese as assam guwahati byakhya অসমীয়া' },
  { code: 'bho', name: 'Bhojpuri', nativeName: 'भोजपुरी', region: 'Bihar / Eastern UP', searchTerms: 'bhojpuri bho bihar purvanchal patna भोजपुरी' },
  { code: 'mwr', name: 'Marwari / Rajasthani', nativeName: 'मारवाड़ी', region: 'Rajasthan', searchTerms: 'marwari rajasthani mwr dhandha hisab मारवाड़ी' },
];

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  locale: string;
  flag: string;
  searchTerms: string;
}

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'INR', symbol: '₹', name: 'Indian Rupee (INR)', locale: 'en-IN', flag: '🇮🇳', searchTerms: 'inr rupee rupya ₹ india bharat paise' },
  { code: 'USD', symbol: '$', name: 'US Dollar (USD)', locale: 'en-US', flag: '🇺🇸', searchTerms: 'usd dollar $ usa united states america buck cents' },
  { code: 'EUR', symbol: '€', name: 'Euro (EUR)', locale: 'de-DE', flag: '🇪🇺', searchTerms: 'eur euro € europe eu germany france italy spain' },
  { code: 'GBP', symbol: '£', name: 'British Pound (GBP)', locale: 'en-GB', flag: '🇬🇧', searchTerms: 'gbp pound £ uk united kingdom london sterling pence' },
  { code: 'AED', symbol: 'د.إ', name: 'UAE Dirham (AED)', locale: 'ar-AE', flag: '🇦🇪', searchTerms: 'aed dirham dubai uae emirates abu dhabi د.إ' },
  { code: 'SAR', symbol: '﷼', name: 'Saudi Riyal (SAR)', locale: 'ar-SA', flag: '🇸🇦', searchTerms: 'sar riyal saudi arabia riyadh makkah ﷼' },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CAD)', locale: 'en-CA', flag: '🇨🇦', searchTerms: 'cad dollar canada toronto vancouver ca$' },
  { code: 'AUD', symbol: 'AU$', name: 'Australian Dollar (AUD)', locale: 'en-AU', flag: '🇦🇺', searchTerms: 'aud dollar australia sydney melbourne au$' },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (SGD)', locale: 'en-SG', flag: '🇸🇬', searchTerms: 'sgd dollar singapore s$' },
  { code: 'BDT', symbol: '৳', name: 'Bangladeshi Taka (BDT)', locale: 'bn-BD', flag: '🇧🇩', searchTerms: 'bdt taka bangladesh dhaka ৳ poisha' },
  { code: 'NPR', symbol: '₨', name: 'Nepalese Rupee (NPR)', locale: 'ne-NP', flag: '🇳🇵', searchTerms: 'npr rupee nepal kathmandu ₨ paisa' },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen (JPY)', locale: 'ja-JP', flag: '🇯🇵', searchTerms: 'jpy yen japan tokyo ¥' },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan (CNY)', locale: 'zh-CN', flag: '🇨🇳', searchTerms: 'cny yuan china beijing rmb ¥' },
];

/**
 * Returns currently active currency option
 */
export function getActiveCurrency(): CurrencyOption {
  if (typeof window !== 'undefined') {
    try {
      const code = localStorage.getItem('khatapro_currency') || 'INR';
      const found = SUPPORTED_CURRENCIES.find((c) => c.code === code);
      if (found) return found;
    } catch {}
  }
  return SUPPORTED_CURRENCIES[0]; // Default INR
}

/**
 * Sets user currency preference
 */
export function setActiveCurrency(currencyCode: string): CurrencyOption {
  const item = SUPPORTED_CURRENCIES.find((c) => c.code === currencyCode) || SUPPORTED_CURRENCIES[0];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('khatapro_currency', item.code);
      localStorage.setItem('khatapro_currency_symbol', item.symbol);
      window.dispatchEvent(new Event('khatapro_currency_changed'));
    } catch {}
  }
  return item;
}

/**
 * Returns currently active language option
 */
export function getActiveLanguage(): LanguageOption {
  if (typeof window !== 'undefined') {
    try {
      const code = localStorage.getItem('khatapro_language') || 'en';
      const found = SUPPORTED_LANGUAGES.find((l) => l.code === code);
      if (found) return found;
    } catch {}
  }
  return SUPPORTED_LANGUAGES[0]; // Default English
}

/**
 * Sets user language preference
 */
export function setActiveLanguage(langCode: string): LanguageOption {
  const item = SUPPORTED_LANGUAGES.find((l) => l.code === langCode) || SUPPORTED_LANGUAGES[0];
  if (typeof window !== 'undefined') {
    try {
      localStorage.setItem('khatapro_language', item.code);
      window.dispatchEvent(new Event('khatapro_language_changed'));
    } catch {}
  }
  return item;
}

/**
 * Common dictionary translations for primary UI terms across top Indian languages
 */
export const TRANSLATIONS: Record<string, Record<string, string>> = {
  hi: {
    dashboard: 'डैशबोर्ड',
    khata: 'डिजिटल खाता',
    customers: 'ग्राहक (CRM)',
    invoices: 'बिलिंग और इनवॉइस',
    expenses: 'खर्च ट्रैकर',
    savings: 'बचत लक्ष्य',
    inventory: 'स्टॉक और इन्वेंट्री',
    reminders: 'पेमेंट रिमाइंडर',
    documents: 'दस्तावेज़ वॉल्ट',
    settings: 'सेटिंग्स और कॉन्फ़िगरेशन',
    credit: 'जमा / CREDIT',
    debit: 'उधार / DEBIT',
    netProfit: 'शुद्ध लाभ (Net Profit)',
    upiCollections: 'UPI कलेक्शन',
    moneyIn: 'आया पैसा',
    pending: 'बाकी / पेंडिंग',
    collectPayment: 'पेमेंट कलेक्ट करें',
    quickAdd: 'नया जोड़ें',
    currency: 'मुद्रा (Currency)',
    language: 'भाषा (Language)',
    save: 'सहेजें (Save)',
    online: 'ऑनलाइन',
    support: 'लाइव सहायता (Support)',
  },
  gu: {
    dashboard: 'ડેશબોર્ડ',
    khata: 'ડિજિટલ ખાતાવહી',
    customers: 'ગ્રાહકો (CRM)',
    invoices: 'બિલિંગ અને ઇન્વૉઇસ',
    expenses: 'ખર્ચ ટ્રેકર',
    savings: 'બચત લક્ષ્ય',
    inventory: 'સ્ટોક અને ઇન્વેન્ટરી',
    reminders: 'ચુકવણી રીમાઇન્ડર',
    documents: 'દસ્તાવેજ વૉલ્ટ',
    settings: 'સેટિંગ્સ',
    credit: 'જમા / CREDIT',
    debit: 'ઉધાર / DEBIT',
    netProfit: 'ચોખ્ખો નફો',
    upiCollections: 'UPI કલેક્શન',
    moneyIn: 'આવેલા નાણાં',
    pending: 'બાકી',
    collectPayment: 'પેમેન્ટ મેળવો',
    quickAdd: 'નવું ઉમેરો',
    currency: 'ચલણ (Currency)',
    language: 'ભાષા (Language)',
    save: 'સાચવો',
    online: 'ઓનલાઇન',
    support: 'લાઇવ સપોર્ટ',
  },
  mr: {
    dashboard: 'डॅशबोर्ड',
    khata: 'डिजिटल खतावही',
    customers: 'ग्राहक (CRM)',
    invoices: 'बिलिंग आणि इनव्हॉइस',
    expenses: 'खर्च ट्रॅकर',
    savings: 'बचત ध्येय',
    inventory: 'स्टॉक व इन्व्हेंटरी',
    reminders: 'पेमेंट स्मरणपत्रे',
    documents: 'कागदपत्रे व्हॉल्ट',
    settings: 'सेटिंग्ज',
    credit: 'जमा / CREDIT',
    debit: 'उधार / DEBIT',
    netProfit: 'निव्वळ नफा',
    upiCollections: 'UPI संकलन',
    moneyIn: 'आलेले पैसे',
    pending: 'प्रलंबित',
    collectPayment: 'पैसे गोळा करा',
    quickAdd: 'नवीन जोडा',
    currency: 'चलन (Currency)',
    language: 'भाषा (Language)',
    save: 'जतन करा',
    online: 'ऑनलाइन',
    support: 'थेट मदत',
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    khata: 'ডিজিটাল খাতা',
    customers: 'গ্রাহক (CRM)',
    invoices: 'বিল ও ইনভয়েস',
    expenses: 'খরচ ট্র্যাকার',
    savings: 'সঞ্চয় লক্ষ্য',
    inventory: 'স্টক ও ইনভেন্টরি',
    reminders: 'পেমেন্ট রিমাইন্ডার',
    documents: 'ডকুমেন্ট ভল্ট',
    settings: 'সেটিংস',
    credit: 'জমা / CREDIT',
    debit: 'বাকি / DEBIT',
    netProfit: 'নিট লাভ',
    upiCollections: 'UPI কালেকশন',
    moneyIn: 'আগত টাকা',
    pending: 'বকেয়া',
    collectPayment: 'পেমেন্ট নিন',
    quickAdd: 'নতুন যোগ করুন',
    currency: 'মুদ্রা (Currency)',
    language: 'ভাষা (Language)',
    save: 'সংরক্ষণ করুন',
    online: 'অনলাইন',
    support: 'লাইভ সহায়তা',
  },
  ta: {
    dashboard: 'டாஷ்போர்டு',
    khata: 'டிஜிட்டல் கட்டா',
    customers: 'வாடிக்கையாளர்கள் (CRM)',
    invoices: 'பில்லிங் மற்றும் இன்வாய்ஸ்',
    expenses: 'செலவு கண்காணிப்பு',
    savings: 'சேமிப்பு இலக்கு',
    inventory: 'சரக்கு இருப்பு',
    reminders: 'பணம் செலுத்தும் நினைவூட்டல்',
    documents: 'ஆவண பெட்டகம்',
    settings: 'அமைப்புகள்',
    credit: 'வரவு / CREDIT',
    debit: 'பற்று / DEBIT',
    netProfit: 'நிகர லாபம்',
    upiCollections: 'UPI சேகரிப்பு',
    moneyIn: 'வந்த பணம்',
    pending: 'நிலுவை',
    collectPayment: 'பணம் பெறவும்',
    quickAdd: 'புதியது சேர்க்க',
    currency: 'நாணயம் (Currency)',
    language: 'மொழி (Language)',
    save: 'சேமிக்கவும்',
    online: 'ஆன்லைன்',
    support: 'நேரலை உதவி',
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్',
    khata: 'డిజిటల్ ఖాతా',
    customers: 'కస్టమర్లు (CRM)',
    invoices: 'బిల్లింగ్ & ఇన్వాయిస్లు',
    expenses: 'ఖర్చు ట్రాకర్',
    savings: 'పొదుపు లక్ష్యాలు',
    inventory: 'స్టాక్ & ఇన్వెంటరీ',
    reminders: 'చెల్లింపు రిమైండర్లు',
    documents: 'డాక్యుమెంట్ వాల్ట్',
    settings: 'సెట్టింగ్‌లు',
    credit: 'జమ / CREDIT',
    debit: 'అప్పు / DEBIT',
    netProfit: 'నికర లాభం',
    upiCollections: 'UPI కలెక్షన్స్',
    moneyIn: 'వచ్చిన డబ్బు',
    pending: 'బాకీ',
    collectPayment: 'చెల్లింపు స్వీకరించండి',
    quickAdd: 'కొత్తది జోడించండి',
    currency: 'కరెన్సీ (Currency)',
    language: 'భాష (Language)',
    save: 'సేవ్ చేయండి',
    online: 'ఆన్‌లైన్',
    support: 'లైవ్ మద్దతు',
  },
};

/**
 * Translation helper with fallback
 */
export function t(key: string, fallback = ''): string {
  if (typeof window === 'undefined') return fallback || key;
  try {
    const lang = localStorage.getItem('khatapro_language') || 'en';
    if (lang === 'en' || !TRANSLATIONS[lang]) return fallback || key;
    return TRANSLATIONS[lang][key] || fallback || key;
  } catch {
    return fallback || key;
  }
}

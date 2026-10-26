import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', name: 'Marathi', native: 'मराठी' },
  { code: 'bn', name: 'Bengali', native: 'বাংলা' },
  { code: 'gu', name: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', name: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

const TRANSLATIONS = {
  en: {
    dashboard: 'Dashboard',
    income: 'Income',
    expenses: 'Expenses',
    budget: 'Budget',
    health: 'Financial Health',
    aiAssistant: 'AI Assistant',
    calendar: 'Smart Calendar',
    projects: 'Projects',
    reports: 'Reports',
    savingsGoals: 'Savings & Goals',
    investments: 'Investments',
    liabilities: 'Liabilities',
    bankTransactions: 'Bank Transactions',
    profile: 'Profile & Settings',
    logout: 'Log Out',
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netCashFlow: 'Net Cash Flow',
    addExpense: 'Add Expense',
    addIncome: 'Add Income',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    microSpending: 'Micro-Spending',
  },
  hi: {
    dashboard: 'डैशबोर्ड',
    income: 'आय',
    expenses: 'खर्च',
    budget: 'बजट',
    health: 'वित्तीय स्वास्थ्य',
    aiAssistant: 'एआई सहायक',
    calendar: 'स्मार्ट कैलेंडर',
    projects: 'प्रोजेक्ट्स',
    reports: 'रिपोर्ट्स',
    savingsGoals: 'बचत और लक्ष्य',
    investments: 'निवेश',
    profile: 'प्रोफ़ाइल और सेटिंग्स',
    logout: 'लॉग आउट',
    totalIncome: 'कुल आय',
    totalExpenses: 'कुल खर्च',
    netCashFlow: 'शुद्ध नकदी प्रवाह',
    addExpense: 'खर्च जोड़ें',
    addIncome: 'आय जोड़ें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    microSpending: 'सूक्ष्म खर्च',
  },
  ta: {
    dashboard: 'முகப்பு பலகை',
    expenses: 'செலவுகள்',
    budget: 'பட்ஜெட்',
    health: 'நிதி ஆரோக்கியம்',
    aiAssistant: 'AI உதவியாளர்',
    calendar: 'ஸ்மார்ட் கேலெண்டர்',
    projects: 'திட்டங்கள்',
    reports: 'அறிக்கைகள்',
    savingsGoals: 'சேமிப்பு மற்றும் இலக்குகள்',
    investments: 'முதலீடுகள்',
    profile: 'சுயவிவரம் மற்றும் அமைப்புகள்',
    logout: 'வெளியேறு',
    totalIncome: 'மொத்த வருமானம்',
    totalExpenses: 'மொத்த செலவு',
    netCashFlow: 'நிகர பணப்புழக்கம்',
    addExpense: 'செலவு சேர்',
    addIncome: 'வருமானம் சேர்',
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    microSpending: 'சிறு செலவுகள்',
  },
  te: {
    dashboard: 'డాష్‌బోర్డ్',
    expenses: 'ఖర్చులు',
    budget: 'బడ్జెట్',
    health: 'ఆర్థిక ఆరోగ్యం',
    aiAssistant: 'AI అసిస్టెంట్',
    calendar: 'స్మార్ట్ క్యాలెండర్',
    projects: 'ప్రాజెక్టులు',
    reports: 'నివేదికలు',
    savingsGoals: 'పొదుపు & లక్ష్యాలు',
    investments: 'పెట్టుబడులు',
    profile: 'ప్రొఫైల్ & సెట్టింగ్‌లు',
    logout: 'లాగ్ అవుట్',
    totalIncome: 'మొత్తం ఆదాయం',
    totalExpenses: 'మొత్తం ఖర్చులు',
    netCashFlow: 'నికర నగదు ప్రవాహం',
    addExpense: 'ఖర్చు జోడించండి',
    addIncome: 'ఆదాయం జోడించండి',
    save: 'భద్రపరచు',
    cancel: 'రద్దు చేయి',
    delete: 'తొలగించు',
    edit: 'సవరించు',
    microSpending: 'చిన్న ఖర్చులు',
  },
  kn: {
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    expenses: 'ವೆಚ್ಚಗಳು',
    budget: 'ಬಜೆಟ್',
    health: 'ಹಣಕಾಸು ಆರೋಗ್ಯ',
    aiAssistant: 'AI ಸಹಾಯಕ',
    calendar: 'ಸ್ಮಾರ್ಟ್ ಕ್ಯಾಲೆಂಡರ್',
    projects: 'ಯೋಜನೆಗಳು',
    reports: 'ವರದಿಗಳು',
    savingsGoals: 'ಉಳಿತಾಯ ಮತ್ತು ಗುರಿಗಳು',
    investments: 'ಹೂಡಿಕೆಗಳು',
    profile: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    logout: 'ಲಾಗ್ ಔಟ್',
    totalIncome: 'ಒಟ್ಟು ಆದಾಯ',
    totalExpenses: 'ಒಟ್ಟು ವೆಚ್ಚಗಳು',
    netCashFlow: 'ನಿವ್ವಳ ನಗದು ಹರಿವು',
    addExpense: 'ವೆಚ್ಚ ಸೇರಿಸಿ',
    addIncome: 'ಆದಾಯ ಸೇರಿಸಿ',
    save: 'ಉಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    delete: 'ಅಳಿಸಿ',
    edit: 'ತಿದ್ದು',
    microSpending: 'ಸಣ್ಣ ವೆಚ್ಚಗಳು',
  },
  ml: {
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    expenses: 'ചെലവുകൾ',
    budget: 'ബജറ്റ്',
    health: 'സാമ്പത്തിക ആരോഗ്യം',
    aiAssistant: 'AI അസിസ്റ്റന്റ്',
    calendar: 'സ്മാർട്ട് കലണ്ടർ',
    projects: 'പദ്ധതികൾ',
    reports: 'റിപ്പോർട്ടുകൾ',
    savingsGoals: 'സമ്പാദ്യവും ലക്ഷ്യങ്ങളും',
    investments: 'നിക്ഷേപങ്ങൾ',
    profile: 'പ്രൊഫൈലും ക്രമീകരണങ്ങളും',
    logout: 'ലോഗ് ഔട്ട്',
    totalIncome: 'ആകെ വരുമാനം',
    totalExpenses: 'ആകെ ചെലവുകൾ',
    netCashFlow: 'അറ്റ പണമൊഴുക്ക്',
    addExpense: 'ചെലവ് ചേർക്കുക',
    addIncome: 'വരുമാനം ചേർക്കുക',
    save: 'സൂക്ഷിക്കുക',
    cancel: 'റദ്ദാക്കുക',
    delete: 'മായ്ക്കുക',
    edit: 'തിരുത്തുക',
    microSpending: 'ചെറിയ ചെലവുകൾ',
  },
  mr: {
    dashboard: 'डॅशबोर्ड',
    expenses: 'खर्च',
    budget: 'अंदाजपत्रक',
    health: 'आर्थिक आरोग्य',
    aiAssistant: 'एआय सहाय्यक',
    calendar: 'स्मार्ट कॅलेंडर',
    projects: 'प्रकल्प',
    reports: 'अहवाल',
    savingsGoals: 'बचत आणि उद्दिष्टे',
    investments: 'गुंतवणूक',
    profile: 'प्रोफाइल आणि सेटिंग्ज',
    logout: 'लॉग आउट',
    totalIncome: 'एकूण उत्पन्न',
    totalExpenses: 'एकूण खर्च',
    netCashFlow: 'निव्वळ रोख प्रवाह',
    addExpense: 'खर्च जोडा',
    addIncome: 'उत्पन्न जोडा',
    save: 'जतन करा',
    cancel: 'रद्द करा',
    delete: 'हटवा',
    edit: 'संपादित करा',
    microSpending: 'सूक्ष्म खर्च',
  },
  bn: {
    dashboard: 'ড্যাশবোর্ড',
    expenses: 'ব্যয়',
    budget: 'বাজেট',
    health: 'আর্থিক স্বাস্থ্য',
    aiAssistant: 'এআই সহায়ক',
    calendar: 'স্মার্ট ক্যালেন্ডার',
    projects: 'প্রকল্প',
    reports: 'প্রতিবেদন',
    savingsGoals: 'সঞ্চয় ও লক্ষ্য',
    investments: 'বিনিয়োগ',
    profile: 'প্রোফাইল ও সেটিংস',
    logout: 'লগ আউট',
    totalIncome: 'মোট আয়',
    totalExpenses: 'মোট ব্যয়',
    netCashFlow: 'নিট নগদ প্রবাহ',
    addExpense: 'ব্যয় যোগ করুন',
    addIncome: 'আয় যোগ করুন',
    save: 'সংরক্ষণ করুন',
    cancel: 'বাতিল',
    delete: 'মুছুন',
    edit: 'সম্পাদনা করুন',
    microSpending: 'ক্ষুদ্র ব্যয়',
  },
  gu: {
    dashboard: 'ડેશબોર્ડ',
    expenses: 'ખર્ચ',
    budget: 'બજેટ',
    health: 'નાણાકીય આરોગ્ય',
    aiAssistant: 'AI સહાયક',
    calendar: 'સ્માર્ટ કેલેન્ડર',
    projects: 'પ્રોજેક્ટ્સ',
    reports: 'અહેવાલો',
    savingsGoals: 'બચત અને લક્ષ્યો',
    investments: 'રોકાણો',
    profile: 'પ્રોફાઇલ અને સેટિંગ્સ',
    logout: 'લૉગ આઉટ',
    totalIncome: 'કુલ આવક',
    totalExpenses: 'કુલ ખર્ચ',
    netCashFlow: 'ચોખ્ખો રોકડ પ્રવાહ',
    addExpense: 'ખર્ચ ઉમેરો',
    addIncome: 'આવક ઉમેરો',
    save: 'સાચવો',
    cancel: 'રદ કરો',
    delete: 'કાઢી નાખો',
    edit: 'સંપાદિત કરો',
    microSpending: 'નાના ખર્ચાઓ',
  },
  pa: {
    dashboard: 'ਡੈਸ਼ਬੋਰਡ',
    expenses: 'ਖਰਚੇ',
    budget: 'ਬਜਟ',
    health: 'ਵਿੱਤੀ ਸਿਹਤ',
    aiAssistant: 'AI ਸਹਾਇਕ',
    calendar: 'ਸਮਾਰਟ ਕੈਲੰਡਰ',
    projects: 'ਪ੍ਰੋਜੈਕਟ',
    reports: 'ਰਿਪੋਰਟਾਂ',
    savingsGoals: 'ਬੱਚਤ ਅਤੇ ਟੀਚੇ',
    investments: 'ਨਿਵੇਸ਼',
    profile: 'ਪ੍ਰੋਫਾਈਲ ਅਤੇ ਸੈਟਿੰਗਾਂ',
    logout: 'ਲਾਗ ਆਉਟ',
    totalIncome: 'ਕੁੱਲ ਆਮਦਨ',
    totalExpenses: 'ਕੁੱਲ ਖਰਚੇ',
    netCashFlow: 'ਸ਼ੁੱਧ ਨਕਦ ਪ੍ਰਵਾਹ',
    addExpense: 'ਖਰਚ ਸ਼ਾਮਲ ਕਰੋ',
    addIncome: 'ਆਮਦਨ ਸ਼ਾਮਲ ਕਰੋ',
    save: 'ਸੰਭਾਲੋ',
    cancel: 'ਰੱਦ ਕਰੋ',
    delete: 'ਮਿਟਾਓ',
    edit: 'ਸੋਧੋ',
    microSpending: 'ਛੋਟੇ ਖਰਚੇ',
  },
};

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
  const { currentUser, updateProfile } = useAuth();
  const [language, setLanguageState] = useState(() => {
    return localStorage.getItem('finman_lang') || 'en';
  });

  useEffect(() => {
    if (currentUser?.preferred_language && currentUser.preferred_language !== language) {
      setLanguageState(currentUser.preferred_language);
      localStorage.setItem('finman_lang', currentUser.preferred_language);
    }
  }, [currentUser]);

  const setLanguage = async (code) => {
    setLanguageState(code);
    localStorage.setItem('finman_lang', code);
    if (currentUser && updateProfile) {
      try {
        await updateProfile({ preferredLanguage: code });
      } catch (err) {
        console.warn('Could not persist language to user profile:', err.message);
      }
    }
  };

  const t = (key) => {
    return TRANSLATIONS[language]?.[key] || TRANSLATIONS.en?.[key] || key;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: SUPPORTED_LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    return {
      language: 'en',
      setLanguage: () => {},
      t: (k) => k,
      languages: SUPPORTED_LANGUAGES,
    };
  }
  return context;
};

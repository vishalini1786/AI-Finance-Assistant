import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', native: 'English' },
  { code: 'ta', name: 'Tamil', native: 'தமிழ்' },
  { code: 'hi', name: 'Hindi', native: 'हिन्दी' },
  { code: 'te', name: 'Telugu', native: 'తెలుగు' },
  { code: 'ml', name: 'Malayalam', native: 'മലയാളം' },
  { code: 'kn', name: 'Kannada', native: 'ಕನ್ನಡ' },
];

const TRANSLATIONS = {
  en: {
    // Page Headers
    dashboardTitle: 'Financial Dashboard',
    incomeTitle: 'Income Management',
    expensesTitle: 'Expenses Management',
    bankTransactionsTitle: 'Bank Transactions',
    budgetTitle: 'Intelligent Budget Planner',
    healthTitle: 'Financial Health & Credit Simulation',
    projectsTitle: 'Project Workspaces',
    aiAssistantPageTitle: 'FinMan AI Financial Assistant',
    calendarTitle: 'Smart Financial Calendar',
    savingsGoalsTitle: 'Savings & Financial Goals',
    investmentsTitle: 'Portfolio & Investments',
    liabilitiesTitle: 'Liabilities & Debt Management',
    reportsTitle: 'Financial Analytics & Reports',
    profileTitle: 'Profile & Account Settings',
    dashboard: 'Dashboard',
    income: 'Income',
    expenses: 'Expenses',
    bankTransactions: 'Bank Transactions',
    budget: 'Budgets & Goals',
    health: 'Financial Health',
    projects: 'Project Workspaces',
    aiAssistant: 'AI Assistant',
    calendar: 'Smart Calendar',
    savingsGoals: 'Savings & Goals',
    investments: 'Investments',
    liabilities: 'Liabilities',
    reports: 'Reports',
    profile: 'Profile & Settings',
    logout: 'Log Out',
    coreFeatures: 'Core Features',

    // Dashboard Cards & Actions
    totalIncome: 'Total Income',
    totalExpenses: 'Total Expenses',
    netCashFlow: 'Net Cash Flow',
    periodSavings: 'Period Savings',
    deficit: 'Deficit',
    quickExpense: 'Quick Expense',
    addExpense: 'Add Expense',
    addIncome: 'Add Income',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    accept: 'Accept',
    decline: 'Decline',
    modify: 'Modify',
    reallocate: 'Reallocate',
    search: 'Search',
    filter: 'Filter',
    today: 'Today',
    viewAll: 'View All',
    actions: 'Actions',
    status: 'Status',
    amount: 'Amount',
    date: 'Date',
    category: 'Category',
    description: 'Description',

    // Budget & Reallocation
    budgetPlanner: 'Intelligent Budget Planner',
    budgetAdvisor: 'FinMan Budget Advisor',
    reallocationRecommendation: 'Budget Reallocation Recommendation',
    critical: 'Critical',
    essential: 'Essential',
    important: 'Important',
    flexible: 'Flexible',
    discretionary: 'Discretionary',
    allocated: 'Allocated',
    spent: 'Spent',
    remaining: 'Remaining',
    utilization: 'Utilization',

    // Calendar
    smartCalendar: 'Smart Financial Calendar',
    addCalendarEvent: 'Add Calendar Event',
    scheduledObligations: 'Scheduled Obligations',
    upcomingDues: 'Upcoming Dues',
    commitments: 'Commitments',

    // AI Assistant
    aiAssistantTitle: 'FinMan AI Financial Assistant',
    aiDisclaimer: 'FinMan is a finance-only assistant grounded strictly in your verified records.',
    askAnything: 'Ask a financial question, track a purchase, or check budgets...',
    send: 'Send',

    // Projects
    projectWorkspaces: 'Project Workspaces',
    targetBudget: 'Target Budget',
    amountSpent: 'Amount Spent',
    remainingBudget: 'Remaining Budget',
    projectProgress: 'Project Progress',

    // Notifications
    notifications: 'Notifications',
    markAllRead: 'Mark all as read',
    noNotifications: 'No notifications yet.',
    unread: 'unread',
  },
  ta: {
    // Page Headers
    dashboardTitle: 'நிதி முகப்பு பலகை',
    incomeTitle: 'வருமான மேலாண்மை',
    expensesTitle: 'செலவு மேலாண்மை',
    bankTransactionsTitle: 'வங்கி பரிவர்த்தனைகள்',
    budgetTitle: 'புத்திசாலி பட்ஜெட் திட்டமிடுபவர்',
    healthTitle: 'நிதி ஆரோக்கியம் மற்றும் கடன் மதிப்பீடு',
    projectsTitle: 'திட்டப் பணியிடங்கள்',
    aiAssistantPageTitle: 'FinMan AI நிதி உதவியாளர்',
    calendarTitle: 'ஸ்மார்ட் நிதி கேலெண்டர்',
    savingsGoalsTitle: 'சேமிப்பு மற்றும் நிதி இலக்குகள்',
    investmentsTitle: 'முதலீட்டு தொகுப்பு',
    liabilitiesTitle: 'கடன்கள் மற்றும் பொறுப்புகள்',
    reportsTitle: 'நிதி பகுப்பாய்வு மற்றும் அறிக்கைகள்',
    profileTitle: 'சுயவிவரம் மற்றும் கணக்கு அமைப்புகள்',
    dashboard: 'முகப்பு பலகை',
    income: 'வருமானம்',
    expenses: 'செலவுகள்',
    bankTransactions: 'வங்கி பரிவர்த்தனைகள்',
    budget: 'பட்ஜெட் மற்றும் இலக்குகள்',
    health: 'நிதி ஆரோக்கியம்',
    projects: 'திட்டப் பணியிடங்கள்',
    aiAssistant: 'AI உதவியாளர்',
    calendar: 'ஸ்மார்ட் கேலெண்டர்',
    savingsGoals: 'சேமிப்பு மற்றும் இலக்குகள்',
    investments: 'முதலீடுகள்',
    liabilities: 'கடன்கள் மற்றும் பொறுப்புகள்',
    reports: 'நிதி அறிக்கைகள்',
    profile: 'சுயவிவரம் மற்றும் அமைப்புகள்',
    logout: 'வெளியேறு',
    coreFeatures: 'முக்கிய அம்சங்கள்',

    // Dashboard Cards & Actions
    totalIncome: 'மொத்த வருமானம்',
    totalExpenses: 'மொத்த செலவுகள்',
    netCashFlow: 'நிகர பணப்புழக்கம்',
    periodSavings: 'நடப்பு சேமிப்பு',
    deficit: 'பற்றாக்குறை',
    quickExpense: 'விரைவு செலவு',
    addExpense: 'செலவு சேர்',
    addIncome: 'வருமானம் சேர்',
    save: 'சேமி',
    cancel: 'ரத்து செய்',
    delete: 'நீக்கு',
    edit: 'திருத்து',
    accept: 'ஏற்றுக்கொள்',
    decline: 'நிராகரி',
    modify: 'மாற்று',
    reallocate: 'மறுஒதுக்கீடு',
    search: 'தேடு',
    filter: 'வடிகட்டு',
    today: 'இன்று',
    viewAll: 'அனைத்தையும் பார்',
    actions: 'செயல்கள்',
    status: 'நிலை',
    amount: 'தொகை',
    date: 'தேதி',
    category: 'வகை',
    description: 'விவரம்',

    // Budget & Reallocation
    budgetPlanner: 'புத்திசாலி பட்ஜெட் திட்டமிடுபவர்',
    budgetAdvisor: 'FinMan பட்ஜெட் ஆலோசகர்',
    reallocationRecommendation: 'பட்ஜெட் மறுஒதுக்கீட்டு பரிந்துரை',
    critical: 'மிக முக்கியம்',
    essential: 'அவசியம்',
    important: 'முக்கியம்',
    flexible: 'வளைந்து கொடுக்கும்',
    discretionary: 'விருப்பப்படி',
    allocated: 'ஒதுக்கப்பட்டது',
    spent: 'செலவிடப்பட்டது',
    remaining: 'மீதம்',
    utilization: 'பயன்பாடு',

    // Calendar
    smartCalendar: 'ஸ்மார்ட் நிதி கேலெண்டர்',
    addCalendarEvent: 'நிகழ்வு சேர்',
    scheduledObligations: 'திட்டமிடப்பட்ட கடமைகள்',
    upcomingDues: 'வரவிருக்கும் நிலுவைகள்',
    commitments: 'பொறுப்புகள்',

    // AI Assistant
    aiAssistantTitle: 'FinMan AI நிதி உதவியாளர்',
    aiDisclaimer: 'FinMan நிதி சார்ந்த கேள்விகளுக்கு மட்டுமே பதிலளிக்கும் நிதி உதவியாளர்.',
    askAnything: 'நிதி கேள்வி கேளுங்கள், செலவுகளை பதிவு செய்யுங்கள்...',
    send: 'அனுப்பு',

    // Projects
    projectWorkspaces: 'திட்டப் பணியிடங்கள்',
    targetBudget: 'இலக்கு பட்ஜெட்',
    amountSpent: 'செலவான தொகை',
    remainingBudget: 'மீதமுள்ள பட்ஜெட்',
    projectProgress: 'திட்ட முன்னேற்றம்',

    // Notifications
    notifications: 'அறிவிப்புகள்',
    markAllRead: 'அனைத்தையும் படித்ததாகக் குறி',
    noNotifications: 'அறிவிப்புகள் இல்லை.',
    unread: 'படிக்காதவை',
  },
  hi: {
    // Page Headers
    dashboardTitle: 'वित्तीय डैशबोर्ड',
    incomeTitle: 'आय प्रबंधन',
    expensesTitle: 'खर्च प्रबंधन',
    bankTransactionsTitle: 'बैंक लेनदेन',
    budgetTitle: 'स्मार्ट बजट प्लानर',
    healthTitle: 'वित्तीय स्वास्थ्य और क्रेडिट सिमुलेशन',
    projectsTitle: 'प्रोजेक्ट वर्कस्पेस',
    aiAssistantPageTitle: 'FinMan एआई वित्तीय सहायक',
    calendarTitle: 'स्मार्ट वित्तीय कैलेंडर',
    savingsGoalsTitle: 'बचत और वित्तीय लक्ष्य',
    investmentsTitle: 'पोर्टफोलियो और निवेश',
    liabilitiesTitle: 'देनदारियां और ऋण प्रबंधन',
    reportsTitle: 'वित्तीय विश्लेषण और रिपोर्ट',
    profileTitle: 'प्रोफ़ाइल और खाता सेटिंग्स',
    dashboard: 'डैशबोर्ड',
    income: 'आय',
    expenses: 'खर्च',
    bankTransactions: 'बैंक लेनदेन',
    budget: 'बजट और लक्ष्य',
    health: 'वित्तीय स्वास्थ्य',
    projects: 'प्रोजेक्ट वर्कस्पेस',
    aiAssistant: 'एआई सहायक',
    calendar: 'स्मार्ट कैलेंडर',
    savingsGoals: 'बचत और लक्ष्य',
    investments: 'निवेश',
    liabilities: 'देनदारियां और ऋण',
    reports: 'वित्तीय रिपोर्ट',
    profile: 'प्रोफ़ाइल और सेटिंग्स',
    logout: 'लॉग आउट',
    coreFeatures: 'मुख्य विशेषताएं',

    // Dashboard Cards & Actions
    totalIncome: 'कुल आय',
    totalExpenses: 'कुल खर्च',
    netCashFlow: 'शुद्ध नकदी प्रवाह',
    periodSavings: 'इस अवधि की बचत',
    deficit: 'घाटा',
    quickExpense: 'त्वरित खर्च',
    addExpense: 'खर्च जोड़ें',
    addIncome: 'आय जोड़ें',
    save: 'सहेजें',
    cancel: 'रद्द करें',
    delete: 'हटाएं',
    edit: 'संपादित करें',
    accept: 'स्वीकार करें',
    decline: 'अस्वीकार करें',
    modify: 'संशोधित करें',
    reallocate: 'पुनर्वितरित करें',
    search: 'खोजें',
    filter: 'फ़िल्टर',
    today: 'आज',
    viewAll: 'सभी देखें',
    actions: 'कार्रवाई',
    status: 'स्थिति',
    amount: 'राशि',
    date: 'तारीख',
    category: 'श्रेणी',
    description: 'विवरण',

    // Budget & Reallocation
    budgetPlanner: 'स्मार्ट बजट प्लानर',
    budgetAdvisor: 'FinMan बजट सलाहकार',
    reallocationRecommendation: 'बजट पुनर्वितरण अनुशंसा',
    critical: 'अति महत्वपूर्ण',
    essential: 'आवश्यक',
    important: 'महत्वपूर्ण',
    flexible: 'लचीला',
    discretionary: 'वैकल्पिक',
    allocated: 'आवंटित',
    spent: 'खर्च किया',
    remaining: 'शेष',
    utilization: 'उपयोग',

    // Calendar
    smartCalendar: 'स्मार्ट वित्तीय कैलेंडर',
    addCalendarEvent: 'कैलेंडर इवेंट जोड़ें',
    scheduledObligations: 'नियत भुगतान',
    upcomingDues: 'आगामी देय तिथियां',
    commitments: 'प्रतिबद्धताएं',

    // AI Assistant
    aiAssistantTitle: 'FinMan एआई वित्तीय सहायक',
    aiDisclaimer: 'FinMan केवल व्यक्तिगत वित्त प्रश्नों के लिए एक समर्पित सहायक है।',
    askAnything: 'वित्तीय प्रश्न पूछें, खर्च दर्ज करें या बजट जांचें...',
    send: 'भेजें',

    // Projects
    projectWorkspaces: 'प्रोजेक्ट वर्कस्पेस',
    targetBudget: 'लक्ष्य बजट',
    amountSpent: 'खर्च की गई राशि',
    remainingBudget: 'शेष बजट',
    projectProgress: 'प्रोजेक्ट प्रगति',

    // Notifications
    notifications: 'सूचनाएं',
    markAllRead: 'सभी को पढ़ा हुआ चिह्नित करें',
    noNotifications: 'कोई नई सूचना नहीं है।',
    unread: 'अपठित',
  },
  te: {
    // Page Headers
    dashboardTitle: 'ఆర్థిక డాష్‌బోర్డ్',
    incomeTitle: 'ఆదాయ నిర్వహణ',
    expensesTitle: 'ఖర్చుల నిర్వహణ',
    bankTransactionsTitle: 'బ్యాంక్ లావాదేవీలు',
    budgetTitle: 'స్మార్ట్ బడ్జెట్ ప్లానర్',
    healthTitle: 'ఆర్థిక ఆరోగ్యం & క్రెడిట్ సిమ్యులేషన్',
    projectsTitle: 'ప్రాజెక్ట్ వర్క్‌స్పేస్‌లు',
    aiAssistantPageTitle: 'FinMan AI ఆర్థిక సహాయకుడు',
    calendarTitle: 'స్మార్ట్ ఆర్థిక క్యాలెండర్',
    savingsGoalsTitle: 'పొదుపు & ఆర్థిక లక్ష్యాలు',
    investmentsTitle: 'పెట్టుబడులు & పోర్ట్‌ఫోలియో',
    liabilitiesTitle: 'అప్పులు & రుణ నిర్వహణ',
    reportsTitle: 'ఆర్థిక విశ్లేషణ & నివేదికలు',
    profileTitle: 'ప్రొఫైల్ & ఖాతా సెట్టింగ్‌లు',
    dashboard: 'డాష్‌బోర్డ్',
    income: 'ఆదాయం',
    expenses: 'ఖర్చులు',
    bankTransactions: 'బ్యాంక్ లావాదేవీలు',
    budget: 'బడ్జెట్ & లక్ష్యాలు',
    health: 'ఆర్థిక ఆరోగ్యం',
    projects: 'ప్రాజెక్ట్ వర్క్‌స్పేస్‌లు',
    aiAssistant: 'AI అసిస్టెంట్',
    calendar: 'స్మార్ట్ క్యాలెండర్',
    savingsGoals: 'పొదుపు & లక్ష్యాలు',
    investments: 'పెట్టుబడులు',
    liabilities: 'అప్పులు & రుణాలు',
    reports: 'ఆర్థిక నివేదికలు',
    profile: 'ప్రొఫైల్ & సెట్టింగ్‌లు',
    logout: 'లాగ్ అవుట్',
    coreFeatures: 'ప్రధాన ఫీచర్లు',

    // Dashboard Cards & Actions
    totalIncome: 'మొత్తం ఆదాయం',
    totalExpenses: 'మొత్తం ఖర్చులు',
    netCashFlow: 'నికర నగదు ప్రవాహం',
    periodSavings: 'ఈ కాలం పొదుపు',
    deficit: 'లోటు',
    quickExpense: 'త్వరిత ఖర్చు',
    addExpense: 'ఖర్చు జోడించండి',
    addIncome: 'ఆదాయం జోడించండి',
    save: 'భద్రపరచు',
    cancel: 'రద్దు చేయి',
    delete: 'తొలగించు',
    edit: 'సవరించు',
    accept: 'అంగీకరించు',
    decline: 'తిరస్కరించు',
    modify: 'సవరించు',
    reallocate: 'పునఃకేటాయించు',
    search: 'వెతుకు',
    filter: 'ఫిల్టర్',
    today: 'ఈ రోజు',
    viewAll: 'అన్నీ చూడండి',
    actions: 'చర్యలు',
    status: 'స్థితి',
    amount: 'మొత్తం',
    date: 'తేదీ',
    category: 'వర్గం',
    description: 'వివరణ',

    // Budget & Reallocation
    budgetPlanner: 'స్మార్ట్ బడ్జెట్ ప్లానర్',
    budgetAdvisor: 'FinMan బడ్జెట్ సలహాదారు',
    reallocationRecommendation: 'బడ్జెట్ పునఃకేటాయింపు సిఫార్సు',
    critical: 'అత్యవసరం',
    essential: 'ముఖ్యమైనది',
    important: 'ప్రాధాన్యమైనది',
    flexible: 'సడలింపు గలది',
    discretionary: 'ఐచ్ఛికం',
    allocated: 'కేటాయించినది',
    spent: 'ఖర్చు చేసినది',
    remaining: 'మిగిలినది',
    utilization: 'వినియోగం',

    // Calendar
    smartCalendar: 'స్మార్ట్ ఆర్థిక క్యాలెండర్',
    addCalendarEvent: 'ఈవెంట్ జోడించండి',
    scheduledObligations: 'షెడ్యూల్ చేయబడిన చెల్లింపులు',
    upcomingDues: 'రాబోయే బకాయిలు',
    commitments: 'చెల్లింపులు',

    // AI Assistant
    aiAssistantTitle: 'FinMan AI ఆర్థిక సహాయకుడు',
    aiDisclaimer: 'FinMan వ్యక్తిగత ఆర్థిక విషయాల కొరకు మాత్రమే రూపొందించబడింది.',
    askAnything: 'డబ్బు, బడ్జెట్ లేదా పెట్టుబడుల గురించి అడగండి...',
    send: 'పంపు',

    // Projects
    projectWorkspaces: 'ప్రాజెక్ట్ వర్క్‌స్పేస్‌లు',
    targetBudget: 'లక్ష్య బడ్జెట్',
    amountSpent: 'ఖర్చు చేసిన మొత్తం',
    remainingBudget: 'మిగిలిన బడ్జెట్',
    projectProgress: 'ప్రాజెక్ట్ పురోగతి',

    // Notifications
    notifications: 'నోటిఫికేషన్‌లు',
    markAllRead: 'అన్నీ చదివినట్లుగా గుర్తించు',
    noNotifications: 'నోటిఫికేషన్‌లు లేవు.',
    unread: 'చదవనివి',
  },
  ml: {
    // Page Headers
    dashboardTitle: 'സാമ്പത്തിക ഡാഷ്‌ബോർഡ്',
    incomeTitle: 'വരുമാന മാനേജ്മെന്റ്',
    expensesTitle: 'ചെലവ് മാനേജ്മെന്റ്',
    bankTransactionsTitle: 'ബാങ്ക് ഇടപാടുകൾ',
    budgetTitle: 'സ്മാർട്ട് ബജറ്റ് പ്ലാനർ',
    healthTitle: 'സാമ്പത്തിക ആരോഗ്യ വിശകലനം',
    projectsTitle: 'പ്രോജക്റ്റ് വർക്ക്‌സ്പെയ്സ്',
    aiAssistantPageTitle: 'FinMan AI സാമ്പത്തിക സഹായി',
    calendarTitle: 'സ്മാർട്ട് കലണ്ടർ',
    savingsGoalsTitle: 'സമ്പാദ്യവും ലക്ഷ്യങ്ങളും',
    investmentsTitle: 'നിക്ഷേപ പോർട്ട്ഫോളിയോ',
    liabilitiesTitle: 'ബാധ്യതകളും വായ്പകളും',
    reportsTitle: 'സാമ്പത്തിക റിപ്പോർട്ടുകൾ',
    profileTitle: 'പ്രൊഫൈൽ ക്രമീകരണങ്ങൾ',
    dashboard: 'ഡാഷ്‌ബോർഡ്',
    income: 'വരുമാനം',
    expenses: 'ചെലവുകൾ',
    bankTransactions: 'ബാങ്ക് ഇടപാടുകൾ',
    budget: 'ബജറ്റും ലക്ഷ്യങ്ങളും',
    health: 'സാമ്പത്തിക ആരോഗ്യം',
    projects: 'പ്രോജക്റ്റ് വർക്ക്‌സ്പെയ്സ്',
    aiAssistant: 'AI അസിസ്റ്റന്റ്',
    calendar: 'സ്മാർട്ട് കലണ്ടർ',
    savingsGoals: 'സമ്പാദ്യവും ലക്ഷ്യങ്ങളും',
    investments: 'നിക്ഷേപങ്ങൾ',
    liabilities: 'ബാധ്യതകളും വായ്പകളും',
    reports: 'സാമ്പത്തിക റിപ്പോർട്ടുകൾ',
    profile: 'പ്രൊഫൈലും ക്രമീകരണങ്ങളും',
    logout: 'ലോഗ് ഔട്ട്',
    coreFeatures: 'പ്രധാന സേവനങ്ങൾ',

    // Dashboard Cards & Actions
    totalIncome: 'ആകെ വരുമാനം',
    totalExpenses: 'ആകെ ചെലവുകൾ',
    netCashFlow: 'അറ്റ പണമൊഴുക്ക്',
    periodSavings: 'സമ്പാദ്യം',
    deficit: 'കമ്മി',
    quickExpense: 'പെട്ടെന്നുള്ള ചെലവ്',
    addExpense: 'ചെലവ് ചേർക്കുക',
    addIncome: 'വരുമാനം ചേർക്കുക',
    save: 'സൂക്ഷിക്കുക',
    cancel: 'റദ്ദാക്കുക',
    delete: 'നീക്കം ചെയ്യുക',
    edit: 'മാറ്റം വരുത്തുക',
    accept: 'സ്വീകരിക്കുക',
    decline: 'നിരസിക്കുക',
    modify: 'മാറ്റുക',
    reallocate: 'പുനർവിനിയോഗം ചെയ്യുക',
    search: 'തിരയുക',
    filter: 'ഫിൽട്ടർ',
    today: 'ഇന്ന്',
    viewAll: 'എല്ലാം കാണുക',
    actions: 'നടപടികൾ',
    status: 'നില',
    amount: 'തുക',
    date: 'തീയതി',
    category: 'വിഭാഗം',
    description: 'വിവരണം',

    // Budget & Reallocation
    budgetPlanner: 'സ്മാർട്ട് ബജറ്റ് പ്ലാനർ',
    budgetAdvisor: 'FinMan ബജറ്റ് ഉപദേശകൻ',
    reallocationRecommendation: 'ബജറ്റ് പുനർവിനിയോഗ ശുപാർശ',
    critical: 'അതിപ്രധാനം',
    essential: 'ആവശ്യമായത്',
    important: 'പ്രധാനപ്പെട്ടത്',
    flexible: 'മാറ്റം വരുത്താവുന്നത്',
    discretionary: 'ഐച്ഛികം',
    allocated: 'അനുവദിച്ചത്',
    spent: 'ചെലവഴിച്ചത്',
    remaining: 'ബാക്കി',
    utilization: 'വിനിയോഗം',

    // Calendar
    smartCalendar: 'സ്മാർട്ട് കലണ്ടർ',
    addCalendarEvent: 'ഇവന്റ് ചേർക്കുക',
    scheduledObligations: 'നിശ്ചയിച്ച അടവുകൾ',
    upcomingDues: 'വരാനിരിക്കുന്ന അടവുകൾ',
    commitments: 'ബാധ്യതകൾ',

    // AI Assistant
    aiAssistantTitle: 'FinMan AI സാമ്പത്തിക സഹായി',
    aiDisclaimer: 'വ്യക്തിഗത ധനകാര്യ ചോദ്യങ്ങൾക്ക് മാത്രമായി FinMan പ്രവർത്തിക്കുന്നു.',
    askAnything: 'സാമ്പത്തിക കാര്യങ്ങൾ, ബജറ്റ് എന്നിവ ചോദിക്കൂ...',
    send: 'അയക്കുക',

    // Projects
    projectWorkspaces: 'പ്രോജക്റ്റ് വർക്ക്‌സ്പെയ്സ്',
    targetBudget: 'ലക്ഷ്യ ബജറ്റ്',
    amountSpent: 'ചെലവഴിച്ച തുക',
    remainingBudget: 'ബാക്കി ബജറ്റ്',
    projectProgress: 'പുരോഗതി',

    // Notifications
    notifications: 'അറിയിപ്പുകൾ',
    markAllRead: 'എല്ലാം വായിച്ചതായി അടയാളപ്പെടുത്തുക',
    noNotifications: 'അറിയിപ്പുകൾ ലഭ്യമല്ല.',
    unread: 'വായിക്കാത്തവ',
  },
  kn: {
    // Page Headers
    dashboardTitle: 'ಹಣಕಾಸು ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    incomeTitle: 'ಆದಾಯ ನಿರ್ವಹಣೆ',
    expensesTitle: 'ವೆಚ್ಚಗಳ ನಿರ್ವಹಣೆ',
    bankTransactionsTitle: 'ಬ್ಯಾಂಕ್ ವಹಿವಾಟುಗಳು',
    budgetTitle: 'ಸ್ಮಾರ್ಟ್ ಬಜೆಟ್ ಯೋಜಕ',
    healthTitle: 'ಹಣಕಾಸು ಆರೋಗ್ಯ ಮತ್ತು ಕ್ರೆಡಿಟ್ ಸಿಮ್ಯುಲೇಶನ್',
    projectsTitle: 'ಪ್ರಾಜೆಕ್ಟ್ ಕಾರ್ಯಸ್ಥಳ',
    aiAssistantPageTitle: 'FinMan AI ಹಣಕಾಸು ಸಹಾಯಕ',
    calendarTitle: 'ಸ್ಮಾರ್ಟ್ ಹಣಕಾಸು ಕ್ಯಾಲೆಂಡರ್',
    savingsGoalsTitle: 'ಉಳಿತಾಯ ಮತ್ತು ಹಣಕಾಸಿನ ಗುರಿಗಳು',
    investmentsTitle: 'ಹೂಡಿಕೆಗಳು',
    liabilitiesTitle: 'ಸಾಲಗಳು ಮತ್ತು ಹೊಣೆಗಾರಿಕೆಗಳು',
    reportsTitle: 'ಹಣಕಾಸು ವಿಶ್ಲೇಷಣೆ ಮತ್ತು ವರದಿಗಳು',
    profileTitle: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಖಾತೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    dashboard: 'ಡ್ಯಾಶ್‌ಬೋರ್ಡ್',
    income: 'ಆದಾಯ',
    expenses: 'ವೆಚ್ಚಗಳು',
    bankTransactions: 'ಬ್ಯಾಂಕ್ ವಹಿವಾಟುಗಳು',
    budget: 'ಬಜೆಟ್ ಮತ್ತು ಗುರಿಗಳು',
    health: 'ಹಣಕಾಸು ಆರೋಗ್ಯ',
    projects: 'ಪ್ರಾಜೆಕ್ಟ್ ಕಾರ್ಯಸ್ಥಳ',
    aiAssistant: 'AI ಸಹಾಯಕ',
    calendar: 'ಸ್ಮಾರ್ಟ್ ಕ್ಯಾಲೆಂಡರ್',
    savingsGoals: 'ಉಳಿತಾಯ ಮತ್ತು ಗುರಿಗಳು',
    investments: 'ಹೂಡಿಕೆಗಳು',
    liabilities: 'ಸಾಲಗಳು ಮತ್ತು ಹೊಣೆಗಾರಿಕೆಗಳು',
    reports: 'ಹಣಕಾಸು ವರದಿಗಳು',
    profile: 'ಪ್ರೊಫೈಲ್ ಮತ್ತು ಸೆಟ್ಟಿಂಗ್‌ಗಳು',
    logout: 'ಲಾಗ್ ಔಟ್',
    coreFeatures: 'ಪ್ರಮುಖ ವೈಶಿಷ್ಟ್ಯಗಳು',

    // Dashboard Cards & Actions
    totalIncome: 'ಒಟ್ಟು ಆದಾಯ',
    totalExpenses: 'ಒಟ್ಟು ವೆಚ್ಚಗಳು',
    netCashFlow: 'ನಿವ್ವಳ ನಗದು ಹರಿವು',
    periodSavings: 'ಉಳಿತಾಯ',
    deficit: 'ಕೊರತೆ',
    quickExpense: 'ತ್ವರಿತ ವೆಚ್ಚ',
    addExpense: 'ವೆಚ್ಚ ಸೇರಿಸಿ',
    addIncome: 'ಆದಾಯ ಸೇರಿಸಿ',
    save: 'ಉಳಿಸಿ',
    cancel: 'ರದ್ದುಮಾಡಿ',
    delete: 'ಅಳಿಸಿ',
    edit: 'ತಿದ್ದಿ',
    accept: 'ಒಪ್ಪಿಕೊಳ್ಳಿ',
    decline: 'ತಿರಸ್ಕರಿಸಿ',
    modify: 'ಬದಲಾಯಿಸಿ',
    reallocate: 'ಮರುಹಂಚಿಕೆ ಮಾಡಿ',
    search: 'ಹುಡುಕಿ',
    filter: 'ಫಿಲ್ಟರ್',
    today: 'ಇಂದು',
    viewAll: 'ಎಲ್ಲವನ್ನೂ ವೀಕ್ಷಿಸಿ',
    actions: 'ಕ್ರಮಗಳು',
    status: 'ಸ್ಥಿತಿ',
    amount: 'ಮೊತ್ತ',
    date: 'ದಿನಾಂಕ',
    category: 'ವರ್ಗ',
    description: 'ವಿವರಣೆ',

    // Budget & Reallocation
    budgetPlanner: 'ಸ್ಮಾರ್ಟ್ ಬಜೆಟ್ ಯೋಜಕ',
    budgetAdvisor: 'FinMan ಬಜೆಟ್ ಸಲಹೆಗಾರ',
    reallocationRecommendation: 'ಬಜೆಟ್ ಮರುಹಂಚಿಕೆ ಶಿಫಾರಸು',
    critical: 'ಅತ್ಯಂತ ತುರ್ತು',
    essential: 'ಅಗತ್ಯ',
    important: 'ಮುಖ್ಯ',
    flexible: 'ಹೊಂದಿಕೊಳ್ಳುವ',
    discretionary: 'ಐಚ್ಛಿಕ',
    allocated: 'ಹಂಚಿಕೆ ಮಾಡಿದ್ದು',
    spent: 'ವೆಚ್ಚ ಮಾಡಿದ್ದು',
    remaining: 'ಉಳಿದದ್ದು',
    utilization: 'ಬಳಕೆ',

    // Calendar
    smartCalendar: 'ಸ್ಮಾರ್ಟ್ ಹಣಕಾಸು ಕ್ಯಾಲೆಂಡರ್',
    addCalendarEvent: 'ಕಾರ್ಯಕ್ರಮ ಸೇರಿಸಿ',
    scheduledObligations: 'ನಿಗದಿತ ಪಾವತಿಗಳು',
    upcomingDues: 'ಮುಂಬರುವ ಬಾಕಿಗಳು',
    commitments: 'ಬದ್ಧತೆಗಳು',

    // AI Assistant
    aiAssistantTitle: 'FinMan AI ಹಣಕಾಸು ಸಹಾಯಕ',
    aiDisclaimer: 'FinMan ನಿಮ್ಮ ಹಣಕಾಸು ಪ್ರಶ್ನೆಗಳಿಗೆ ಮಾತ್ರ ಉತ್ತರಿಸುವ ಸಹಾಯಕ.',
    askAnything: 'ಹಣಕಾಸು ಪ್ರಶ್ನೆಗಳನ್ನು ಕೇಳಿ, ಬಜೆಟ್ ಪರಿಶೀಲಿಸಿ...',
    send: 'ಕಳುಹಿಸಿ',

    // Projects
    projectWorkspaces: 'ಪ್ರಾಜೆಕ್ಟ್ ಕಾರ್ಯಸ್ಥಳ',
    targetBudget: 'ಗುರಿ ಬಜೆಟ್',
    amountSpent: 'ವೆಚ್ಚವಾದ ಮೊತ್ತ',
    remainingBudget: 'ಉಳಿದ ಬಜೆಟ್',
    projectProgress: 'ಪ್ರಗತಿ',

    // Notifications
    notifications: 'ಅಧಿಸೂಚನೆಗಳು',
    markAllRead: 'ಎಲ್ಲವನ್ನೂ ಓದಲಾಗಿದೆ ಎಂದು ಗುರುತಿಸಿ',
    noNotifications: 'ಯಾವುದೇ ಅಧಿಸೂಚನೆಗಳಿಲ್ಲ.',
    unread: 'ಓದದಿರುವುದು',
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
    if (!key) return '';
    const currentDict = TRANSLATIONS[language] || TRANSLATIONS.en;
    if (currentDict[key]) return currentDict[key];

    // Normalized match from English text
    const cleanKey = String(key).trim();
    const enMatch = Object.keys(TRANSLATIONS.en).find(
      k => String(TRANSLATIONS.en[k]).toLowerCase() === cleanKey.toLowerCase()
    );
    if (enMatch && currentDict[enMatch]) return currentDict[enMatch];

    return TRANSLATIONS.en[key] || key;
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

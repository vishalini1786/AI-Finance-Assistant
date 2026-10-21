import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import OnboardingLayout from '../../components/onboarding/OnboardingLayout';
import { useAuth } from '../../context/AuthContext';
import {
  USER_TYPES,
  FINANCIAL_INTERESTS,
  SPENDING_CATEGORIES,
  FINANCIAL_GOALS,
  FINANCIAL_EXPERIENCES,
  AI_PREFERENCES,
} from '../../data/onboardingOptions';
import {
  Sparkles, ArrowRight, ArrowLeft, Check, CheckCircle2,
  Loader2, AlertCircle, IndianRupee, Languages, Bell, Clock, Coffee, ShieldCheck
} from 'lucide-react';

// ---------------------------------------------------------------
// Supported languages across the 10 project languages
// ---------------------------------------------------------------
const LANGUAGES = [
  { code: 'en', label: 'English', native: 'English' },
  { code: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { code: 'ta', label: 'Tamil', native: 'தமிழ்' },
  { code: 'te', label: 'Telugu', native: 'తెలుగు' },
  { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  { code: 'ml', label: 'Malayalam', native: 'മലയാളം' },
  { code: 'mr', label: 'Marathi', native: 'मराठी' },
  { code: 'bn', label: 'Bengali', native: 'বাংলা' },
  { code: 'gu', label: 'Gujarati', native: 'ગુજરાતી' },
  { code: 'pa', label: 'Punjabi', native: 'ਪੰਜਾਬੀ' },
];

const SAVINGS_HABITS = [
  { id: 'none', label: "I don't save regularly" },
  { id: 'less_10', label: 'Less than 10%' },
  { id: '10_20', label: '10 – 20%' },
  { id: '20_30', label: '20 – 30%' },
  { id: 'more_30', label: 'More than 30%' },
];

const INVESTMENT_PREFS = [
  { id: 'conservative', label: 'Conservative', desc: 'Low risk, stable returns' },
  { id: 'balanced', label: 'Balanced', desc: 'Moderate risk & growth' },
  { id: 'growth', label: 'Growth-oriented', desc: 'Higher risk, higher potential' },
  { id: 'not_interested', label: 'Not interested yet', desc: 'Skip for now' },
];

// Monthly income slider steps (₹ values)
const INCOME_STEPS = [0, 10000, 25000, 50000, 75000, 100000, 150000, 200000];
const formatIncome = (val) => {
  if (val === 0) return '₹0';
  if (val >= 100000) return `₹${(val / 100000).toFixed(val % 100000 === 0 ? 0 : 1)} L`;
  return `₹${(val / 1000).toFixed(0)}K`;
};

const TOTAL_STEPS = 12;

export const Onboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { completeOnboarding, currentUser } = useAuth();

  const searchParams = new URLSearchParams(location.search);
  const allowEdit = searchParams.get('edit') === 'true';

  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    userType: '',
    financialInterests: [],
    spendingCategories: [],
    financialGoals: [],
    monthlyIncome: 50000,
    financialExperience: '',
    savingsHabit: '',
    preferredLanguage: 'en',
    investmentPreference: '',
    expenseReminderEnabled: true,
    expenseReminderTime: '21:00',
    microExpensePromptsEnabled: true,
    aiPreferences: [],
  });

  const [validationError, setValidationError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  // Redirect if already onboarded unless explicitly editing
  useEffect(() => {
    if (currentUser && currentUser.is_onboarded && !allowEdit) {
      navigate('/dashboard', { replace: true });
    }
  }, [currentUser, allowEdit, navigate]);

  // Restore saved answers from currentUser
  useEffect(() => {
    if (currentUser) {
      const parseJsonSafe = (val) => {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        try {
          const parsed = JSON.parse(val);
          return Array.isArray(parsed) ? parsed : [];
        } catch {
          return [];
        }
      };

      setData((prev) => ({
        userType: currentUser.occupation || prev.userType,
        financialInterests: parseJsonSafe(currentUser.financial_interests).length
          ? parseJsonSafe(currentUser.financial_interests)
          : prev.financialInterests,
        spendingCategories: parseJsonSafe(currentUser.spending_categories).length
          ? parseJsonSafe(currentUser.spending_categories)
          : prev.spendingCategories,
        financialGoals: parseJsonSafe(currentUser.financial_goals).length
          ? parseJsonSafe(currentUser.financial_goals)
          : prev.financialGoals,
        monthlyIncome:
          currentUser.monthly_income != null
            ? Number(currentUser.monthly_income)
            : prev.monthlyIncome,
        financialExperience:
          currentUser.financial_experience || prev.financialExperience,
        savingsHabit: currentUser.savings_habit || prev.savingsHabit,
        preferredLanguage: currentUser.preferred_language || prev.preferredLanguage,
        investmentPreference:
          currentUser.investment_preference || prev.investmentPreference,
        expenseReminderEnabled:
          currentUser.expense_reminder_enabled !== undefined
            ? Boolean(currentUser.expense_reminder_enabled)
            : prev.expenseReminderEnabled,
        expenseReminderTime:
          currentUser.expense_reminder_time || prev.expenseReminderTime,
        microExpensePromptsEnabled:
          currentUser.micro_expense_prompts_enabled !== undefined
            ? Boolean(currentUser.micro_expense_prompts_enabled)
            : prev.microExpensePromptsEnabled,
        aiPreferences: parseJsonSafe(currentUser.ai_preferences).length
          ? parseJsonSafe(currentUser.ai_preferences)
          : prev.aiPreferences,
      }));
    }
  }, [currentUser]);

  const toggleArray = (key, value) => {
    setValidationError('');
    const list = data[key] || [];
    if (list.includes(value)) {
      setData({ ...data, [key]: list.filter((item) => item !== value) });
    } else {
      setData({ ...data, [key]: [...list, value] });
    }
  };

  const validateStep = (currentStep) => {
    if (currentStep === 2 && !data.userType) {
      return 'Please select your primary occupation to continue.';
    }
    if (currentStep === 3 && data.financialInterests.length === 0) {
      return 'Please select at least one financial interest to continue.';
    }
    if (currentStep === 4 && data.spendingCategories.length === 0) {
      return 'Please select at least one spending category to continue.';
    }
    if (currentStep === 5 && data.financialGoals.length === 0) {
      return 'Please select at least one financial goal to continue.';
    }
    if (currentStep === 7 && !data.financialExperience) {
      return 'Please select your financial experience level.';
    }
    if (currentStep === 8 && !data.savingsHabit) {
      return 'Please select your usual monthly savings habit.';
    }
    if (currentStep === 9 && !data.preferredLanguage) {
      return 'Please select your preferred language.';
    }
    if (currentStep === 10 && !data.investmentPreference) {
      return 'Please select your investment preference.';
    }
    if (currentStep === 12 && (!data.aiPreferences || data.aiPreferences.length === 0)) {
      return 'Please select at least one AI preference to complete your setup.';
    }
    return '';
  };

  const handleNext = () => {
    const errorMsg = validateStep(step);
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }
    setValidationError('');
    setStep((prev) => Math.min(prev + 1, TOTAL_STEPS));
  };

  const handlePrev = () => {
    setValidationError('');
    setStep((prev) => Math.max(prev - 1, 1));
  };

  const handleFinish = async () => {
    if (isSaving) return;
    const errorMsg = validateStep(12);
    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }
    setSaveError('');
    setIsSaving(true);
    try {
      await completeOnboarding({
        occupation: data.userType,
        monthlyIncome: data.monthlyIncome,
        preferredLanguage: data.preferredLanguage,
        financialInterests: data.financialInterests,
        spendingCategories: data.spendingCategories,
        financialGoals: data.financialGoals,
        financialExperience: data.financialExperience,
        aiPreferences: data.aiPreferences,
        savingsHabit: data.savingsHabit,
        investmentPreference: data.investmentPreference,
        expenseReminderEnabled: data.expenseReminderEnabled,
        expenseReminderTime: data.expenseReminderTime,
        microExpensePromptsEnabled: data.microExpensePromptsEnabled,
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message;
      setSaveError(msg || 'Failed to save your profile. Please try again.');
      setIsSaving(false);
    }
  };

  const getGreeting = () => {
    if (!currentUser?.name) return 'Welcome to FinMan!';
    const firstName = currentUser.name.trim().split(' ')[0];
    if (!firstName || firstName.toLowerCase() === 'google' || firstName.toLowerCase().includes('demo')) {
      return 'Welcome to FinMan!';
    }
    return `Welcome to FinMan, ${firstName}!`;
  };

  const chipBase =
    'px-3.5 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none text-left flex items-center justify-between';
  const chipSelected =
    'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-sm ring-1 ring-sky-500';
  const chipDefault =
    'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-700';

  const cardBase =
    'p-4 rounded-2xl border cursor-pointer transition-all select-none';
  const cardSelected =
    'border-sky-500 bg-sky-50/80 dark:bg-sky-950/60 shadow-md ring-1 ring-sky-500';
  const cardDefault =
    'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 hover:border-slate-300 dark:hover:border-slate-700';

  return (
    <OnboardingLayout currentStep={step} totalSteps={TOTAL_STEPS}>
      {/* STEP 1: WELCOME */}
      {step === 1 && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/80 text-sky-500 flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            {getGreeting()}
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
            Let's set up your financial profile in about 2 minutes.
            Your answers help FinMan give you personalized insights, intelligent reminders, and accurate recommendations.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            All your information is stored securely in your PostgreSQL database.
          </p>
          <div className="pt-2">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-sky-500">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Home Page
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: USER TYPE / OCCUPATION (Single-select) */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">What best describes you?</h2>
          <p className="text-xs text-slate-400 mt-1">Select your primary occupation category.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {USER_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = data.userType === type.id;
              return (
                <div
                  key={type.id}
                  id={`user-type-${type.id.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => {
                    setValidationError('');
                    setData({ ...data, userType: type.id });
                  }}
                  className={`${cardBase} flex items-start gap-3 ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-sky-100 dark:bg-sky-900/60 text-sky-600 dark:text-sky-300' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'}`}>
                    <Icon className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{type.title}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{type.desc}</span>
                  </div>
                  {isSelected && (
                    <CheckCircle2 className="w-4 h-4 text-sky-500 ml-auto shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 3: FINANCIAL INTERESTS (Multi-select) */}
      {step === 3 && (
        <div>
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">What are your financial interests?</h2>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800">
              {data.financialInterests.length} selected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Select all areas you want to manage or improve.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mt-6">
            {FINANCIAL_INTERESTS.map((interest) => {
              const id = interest.id || interest;
              const title = interest.title || interest;
              const desc = interest.desc || '';
              const Icon = interest.icon || Sparkles;
              const isSelected = data.financialInterests.includes(id);
              return (
                <div
                  key={id}
                  id={`interest-${id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => toggleArray('financialInterests', id)}
                  className={`${cardBase} flex flex-col justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${isSelected ? 'text-sky-500' : 'text-slate-400'}`} />
                        <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</span>
                      </div>
                      {isSelected ? (
                        <Check className="w-4 h-4 text-sky-500 shrink-0 font-bold" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700" />
                      )}
                    </div>
                    {desc && <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight mt-1">{desc}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: SPENDING CATEGORIES (Multi-select) */}
      {step === 4 && (
        <div>
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Where do you spend most?</h2>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800">
              {data.spendingCategories.length} selected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Pick the categories that matter most in your monthly budget.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 mt-6">
            {SPENDING_CATEGORIES.map((cat) => {
              const id = cat.id || cat;
              const title = cat.title || cat;
              const isSelected = data.spendingCategories.includes(id);
              return (
                <button
                  key={id}
                  id={`cat-${id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  type="button"
                  onClick={() => toggleArray('spendingCategories', id)}
                  className={`${chipBase} ${isSelected ? chipSelected : chipDefault}`}
                >
                  <span className="truncate">{title}</span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-sky-500 shrink-0" />
                  ) : (
                    <span className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: FINANCIAL GOALS (Multi-select) */}
      {step === 5 && (
        <div>
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">What are your top financial goals?</h2>
            <span className="text-xs text-sky-600 dark:text-sky-400 font-bold bg-sky-50 dark:bg-sky-950/60 px-2.5 py-1 rounded-full border border-sky-200 dark:border-sky-800">
              {data.financialGoals.length} selected
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">FinMan will help you track and achieve these targets.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {FINANCIAL_GOALS.map((goal) => {
              const id = goal.id || goal;
              const title = goal.title || goal;
              const desc = goal.desc || '';
              const isSelected = data.financialGoals.includes(id);
              return (
                <div
                  key={id}
                  id={`goal-${id.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                  onClick={() => toggleArray('financialGoals', id)}
                  className={`${cardBase} ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{title}</span>
                    {isSelected ? (
                      <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                    ) : (
                      <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                    )}
                  </div>
                  {desc && <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-1">{desc}</p>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 6: ESTIMATED MONTHLY INCOME */}
      {step === 6 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">What is your estimated monthly income?</h2>
          <p className="text-xs text-slate-400 mt-1">This helps us calculate safe budget allocations and health scores.</p>
          <div className="mt-8 space-y-6">
            <div className="text-center">
              <div className="inline-flex items-center gap-1 text-3xl sm:text-4xl font-black text-sky-500">
                <IndianRupee className="w-7 h-7 sm:w-8 sm:h-8" />
                <span>{data.monthlyIncome >= 200000 ? '2,00,000+' : data.monthlyIncome.toLocaleString('en-IN')}</span>
              </div>
              <p className="text-xs text-slate-400 mt-1">per month</p>
            </div>
            <input
              type="range"
              min={0}
              max={INCOME_STEPS.length - 1}
              step={1}
              value={INCOME_STEPS.indexOf(data.monthlyIncome) !== -1 ? INCOME_STEPS.indexOf(data.monthlyIncome) : 3}
              onChange={(e) => {
                setValidationError('');
                setData({ ...data, monthlyIncome: INCOME_STEPS[Number(e.target.value)] });
              }}
              className="w-full accent-sky-500 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400">
              {INCOME_STEPS.map((s) => (
                <span key={s}>{formatIncome(s)}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* STEP 7: FINANCIAL EXPERIENCE (Single-select) */}
      {step === 7 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">How experienced are you with personal finance?</h2>
          <p className="text-xs text-slate-400 mt-1">We tailor recommendations to your comfort level.</p>
          <div className="space-y-3 mt-6">
            {FINANCIAL_EXPERIENCES.map((exp) => {
              const id = exp.id || exp.level;
              const label = exp.label || exp.level;
              const isSelected = data.financialExperience === id;
              return (
                <div
                  key={id}
                  id={`exp-${id.toLowerCase()}`}
                  onClick={() => {
                    setValidationError('');
                    setData({ ...data, financialExperience: id });
                  }}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{exp.desc}</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 8: SAVINGS HABIT (Single-select) */}
      {step === 8 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">How much do you usually save each month?</h2>
          <p className="text-xs text-slate-400 mt-1">This helps FinMan set realistic savings targets for you.</p>
          <div className="space-y-3 mt-6">
            {SAVINGS_HABITS.map((habit) => {
              const isSelected = data.savingsHabit === habit.id;
              return (
                <div
                  key={habit.id}
                  id={`habit-${habit.id}`}
                  onClick={() => {
                    setValidationError('');
                    setData({ ...data, savingsHabit: habit.id });
                  }}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{habit.label}</span>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 9: LANGUAGE PREFERENCE (Single-select) */}
      {step === 9 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Languages className="w-6 h-6 text-sky-500" />
            Which language would you like FinMan to use?
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Choose from all 10 supported Indian languages. You can change this anytime.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
            {LANGUAGES.map((lang) => {
              const isSelected = data.preferredLanguage === lang.code;
              return (
                <div
                  key={lang.code}
                  id={`lang-${lang.code}`}
                  onClick={() => {
                    setValidationError('');
                    setData({ ...data, preferredLanguage: lang.code });
                  }}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{lang.native}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{lang.label}</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 10: INVESTMENT PREFERENCE (Single-select) */}
      {step === 10 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">How would you describe your investment preference?</h2>
          <p className="text-xs text-slate-400 mt-1">This will help personalize future investment guidance.</p>
          <div className="space-y-3 mt-6">
            {INVESTMENT_PREFS.map((pref) => {
              const isSelected = data.investmentPreference === pref.id;
              return (
                <div
                  key={pref.id}
                  id={`pref-${pref.id}`}
                  onClick={() => {
                    setValidationError('');
                    setData({ ...data, investmentPreference: pref.id });
                  }}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{pref.label}</span>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400">{pref.desc}</span>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 11: DAILY REMINDERS & MICRO-SPENDING PREFERENCES */}
      {step === 11 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
              <Bell className="w-6 h-6 text-sky-500" />
              Daily Reminders & Micro-Spending Tracking
            </h2>
            <p className="text-xs text-slate-400 mt-1">
              Configure daily alerts so no transaction or small habit slips past your budget.
            </p>
          </div>

          {/* Daily Expense Reminder Card */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-sky-500" />
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">Daily Expense Reminder</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Receive an in-app & email nudge to log daily expenses</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.expenseReminderEnabled}
                  onChange={(e) => setData({ ...data, expenseReminderEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-sky-500"></div>
              </label>
            </div>

            {data.expenseReminderEnabled && (
              <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
                <label className="block text-[11px] font-semibold text-slate-600 dark:text-slate-300 mb-1.5">
                  Preferred Reminder Time:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['20:00', '21:00', '22:00'].map((time) => (
                    <button
                      key={time}
                      type="button"
                      onClick={() => setData({ ...data, expenseReminderTime: time })}
                      className={`py-1.5 px-3 rounded-xl text-xs font-semibold border ${
                        data.expenseReminderTime === time
                          ? 'border-sky-500 bg-sky-500 text-white shadow-sm'
                          : 'border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900'
                      }`}
                    >
                      {time === '20:00' ? '8:00 PM' : time === '21:00' ? '9:00 PM' : '10:00 PM'}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Micro-Spending Tracking Card */}
          <div className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <Coffee className="w-5 h-5 text-amber-500" />
                <div>
                  <span className="block text-xs font-bold text-slate-900 dark:text-white">Micro-Spending Tracking</span>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400">Track purchases ≤ ₹250 (chai, snacks, auto fares)</span>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={data.microExpensePromptsEnabled}
                  onChange={(e) => setData({ ...data, microExpensePromptsEnabled: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Small unrecorded daily spends often total ₹3,000–₹5,000/month. Enabling this helps FinMan highlight these silent cash leaks.
            </p>
          </div>
        </div>
      )}

      {/* STEP 12: AI PREFERENCES + COMPLETION SUMMARY */}
      {step === 12 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">How should FinMan AI assist you?</h2>
          <p className="text-xs text-slate-400 mt-1">Select preferred AI advisory capabilities.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-4">
            {AI_PREFERENCES.map((pref) => {
              const isSelected = data.aiPreferences.includes(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => toggleArray('aiPreferences', pref)}
                  className={`${chipBase} ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-sm ring-1 ring-purple-500'
                      : chipDefault
                  }`}
                >
                  <span className="truncate">{pref}</span>
                  {isSelected ? (
                    <Check className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400 shrink-0" />
                  ) : (
                    <div className="w-3.5 h-3.5 rounded-full border border-slate-300 dark:border-slate-700 shrink-0" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Profile Summary */}
          <div className="mt-5 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs space-y-2">
            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 font-bold">
              <CheckCircle2 className="w-4 h-4" /> Your Financial Profile — Ready to Save
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 dark:text-slate-300">
              <span><strong>Occupation:</strong> {data.userType || '—'}</span>
              <span><strong>Income:</strong> {data.monthlyIncome >= 200000 ? '₹2L+/mo' : formatIncome(data.monthlyIncome) + '/mo'}</span>
              <span><strong>Language:</strong> {LANGUAGES.find((l) => l.code === data.preferredLanguage)?.label || 'English'}</span>
              <span><strong>Goals:</strong> {data.financialGoals.length} selected</span>
              <span><strong>Daily Reminder:</strong> {data.expenseReminderEnabled ? `Active (${data.expenseReminderTime})` : 'Disabled'}</span>
              <span><strong>Micro-Spends:</strong> {data.microExpensePromptsEnabled ? 'Tracking (≤ ₹250)' : 'Disabled'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              All information will be saved to your FinMan profile in PostgreSQL.
            </p>
          </div>

          {/* Save Error */}
          {saveError && (
            <div className="mt-3 p-3 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-600 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{saveError}</span>
            </div>
          )}
        </div>
      )}

      {/* Validation Warning Alert */}
      {validationError && (
        <div className="mt-4 p-3 rounded-xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-200 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
          <span>{validationError}</span>
        </div>
      )}

      {/* ---- Wizard Navigation Bar ---- */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        {step > 1 ? (
          <button
            type="button"
            id="onboarding-back-btn"
            onClick={handlePrev}
            disabled={isSaving}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-50"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </button>
        ) : (
          <Link
            to="/"
            className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Exit to Home
          </Link>
        )}

        {step < TOTAL_STEPS ? (
          <button
            type="button"
            id="onboarding-continue-btn"
            onClick={handleNext}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            {step === 1 ? "Let's Get Started" : 'Continue'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            id="onboarding-finish-btn"
            onClick={handleFinish}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Saving to your profile...
              </>
            ) : (
              <>
                Launch My Dashboard <Check className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </OnboardingLayout>
  );
};

export default Onboarding;
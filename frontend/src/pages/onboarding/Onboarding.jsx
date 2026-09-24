import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
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
  Loader2, AlertCircle, IndianRupee, Languages
} from 'lucide-react';

// ---------------------------------------------------------------
// Supported languages (kept to what FinMan actually plans to support)
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
];

const SAVINGS_HABITS = [
  { id: 'none', label: 'I don\'t save regularly' },
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

// ---------------------------------------------------------------
// Total steps: Welcome(1) + UserType(2) + Interests(3) + Categories(4)
//              + Goals(5) + Income(6) + Experience(7) + Savings(8)
//              + Language(9) + AI Prefs(10) + Completion(11)
// ---------------------------------------------------------------
const TOTAL_STEPS = 11;

export const Onboarding = () => {
  const navigate = useNavigate();
  const { completeOnboarding, currentUser } = useAuth();

  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    userType: '',
    financialInterests: [],
    spendingCategories: [],
    financialGoals: [],
    // A new user has no recorded income until they provide it.
    monthlyIncome: 0,
    financialExperience: '',
    savingsHabit: '',
    preferredLanguage: 'en',
    investmentPreference: '',
    aiPreferences: [],
  });

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const toggleArray = (key, value) => {
    const list = data[key];
    if (list.includes(value)) {
      setData({ ...data, [key]: list.filter((item) => item !== value) });
    } else {
      setData({ ...data, [key]: [...list, value] });
    }
  };

  // Can the user proceed to the next step?
  const canProceed = () => {
    if (step === 2 && !data.userType) return false;
    if (step === 3 && data.financialInterests.length === 0) return false;
    if (step === 4 && data.spendingCategories.length === 0) return false;
    if (step === 5 && data.financialGoals.length === 0) return false;
    if (step === 7 && !data.financialExperience) return false;
    if (step === 8 && !data.savingsHabit) return false;
    return true;
  };

  const handleFinish = async () => {
    setSaveError('');
    setIsSaving(true);
    try {
      // Send ALL onboarding data to PostgreSQL via backend API.
      // Backend sets is_onboarded = TRUE in the users table.
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
      });
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const msg = err?.response?.data?.message;
      setSaveError(msg || 'Failed to save your profile. Please try again.');
      setIsSaving(false);
    }
  };

  // Helper styles
  const chipBase = 'px-3 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all select-none';
  const chipSelected = 'border-sky-500 bg-sky-50 dark:bg-sky-950/60 text-sky-700 dark:text-sky-300 shadow-sm';
  const chipDefault = 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600';

  const cardBase = 'p-4 rounded-2xl border cursor-pointer transition-all';
  const cardSelected = 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/60 shadow-md';
  const cardDefault = 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-600';

  return (
    <OnboardingLayout currentStep={step} totalSteps={TOTAL_STEPS}>

      {/* STEP 1: WELCOME */}
      {step === 1 && (
        <div className="text-center py-6 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-sky-50 dark:bg-sky-950/80 text-sky-500 flex items-center justify-center mx-auto shadow-md">
            <Sparkles className="w-8 h-8" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white">
            Welcome to FinMan{currentUser?.name ? `, ${currentUser.name.split(' ')[0]}` : ''}!
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">
            Let's set up your financial profile in about 2 minutes.
            Your answers help FinMan give you personalized insights and smarter recommendations.
          </p>
          <p className="text-[11px] text-slate-400 dark:text-slate-500">
            All your information is stored securely in our database.
          </p>
          <div className="pt-2">
            <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-sky-500">
              <ArrowLeft className="w-3.5 h-3.5" /> Return to Home Page
            </Link>
          </div>
        </div>
      )}

      {/* STEP 2: USER TYPE / OCCUPATION */}
      {step === 2 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">What best describes you?</h2>
          <p className="text-xs text-slate-400 mt-1">Select your primary user category.</p>
          <div className="grid grid-cols-2 gap-3 mt-6">
            {USER_TYPES.map((type) => {
              const Icon = type.icon;
              const isSelected = data.userType === type.id;
              return (
                <div
                  key={type.id}
                  onClick={() => setData({ ...data, userType: type.id })}
                  className={`${cardBase} flex items-start gap-3 ${isSelected ? cardSelected : cardDefault}`}
                >
                  <Icon className={`w-5 h-5 mt-0.5 ${isSelected ? 'text-sky-500' : 'text-slate-400'}`} />
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{type.title}</span>
                    <span className="text-[10px] text-slate-400">{type.desc}</span>
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

      {/* STEP 3: FINANCIAL INTERESTS */}
      {step === 3 && (
        <div>
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">What are your financial interests?</h2>
            <span className="text-xs font-bold text-sky-500">{data.financialInterests.length} selected</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Select all that apply — minimum 1 required.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 mt-6">
            {FINANCIAL_INTERESTS.map((interest) => {
              const isSelected = data.financialInterests.includes(interest);
              return (
                <button
                  key={interest}
                  type="button"
                  onClick={() => toggleArray('financialInterests', interest)}
                  className={`${chipBase} text-left ${isSelected ? chipSelected : chipDefault}`}
                >
                  {interest}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 4: SPENDING CATEGORIES */}
      {step === 4 && (
        <div>
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">Where does most of your money go?</h2>
            <span className="text-xs font-bold text-sky-500">{data.spendingCategories.length} selected</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Select your primary spending areas.</p>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 mt-6">
            {SPENDING_CATEGORIES.map((category) => {
              const isSelected = data.spendingCategories.includes(category);
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => toggleArray('spendingCategories', category)}
                  className={`${chipBase} text-center ${isSelected ? chipSelected : chipDefault}`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 5: FINANCIAL GOALS */}
      {step === 5 && (
        <div>
          <div className="flex justify-between items-baseline">
            <h2 className="text-xl font-black text-slate-900 dark:text-white">What do you want FinMan to help you achieve?</h2>
            <span className="text-xs font-bold text-sky-500">{data.financialGoals.length} selected</span>
          </div>
          <p className="text-xs text-slate-400 mt-1">Select all your financial goals.</p>
          <div className="grid grid-cols-2 gap-2.5 mt-6">
            {FINANCIAL_GOALS.map((goal) => {
              const isSelected = data.financialGoals.includes(goal);
              return (
                <button
                  key={goal}
                  type="button"
                  onClick={() => toggleArray('financialGoals', goal)}
                  className={`${chipBase} text-left ${isSelected ? chipSelected : chipDefault}`}
                >
                  {goal}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 6: MONTHLY INCOME (new — persisted to users.monthly_income) */}
      {step === 6 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">What is your approximate monthly income?</h2>
          <p className="text-xs text-slate-400 mt-1">
            Helps FinMan calibrate budgets and savings targets. This is saved to your profile.
          </p>

          <div className="mt-8 text-center">
            <div className="inline-flex items-center gap-2 px-6 py-4 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200 dark:border-sky-800 mb-6">
              <IndianRupee className="w-6 h-6 text-sky-500" />
              <span className="text-3xl font-black text-sky-600 dark:text-sky-300">
                {data.monthlyIncome >= 200000 ? '₹2L+' : formatIncome(data.monthlyIncome)}
              </span>
              <span className="text-xs text-sky-400 font-medium">/ month</span>
            </div>

            <div className="px-2">
              <input
                type="range"
                min="0"
                max={INCOME_STEPS.length - 1}
                step="1"
                value={INCOME_STEPS.indexOf(data.monthlyIncome) === -1
                  ? INCOME_STEPS.length - 1
                  : INCOME_STEPS.indexOf(data.monthlyIncome)}
                onChange={(e) => setData({ ...data, monthlyIncome: INCOME_STEPS[parseInt(e.target.value)] })}
                className="w-full h-2 rounded-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between mt-2 text-[10px] text-slate-400 font-medium">
                <span>₹0</span>
                <span>₹50K</span>
                <span>₹1L</span>
                <span>₹2L+</span>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setData({ ...data, monthlyIncome: 0 })}
            className="mt-4 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 underline block mx-auto"
          >
            Prefer not to say (set to ₹0)
          </button>
        </div>
      )}

      {/* STEP 7: FINANCIAL EXPERIENCE */}
      {step === 7 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">How confident do you feel managing money?</h2>
          <p className="text-xs text-slate-400 mt-1">Select your experience level.</p>
          <div className="space-y-3 mt-6">
            {FINANCIAL_EXPERIENCES.map((item) => {
              const isSelected = data.financialExperience === item.level;
              return (
                <div
                  key={item.level}
                  onClick={() => setData({ ...data, financialExperience: item.level })}
                  className={`${cardBase} ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{item.level}</span>
                    {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-500" />}
                  </div>
                  <span className="text-[11px] text-slate-400 mt-0.5 block">{item.desc}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 8: SAVINGS HABIT (new — persisted to users.savings_habit) */}
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
                  onClick={() => setData({ ...data, savingsHabit: habit.id })}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">{habit.label}</span>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 9: LANGUAGE PREFERENCE (new — persisted to users.preferred_language) */}
      {step === 9 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Languages className="w-6 h-6 text-sky-500" />
            Which language would you like FinMan to use?
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Select your preferred language. More languages will be added over time.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-2 gap-3 mt-6">
            {LANGUAGES.map((lang) => {
              const isSelected = data.preferredLanguage === lang.code;
              return (
                <div
                  key={lang.code}
                  onClick={() => setData({ ...data, preferredLanguage: lang.code })}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{lang.native}</span>
                    <span className="text-[10px] text-slate-400">{lang.label}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 10: INVESTMENT PREFERENCE */}
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
                  onClick={() => setData({ ...data, investmentPreference: pref.id })}
                  className={`${cardBase} flex items-center justify-between ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div>
                    <span className="block text-xs font-bold text-slate-900 dark:text-white">{pref.label}</span>
                    <span className="text-[10px] text-slate-400">{pref.desc}</span>
                  </div>
                  {isSelected && <CheckCircle2 className="w-4 h-4 text-sky-500 shrink-0" />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* STEP 11: AI PREFERENCES + COMPLETION SUMMARY */}
      {step === 11 && (
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white">How should FinMan AI assist you?</h2>
          <p className="text-xs text-slate-400 mt-1">Select preferred AI advisory capabilities.</p>
          <div className="grid grid-cols-2 gap-2 mt-4">
            {AI_PREFERENCES.map((pref) => {
              const isSelected = data.aiPreferences.includes(pref);
              return (
                <button
                  key={pref}
                  type="button"
                  onClick={() => toggleArray('aiPreferences', pref)}
                  className={`${chipBase} text-left ${
                    isSelected
                      ? 'border-purple-500 bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 shadow-sm'
                      : chipDefault
                  }`}
                >
                  {pref}
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
              <span><strong>Experience:</strong> {data.financialExperience || '—'}</span>
              <span><strong>Language:</strong> {LANGUAGES.find(l => l.code === data.preferredLanguage)?.label || 'English'}</span>
              <span><strong>Goals:</strong> {data.financialGoals.length} selected</span>
              <span><strong>Savings:</strong> {SAVINGS_HABITS.find(h => h.id === data.savingsHabit)?.label || '—'}</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-2">
              All information will be saved to your FinMan profile in our secure database.
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

      {/* ---- Wizard Navigation Bar ---- */}
      <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        {step > 1 ? (
          <button
            type="button"
            onClick={() => setStep(step - 1)}
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
            onClick={() => setStep(step + 1)}
            disabled={!canProceed()}
            className="px-6 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all"
          >
            {step === 1 ? "Let's Get Started" : 'Continue'} <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleFinish}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white font-extrabold text-xs flex items-center gap-2 shadow-md shadow-emerald-600/20 transition-all"
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
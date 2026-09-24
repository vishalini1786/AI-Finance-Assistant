import { 
  GraduationCap, Briefcase, Rocket, Laptop, Home as HomeIcon, Layers,
  PiggyBank, Wallet, Target, TrendingUp, ShieldCheck, HeartPulse
} from 'lucide-react';

export const USER_TYPES = [
  { id: 'Student', title: 'Student', desc: 'College / University studies', icon: GraduationCap },
  { id: 'Working Professional', title: 'Working Professional', desc: 'Salaried individual', icon: Briefcase },
  { id: 'Entrepreneur', title: 'Entrepreneur', desc: 'Business founder / Startup', icon: Rocket },
  { id: 'Freelancer', title: 'Freelancer', desc: 'Independent contractor', icon: Laptop },
  { id: 'Homemaker', title: 'Homemaker', desc: 'Managing household finances', icon: HomeIcon },
  { id: 'Other', title: 'Other', desc: 'Personal finance enthusiast', icon: Layers }
];

export const FINANCIAL_INTERESTS = [
  "Saving Money", "Expense Tracking", "Budget Planning",
  "Investments", "Loans & EMIs", "Insurance",
  "Education Planning", "Healthcare", "Debt Management",
  "Tax Planning", "Emergency Fund", "Financial Growth"
];

export const SPENDING_CATEGORIES = [
  "Food", "Shopping", "Transport", "Healthcare",
  "Education", "Housing", "Utilities", "Entertainment",
  "Travel", "Loans/EMI", "Subscriptions", "Investments"
];

export const FINANCIAL_GOALS = [
  "Build Savings", "Emergency Fund", "Buy a House",
  "Education", "Buy a Vehicle", "Travel",
  "Grow Investments", "Become Debt Free", "Retirement", "Other"
];

export const FINANCIAL_EXPERIENCES = [
  { level: 'Beginner', desc: 'New to personal finance, looking for simple step-by-step guidance.' },
  { level: 'Learning', desc: 'Track basic expenses and bills, looking to build consistent monthly savings.' },
  { level: 'Comfortable', desc: 'Maintain regular budgets and manage diversified ongoing investments.' },
  { level: 'Advanced', desc: 'Experienced in tax planning, portfolio growth, and asset optimization.' }
];

export const AI_PREFERENCES = [
  "Analyze my spending",
  "Give saving suggestions",
  "Explain financial trends",
  "Alert about unusual spending",
  "Track financial goals",
  "Remind about commitments",
  "Explain investments",
  "Organize financial documents"
];
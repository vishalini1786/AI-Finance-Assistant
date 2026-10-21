import { 
  GraduationCap, Briefcase, Rocket, Laptop, Home as HomeIcon, Layers,
  PiggyBank, Wallet, Target, TrendingUp, ShieldCheck, HeartPulse,
  BookOpen, Calculator, DollarSign, Clock, PieChart, Shield
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
  { id: 'Saving Money', title: 'Saving Money', desc: 'Build and optimize personal cash reserves', icon: PiggyBank },
  { id: 'Expense Tracking', title: 'Expense Tracking', desc: 'Monitor daily outlays and reduce cash leaks', icon: Wallet },
  { id: 'Budget Planning', title: 'Budget Planning', desc: 'Enforce monthly envelope limits', icon: PieChart },
  { id: 'Investments', title: 'Investments', desc: 'Grow wealth via mutual funds, stocks & gold', icon: TrendingUp },
  { id: 'Loans & EMIs', title: 'Loans & EMIs', desc: 'Manage debts and repayment schedules', icon: Calculator },
  { id: 'Insurance', title: 'Insurance', desc: 'Protect health, life, and family assets', icon: ShieldCheck },
  { id: 'Education Planning', title: 'Education Planning', desc: 'Fund academic degrees and certifications', icon: BookOpen },
  { id: 'Healthcare', title: 'Healthcare', desc: 'Prepare for medical expenses and emergencies', icon: HeartPulse },
  { id: 'Debt Management', title: 'Debt Management', desc: 'Strategy to become debt-free faster', icon: Target },
  { id: 'Tax Planning', title: 'Tax Planning', desc: 'Optimize deductions under Indian IT slabs', icon: Calculator },
  { id: 'Emergency Fund', title: 'Emergency Fund', desc: 'Build 3–6 months of liquid living expenses', icon: Shield },
  { id: 'Financial Growth', title: 'Financial Growth', desc: 'Long-term compounding and net worth tracking', icon: TrendingUp }
];

export const SPENDING_CATEGORIES = [
  { id: 'Food', title: 'Food & Dining' },
  { id: 'Shopping', title: 'Shopping' },
  { id: 'Transport', title: 'Transport & Fuel' },
  { id: 'Healthcare', title: 'Healthcare' },
  { id: 'Education', title: 'Education' },
  { id: 'Housing', title: 'Rent & Housing' },
  { id: 'Utilities', title: 'Bills & Utilities' },
  { id: 'Entertainment', title: 'Entertainment' },
  { id: 'Travel', title: 'Travel & Vacation' },
  { id: 'Loans/EMI', title: 'Loans / EMI' },
  { id: 'Subscriptions', title: 'Subscriptions' },
  { id: 'Investments', title: 'Investments' }
];

export const FINANCIAL_GOALS = [
  { id: 'Build Savings', title: 'Build Savings', desc: 'Save consistently every month' },
  { id: 'Emergency Fund', title: 'Emergency Fund', desc: 'Safety net for unexpected life events' },
  { id: 'Buy a House', title: 'Buy a House', desc: 'Down payment for a home purchase' },
  { id: 'Education', title: 'Higher Education', desc: 'College, degrees or specialized courses' },
  { id: 'Buy a Vehicle', title: 'Buy a Vehicle', desc: 'Two-wheeler or car down payment' },
  { id: 'Travel', title: 'Travel & Vacation', desc: 'Domestic or international holiday fund' },
  { id: 'Grow Investments', title: 'Grow Investments', desc: 'Create wealth and passive income' },
  { id: 'Become Debt Free', title: 'Become Debt Free', desc: 'Pay off personal loans and credit cards' },
  { id: 'Retirement', title: 'Retirement Security', desc: 'Early financial independence (FIRE)' },
  { id: 'Other', title: 'Other Goals', desc: 'Custom personal financial milestone' }
];

export const FINANCIAL_EXPERIENCES = [
  { id: 'Beginner', label: 'Beginner', desc: 'New to personal finance, looking for simple step-by-step guidance.' },
  { id: 'Learning', label: 'Learning', desc: 'Track basic expenses and bills, looking to build consistent monthly savings.' },
  { id: 'Comfortable', label: 'Comfortable', desc: 'Maintain regular budgets and manage diversified ongoing investments.' },
  { id: 'Advanced', label: 'Advanced', desc: 'Experienced in tax planning, portfolio growth, and asset optimization.' }
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
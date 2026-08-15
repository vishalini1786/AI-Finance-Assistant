export const userProfile = {
  name: "Vishalini",
  avatar: "V",
  healthScore: 82,
  rating: "Good",
  lastUpdated: "August 15, 2026",
};

export const dashboardSummary = {
  totalBalance: 125430,
  monthlyIncome: 65000,
  monthlyExpenses: 32450,
  totalSavings: 32550,
  dailyAverage: 1046,
  highestCategory: "Food",
  highestCategoryAmount: 11350,
  totalTransactions: 42,
  budgetTotal: 64000,
  budgetSpent: 48760,
  budgetRemaining: 15240,
  budgetUtilization: 76,
};

export const lineChartData = [
  { name: "Jan", income: 55000, expense: 28000 },
  { name: "Feb", income: 58000, expense: 31000 },
  { name: "Mar", income: 60000, expense: 34000 },
  { name: "Apr", income: 62000, expense: 29500 },
  { name: "May", income: 62000, expense: 33000 },
  { name: "Jun", income: 65000, expense: 35000 },
  { name: "Jul", income: 65000, expense: 30000 },
  { name: "Aug", income: 65000, expense: 32450 },
];

export const donutChartData = [
  { name: "Food", value: 11350, fill: "#2563EB" },
  { name: "Shopping", value: 7520, fill: "#F59E0B" },
  { name: "Bills", value: 7800, fill: "#EF4444" },
  { name: "Transport", value: 3800, fill: "#0D9488" },
  { name: "Entertainment", value: 2450, fill: "#8B5CF6" },
  { name: "Others", value: 1530, fill: "#94A3B8" },
];

export const initialExpenses = [
  { id: 1, date: "15 Aug 2026", category: "Food", merchant: "Starbucks Coffee", amount: 650, mode: "UPI" },
  { id: 2, date: "15 Aug 2026", category: "Transport", merchant: "Uber Ride", amount: 220, mode: "UPI" },
  { id: 3, date: "14 Aug 2026", category: "Income", merchant: "Salary Credit", amount: 65000, mode: "Direct Deposit", isIncome: true },
  { id: 4, date: "14 Aug 2026", category: "Shopping", merchant: "Amazon.in", amount: 1200, mode: "Credit Card" },
  { id: 5, date: "14 Aug 2026", category: "Bills", merchant: "Electricity Bill", amount: 1500, mode: "Net Banking" },
  { id: 6, date: "13 Aug 2026", category: "Food", merchant: "Swiggy", amount: 450, mode: "UPI" },
  { id: 7, date: "13 Aug 2026", category: "Entertainment", merchant: "Netflix", amount: 649, mode: "UPI" },
  { id: 8, date: "12 Aug 2026", category: "Healthcare", merchant: "Apollo Pharmacy", amount: 780, mode: "UPI" },
];

export const budgetCategories = [
  { id: 1, category: "Food", budget: 8000, spent: 6200, percent: 77 },
  { id: 2, category: "Transport", budget: 6000, spent: 3800, percent: 63 },
  { id: 3, category: "Shopping", budget: 8000, spent: 7520, percent: 94 },
  { id: 4, category: "Bills", budget: 10000, spent: 7800, percent: 78 },
  { id: 5, category: "Entertainment", budget: 4000, spent: 2450, percent: 61 },
  { id: 6, category: "Healthcare", budget: 3000, spent: 1620, percent: 54 },
  { id: 7, category: "Education", budget: 5000, spent: 2100, percent: 42 },
  { id: 8, category: "Others", budget: 20000, spent: 17270, percent: 86 },
];

export const healthScoreBreakdown = [
  { metric: "Savings Rate", score: 85, max: 100 },
  { metric: "Debt Management", score: 70, max: 100 },
  { metric: "Budget Adherence", score: 90, max: 100 },
  { metric: "Investment Growth", score: 80, max: 100 },
  { metric: "Spending Control", score: 75, max: 100 },
  { metric: "Income Stability", score: 88, max: 100 },
];

export const healthTrendData = [
  { month: "March", score: 70 },
  { month: "April", score: 74 },
  { month: "May", score: 78 },
  { month: "June", score: 78 },
  { month: "July", score: 80 },
  { month: "August", score: 82 },
];

export const calendarEvents = {
  15: [{ id: 1, name: "Salary Credit", amount: 65000, type: "income", color: "bg-emerald-500", text: "+₹65,000" }],
  18: [{ id: 2, name: "Electricity Bill", amount: 1500, type: "bill", color: "bg-rose-500", text: "-₹1,500" }],
  20: [{ id: 3, name: "SIP Investment", amount: 2000, type: "investment", color: "bg-purple-600", text: "-₹2,000" }],
  24: [{ id: 4, name: "Home Loan EMI", amount: 12500, type: "emi", color: "bg-blue-600", text: "-₹12,500" }],
  28: [{ id: 5, name: "Netflix Renewal", amount: 649, type: "subscription", color: "bg-amber-500", text: "-₹649" }],
  30: [{ id: 6, name: "Savings Goal", amount: 10000, type: "savings", color: "bg-teal-600", text: "+₹10,000" }],
};
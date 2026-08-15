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
  { name: "Food", value: 11350, fill: "#6D28D9" },
  { name: "Shopping", value: 7520, fill: "#8B5CF6" },
  { name: "Bills", value: 7800, fill: "#A78BFA" },
  { name: "Transport", value: 3800, fill: "#C4B5FD" },
  { name: "Entertainment", value: 2450, fill: "#DDD6FE" },
  { name: "Others", value: 1530, fill: "#EDE9FE" },
];

export const initialExpenses = [
  { id: 1, date: "15 Aug 2026", category: "Food", merchant: "Starbucks Coffee", amount: 650, mode: "UPI" },
  { id: 2, date: "15 Aug 2026", category: "Transport", merchant: "Uber Ride", amount: 220, mode: "UPI" },
  { id: 3, date: "14 Aug 2026", category: "Shopping", merchant: "Amazon.in", amount: 1200, mode: "Credit Card" },
  { id: 4, date: "14 Aug 2026", category: "Bills", merchant: "Electricity Bill", amount: 1500, mode: "Net Banking" },
  { id: 5, date: "13 Aug 2026", category: "Food", merchant: "Swiggy", amount: 450, mode: "UPI" },
  { id: 6, date: "13 Aug 2026", category: "Entertainment", merchant: "Netflix", amount: 649, mode: "UPI" },
  { id: 7, date: "12 Aug 2026", category: "Healthcare", merchant: "Apollo Pharmacy", amount: 780, mode: "UPI" },
];

export const budgetCategories = [
  { id: 1, category: "Food", budget: 8000, spent: 6200 },
  { id: 2, category: "Transport", budget: 6000, spent: 3800 },
  { id: 3, category: "Shopping", budget: 8000, spent: 7520 },
  { id: 4, category: "Bills", budget: 10000, spent: 7800 },
  { id: 5, category: "Entertainment", budget: 4000, spent: 2450 },
  { id: 6, category: "Healthcare", budget: 3000, spent: 1620 },
  { id: 7, category: "Education", budget: 5000, spent: 2100 },
  { id: 8, category: "Others", budget: 20000, spent: 17270 },
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
  1: [{ type: "income", text: "+₹65,000 (Salary)", color: "bg-blue-600", border: "border-green-400" }],
  5: [{ type: "bill", text: "-₹1,500 (Electricity Bill)", color: "bg-red-500", border: "border-yellow-400" }],
  10: [{ type: "emi", text: "-₹5,000 (Car Loan EMI)", color: "bg-red-600", border: "border-red-400" }],
  15: [
    { type: "expense", text: "-₹650 (Starbucks)", color: "bg-purple-600", border: "border-purple-600" },
    { type: "expense", text: "-₹220 (Uber)", color: "bg-purple-600", border: "border-purple-600" },
  ],
  22: [{ type: "goal", text: "Target Saved (Laptop)", color: "bg-purple-500", border: "border-purple-300" }],
};
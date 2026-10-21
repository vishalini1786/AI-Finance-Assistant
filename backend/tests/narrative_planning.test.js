const aiChatService = require('../src/services/aiChatService');

describe('Phase 2 — AI Assistant Natural-Language Understanding Tests', () => {
  const mockContext = {
    user: {
      name: 'Visha',
      monthly_income: 80000,
      currency: 'INR',
    },
    summary: {
      totalIncome: 80000,
      totalExpenses: 35000,
      totalSavings: 45000,
      deficit: 0,
      financialHealthScore: 78,
    },
    monthComparison: {
      currentMonthName: 'October 2026',
      prevMonthName: 'September 2026',
      currentCatMap: { Food: 12000, Utilities: 8000 },
    },
    incomeData: {
      currentMonthTotal: 80000,
      currentMonthCount: 1,
      prevMonthTotal: 80000,
      prevMonthSalary: 80000,
      prevMonthExpenseTotal: 34000,
    },
    upcomingBills: [
      { title: 'Electricity Bill', amount: 2500, event_date: '2026-10-25' },
    ],
    categories: [
      { category_id: 1, name: 'Food & Dining' },
      { category_id: 2, name: 'Housing & Rent' },
    ],
    microSpending: { count: 3, total: 350, categories: { Chai: 150 } },
    lastExpense: { amount: 50, merchant_name: 'Tea Stall', category_name: 'Food & Dining', expense_date: '2026-10-20' },
  };

  beforeAll(() => {
    jest.spyOn(aiChatService, 'getUserFullContext').mockImplementation(async () => mockContext);
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  test('Narrative home construction query produces detailed financial roadmap instead of generic introduction', async () => {
    const question = 'I am planning to build a home worth ₹1 crore. Is it a good time to build? How should I plan over the next year?';
    const result = await aiChatService.processChatMessage(1, question, []);

    expect(result).toBeDefined();
    expect(result.reply).toBeDefined();
    // Must NOT be the generic fallback string
    expect(result.reply).not.toContain('I am your FinMan Personal Finance Assistant, grounded in your real financial records.');
    expect(result.reply).not.toContain('Add Income: "Bro, can you add my salary of ₹10,000?"');

    // Must contain relevant home planning sections
    expect(result.reply).toContain('Home Construction & Financial Plan for ₹1,00,00,000');
    expect(result.reply).toContain('Market Timing & Feasibility');
    expect(result.reply).toContain('Self-Funded Down Payment');
    expect(result.reply).toContain('Contingency');
    expect(result.reply).toContain('Estimated Monthly EMI');
    expect(result.reply).toContain('12-Month Phased Action Roadmap');
    expect(result.reply).toContain('Q1 (Months 1–3)');
    expect(result.reply).toContain('Q4 (Months 10–12)');
  });

  test('Vehicle purchase narrative returns 20/4/10 advice and EMI estimation', async () => {
    const question = 'I am planning to buy a car worth ₹15 lakhs next year, what is the financial plan?';
    const result = await aiChatService.processChatMessage(1, question, []);

    expect(result).toBeDefined();
    expect(result.reply).toContain('Vehicle Purchase Financial Plan for ₹15,00,000');
    expect(result.reply).toContain('Estimated Monthly EMI');
    expect(result.reply).toContain('20/4/10 Rule');
  });

  test('Annual financial planning question returns structured 12-month roadmap', async () => {
    const question = 'How should I plan over the next year to grow my savings?';
    const result = await aiChatService.processChatMessage(1, question, []);

    expect(result).toBeDefined();
    expect(result.reply).toContain('12-Month Financial Roadmap & Strategy');
    expect(result.reply).toContain('Emergency Reserve');
    expect(result.reply).toContain('50/30/20 Budget Discipline');
  });
});

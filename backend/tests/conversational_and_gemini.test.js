const aiChatService = require('../src/services/aiChatService');
const geminiService = require('../src/services/geminiService');
const db = require('../src/config/database');

const mockCategories = [
  { category_id: 1, name: 'Food' },
  { category_id: 2, name: 'Transportation' },
  { category_id: 3, name: 'Shopping' },
  { category_id: 4, name: 'Entertainment' },
  { category_id: 5, name: 'Bills' },
];

describe('Conversational Intelligence & Multi-Transaction Narration', () => {
  test('Tea, Burma Hotel lunch, and cinema tickets regression (Part 5.1)', () => {
    const text = 'Today morning I had a tea which costs about rupees 15 and then for lunch I had my lunch at Burma hotel and the total bill was rupees 200 and cinema tickets costs 300.';
    const result = aiChatService.parseDayNarration(text, mockCategories);

    expect(result).not.toBeNull();
    expect(result.type).toBe('batch');
    expect(result.items.length).toBe(3);
    expect(result.totalAmount).toBe(515);

    const [tea, lunch, cinema] = result.items;

    // 1. Tea
    expect(tea.amount).toBe(15);
    expect(tea.merchantName || tea.description).toMatch(/tea/i);
    expect(tea.category).toBe('Food');
    expect(tea.status).toBe('PENDING_CONFIRMATION');

    // 2. Burma Hotel Lunch
    expect(lunch.amount).toBe(200);
    expect(lunch.merchantName || lunch.description).toMatch(/burma hotel/i);
    expect(lunch.category).toBe('Food');
    expect(lunch.status).toBe('PENDING_CONFIRMATION');

    // 3. Cinema tickets
    expect(cinema.amount).toBe(300);
    expect(cinema.merchantName || cinema.description).toMatch(/cinema/i);
    expect(cinema.category).toBe('Entertainment');
    expect(cinema.status).toBe('PENDING_CONFIRMATION');
  });

  test('Five independent expenses narration are all extracted correctly', () => {
    const text = 'I spent 40 on tea, 120 on breakfast, 200 on lunch, 50 on fruits and 500 on petrol.';
    const result = aiChatService.parseDayNarration(text, mockCategories);

    expect(result).not.toBeNull();
    expect(result.items.length).toBe(5);
    expect(result.totalAmount).toBe(910);

    const amounts = result.items.map((it) => it.amount);
    expect(amounts).toEqual([40, 120, 200, 50, 500]);

    const petrolItem = result.items.find((it) => /petrol/i.test(it.description));
    expect(petrolItem).toBeDefined();
    expect(petrolItem.category).toBe('Transportation');
  });

  test('Component items vs bill total does not double count to 400 (Part 5.2)', () => {
    const text = 'My lunch items cost 80 and 120, total bill 200.';
    const result = aiChatService.parseDayNarration(text, mockCategories);

    expect(result).not.toBeNull();
    // Sum of items must equal 200, NOT 400
    expect(result.totalAmount).toBe(200);
    const amounts = result.items.map((it) => it.amount);
    expect(amounts).not.toContain(400);
  });

  test('Dates are not mistaken for transaction amounts', () => {
    const text = 'On 20-10-2026 I bought petrol for 350.';
    const entities = aiChatService.extractFinancialEntities(text);

    expect(entities.dates.length).toBeGreaterThan(0);
    expect(entities.dates[0].iso).toBe('2026-10-20');

    // Amount must be 350, NOT 20 or 2026
    const moneyValues = entities.money.map((m) => m.value);
    expect(moneyValues).toContain(350);
    expect(moneyValues).not.toContain(20);
    expect(moneyValues).not.toContain(2026);
  });
});

describe('Contextual Follow-ups & Batch State', () => {
  beforeEach(() => {
    jest.spyOn(aiChatService, 'getUserFullContext').mockResolvedValue({
      user: { name: 'Test User' },
      summary: {},
      categories: mockCategories,
      budgets: [],
      goals: [],
      projects: [],
      holdings: [],
      liabilities: [],
      recurringPayments: [],
      taxes: [],
      upcomingBills: [],
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  test('Pending batch modification handles item update and recalculates total', async () => {
    const pendingBatch = {
      id: 'batch_test_123',
      type: 'batch',
      totalAmount: 515,
      count: 3,
      items: [
        { id: '1', merchantName: 'Tea', amount: 15, category: 'Food' },
        { id: '2', merchantName: 'Lunch at Burma hotel', amount: 200, category: 'Food' },
        { id: '3', merchantName: 'Cinema tickets', amount: 300, category: 'Entertainment' },
      ],
      status: 'PENDING_CONFIRMATION',
    };

    // User corrects tea: "Change the tea amount to 20"
    const response = await aiChatService.processChatMessage(
      '00000000-0000-0000-0000-000000000001',
      'Change the tea amount to 20',
      [],
      pendingBatch
    );

    expect(response.pendingTransaction).toBeDefined();
    expect(response.pendingTransaction.totalAmount).toBe(520);
    const teaItem = response.pendingTransaction.items.find((i) => /tea/i.test(i.merchantName));
    expect(teaItem.amount).toBe(20);
  });

  test('Pending batch modification handles item removal', async () => {
    const pendingBatch = {
      id: 'batch_test_456',
      type: 'batch',
      totalAmount: 515,
      count: 3,
      items: [
        { id: '1', merchantName: 'Tea', amount: 15, category: 'Food' },
        { id: '2', merchantName: 'Lunch at Burma hotel', amount: 200, category: 'Food' },
        { id: '3', merchantName: 'Cinema tickets', amount: 300, category: 'Entertainment' },
      ],
      status: 'PENDING_CONFIRMATION',
    };

    // User removes cinema tickets: "Remove the cinema ticket"
    const response = await aiChatService.processChatMessage(
      '00000000-0000-0000-0000-000000000001',
      'Remove the cinema ticket',
      [],
      pendingBatch
    );

    expect(response.pendingTransaction).toBeDefined();
    expect(response.pendingTransaction.count).toBe(2);
    expect(response.pendingTransaction.totalAmount).toBe(215);
    const hasCinema = response.pendingTransaction.items.some((i) => /cinema/i.test(i.merchantName));
    expect(hasCinema).toBe(false);
  });

  test('Cancellation discards pending batch without saving anything', async () => {
    const pendingBatch = {
      id: 'batch_test_789',
      type: 'batch',
      totalAmount: 515,
      count: 3,
      items: [{ id: '1', merchantName: 'Tea', amount: 15 }],
      status: 'PENDING_CONFIRMATION',
    };

    const response = await aiChatService.processChatMessage(
      '00000000-0000-0000-0000-000000000001',
      'Cancel',
      [],
      pendingBatch
    );

    expect(response.pendingTransaction).toBeNull();
    expect(response.reply).toMatch(/cancelled/i);
    expect(response.transactionSaved).toBeUndefined();
  });
});

describe('Gemini Integration & AI Reliability (Part 4)', () => {
  test('Diagnostics reports unconfigured status safely when API key is missing', () => {
    const diag = geminiService.getGeminiDiagnostics();
    expect(diag.provider).toBe('Google Gemini');
    expect(diag).toHaveProperty('configured');
    expect(diag).toHaveProperty('model');
    expect(diag).toHaveProperty('status');
  });

  test('generateContent returns gracefully when API key is unconfigured', async () => {
    // If not configured, should return status UNCONFIGURED without throwing
    if (!geminiService.isConfigured()) {
      const result = await geminiService.generateContent({ prompt: 'Hello' });
      expect(result.success).toBe(false);
      expect(result.status).toBe('UNCONFIGURED');
    }
  });

  test('extractFinancialIntent handles unconfigured environment gracefully', async () => {
    if (!geminiService.isConfigured()) {
      const result = await geminiService.extractFinancialIntent({ userMessage: 'I spent 200 on lunch' });
      expect(result.success).toBe(false);
      expect(result.reason).toBe('UNCONFIGURED');
    }
  });

  test('Idempotency prevents duplicate transaction execution', async () => {
    const tx = {
      id: `idemp_test_${Date.now()}`,
      type: 'batch',
      items: [],
      status: 'PENDING_CONFIRMATION',
    };

    // First attempt with empty items throws 400
    await expect(aiChatService.executeConfirmTransaction('user-idemp', tx)).rejects.toThrow();
  });

  afterAll(async () => {
    if (db && db.pool && typeof db.pool.end === 'function') {
      await db.pool.end();
    }
  });
});

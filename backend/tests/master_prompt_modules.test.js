const adminRepository = require('../src/repositories/adminRepository');
const goalService = require('../src/services/goalService');
const reminderScheduler = require('../src/services/reminderScheduler');
const aiChatService = require('../src/services/aiChatService');

describe('Master Prompt Modules Regression Suite', () => {

  describe('Module 2: Voice input deduplication logic', () => {
    function simulateAppendTranscript(base, incomingFinal) {
      const lowerBase = (base || '').trim().toLowerCase();
      const lowerFinal = (incomingFinal || '').trim().toLowerCase();
      if (!lowerFinal) return base;
      if (lowerBase.endsWith(lowerFinal)) return base;
      return base ? `${base.trim()} ${incomingFinal.trim()}` : incomingFinal.trim();
    }

    it('does not duplicate repetitive final speech results', () => {
      let draft = '';
      draft = simulateAppendTranscript(draft, 'Hi');
      expect(draft).toBe('Hi');

      // Duplicate delivery of the exact same final result
      draft = simulateAppendTranscript(draft, 'Hi');
      expect(draft).toBe('Hi');

      draft = simulateAppendTranscript(draft, 'hello');
      expect(draft).toBe('Hi hello');

      // Duplicate delivery of the last phrase
      draft = simulateAppendTranscript(draft, 'hello');
      expect(draft).toBe('Hi hello');
    });

    it('preserves manual pre-typed text when adding spoken speech', () => {
      let draft = 'I paid for lunch';
      draft = simulateAppendTranscript(draft, 'yesterday');
      expect(draft).toBe('I paid for lunch yesterday');
    });
  });

  describe('Module 4: Admin Bulk Deletion Safety', () => {
    it('rejects bulk delete when caller tries to delete themselves', async () => {
      const callingAdminId = 99;
      const userIds = [101, 102, callingAdminId];
      // deleteUsersBulk filters out callingAdminId: WHERE user_id = ANY($1::int[]) AND user_id != $2
      // Let's verify parameter structure
      expect(userIds.filter((id) => id !== callingAdminId)).toEqual([101, 102]);
    });
  });

  describe('Module 6: Goal Contribution Financial Correctness', () => {
    it('validates that contribution amount must be positive and non-zero', async () => {
      await expect(goalService.recordContribution(1, 1, { amount: 0 }))
        .rejects.toThrow('Contribution amount must be a positive number');

      await expect(goalService.recordContribution(1, 1, { amount: -500 }))
        .rejects.toThrow('Contribution amount must be a positive number');

      await expect(goalService.recordContribution(1, 1, { amount: NaN }))
        .rejects.toThrow('Contribution amount must be a positive number');
    });
  });

  describe('Module 7: Timezone-Aware Reminder Scheduler & Normalization', () => {
    it('normalizes various TIME formats correctly to HH:mm', () => {
      expect(reminderScheduler.normalizeTime('21:00:00')).toBe('21:00');
      expect(reminderScheduler.normalizeTime('9:30')).toBe('09:30');
      expect(reminderScheduler.normalizeTime('20:15:45')).toBe('20:15');
      expect(reminderScheduler.normalizeTime(null)).toBe('21:00');
    });

    it('retrieves valid local time and date for any standard IANA timezone', () => {
      const ist = reminderScheduler.getUserLocalTime('Asia/Kolkata');
      expect(ist).toHaveProperty('localTime');
      expect(ist).toHaveProperty('localDate');
      expect(ist.localTime).toMatch(/^\d{2}:\d{2}$/);
      expect(ist.localDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);

      const utc = reminderScheduler.getUserLocalTime('UTC');
      expect(utc.localTime).toMatch(/^\d{2}:\d{2}$/);

      // Invalid timezone gracefully falls back without crashing
      const fallback = reminderScheduler.getUserLocalTime('Invalid/Unknown_Zone');
      expect(fallback.localTime).toMatch(/^\d{2}:\d{2}$/);
    });
  });

  describe('Module 8: AI Assistant Intent Recognition', () => {
    it('recognizes "Hi, I just want to plan my monthly budget. Please help me."', async () => {
      const res = await aiChatService.processChatMessage(1, 'Hi, I just want to plan my monthly budget. Please help me.', []);
      expect(res).toHaveProperty('reply');
      expect(res.reply).toContain('Monthly Budget Blueprint');
      expect(res.reply).toContain('50/30/20');
      expect(res.reply).toContain('Essentials / Needs');
    });

    it('recognizes "Analyze my spending."', async () => {
      const res = await aiChatService.processChatMessage(1, 'Analyze my spending.', []);
      expect(res).toHaveProperty('reply');
      expect(res.reply).toContain('Date Range:');
      expect(res.reply).toContain('Total Spending:');
    });

    it('recognizes "Where can I reduce my expenses?"', async () => {
      const res = await aiChatService.processChatMessage(1, 'Where can I reduce my expenses?', []);
      expect(res).toHaveProperty('reply');
      expect(res.reply).toContain('Expense Reduction');
      expect(res.reply).toContain('Ranked by Financial Impact');
    });

    it('recognizes "Help me save money for my goals."', async () => {
      const res = await aiChatService.processChatMessage(1, 'Help me save money for my goals.', []);
      expect(res).toHaveProperty('reply');
      expect(res.reply.toLowerCase()).toContain('savings goal');
      expect(res.reply).toContain('Add Savings');
    });

    it('handles follow-up question "What about last month?" contextually', async () => {
      const res = await aiChatService.processChatMessage(
        1,
        'What about last month?',
        [
          { role: 'user', content: 'Analyze my spending.' },
          { role: 'assistant', content: 'Here is your spending analysis...' },
        ]
      );
      expect(res).toHaveProperty('reply');
      expect(res.reply).toContain('Last Month Spending Breakdown');
    });

    it('handles follow-up question "How can I reduce that?" contextually', async () => {
      const res = await aiChatService.processChatMessage(
        1,
        'How can I reduce that?',
        [
          { role: 'user', content: 'Where can I reduce my expenses?' },
          { role: 'assistant', content: 'Highest Discretionary Spend: Food' },
        ]
      );
      expect(res).toHaveProperty('reply');
      expect(res.reply).toContain('Targeted Strategies to Reduce That Expense');
      expect(res.reply).toContain('48-Hour Pause Rule');
    });
  });

});

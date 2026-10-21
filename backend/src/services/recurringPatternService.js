// recurringPatternService.js
// Business logic for intelligent recurring spending pattern detection,
// statistics calculation, prompt generation, and user response handling.

const db = require('../config/database');
const recurringPatternRepository = require('../repositories/recurringPatternRepository');
const expenseRepository = require('../repositories/expenseRepository');

function normalizePatternName(str) {
  if (!str) return 'Recurring Expense';
  const s = str.trim().toLowerCase();
  if (s.includes('tea') || s.includes('chai')) return 'Office Tea';
  if (s.includes('coffee') || s.includes('cafe')) return 'Coffee';
  if (s.includes('milk') || s.includes('dairy')) return 'Daily Milk';
  if (s.includes('flower') || s.includes('pooja')) return 'Pooja Flowers';
  if (s.includes('bus') || s.includes('metro') || s.includes('auto') || s.includes('commute')) return 'Daily Commute';
  if (s.includes('snack') || s.includes('canteen')) return 'Break Snacks';
  if (s.includes('lunch') || s.includes('meal')) return 'Daily Lunch';
  if (s.includes('newspaper') || s.includes('paper')) return 'Newspaper';
  // Capitalize words
  return str.trim().replace(/\b\w/g, (c) => c.toUpperCase());
}

function computeNextExpectedDate(frequency, dayOfWeek, lastDateStr) {
  const base = lastDateStr ? new Date(lastDateStr) : new Date();
  const next = new Date(base);

  if (frequency === 'DAILY') {
    next.setDate(next.getDate() + 1);
  } else if (frequency === 'WORKDAYS') {
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() === 0 || next.getDay() === 6);
  } else if (frequency === 'WEEKLY' && dayOfWeek != null) {
    do {
      next.setDate(next.getDate() + 1);
    } while (next.getDay() !== dayOfWeek);
  } else if (frequency === 'FORTNIGHTLY') {
    next.setDate(next.getDate() + 14);
  } else if (frequency === 'MONTHLY') {
    next.setMonth(next.getMonth() + 1);
  } else {
    next.setDate(next.getDate() + 1);
  }

  return next.toISOString().slice(0, 10);
}

function calculateEstimates(typicalAmount, frequency) {
  const amt = Number(typicalAmount || 0);
  let weekly = amt * 7;
  let monthly = amt * 30;

  if (frequency === 'WORKDAYS') {
    weekly = amt * 5;
    monthly = amt * 22;
  } else if (frequency === 'WEEKLY') {
    weekly = amt * 1;
    monthly = amt * 4.33;
  } else if (frequency === 'FORTNIGHTLY') {
    weekly = amt * 0.5;
    monthly = amt * 2.16;
  } else if (frequency === 'MONTHLY') {
    weekly = amt * (7 / 30.5);
    monthly = amt * 1;
  }

  const annual = monthly * 12;

  return {
    weeklyEstimate: Math.round(weekly * 100) / 100,
    monthlyEstimate: Math.round(monthly * 100) / 100,
    annualEstimate: Math.round(annual * 100) / 100,
  };
}

async function detectPatternsFromHistory(userId) {
  const result = await db.query(
    `SELECT e.amount, TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date,
            e.merchant_name, e.description, e.category_id, c.name AS category_name
     FROM expenses e
     JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
     ORDER BY e.expense_date ASC`,
    [userId]
  );

  const expenses = result.rows;
  if (expenses.length < 2) return [];

  // Group by normalized name and category
  const groups = {};
  for (const exp of expenses) {
    const rawName = exp.merchant_name || exp.description || exp.category_name;
    const norm = normalizePatternName(rawName);
    const key = `${exp.category_id}_${norm.toLowerCase()}`;

    if (!groups[key]) {
      groups[key] = {
        categoryId: exp.category_id,
        categoryName: exp.category_name,
        patternName: norm,
        items: [],
      };
    }
    groups[key].items.push(exp);
  }

  const detected = [];

  for (const group of Object.values(groups)) {
    if (group.items.length < 2) continue; // Need at least 2 occurrences to establish a pattern

    const amounts = group.items.map((i) => Number(i.amount));
    const dates = group.items.map((i) => new Date(i.expense_date)).sort((a, b) => a - b);

    // Calculate typical amount (average)
    const sum = amounts.reduce((a, b) => a + b, 0);
    const typicalAmount = Math.round((sum / amounts.length) * 100) / 100;
    const minAmount = Math.min(...amounts);
    const maxAmount = Math.max(...amounts);

    // Calculate intervals between consecutive occurrences
    const intervals = [];
    const daysOfWeek = [];
    for (let i = 1; i < dates.length; i++) {
      const diffDays = Math.round((dates[i] - dates[i - 1]) / (1000 * 60 * 60 * 24));
      if (diffDays >= 0) intervals.push(diffDays);
    }
    dates.forEach((d) => daysOfWeek.push(d.getDay()));

    // Determine dominant day of week if any
    const dowCounts = {};
    daysOfWeek.forEach((d) => { dowCounts[d] = (dowCounts[d] || 0) + 1; });
    let maxDow = null, maxDowCount = 0;
    for (const [dow, cnt] of Object.entries(dowCounts)) {
      if (cnt > maxDowCount) { maxDowCount = cnt; maxDow = Number(dow); }
    }

    // Determine frequency
    const avgInterval = intervals.length > 0
      ? intervals.reduce((a, b) => a + b, 0) / intervals.length
      : 1;

    let frequency = 'DAILY';
    let targetDow = null;

    const areAllWorkdays = daysOfWeek.every((d) => d >= 1 && d <= 5);

    if (areAllWorkdays && avgInterval <= 3) {
      frequency = 'WORKDAYS';
    } else if (avgInterval >= 5 && avgInterval <= 9 && maxDowCount >= Math.ceil(dates.length * 0.6)) {
      frequency = 'WEEKLY';
      targetDow = maxDow;
    } else if (avgInterval >= 12 && avgInterval <= 18) {
      frequency = 'FORTNIGHTLY';
    } else if (avgInterval >= 25 && avgInterval <= 35) {
      frequency = 'MONTHLY';
    } else if (avgInterval <= 2) {
      frequency = 'DAILY';
    }

    // Calculate confidence score
    let confidence = 0.50;
    if (group.items.length >= 4) confidence = 0.88;
    else if (group.items.length >= 3) confidence = 0.75;
    else confidence = 0.60;

    // Consistency check on amounts
    const variance = (maxAmount - minAmount) / (typicalAmount || 1);
    if (variance < 0.2) confidence = Math.min(0.96, confidence + 0.08);

    const lastObservedStr = dates[dates.length - 1].toISOString().slice(0, 10);
    const nextExpectedStr = computeNextExpectedDate(frequency, targetDow, lastObservedStr);

    // Upsert into repository
    const existing = await recurringPatternRepository.findByNameAndUser(group.patternName, userId);

    if (existing) {
      // If user has confirmed or paused, only update tracking dates and count
      if (['CONFIRMED', 'PAUSED', 'DISMISSED'].includes(existing.status)) {
        await recurringPatternRepository.updatePattern(existing.pattern_id, userId, {
          last_observed_date: lastObservedStr,
          occurrence_count: group.items.length,
        });
      } else {
        // Update detected metrics
        await recurringPatternRepository.updatePattern(existing.pattern_id, userId, {
          category_id: group.categoryId,
          typical_amount: typicalAmount,
          min_amount: minAmount,
          max_amount: maxAmount,
          frequency,
          day_of_week: targetDow,
          last_observed_date: lastObservedStr,
          next_expected_date: nextExpectedStr,
          occurrence_count: group.items.length,
          confidence_score: confidence,
        });
      }
      detected.push(existing);
    } else {
      const created = await recurringPatternRepository.createPattern({
        userId,
        categoryId: group.categoryId,
        patternName: group.patternName,
        typicalAmount,
        minAmount,
        maxAmount,
        frequency,
        dayOfWeek: targetDow,
        lastObservedDate: lastObservedStr,
        nextExpectedDate: nextExpectedStr,
        occurrenceCount: group.items.length,
        confidenceScore: confidence,
        status: 'DETECTED',
        remindersEnabled: true,
      });
      detected.push(created);
    }
  }

  return detected;
}

async function getPatterns(userId, statusFilter = 'ALL') {
  // First run discovery sweep
  await detectPatternsFromHistory(userId).catch((e) => console.warn('[RecurringPatternService] Detection error:', e.message));

  const patterns = await recurringPatternRepository.findAllByUser(userId, statusFilter);
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  // Enhance each pattern with actual this-month stats and projection estimates
  const enhanced = await Promise.all(
    patterns.map(async (p) => {
      const estimates = calculateEstimates(p.typical_amount, p.frequency);

      // Query actual spending matching this pattern in the current month
      const actualRes = await db.query(
        `SELECT COUNT(*)::int AS count, COALESCE(SUM(amount), 0) AS total,
                ROUND(AVG(amount), 2) AS avg_amount
         FROM expenses
         WHERE user_id = $1
           AND (
             LOWER(merchant_name) LIKE LOWER($2)
             OR LOWER(description) LIKE LOWER($2)
             OR (category_id = $3 AND amount BETWEEN $4 AND $5)
           )
           AND EXTRACT(MONTH FROM expense_date) = $6
           AND EXTRACT(YEAR FROM expense_date) = $7`,
        [
          userId,
          `%${p.pattern_name}%`,
          p.category_id,
          Number(p.min_amount || p.typical_amount) * 0.8,
          Number(p.max_amount || p.typical_amount) * 1.2,
          currentMonth,
          currentYear,
        ]
      );

      const actualSpentThisMonth = Number(actualRes.rows[0]?.total || 0);
      const actualCountThisMonth = Number(actualRes.rows[0]?.count || 0);
      const avgSpentPerPurchase = Number(actualRes.rows[0]?.avg_amount || p.typical_amount);

      return {
        ...p,
        ...estimates,
        actualSpentThisMonth,
        actualCountThisMonth,
        avgSpentPerPurchase,
      };
    })
  );

  return enhanced;
}

async function createManualPattern(userId, data) {
  const {
    patternName,
    categoryId,
    typicalAmount,
    frequency = 'DAILY',
    dayOfWeek = null,
    remindersEnabled = true,
  } = data;

  const nextExpectedDate = computeNextExpectedDate(frequency, dayOfWeek, new Date().toISOString().slice(0, 10));

  return recurringPatternRepository.createPattern({
    userId,
    categoryId: categoryId ? Number(categoryId) : null,
    patternName: patternName.trim(),
    typicalAmount: Number(typicalAmount),
    minAmount: Number(typicalAmount),
    maxAmount: Number(typicalAmount),
    frequency,
    dayOfWeek: dayOfWeek != null ? Number(dayOfWeek) : null,
    lastObservedDate: new Date().toISOString().slice(0, 10),
    nextExpectedDate,
    occurrenceCount: 1,
    confidenceScore: 0.95,
    status: 'CONFIRMED',
    remindersEnabled: Boolean(remindersEnabled),
  });
}

async function updatePattern(patternId, userId, updates) {
  const allowedUpdates = {};
  if (updates.patternName !== undefined) allowedUpdates.pattern_name = updates.patternName;
  if (updates.categoryId !== undefined) allowedUpdates.category_id = updates.categoryId;
  if (updates.typicalAmount !== undefined) {
    allowedUpdates.typical_amount = Number(updates.typicalAmount);
    allowedUpdates.min_amount = updates.minAmount !== undefined ? Number(updates.minAmount) : Number(updates.typicalAmount);
    allowedUpdates.max_amount = updates.maxAmount !== undefined ? Number(updates.maxAmount) : Number(updates.typicalAmount);
  }
  if (updates.frequency !== undefined) allowedUpdates.frequency = updates.frequency;
  if (updates.dayOfWeek !== undefined) allowedUpdates.day_of_week = updates.dayOfWeek;
  if (updates.status !== undefined) allowedUpdates.status = updates.status;
  if (updates.remindersEnabled !== undefined) allowedUpdates.reminders_enabled = Boolean(updates.remindersEnabled);

  return recurringPatternRepository.updatePattern(patternId, userId, allowedUpdates);
}

async function deletePattern(patternId, userId) {
  return recurringPatternRepository.deletePattern(patternId, userId);
}

async function getDuePrompts(userId, dateStr) {
  const targetDateStr = dateStr || new Date().toISOString().slice(0, 10);
  const targetDate = new Date(targetDateStr);
  const dow = targetDate.getDay(); // 0=Sun..6=Sat
  const isWeekday = dow >= 1 && dow <= 5;

  const patterns = await recurringPatternRepository.findAllByUser(userId);

  const due = [];

  for (const p of patterns) {
    if (p.status !== 'CONFIRMED' && (p.status !== 'DETECTED' || Number(p.confidence_score) < 0.65)) {
      continue;
    }
    if (!p.reminders_enabled) continue;

    // 1. Safeguard: If already answered today, do not ask again today
    const lastRespDate = p.last_response_date ? new Date(p.last_response_date).toISOString().slice(0, 10) : null;
    if (lastRespDate === targetDateStr) {
      continue;
    }

    // 2. Safeguard: Check if user already recorded an expense matching this pattern today
    const alreadyLoggedRes = await db.query(
      `SELECT 1 FROM expenses
       WHERE user_id = $1 AND expense_date = $2::date
         AND (
           LOWER(merchant_name) LIKE LOWER($3)
           OR LOWER(description) LIKE LOWER($3)
           OR (category_id = $4 AND amount = $5)
         )
       LIMIT 1`,
      [userId, targetDateStr, `%${p.pattern_name}%`, p.category_id, p.typical_amount]
    );

    if (alreadyLoggedRes.rows.length > 0) {
      continue; // Expense already logged today!
    }

    // 3. Schedule match
    let isDueToday = false;
    if (p.frequency === 'DAILY') {
      isDueToday = true;
    } else if (p.frequency === 'WORKDAYS') {
      isDueToday = isWeekday;
    } else if (p.frequency === 'WEEKLY') {
      isDueToday = p.day_of_week != null ? p.day_of_week === dow : true;
    } else if (p.next_expected_date && p.next_expected_date <= targetDateStr) {
      isDueToday = true;
    }

    if (isDueToday) {
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      let promptText = `Did you purchase ${p.pattern_name} today? (Usual: ₹${Number(p.typical_amount).toLocaleString('en-IN')})`;

      if (p.frequency === 'WEEKLY' && p.day_of_week != null) {
        promptText = `It's ${dayNames[p.day_of_week]}. Did you buy ${p.pattern_name} today? (Usual: ₹${Number(p.typical_amount).toLocaleString('en-IN')})`;
      } else if (p.pattern_name.toLowerCase().includes('tea') || p.pattern_name.toLowerCase().includes('coffee')) {
        promptText = `Did you have ${p.pattern_name} at the office today? Your usual amount is ₹${Number(p.typical_amount).toLocaleString('en-IN')}.`;
      } else if (p.pattern_name.toLowerCase().includes('milk')) {
        promptText = `Did you buy ${p.pattern_name} today? (Usual: ₹${Number(p.typical_amount).toLocaleString('en-IN')})`;
      }

      due.push({
        patternId: p.pattern_id,
        patternName: p.pattern_name,
        typicalAmount: Number(p.typical_amount),
        categoryId: p.category_id,
        categoryName: p.category_name,
        frequency: p.frequency,
        promptText,
        confidence: Number(p.confidence_score),
        status: p.status,
      });

      // Mark last_prompted_date
      await recurringPatternRepository.recordPrompt(p.pattern_id, userId, targetDateStr);
    }
  }

  return due;
}

async function respondToPrompt(patternId, userId, { response, date, customAmount, createExpense = false }) {
  const targetDateStr = date || new Date().toISOString().slice(0, 10);
  const pattern = await recurringPatternRepository.findByIdAndUser(patternId, userId);
  if (!pattern) {
    const err = new Error('Pattern not found');
    err.statusCode = 404;
    err.expose = true;
    throw err;
  }

  const normalizedResp = String(response).toUpperCase();

  if (normalizedResp === 'NO') {
    await recurringPatternRepository.recordResponse(patternId, userId, 'NO', targetDateStr);
    return {
      status: 'RECORDED',
      message: `Noted. No expense recorded for ${pattern.pattern_name} today.`,
      patternId,
      date: targetDateStr,
    };
  }

  if (normalizedResp === 'SNOOZE' || normalizedResp === 'DISMISS') {
    await recurringPatternRepository.recordResponse(patternId, userId, normalizedResp, targetDateStr);
    return {
      status: normalizedResp,
      message: `Prompt snoozed for today.`,
      patternId,
      date: targetDateStr,
    };
  }

  if (normalizedResp === 'YES') {
    let createdExpense = null;
    const finalAmount = customAmount != null ? Number(customAmount) : Number(pattern.typical_amount);

    if (createExpense) {
      createdExpense = await expenseRepository.create({
        userId,
        categoryId: pattern.category_id,
        amount: finalAmount,
        expenseDate: targetDateStr,
        merchantName: pattern.pattern_name,
        paymentMode: 'UPI',
        description: `Recurring habit: ${pattern.pattern_name}`,
        sourceType: 'RECURRING',
      });
    }

    const nextExpected = computeNextExpectedDate(pattern.frequency, pattern.day_of_week, targetDateStr);

    await recurringPatternRepository.updatePattern(patternId, userId, {
      last_observed_date: targetDateStr,
      next_expected_date: nextExpected,
      occurrence_count: Number(pattern.occurrence_count || 0) + 1,
      last_response: 'YES',
      last_response_date: targetDateStr,
    });

    return {
      status: 'CONFIRMED',
      message: `Recorded ${pattern.pattern_name} for ₹${finalAmount.toLocaleString('en-IN')} on ${targetDateStr}.`,
      expense: createdExpense,
      prefillData: {
        patternId: pattern.pattern_id,
        patternName: pattern.pattern_name,
        amount: finalAmount,
        categoryId: pattern.category_id,
        expenseDate: targetDateStr,
      },
    };
  }

  const err = new Error('Invalid prompt response. Expected YES, NO, SNOOZE, or DISMISS.');
  err.statusCode = 400;
  err.expose = true;
  throw err;
}

module.exports = {
  detectPatternsFromHistory,
  getPatterns,
  createManualPattern,
  updatePattern,
  deletePattern,
  getDuePrompts,
  respondToPrompt,
};

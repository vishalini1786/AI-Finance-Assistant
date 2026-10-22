const userService = require('./userService');
const dashboardService = require('./dashboardService');
const budgetService = require('./budgetService');
const projectService = require('./projectService');
const goalService = require('./goalService');
const holdingService = require('./holdingService');
const incomeService = require('./incomeService');
const expenseService = require('./expenseService');
const financialProfileService = require('./financialProfileService');

const budgetRepository = require('../repositories/budgetRepository');
const goalRepository = require('../repositories/goalRepository');
const projectRepository = require('../repositories/projectRepository');
const calendarRepository = require('../repositories/calendarRepository');
const categoryRepository = require('../repositories/categoryRepository');
const db = require('../config/database');

// User-scoped idempotency cache to prevent duplicate submissions of the exact same pending transaction ID
const completedTransactions = new Map();

function isConfirmationMessage(text) {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const directConfirmations = new Set([
    'yes', 'yeah', 'yep', 'yup', 'confirm', 'proceed', 'sure', 'fine',
    'ok', 'okay', 'seri', 'sari', 'haan', 'ha', 'do it', 'go ahead',
    'add it', 'save it', 'save', 'record it', 'confirm and add', 'yes add',
    'okay save it', 'ok save it', 'okay add it', 'ok add it', 'yes bro',
    'yes da', 'yes please', 'pls add', 'please add', 'seri pa', 'seri da',
    'okay bro', 'ok bro', 'sure thing', 'yes do it'
  ]);

  if (directConfirmations.has(clean)) return true;

  const confirmPatterns = [
    /^(yes|yeah|yep|yup|sure|ok|okay|fine|haan|ha|seri|sari)\s+(?:add|add it|save|save it|confirm|proceed|go ahead|do it|record|record it)$/i,
    /^(yes|yeah|yep|yup|sure|ok|okay|fine|haan|ha|seri|sari)\s+(?:bro|da|pa|friend|boss|please|pls)$/i,
    /^(yes|yeah|yep|yup|sure|ok|okay|fine|haan|ha|seri|sari)\s+(?:bro|da|pa|please|pls)\s+(?:add|add it|save|save it|do it)$/i,
    /^(confirm\s+and\s+add|confirm\s+add|please\s+add|pls\s+add|please\s+save|pls\s+save|go\s+ahead\s+and\s+add)$/i,
    /^(okay\s+save\s+it|ok\s+save\s+it|okay\s+add\s+it|ok\s+add\s+it|okay\s+save|ok\s+save)$/i,
    /^(seri\s+pa|seri\s+da|seri\s+bro|seri\s+ma)$/i,
    /^(haan\s+add\s+kar\s+do|haan\s+bhai|haan\s+bro|haan\s+ji)$/i,
    /^go\s+ahead(?:\s+(?:bro|da|pa|please|pls))?$/i,
    /^do\s+it(?:\s+(?:bro|da|pa|please|pls))?$/i,
  ];

  return confirmPatterns.some((pattern) => pattern.test(clean));
}

function isCancellationMessage(text) {
  if (!text) return false;
  const clean = text
    .toLowerCase()
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"']/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // If message contains correction or edit words, it is not a cancellation
  if (/\b(?:meant|mean|actually|instead|rather|make\s+it|change)\b/i.test(clean)) {
    return false;
  }

  const directCancels = new Set([
    'cancel', 'discard', 'abort', 'nevermind', 'stop', 'decline', 'drop',
    'no', 'nope', 'nah', 'no need', 'dont add', 'do not add', 'dont save', 'do not save',
    'cancel it', 'leave it', 'skip', 'forget it'
  ]);

  if (directCancels.has(clean)) return true;

  const cancelPatterns = [
    /^no\b/i,
    /\b(?:didn't|did not|never)\s+(?:buy|spend|pay|purchase|get|earn|have|drink)\b/i,
    /\b(?:cancel\s+it|discard\s+it|don't\s+add|do\s+not\s+add|don't\s+save|do\s+not\s+save)\b/i,
    /\b(?:wrong\s+(?:entry|amount|record)|mistake|not\s+now|no\s+need|leave\s+it|forget\s+it)\b/i,
  ];

  return cancelPatterns.some((pattern) => pattern.test(clean));
}

function formatCurrency(amt) {
  return `₹${Number(amt || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function parseWordNumber(text) {
  if (!text) return null;
  const map = {
    zero: 0, one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9,
    ten: 10, eleven: 11, twelve: 12, thirteen: 13, fourteen: 14, fifteen: 15, sixteen: 16,
    seventeen: 17, eighteen: 18, nineteen: 19, twenty: 20, thirty: 30, forty: 40, fifty: 50,
    sixty: 60, seventy: 70, eighty: 80, ninety: 90, hundred: 100, thousand: 1000,
    lakh: 100000, lakhs: 100000, lac: 100000, lacs: 100000, crore: 10000000, crores: 10000000,
  };
  const tokens = text.toLowerCase().trim().split(/[\s-]+/);
  let total = 0;
  let current = 0;
  let matchedAny = false;
  for (const t of tokens) {
    if (t === 'and' || t === 'a' || t === 'another') continue;
    if (map[t] !== undefined) {
      matchedAny = true;
      const v = map[t];
      if (v === 100) {
        current = (current || 1) * 100;
      } else if (v >= 1000) {
        current = (current || 1) * v;
        total += current;
        current = 0;
      } else {
        current += v;
      }
    } else {
      break;
    }
  }
  total += current;
  return matchedAny ? total : null;
}

function dateToIso(d) {
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
}

function todayIso() {
  return dateToIso(new Date());
}

function extractFinancialEntities(text) {
  if (!text) return { quantities: [], dates: [], money: [], percentages: [], durations: [] };

  const quantities = [];
  const dates = [];
  const percentages = [];
  const durations = [];
  const money = [];

  // 1. Quantities: '1 gram', '5 units', '10 shares', '2 litres'
  const qtyRegex = /\b(\d+(?:\.\d+)?)\s*(grams?|gms?|gm|g\b|kgs?|kilos?|litres?|liters?|ltr|l\b|units?|shares?|pieces?|nos?)\b/gi;
  let qMatch;
  while ((qMatch = qtyRegex.exec(text)) !== null) {
    quantities.push({
      value: parseFloat(qMatch[1]),
      unit: qMatch[2].toLowerCase(),
      raw: qMatch[0],
      start: qMatch.index,
      end: qMatch.index + qMatch[0].length,
    });
  }

  // 2. Percentages: '8% return', '12 percent'
  const pctRegex = /\b(\d+(?:\.\d+)?)\s*(?:%|percent(?:age)?\b)/gi;
  let pMatch;
  while ((pMatch = pctRegex.exec(text)) !== null) {
    percentages.push({
      value: parseFloat(pMatch[1]),
      raw: pMatch[0],
      start: pMatch.index,
      end: pMatch.index + pMatch[0].length,
    });
  }

  // 3. Durations: '12 months', '5 years'
  const durRegex = /\b(\d+(?:\.\d+)?)\s*(months?|years?|yrs?|weeks?|days?)\b/gi;
  let dMatch;
  while ((dMatch = durRegex.exec(text)) !== null) {
    durations.push({
      value: parseFloat(dMatch[1]),
      unit: dMatch[2].toLowerCase(),
      raw: dMatch[0],
      start: dMatch.index,
      end: dMatch.index + dMatch[0].length,
    });
  }

  // 4. Dates
  // 4a. Day Month Year: '19th September 2026', '19 Sep 2026'
  const dmyRegex = /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)(?:\s*,?\s*(\d{4}))?\b/gi;
  let dtMatch;
  while ((dtMatch = dmyRegex.exec(text)) !== null) {
    const day = parseInt(dtMatch[1], 10);
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.findIndex((m) => dtMatch[2].toLowerCase().startsWith(m));
    const year = dtMatch[3] ? parseInt(dtMatch[3], 10) : new Date().getFullYear();
    dates.push({
      iso: `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      raw: dtMatch[0],
      start: dtMatch.index,
      end: dtMatch.index + dtMatch[0].length,
    });
  }

  // 4b. Month Day Year: 'September 19th, 2026'
  const mdyRegex = /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{1,2})(?:st|nd|rd|th)?(?:\s*,?\s*(\d{4}))?\b/gi;
  while ((dtMatch = mdyRegex.exec(text)) !== null) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.findIndex((m) => dtMatch[1].toLowerCase().startsWith(m));
    const day = parseInt(dtMatch[2], 10);
    const year = dtMatch[3] ? parseInt(dtMatch[3], 10) : new Date().getFullYear();
    dates.push({
      iso: `${year}-${String(mIdx + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      raw: dtMatch[0],
      start: dtMatch.index,
      end: dtMatch.index + dtMatch[0].length,
    });
  }

  // 4c. ISO date: '2026-09-19'
  const isoRegex = /\b(\d{4})-(\d{2})-(\d{2})\b/g;
  while ((dtMatch = isoRegex.exec(text)) !== null) {
    dates.push({
      iso: dtMatch[0],
      raw: dtMatch[0],
      start: dtMatch.index,
      end: dtMatch.index + dtMatch[0].length,
    });
  }

  // 4d. DD/MM/YYYY or DD-MM-YYYY
  const slashDmyRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/g;
  while ((dtMatch = slashDmyRegex.exec(text)) !== null) {
    const day = dtMatch[1].padStart(2, '0');
    const month = dtMatch[2].padStart(2, '0');
    const year = dtMatch[3];
    dates.push({
      iso: `${year}-${month}-${day}`,
      raw: dtMatch[0],
      start: dtMatch.index,
      end: dtMatch.index + dtMatch[0].length,
    });
  }

  // 4e. Relative dates
  const lower = text.toLowerCase();
  if (lower.includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    const idx = lower.indexOf('yesterday');
    dates.push({
      iso: dateToIso(d),
      raw: 'yesterday',
      start: idx,
      end: idx + 9,
    });
  }
  if (lower.includes('day before yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 2);
    const idx = lower.indexOf('day before yesterday');
    dates.push({
      iso: dateToIso(d),
      raw: 'day before yesterday',
      start: idx,
      end: idx + 20,
    });
  }

  // Non-money ranges to avoid capturing as money
  const reservedRanges = [
    ...quantities.map((q) => [q.start, q.end]),
    ...percentages.map((p) => [p.start, p.end]),
    ...durations.map((d) => [d.start, d.end]),
    ...dates.map((d) => [d.start, d.end]),
  ];

  function isReserved(start, end) {
    return reservedRanges.some(([rStart, rEnd]) => !(end <= rStart || start >= rEnd));
  }

  // 5. Money Amounts
  function addMoney(amt, start, end, raw) {
    if (isNaN(amt) || amt <= 0) return;
    if (isReserved(start, end)) return;
    const overlapIdx = money.findIndex((m) => !(end <= m.start || start >= m.end));
    if (overlapIdx !== -1) {
      if (raw.length > money[overlapIdx].raw.length) {
        money[overlapIdx] = { value: amt, start, end, raw };
      }
    } else {
      money.push({ value: amt, start, end, raw });
    }
  }

  // 5a. Currency symbol/code with prefix: ₹15,000, Rs. 15000, INR 15000, rupees 15, rupee 200
  const currRegex = /(?:₹|rs\.?|rupees?|inr)\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(crores?|cr|lakhs?|lacs?|lac|l\b|k\b)?\b/gi;
  let cMatch;
  while ((cMatch = currRegex.exec(text)) !== null) {
    let amt = parseFloat(cMatch[1].replace(/,/g, ''));
    const mult = cMatch[2] ? cMatch[2].toLowerCase() : '';
    if (mult.startsWith('cr')) amt *= 10000000;
    else if (mult.startsWith('l')) amt *= 100000;
    else if (mult === 'k') amt *= 1000;
    addMoney(amt, cMatch.index, cMatch.index + cMatch[0].length, cMatch[0]);
  }

  // 5b. Currency with suffix: 15 rupees, 200 rs
  const currSuffixRegex = /\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:rupees?|rs\.?|inr)\b/gi;
  let csMatch;
  while ((csMatch = currSuffixRegex.exec(text)) !== null) {
    const amt = parseFloat(csMatch[1].replace(/,/g, ''));
    addMoney(amt, csMatch.index, csMatch.index + csMatch[0].length, csMatch[0]);
  }

  // 5c. Denomination words: 1 crore, 50 lakhs, 15k, 2 lakh
  const denomRegex = /\b(\d+(?:\.\d+)?)\s*(crores?|cr|lakhs?|lacs?|lac|k)\b/gi;
  let dnMatch;
  while ((dnMatch = denomRegex.exec(text)) !== null) {
    let amt = parseFloat(dnMatch[1]);
    const mult = dnMatch[2].toLowerCase();
    if (mult.startsWith('cr')) amt *= 10000000;
    else if (mult.startsWith('l')) amt *= 100000;
    else if (mult === 'k') amt *= 1000;
    addMoney(amt, dnMatch.index, dnMatch.index + dnMatch[0].length, dnMatch[0]);
  }

  // 5d. Contextual money verbs: 'worth about 15,000', 'cost 200', 'costs about rupees 15', 'bill was rupees 200', 'costs 300'
  const contextMoneyRegex = /\b(?:worth(?:\s+about|\s+around)?|cost(?:s)?(?:\s+about|\s+around)?|spent|paid|received|earned|got|saved|price(?:\s+of)?|for|at|(?:total\s+)?bill(?:\s+of|\s+was|\s+is)?|(?:was|is)(?:\s+about|\s+around)?)\s+(?:about|around|approx(?:\.)?|₹|rs\.?|rupees?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)\s*(crores?|cr|lakhs?|lacs?|lac|l\b|k\b)?\b/gi;
  let cmMatch;
  while ((cmMatch = contextMoneyRegex.exec(text)) !== null) {
    const rawDigits = cmMatch[1].replace(/,/g, '');
    let amt = parseFloat(rawDigits);
    const mult = cmMatch[2] ? cmMatch[2].toLowerCase() : '';
    if (mult.startsWith('cr')) amt *= 10000000;
    else if (mult.startsWith('l')) amt *= 100000;
    else if (mult === 'k') amt *= 1000;
    addMoney(amt, cmMatch.index, cmMatch.index + cmMatch[0].length, cmMatch[0]);
  }

  // 5e. Conjoined list items: '40 on tea, 120 on breakfast, 200 on lunch'
  const listMoneyRegex = /\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:on|for)\s+([a-zA-Z]+)/gi;
  let lmMatch;
  while ((lmMatch = listMoneyRegex.exec(text)) !== null) {
    const amt = parseFloat(lmMatch[1].replace(/,/g, ''));
    addMoney(amt, lmMatch.index, lmMatch.index + lmMatch[0].length, lmMatch[0]);
  }

  // 5f. Multiple numbers in spending clause: 'cost 80 and 120'
  const conjoinedRegex = /\b(?:cost(?:s)?|spent|paid|items?|bill)\s+(?:about\s+)?(\d[\d,]*)\s+(?:and|,)\s*(\d[\d,]*)/gi;
  let cjMatch;
  while ((cjMatch = conjoinedRegex.exec(text)) !== null) {
    const a1 = parseFloat(cjMatch[1].replace(/,/g, ''));
    const a2 = parseFloat(cjMatch[2].replace(/,/g, ''));
    addMoney(a1, cjMatch.index, cjMatch.index + cjMatch[1].length + 4, cjMatch[1]);
    const secStart = cjMatch.index + cjMatch[0].lastIndexOf(cjMatch[2]);
    addMoney(a2, secStart, secStart + cjMatch[2].length, cjMatch[2]);
  }

  // 5g. Spoken word amounts: 'ten rupees', 'two hundred', 'fifty', 'five hundred'
  const wordAmountsRegex = /\b(?:tea\s+for|breakfast\s+cost|fruits\s+for|petrol\s+for|spent\s+another|spent|paid|cost|worth|for)\s+(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|crore)(?:\s+(?:hundred|thousand|lakh|crore))?(?:\s+rupees)?\b/gi;
  let waMatch;
  while ((waMatch = wordAmountsRegex.exec(text)) !== null) {
    const fullMatch = waMatch[0];
    const wordsOnly = fullMatch.replace(/^(?:tea\s+for|breakfast\s+cost|fruits\s+for|petrol\s+for|spent\s+another|spent|paid|cost|worth|for)\s+/i, '').replace(/\s+rupees$/i, '');
    const val = parseWordNumber(wordsOnly);
    if (val) {
      addMoney(val, waMatch.index, waMatch.index + fullMatch.length, fullMatch);
    }
  }

  money.sort((a, b) => a.start - b.start);
  return { quantities, dates, percentages, durations, money };
}

// Extract money amounts from natural language (e.g. "₹10,000", "1 crore", "50 lakhs", "25k", "25,000", "600 received")
function extractAmount(text) {
  if (!text) return null;
  const entities = extractFinancialEntities(text);
  if (entities.money.length > 0) {
    return entities.money[0].value;
  }

  const crMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:crores?|cr)\b/i);
  if (crMatch) return parseFloat(crMatch[1]) * 10000000;

  const lakhMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:lakhs?|lacs?|l)\b/i);
  if (lakhMatch) return parseFloat(lakhMatch[1]) * 100000;

  const kMatch = text.match(/(\d+(?:\.\d+)?)\s*k\b/i);
  if (kMatch) return parseFloat(kMatch[1]) * 1000;

  // Numbers followed by financial verbs: '600 received', '500 spent', '200 paid'
  const followMatch = text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\s*(?:received|earned|credit|spent|paid|cost|worth|for)\b/i);
  if (followMatch) {
    return parseFloat(followMatch[1].replace(/,/g, ''));
  }

  // Numbers preceded by financial verbs/words: 'add 600', 'worth 15000', 'spent 50', 'for 50'
  const prevMatch = text.match(/\b(?:add|record|spent|paid|received|worth|cost|for|price of|bill of|amount of)\s+(?:about|around|approx(?:\.)?|₹|rs\.?|inr)?\s*(\d[\d,]*(?:\.\d{1,2})?)\b/i);
  if (prevMatch) {
    return parseFloat(prevMatch[1].replace(/,/g, ''));
  }

  // Match currency prefix or amount starting with a digit (excluding ordinals, dates, years, quantities)
  const anyDigit = text.match(/\b(\d[\d,]*(?:\.\d{1,2})?)\b(?!\s*(?:st|nd|rd|th|grams?|gms?|gm|kg|litres?|liters?|ltr|units?|shares?|pieces?|years?|months?|days?|%|percent))\b/i);
  if (anyDigit) {
    const val = parseFloat(anyDigit[1].replace(/,/g, ''));
    if (!isNaN(val) && val > 0 && val !== new Date().getFullYear()) return val;
  }

  return null;
}

function calculateLoanEmi(principal, annualRatePercent, tenureYears) {
  if (!principal || principal <= 0) return 0;
  const monthlyRate = (annualRatePercent / 12) / 100;
  const totalMonths = tenureYears * 12;
  const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, totalMonths)) / (Math.pow(1 + monthlyRate, totalMonths) - 1);
  return Math.round(emi);
}

// Extract specific or relative date from text
function extractDate(text) {
  if (!text) return todayIso();
  const entities = extractFinancialEntities(text);
  if (entities.dates.length > 0) {
    return entities.dates[0].iso;
  }

  const lower = text.toLowerCase();
  const d = new Date();

  if (lower.includes('yesterday')) {
    d.setDate(d.getDate() - 1);
    return dateToIso(d);
  }
  if (lower.includes('day before yesterday')) {
    d.setDate(d.getDate() - 2);
    return dateToIso(d);
  }
  if (lower.includes('today') || lower.includes('now') || lower.includes('tonight')) {
    return todayIso();
  }

  // Look for YYYY-MM-DD
  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return isoMatch[0];

  // Look for DD/MM/YYYY or DD-MM-YYYY
  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  return todayIso();
}

// Extract future target dates (e.g., "by December 2027", "by next year", "by 2027-12-31")
function extractTargetDate(text) {
  if (!text) return null;
  const lower = text.toLowerCase();

  const isoMatch = text.match(/\b(\d{4})-(\d{2})-(\d{2})\b/);
  if (isoMatch) return isoMatch[0];

  const dmyMatch = text.match(/\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/);
  if (dmyMatch) {
    return `${dmyMatch[3]}-${dmyMatch[2].padStart(2, '0')}-${dmyMatch[1].padStart(2, '0')}`;
  }

  const myMatch = lower.match(/\b(?:by\s+)?(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+(\d{4})\b/i);
  if (myMatch) {
    const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
    const mIdx = months.findIndex((m) => myMatch[1].toLowerCase().startsWith(m));
    const yr = parseInt(myMatch[2], 10);
    const lastDay = new Date(yr, mIdx + 1, 0).getDate();
    return `${yr}-${String(mIdx + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  }

  if (lower.includes('next year')) {
    const yr = new Date().getFullYear() + 1;
    return `${yr}-12-31`;
  }

  return null;
}

function calculateMonthlyGoalContribution(targetAmount, currentAmount, targetDateStr) {
  const rem = Math.max(0, Number(targetAmount || 0) - Number(currentAmount || 0));
  if (rem <= 0) return 0;
  if (!targetDateStr) return Math.ceil(rem / 12);
  const now = new Date();
  const target = new Date(targetDateStr);
  const months = (target.getFullYear() - now.getFullYear()) * 12 + (target.getMonth() - now.getMonth());
  return Math.ceil(rem / Math.max(1, months));
}

function parseDayNarration(text, categories = []) {
  if (!text) return null;
  const entities = extractFinancialEntities(text);
  const moneyItems = entities.money;

  // We require at least 2 money items or multiple distinct spending items to be a multi-transaction narration
  if (moneyItems.length <= 1) {
    return null;
  }

  const defaultDate = entities.dates[0] ? entities.dates[0].iso : todayIso();
  const transactions = [];

  // Calculate clean boundaries between moneyItems
  const boundaries = [];
  for (let i = 0; i < moneyItems.length - 1; i++) {
    const prevEnd = moneyItems[i].end;
    const nextStart = moneyItems[i + 1].start;
    const between = text.slice(prevEnd, nextStart);

    // Look for punctuation, conjunctions, or temporal markers to split clauses
    const sepRegex = /([.;]|\n+|(?:,\s*(?:and|then)\b)|(?:\b(?:and\s+then|and|then|later|after\s+that|in the evening|in the morning|in the afternoon)\b)|,)/i;
    const match = sepRegex.exec(between);

    let splitOffset;
    if (match) {
      splitOffset = match.index + match[0].length;
    } else {
      splitOffset = Math.floor(between.length / 2);
    }
    boundaries.push(prevEnd + splitOffset);
  }

  for (let i = 0; i < moneyItems.length; i++) {
    const current = moneyItems[i];
    const startBound = i === 0 ? 0 : boundaries[i - 1];
    const endBound = i === moneyItems.length - 1 ? text.length : boundaries[i];

    const segment = text.slice(startBound, endBound).trim();
    const isIncome = /\b(received|credit|earned|salary|freelance|got|income|cashback)\b/i.test(segment);

    let desc = segment;
    desc = desc.replace(/(?:₹|rs\.?|rupees?|inr)?\s*[\d,]+(?:\.\d+)?/gi, '');
    desc = desc.replace(/\b(one|two|three|four|five|six|seven|eight|nine|ten|twenty|thirty|forty|fifty|sixty|seventy|eighty|ninety|hundred|thousand|lakh|crore)(?:\s+(?:hundred|thousand|lakh|crore))?(?:\s+rupees)?\b/gi, '');
    desc = desc.replace(/\b(this morning|today morning|in the morning|in the evening|in the afternoon|later|at night|today|yesterday|then|also|and|cost|costs|for|worth|spent|another|i bought|i had|i filled|i went to the|i paid|i received|from|at|on|about|which|my|the total bill was|total bill was|total bill|bill was|bill of|was|is)\b/gi, ' ');
    desc = desc.replace(/[.,;!?]/g, ' ').replace(/\s+/g, ' ').trim();

    // Specific entity refinement
    if (/tea/i.test(segment)) {
      desc = 'Tea';
    } else if (/burma\s*hotel/i.test(segment) && /lunch/i.test(segment)) {
      desc = 'Lunch at Burma Hotel';
    } else if (/burma\s*hotel/i.test(segment)) {
      desc = 'Burma Hotel';
    } else if (/cinema\s*ticket/i.test(segment) || /cinema/i.test(segment) || /movie/i.test(segment)) {
      desc = 'Cinema tickets';
    } else if (/breakfast/i.test(segment)) {
      desc = 'Breakfast';
    } else if (/fruits?/i.test(segment)) {
      desc = 'Fruits';
    } else if (/petrol|fuel/i.test(segment)) {
      desc = 'Petrol';
    } else if (/dinner/i.test(segment)) {
      desc = 'Dinner';
    } else if (/lunch/i.test(segment)) {
      desc = 'Lunch';
    } else if (!desc || desc.length < 2) {
      desc = isIncome ? 'Income' : `Expense ${i + 1}`;
    }

    const titleDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
    
    // Explicit priority category matching
    let cat = null;
    if (/cinema|theatre|movie|pvr|inox/i.test(segment)) {
      cat = categories.find((c) => /entertainment/i.test(c.name)) || { category_id: 4, name: 'Entertainment' };
    } else if (/petrol|fuel|diesel/i.test(segment)) {
      cat = categories.find((c) => /transport|fuel/i.test(c.name)) || { category_id: 2, name: 'Transportation' };
    } else if (/tea|coffee|breakfast|lunch|dinner|hotel|food|fruit/i.test(segment)) {
      cat = categories.find((c) => /food/i.test(c.name)) || { category_id: 1, name: 'Food' };
    } else {
      cat = matchCategory(titleDesc + ' ' + segment, categories);
    }

    if (isIncome) {
      const source = matchIncomeSource(segment);
      transactions.push({
        id: `inc_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'income',
        source,
        amount: current.value,
        date: defaultDate,
        description: titleDesc,
        status: 'PENDING_CONFIRMATION',
        segment,
      });
    } else {
      transactions.push({
        id: `exp_${Date.now()}_${i}_${Math.random().toString(36).substring(2, 6)}`,
        type: 'expense',
        amount: current.value,
        categoryId: cat.category_id,
        category: cat.name,
        merchantName: titleDesc,
        description: titleDesc,
        date: defaultDate,
        paymentMode: matchPaymentMode(segment) || 'UPI',
        status: 'PENDING_CONFIRMATION',
        segment,
      });
    }
  }

  // Part 5.2: Distinguish totals from individual transactions (e.g. "lunch items 80 and 120, total bill 200")
  if (transactions.length >= 2) {
    for (let i = 0; i < transactions.length; i++) {
      const candidate = transactions[i];
      const otherItems = transactions.filter((_, idx) => idx !== i);
      const otherSum = otherItems.reduce((sum, it) => sum + it.amount, 0);

      // Check if candidate equals the sum of the other items
      if (Math.abs(candidate.amount - otherSum) < 0.01) {
        if (/\b(?:total|bill|all together|in total)\b/i.test(candidate.segment || '') || /\b(?:total|bill)\b/i.test(candidate.description || '')) {
          transactions.splice(i, 1);
          break;
        }
      }
    }
  }

  const totalAmount = transactions.reduce((sum, t) => sum + t.amount, 0);

  return {
    id: `batch_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    type: 'batch',
    totalAmount,
    count: transactions.length,
    items: transactions,
    date: defaultDate,
    status: 'PENDING_CONFIRMATION',
  };
}

function matchHoldingType(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('gold')) return 'Gold';
  if (lower.includes('mutual fund') || lower.includes('sip') || lower.includes('index fund')) return 'Mutual Funds';
  if (lower.includes('stock') || lower.includes('equity') || lower.includes('shares')) return 'Stocks';
  if (lower.includes('crypto') || lower.includes('bitcoin') || lower.includes('eth')) return 'Crypto';
  if (lower.includes('real estate') || lower.includes('property') || lower.includes('plot') || lower.includes('land')) return 'Real Estate';
  if (lower.includes('fd') || lower.includes('fixed deposit')) return 'Fixed Deposit';
  if (lower.includes('bond') || lower.includes('sgb') || lower.includes('sovereign gold')) return 'Bonds';
  return 'Commodity';
}

function normalizeHoldingType(type) {
  if (!type) return 'OTHER';
  const t = String(type).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['STOCK', 'MUTUAL_FUND', 'CRYPTO', 'REAL_ESTATE', 'GOLD', 'BOND', 'OTHER'].includes(t)) {
    return t;
  }
  if (/GOLD|SGB|SILVER|JEWELLERY|PRECIOUS/i.test(t)) return 'GOLD';
  if (/MUTUAL|MF|SIP|INDEX|ETF/i.test(t)) return 'MUTUAL_FUND';
  if (/STOCK|EQUITY|SHARE/i.test(t)) return 'STOCK';
  if (/BOND|DEBENTURE|FD|FIXED_DEPOSIT|GOV/i.test(t)) return 'BOND';
  if (/CRYPTO|BITCOIN|BTC|ETH/i.test(t)) return 'CRYPTO';
  if (/REAL_ESTATE|PROPERTY|LAND|FLAT|HOUSE/i.test(t)) return 'REAL_ESTATE';
  return 'OTHER';
}

function normalizeIncomeSource(source) {
  if (!source) return 'Salary';
  const s = String(source).trim();
  const allowed = ['Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other'];
  const match = allowed.find((a) => a.toLowerCase() === s.toLowerCase());
  if (match) return match;
  if (/freelanc|consult|contract|client|gig/i.test(s)) return 'Freelance';
  if (/business|shop|trade|store/i.test(s)) return 'Business';
  if (/rental|rent|tenant/i.test(s)) return 'Rental';
  if (/scholarship|grant|fellowship|stipend/i.test(s)) return 'Scholarship';
  if (/salary|wages?|paycheck|payroll/i.test(s)) return 'Salary';
  return 'Other';
}

function normalizeLiabilityType(type) {
  if (!type) return 'OTHER';
  const t = String(type).trim().toUpperCase().replace(/[\s-]+/g, '_');
  if (['LOAN', 'CREDIT_CARD', 'MORTGAGE', 'OTHER'].includes(t)) {
    return t;
  }
  if (/LOAN|EMI|PERSONAL_LOAN|AUTO_LOAN|CAR_LOAN|EDUCATION_LOAN/i.test(t)) return 'LOAN';
  if (/CREDIT_CARD|CARD/i.test(t)) return 'CREDIT_CARD';
  if (/MORTGAGE|HOME_LOAN|HOUSING/i.test(t)) return 'MORTGAGE';
  return 'OTHER';
}

// Categorize expense description into system category
function matchCategory(text, categories = []) {
  const lower = (text || '').toLowerCase();

  // 1. Direct category name match
  const directMatch = categories.find((c) => lower.includes(c.name.toLowerCase()));
  if (directMatch) return directMatch;

  const rules = [
    { cat: 'Food', keywords: ['tea', 'chai', 'coffee', 'breakfast', 'lunch', 'dinner', 'food', 'restaurant', 'cafe', 'snack', 'snacks', 'fruit', 'fruits', 'vegetable', 'vegetables', 'veg', 'swiggy', 'zomato', 'pizza', 'burger', 'biryani', 'meal', 'grocery', 'groceries'] },
    { cat: 'Shopping', keywords: ['shopping', 'clothes', 'shirt', 'pants', 'shoes', 'amazon', 'flipkart', 'mart', 'supermarket', 'mall', 'electronics'] },
    { cat: 'Medical', keywords: ['doctor', 'medicine', 'medicines', 'pharmacy', 'hospital', 'clinic', 'tablet', 'syrup', 'health', 'medical', 'dental'] },
    { cat: 'Transportation', keywords: ['transport', 'transportation', 'commute', 'petrol', 'fuel', 'diesel', 'auto', 'cab', 'taxi', 'uber', 'ola', 'rapido', 'bus', 'train', 'metro', 'fare', 'toll'] },
    { cat: 'Entertainment', keywords: ['theatre', 'theater', 'movie', 'cinema', 'pvr', 'inox', 'netflix', 'prime', 'hotstar', 'concert', 'game', 'gaming', 'party'] },
    { cat: 'Bills', keywords: ['electricity', 'water', 'wifi', 'internet', 'broadband', 'recharge', 'mobile', 'dth', 'bill', 'eb', 'tneb', 'bescom'] },
    { cat: 'Education', keywords: ['tuition', 'school', 'college', 'books', 'course', 'degree', 'exam', 'fees'] },
    { cat: 'Investments', keywords: ['sip', 'mutual fund', 'stock', 'share', 'gold', 'crypto'] },
    { cat: 'Insurance', keywords: ['insurance', 'premium', 'lic', 'policy'] },
  ];

  for (const rule of rules) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      const found = categories.find((c) => c.name.toLowerCase() === rule.cat.toLowerCase());
      if (found) return found;
    }
  }

  // Fallback to Others
  const others = categories.find((c) => c.name.toLowerCase() === 'others') || categories[0];
  return others || { category_id: 10, name: 'Others' };
}

function matchIncomeSource(text) {
  const lower = (text || '').toLowerCase();
  if (/salary|payslip|paycheck|wage/i.test(lower)) return 'Salary';
  if (/freelanc|client|consulting|gig/i.test(lower)) return 'Freelance';
  if (/business|profit|sales/i.test(lower)) return 'Business';
  if (/rental|tenant|\brent\b/i.test(lower)) return 'Rental';
  if (/scholarship|stipend/i.test(lower)) return 'Scholarship';
  if (/dividend|interest|investment/i.test(lower)) return 'Investment';
  return 'Salary';
}

function matchPaymentMode(text) {
  const lower = (text || '').toLowerCase();
  if (lower.includes('cash')) return 'Cash';
  if (lower.includes('credit card') || lower.includes('card')) return 'Credit Card';
  if (lower.includes('debit card')) return 'Debit Card';
  if (lower.includes('net banking') || lower.includes('transfer')) return 'Net Banking';
  return 'UPI';
}

async function getUserFullContext(userId) {
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
  const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;

  const [
    user,
    summary,
    budgets,
    goals,
    calendarEvents,
    categories,
    projects,
    projectSummary,
    holdings,
    liabilitiesRes,
    recurringRes,
    taxesRes,
    largestExpenseRes,
    financialProfile,
  ] = await Promise.all([
    userService.getProfile(userId).catch(() => ({})),
    dashboardService.getSummary(userId).catch(() => ({})),
    budgetRepository.findAllByUser(userId).catch(() => []),
    goalRepository.findAllByUser(userId).catch(() => []),
    calendarRepository.findEventsByUser(userId).catch(() => []),
    categoryRepository.findAllByUser(userId).catch(() => []),
    projectService.getProjects(userId).catch(() => []),
    projectService.getProjectSummary(userId).catch(() => ({ totalProjects: 0, totalTargetBudget: 0, totalSpent: 0, totalRemaining: 0 })),
    holdingService.getHoldings(userId).catch(() => []),
    db.query('SELECT * FROM liabilities WHERE user_id = $1 ORDER BY due_date ASC NULLS LAST, liability_id DESC', [userId]).catch(() => ({ rows: [] })),
    db.query('SELECT rp.*, c.name AS category_name FROM recurring_payments rp LEFT JOIN categories c ON c.category_id = rp.category_id WHERE rp.user_id = $1 ORDER BY rp.next_due_date ASC NULLS LAST, rp.recurring_payment_id DESC', [userId]).catch(() => ({ rows: [] })),
    db.query('SELECT * FROM taxes WHERE user_id = $1 ORDER BY due_date ASC NULLS LAST, tax_id DESC', [userId]).catch(() => ({ rows: [] })),
    db.query(
      `SELECT e.expense_id, e.amount, e.merchant_name, e.description, 
              TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, 
              COALESCE(c.name, 'Other') AS category_name
       FROM expenses e
       LEFT JOIN categories c ON c.category_id = e.category_id
       WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.expense_date) = $2 AND EXTRACT(YEAR FROM e.expense_date) = $3
       ORDER BY e.amount DESC
       LIMIT 1`,
      [userId, currentMonth, currentYear]
    ).catch(() => ({ rows: [] })),
    financialProfileService.buildFinancialProfile(userId).catch(() => null),
  ]);

  // Current month active budgets
  const activeBudgets = budgets.filter(
    (b) => Number(b.month) === currentMonth && Number(b.year) === currentYear
  );

  // Micro-spending transactions (<= ₹250) this month
  const microRes = await db.query(
    `SELECT e.amount, e.merchant_name, e.description, COALESCE(c.name, 'Other') AS category_name
     FROM expenses e
     LEFT JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 AND e.amount <= 250
       AND EXTRACT(MONTH FROM e.expense_date) = $2
       AND EXTRACT(YEAR FROM e.expense_date) = $3
     ORDER BY e.expense_date DESC`,
    [userId, currentMonth, currentYear]
  ).catch(() => ({ rows: [] }));

  const microExpenses = microRes.rows;
  const microTotal = microExpenses.reduce((sum, item) => sum + Number(item.amount), 0);

  const microCategories = {};
  microExpenses.forEach((item) => {
    microCategories[item.category_name] = (microCategories[item.category_name] || 0) + Number(item.amount);
  });

  // Current month vs Previous month spending by category
  const currentMonthCatsRes = await db.query(
    `SELECT COALESCE(c.name, 'Other') AS category_name, COALESCE(SUM(e.amount), 0) AS total
     FROM expenses e
     LEFT JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.expense_date) = $2 AND EXTRACT(YEAR FROM e.expense_date) = $3
     GROUP BY c.name`,
    [userId, currentMonth, currentYear]
  ).catch(() => ({ rows: [] }));

  const prevMonthCatsRes = await db.query(
    `SELECT COALESCE(c.name, 'Other') AS category_name, COALESCE(SUM(e.amount), 0) AS total
     FROM expenses e
     LEFT JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1 AND EXTRACT(MONTH FROM e.expense_date) = $2 AND EXTRACT(YEAR FROM e.expense_date) = $3
     GROUP BY c.name`,
    [userId, prevMonth, prevYear]
  ).catch(() => ({ rows: [] }));

  const currentCatMap = {};
  currentMonthCatsRes.rows.forEach((r) => { currentCatMap[r.category_name] = Number(r.total); });

  const prevCatMap = {};
  prevMonthCatsRes.rows.forEach((r) => { prevCatMap[r.category_name] = Number(r.total); });

  // Upcoming bills / EMIs (within 14 days)
  const upcomingBills = calendarEvents.filter((e) => ['bill', 'emi'].includes(e.event_type));

  // Current month income total & details
  const incomeRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS count
     FROM incomes
     WHERE user_id = $1 AND EXTRACT(MONTH FROM income_date) = $2 AND EXTRACT(YEAR FROM income_date) = $3`,
    [userId, currentMonth, currentYear]
  ).catch(() => ({ rows: [{ total: 0, count: 0 }] }));

  // Last month income total & salary
  const prevIncomeRes = await db.query(
    `SELECT 
       COALESCE(SUM(amount), 0) AS total_income,
       COALESCE(SUM(CASE WHEN source ILIKE '%salary%' THEN amount ELSE 0 END), 0) AS salary_income,
       COUNT(*) AS count
     FROM incomes
     WHERE user_id = $1 AND EXTRACT(MONTH FROM income_date) = $2 AND EXTRACT(YEAR FROM income_date) = $3`,
    [userId, prevMonth, prevYear]
  ).catch(() => ({ rows: [{ total_income: 0, salary_income: 0, count: 0 }] }));

  // Last month total expenses
  const prevExpenseRes = await db.query(
    `SELECT COALESCE(SUM(amount), 0) AS total
     FROM expenses
     WHERE user_id = $1 AND EXTRACT(MONTH FROM expense_date) = $2 AND EXTRACT(YEAR FROM expense_date) = $3`,
    [userId, prevMonth, prevYear]
  ).catch(() => ({ rows: [{ total: 0 }] }));

  // Latest recorded expense for references like "that expense" or "the previous one"
  const lastExpenseRes = await db.query(
    `SELECT e.expense_id, e.amount, e.merchant_name, e.description, 
            TO_CHAR(e.expense_date, 'YYYY-MM-DD') AS expense_date, 
            COALESCE(c.name, 'Other') AS category_name
     FROM expenses e
     LEFT JOIN categories c ON c.category_id = e.category_id
     WHERE e.user_id = $1
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT 1`,
    [userId]
  ).catch(() => ({ rows: [] }));

  // Strictly adhere to deterministic calculation rules:
  // netCashFlow = totalIncome - totalExpenses
  // periodSavings = max(netCashFlow, 0)
  // deficit = max(-netCashFlow, 0)
  const totalIncomeVal = Number(summary?.totalIncome || 0);
  const totalExpensesVal = Number(summary?.totalExpenses || 0);
  const netCashFlow = totalIncomeVal - totalExpensesVal;
  const periodSavings = Math.max(netCashFlow, 0);
  const deficit = Math.max(-netCashFlow, 0);

  const normalizedSummary = {
    ...summary,
    totalIncome: totalIncomeVal,
    totalExpenses: totalExpensesVal,
    netCashFlow,
    totalSavings: periodSavings,
    periodSavings,
    deficit,
  };

  return {
    user,
    summary: normalizedSummary,
    categories,
    currentMonth,
    currentYear,
    prevMonth,
    prevYear,
    budgets: activeBudgets,
    allBudgets: budgets,
    goals,
    projects,
    projectSummary,
    holdings,
    liabilities: liabilitiesRes.rows || [],
    recurringPayments: recurringRes.rows || [],
    taxes: taxesRes.rows || [],
    upcomingBills,
    largestExpense: largestExpenseRes.rows[0] || null,
    lastExpense: lastExpenseRes.rows[0] || null,
    incomeData: {
      currentMonthTotal: Number(incomeRes.rows[0]?.total || 0),
      currentMonthCount: Number(incomeRes.rows[0]?.count || 0),
      prevMonthTotal: Number(prevIncomeRes.rows[0]?.total_income || 0),
      prevMonthSalary: Number(prevIncomeRes.rows[0]?.salary_income || 0),
      prevMonthExpenseTotal: Number(prevExpenseRes.rows[0]?.total || 0),
    },
    microSpending: {
      count: microExpenses.length,
      total: microTotal,
      categories: microCategories,
      items: microExpenses.slice(0, 5),
    },
    monthComparison: {
      currentCatMap,
      prevCatMap,
      currentMonthName: now.toLocaleString('en-IN', { month: 'long' }),
      prevMonthName: new Date(prevYear, prevMonth - 1, 1).toLocaleString('en-IN', { month: 'long' }),
      lastMonthName: new Date(prevYear, prevMonth - 1, 1).toLocaleString('en-IN', { month: 'long' }),
      prevMonthTotalExpenses: Number(prevExpenseRes?.rows?.[0]?.total || 0),
      prevMonthTotalIncome: Number(prevIncomeRes?.rows?.[0]?.total_income || 0),
    },
    financialProfile,
  };
}

/**
 * Execute save of confirmed pending transaction across all 13 supported application modules.
 */
async function executeConfirmTransaction(userId, pendingTransaction) {
  if (!pendingTransaction || !pendingTransaction.type) {
    const err = new Error('Invalid pending transaction data');
    err.statusCode = 400;
    throw err;
  }

  const txId = pendingTransaction.id || `${pendingTransaction.type}_${Date.now()}`;
  const dedupeKey = `${userId}:${txId}`;

  // Idempotency check scoped to user
  if (completedTransactions.has(dedupeKey)) {
    return {
      success: true,
      alreadySaved: true,
      message: 'This transaction has already been saved to your records.',
    };
  }

  // 1. Income Execution
  if (pendingTransaction.type === 'income') {
    const normalizedSource = normalizeIncomeSource(pendingTransaction.source);
    const record = await incomeService.createIncome(userId, {
      source: normalizedSource,
      amount: Number(pendingTransaction.amount),
      incomeDate: pendingTransaction.date || todayIso(),
      description: pendingTransaction.description || undefined,
    });
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully added ${formatCurrency(pendingTransaction.amount)} (${normalizedSource}) to your income records!`,
      record,
    };
  }

  // 2. Expense Execution
  if (pendingTransaction.type === 'expense') {
    const record = await expenseService.createExpense(userId, {
      categoryId: pendingTransaction.categoryId,
      merchantName: pendingTransaction.merchantName || pendingTransaction.category || 'Expense',
      amount: Number(pendingTransaction.amount),
      expenseDate: pendingTransaction.date || todayIso(),
      paymentMode: pendingTransaction.paymentMode || 'UPI',
      description: pendingTransaction.description || pendingTransaction.merchantName || undefined,
    });
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully recorded expense of ${formatCurrency(pendingTransaction.amount)} for ${pendingTransaction.category || 'Expense'}!`,
      record,
    };
  }

  // 3. Budget Execution
  if (pendingTransaction.type === 'budget') {
    const budgetAmount = Number(pendingTransaction.amount || pendingTransaction.budgetAmount);
    const month = Number(pendingTransaction.month || new Date().getMonth() + 1);
    const year = Number(pendingTransaction.year || new Date().getFullYear());
    const categoryId = Number(pendingTransaction.categoryId);
    const priority = pendingTransaction.priority || 'FLEXIBLE';

    const existing = await budgetRepository.findAllByUser(userId);
    const existingBudget = existing.find(
      (b) => Number(b.category_id) === categoryId && Number(b.month) === month && Number(b.year) === year
    );

    let record;
    if (existingBudget) {
      record = await budgetService.updateBudget(existingBudget.budget_id, userId, {
        budgetAmount,
        month,
        year,
        priority,
      });
    } else {
      record = await budgetService.createBudget(userId, {
        categoryId,
        budgetAmount,
        month,
        year,
        priority,
      });
    }

    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully set monthly budget of ${formatCurrency(budgetAmount)} for ${pendingTransaction.category || pendingTransaction.categoryName || 'Category'}!`,
      record,
    };
  }

  // 4. Project Workspace Execution
  if (pendingTransaction.type === 'project') {
    const targetBudget = Number(pendingTransaction.targetBudget || pendingTransaction.amount);
    const record = await projectService.createProject(userId, {
      projectName: pendingTransaction.projectName || pendingTransaction.name || 'New Project',
      description: pendingTransaction.description || 'Project workspace created via AI Assistant',
      targetBudget,
      startDate: pendingTransaction.startDate || pendingTransaction.date || todayIso(),
      targetDate: pendingTransaction.targetDate || null,
      status: 'ACTIVE',
    });
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully created project workspace "${record.project_name}" with a target budget of ${formatCurrency(targetBudget)}!`,
      record,
    };
  }

  // 5. Project Expense Execution
  if (pendingTransaction.type === 'project_expense') {
    const record = await projectService.createProjectExpense(pendingTransaction.projectId, userId, {
      expenseName: pendingTransaction.expenseName || pendingTransaction.name || 'Project Expense',
      category: pendingTransaction.category || 'Materials',
      amount: Number(pendingTransaction.amount),
      expenseDate: pendingTransaction.date || todayIso(),
      paymentMode: pendingTransaction.paymentMode || 'UPI',
      description: pendingTransaction.description || undefined,
    });
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully added expense of ${formatCurrency(pendingTransaction.amount)} (${pendingTransaction.expenseName || 'Project Expense'}) to project "${pendingTransaction.projectName}"!`,
      record,
    };
  }

  // 6. Savings Goal Execution
  if (pendingTransaction.type === 'goal') {
    const targetAmount = Number(pendingTransaction.targetAmount || pendingTransaction.amount);
    const record = await goalService.createGoal(userId, {
      goalName: pendingTransaction.goalName || pendingTransaction.name || 'Savings Goal',
      targetAmount,
      currentAmount: Number(pendingTransaction.currentAmount || 0),
      targetDate: pendingTransaction.targetDate || null,
      status: 'IN_PROGRESS',
    });
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully created savings goal "${record.goal_name}" with a target of ${formatCurrency(targetAmount)}!`,
      record,
    };
  }

  // 7. Investment & Financial Holding Execution
  if (pendingTransaction.type === 'holding') {
    const currentValue = Number(pendingTransaction.currentValue || pendingTransaction.amount);
    const normalizedType = normalizeHoldingType(pendingTransaction.holdingType);
    const record = await holdingService.createHolding(userId, {
      holdingType: normalizedType,
      name: pendingTransaction.name || 'Asset Holding',
      quantity: Number(pendingTransaction.quantity || 1),
      currentValue,
      purchaseValue: pendingTransaction.purchaseValue != null ? Number(pendingTransaction.purchaseValue) : currentValue,
      purchaseDate: pendingTransaction.purchaseDate || pendingTransaction.date || todayIso(),
    });
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully recorded investment in "${record.name}" of ${formatCurrency(currentValue)} (${record.holding_type})!`,
      record,
    };
  }

  // 8. Recurring Payment Execution
  if (pendingTransaction.type === 'recurring_payment') {
    const amount = Number(pendingTransaction.amount);
    const frequency = pendingTransaction.frequency || 'MONTHLY';
    const nextDueDate = pendingTransaction.nextDueDate || pendingTransaction.date || todayIso();
    const result = await db.query(
      `INSERT INTO recurring_payments (user_id, category_id, name, amount, frequency, next_due_date, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, pendingTransaction.categoryId || null, pendingTransaction.name || 'Recurring Payment', amount, frequency, nextDueDate, true]
    );
    const record = result.rows[0];
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully scheduled recurring payment "${record.name}" of ${formatCurrency(amount)} (${frequency})!`,
      record,
    };
  }

  // 9. Liability Execution
  if (pendingTransaction.type === 'liability') {
    const totalAmount = Number(pendingTransaction.totalAmount || pendingTransaction.amount);
    const remainingAmount = Number(pendingTransaction.remainingAmount || pendingTransaction.amount);
    const interestRate = Number(pendingTransaction.interestRate || 0);
    const dueDate = pendingTransaction.dueDate || pendingTransaction.date || null;
    const normalizedLiability = normalizeLiabilityType(pendingTransaction.liabilityType);
    const result = await db.query(
      `INSERT INTO liabilities (user_id, liability_type, name, total_amount, remaining_amount, interest_rate, due_date)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [userId, normalizedLiability, pendingTransaction.name || 'Liability', totalAmount, remainingAmount, interestRate, dueDate]
    );
    const record = result.rows[0];
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully recorded liability "${record.name}" with remaining balance of ${formatCurrency(remainingAmount)}!`,
      record,
    };
  }

  // 10. Tax Execution
  if (pendingTransaction.type === 'tax') {
    const amount = Number(pendingTransaction.amount);
    const taxYear = Number(pendingTransaction.taxYear || new Date().getFullYear());
    const taxType = pendingTransaction.taxType || 'Income Tax';
    const dueDate = pendingTransaction.dueDate || pendingTransaction.date || null;
    const status = pendingTransaction.status || 'PENDING';
    const result = await db.query(
      `INSERT INTO taxes (user_id, tax_year, tax_type, amount, due_date, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [userId, taxYear, taxType, amount, dueDate, status]
    );
    const record = result.rows[0];
    completedTransactions.set(dedupeKey, Date.now());
    return {
      success: true,
      message: `✅ Successfully recorded tax entry "${record.tax_type}" for ${taxYear} of ${formatCurrency(amount)}!`,
      record,
    };
  }

  // 11. Batch Transactions Execution (Multi-transaction day narration)
  if (pendingTransaction.type === 'batch') {
    const items = pendingTransaction.items || [];
    if (!items.length) {
      const err = new Error('No transactions found in this batch.');
      err.statusCode = 400;
      throw err;
    }

    const createdRecords = [];
    const failedRecords = [];

    for (const item of items) {
      try {
        if (item.type === 'income') {
          const normalizedSource = normalizeIncomeSource(item.source);
          const record = await incomeService.createIncome(userId, {
            source: normalizedSource,
            amount: Number(item.amount),
            incomeDate: item.date || pendingTransaction.date || todayIso(),
            description: item.description || undefined,
          });
          createdRecords.push({ ...item, record });
        } else {
          const record = await expenseService.createExpense(userId, {
            categoryId: item.categoryId,
            merchantName: item.merchantName || item.category || 'Expense',
            amount: Number(item.amount),
            expenseDate: item.date || pendingTransaction.date || todayIso(),
            paymentMode: item.paymentMode || 'UPI',
            description: item.description || item.merchantName || undefined,
          });
          createdRecords.push({ ...item, record });
        }
      } catch (err) {
        failedRecords.push({ item, error: err.message });
      }
    }

    completedTransactions.set(dedupeKey, Date.now());

    const totalSaved = createdRecords.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const summaryList = createdRecords
      .map((r) => `• ${r.type === 'income' ? '📈' : '📉'} **${r.merchantName || r.description || r.source}**: ${formatCurrency(r.amount)} (${r.category || r.source})`)
      .join('\n');

    let message = `✅ Successfully saved **${createdRecords.length}** transaction${createdRecords.length > 1 ? 's' : ''} (Total: **${formatCurrency(totalSaved)}**) to your FinMan records!\n\n${summaryList}`;

    if (failedRecords.length > 0) {
      message += `\n\n⚠️ Could not save ${failedRecords.length} transaction(s): ${failedRecords.map((f) => `${f.item.description}: ${f.error}`).join(', ')}`;
    }

    return {
      success: true,
      message,
      records: createdRecords,
      failed: failedRecords.length ? failedRecords : undefined,
    };
  }

  const err = new Error(`Unsupported transaction type: ${pendingTransaction.type}`);
  err.statusCode = 400;
  throw err;
}

/**
 * Main chat handler: interprets request, answers grounded questions, or builds pending multi-module actions.
 */
async function processChatMessage(userId, message, conversationHistory = [], existingPending = null) {
  const ctx = await module.exports.getUserFullContext(userId);
  const text = (message || '').trim();
  const lower = text.toLowerCase();
  const userName = ctx.user?.name ? ctx.user.name.split(' ')[0] : 'there';

  const lastUserTurn = [...conversationHistory].reverse().find((h) => h.role === 'user')?.content?.toLowerCase() || '';

  let activePending = existingPending;
  if (!activePending && Array.isArray(conversationHistory)) {
    const lastWithPending = [...conversationHistory].reverse().find((h) => h.pendingTransaction && h.pendingTransaction.status === 'PENDING_CONFIRMATION');
    if (lastWithPending) {
      activePending = lastWithPending.pendingTransaction;
    }
  }

  // -----------------------------------------------------------------
  // 1. ACTIVE PENDING TRANSACTION HANDLING (Confirm, Cancel, Edit, Conflict)
  // -----------------------------------------------------------------
  if (activePending && activePending.status === 'PENDING_CONFIRMATION') {
    // 1-pre: Type Corrections: "No, I meant expenses, not income." / "No, I meant income, not expenses."
    const isCorrectionToExpense = /\b(?:meant|mean|actually)\s+(?:expenses?|spending)\b/i.test(lower) || /\bnot\s+income\b/i.test(lower);
    const isCorrectionToIncome = /\b(?:meant|mean|actually)\s+(?:income|salary|earning)\b/i.test(lower) || /\bnot\s+expense\b/i.test(lower);

    if (isCorrectionToExpense && activePending.type === 'income') {
      const categoryObj = matchCategory(activePending.description || 'Others', ctx.categories);
      const updated = {
        ...activePending,
        id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'expense',
        categoryId: categoryObj.category_id,
        category: categoryObj.name,
        merchantName: activePending.description || categoryObj.name,
        paymentMode: 'UPI',
        status: 'PENDING_CONFIRMATION',
      };
      return {
        reply: `Understood! I've converted that into an **Expense** of **${formatCurrency(updated.amount)}** (${updated.category}):\n\n`
          + `📋 **Updated Expense Preview:**\n`
          + `• **Type:** Expense\n`
          + `• **Category:** ${updated.category}\n`
          + `• **Amount:** ${formatCurrency(updated.amount)}\n`
          + `• **Date:** ${updated.date}\n\n`
          + `Should I add this expense to your FinMan records?`,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: updated,
      };
    }

    if (isCorrectionToIncome && activePending.type === 'expense') {
      const source = matchIncomeSource(activePending.description || 'Salary');
      const updated = {
        ...activePending,
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'income',
        source,
        status: 'PENDING_CONFIRMATION',
      };
      return {
        reply: `Understood! I've converted that into an **Income** of **${formatCurrency(updated.amount)}** (${updated.source}):\n\n`
          + `📋 **Updated Income Preview:**\n`
          + `• **Type:** Income\n`
          + `• **Source:** ${updated.source}\n`
          + `• **Amount:** ${formatCurrency(updated.amount)}\n`
          + `• **Date:** ${updated.date}\n\n`
          + `Should I add this income to your FinMan records?`,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: updated,
      };
    }

    // 1a. Cancellation
    if (isCancellationMessage(text)) {
      return {
        reply: `❌ Cancelled. The proposed ${activePending.type.replace('_', ' ')} was not saved.`,
        suggestedQuestions: ['How much did I spend this month?', 'What bills are coming up?', 'Add an expense'],
        pendingTransaction: null,
      };
    }

    // 1b. Direct Confirmation
    if (isConfirmationMessage(text)) {
      try {
        const result = await executeConfirmTransaction(userId, activePending);
        return {
          reply: result.message,
          suggestedQuestions: ['How much did I spend this month?', 'Check my budget', 'What bills are coming up?'],
          pendingTransaction: null,
          transactionSaved: true,
        };
      } catch (err) {
        return {
          reply: `⚠️ Could not save transaction: ${err.message}. Please try again or check the details.`,
          pendingTransaction: activePending,
        };
      }
    }

    // 1c. Modification / Edits to Pending Transaction across ANY entity type
    const isEditIntent = /\b(change|make\s+it|update|set|instead|actually|modify|edit|switch|correct|remove|delete)\b/i.test(lower) ||
      /\b(category|source|date|amount|description|note|target|budget|name)\b/i.test(lower);

    if (isEditIntent) {
      let updated = { ...activePending };
      let changedDescriptions = [];

      // Batch transaction item edits: e.g. "change tea to 20", "the lunch was actually 250", "remove cinema ticket", "add another 50 for parking"
      if (activePending.type === 'batch') {
        const items = [...(activePending.items || [])];

        // 1. Remove item: "remove cinema ticket", "delete cinema", "drop tea"
        const removeMatch = lower.match(/\b(?:remove|delete|drop|exclude)\s+(?:the\s+)?([a-zA-Z\s]+)/i);
        if (removeMatch) {
          const rawTarget = removeMatch[1].trim().toLowerCase();
          const target = rawTarget.replace(/\b(?:the|a|an|ticket|tickets|item|items|record|expense)\b/gi, '').trim();
          const filtered = items.filter((it) => {
            const name = (it.merchantName || it.description || '').toLowerCase();
            return !name.includes(target || rawTarget);
          });
          if (filtered.length < items.length) {
            updated.items = filtered;
            updated.count = filtered.length;
            updated.totalAmount = filtered.reduce((sum, it) => sum + Number(it.amount || 0), 0);
            changedDescriptions.push(`removed "${rawTarget}" from the batch`);
          }
        }

        // 2. Edit item amount: "change the tea amount to 20", "make tea 20", "the lunch was actually 250"
        let editMatch = lower.match(/\b(?:change|make|update|set)\s+(?:the\s+)?([a-zA-Z\s]+?)(?:\s+amount)?\s+(?:to|as)?\s*(?:₹|rs\.?|rupees?)?\s*(\d[\d,]*)/i);
        if (!editMatch) {
          editMatch = lower.match(/\b(?:the\s+)?([a-zA-Z\s]+?)\s+(?:was|is)\s+(?:actually\s+)?(?:₹|rs\.?|rupees?)?\s*(\d[\d,]*)/i);
        }
        if (editMatch) {
          const rawTarget = editMatch[1].trim().toLowerCase();
          const target = rawTarget.replace(/\b(?:the|a|an|amount|price|cost|item|bill)\b/gi, '').trim();
          const amt = parseFloat(editMatch[2].replace(/,/g, ''));
          const idx = items.findIndex((it) => {
            const name = (it.merchantName || it.description || '').toLowerCase();
            return name.includes(target || rawTarget);
          });
          if (idx !== -1 && !isNaN(amt) && amt > 0) {
            items[idx] = { ...items[idx], amount: amt };
            updated.items = items;
            updated.totalAmount = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
            changedDescriptions.push(`updated ${items[idx].merchantName || items[idx].description} to ${formatCurrency(amt)}`);
          }
        }

        // 3. Add another item to batch: "add another 50 for parking", "add 50 for parking"
        const addMatch = lower.match(/\b(?:add|plus|include|and)\s+(?:another\s+)?(?:₹|rs\.?|rupees?)?\s*(\d[\d,]*)\s+(?:for|on)\s+([a-zA-Z\s]+)/i);
        if (addMatch) {
          const amt = parseFloat(addMatch[1].replace(/,/g, ''));
          const desc = addMatch[2].trim();
          const titleDesc = desc.charAt(0).toUpperCase() + desc.slice(1);
          let cat = null;
          if (/cinema|theatre|movie/i.test(desc)) cat = { category_id: 4, name: 'Entertainment' };
          else if (/parking|petrol|fuel|toll|transport/i.test(desc)) cat = { category_id: 2, name: 'Transportation' };
          else if (/food|tea|coffee|snack|lunch/i.test(desc)) cat = { category_id: 1, name: 'Food' };
          else cat = matchCategory(desc, ctx.categories || []);

          const newItem = {
            id: `exp_${Date.now()}_add_${Math.random().toString(36).substring(2, 6)}`,
            type: 'expense',
            amount: amt,
            categoryId: cat.category_id,
            category: cat.name,
            merchantName: titleDesc,
            description: titleDesc,
            date: activePending.date || todayIso(),
            paymentMode: 'UPI',
            status: 'PENDING_CONFIRMATION',
          };
          items.push(newItem);
          updated.items = items;
          updated.count = items.length;
          updated.totalAmount = items.reduce((sum, it) => sum + Number(it.amount || 0), 0);
          changedDescriptions.push(`added ${titleDesc} (${formatCurrency(amt)}) to the batch`);
        }

        // 4. Batch type flip: "No, I meant income"
        if (/\b(?:meant|mean|actually)\s+(?:an?\s+)?income\b/i.test(lower) || lower === 'income' || lower === 'no income') {
          updated.items = items.map((it) => ({
            ...it,
            type: 'income',
            source: matchIncomeSource(it.merchantName || it.description || 'Other') || 'Other',
          }));
          changedDescriptions.push(`converted all transactions in the batch to **Income**`);
        }
      }

      // Edit amount / target budget / current value
      const newAmount = extractAmount(lower);
      if (newAmount && activePending.type !== 'batch' && newAmount !== (activePending.amount || activePending.targetBudget || activePending.currentValue)) {
        updated.amount = newAmount;
        if (updated.targetBudget) updated.targetBudget = newAmount;
        if (updated.targetAmount) updated.targetAmount = newAmount;
        if (updated.currentValue) updated.currentValue = newAmount;
        changedDescriptions.push(`amount to **${formatCurrency(newAmount)}**`);
      }

      // Edit category
      if (activePending.type === 'expense' || activePending.type === 'budget') {
        const catObj = matchCategory(lower, ctx.categories || []);
        if (catObj && (lower.includes('category') || lower.includes('food') || lower.includes('transport') || lower.includes('shopping') || lower.includes('bills'))) {
          updated.categoryId = catObj.category_id;
          updated.category = catObj.name;
          updated.categoryName = catObj.name;
          changedDescriptions.push(`category to **${catObj.name}**`);
        }
      }

      // Edit source
      if (activePending.type === 'income') {
        const newSource = matchIncomeSource(lower);
        if (newSource && (lower.includes('source') || lower.includes('make it') || lower.includes('change'))) {
          updated.source = newSource;
          changedDescriptions.push(`source to **${newSource}**`);
        }
      }

      // Edit date
      if (lower.includes('date') || lower.includes('yesterday') || lower.includes('today')) {
        const newDate = extractDate(lower);
        if (newDate) {
          updated.date = newDate;
          if (updated.startDate) updated.startDate = newDate;
          if (updated.items && Array.isArray(updated.items)) {
            updated.items = updated.items.map((it) => ({ ...it, date: newDate }));
          }
          changedDescriptions.push(`date to **${newDate}**`);
        }
      }

      // Edit target date
      const newTargetDate = extractTargetDate(lower);
      if (newTargetDate && (updated.type === 'goal' || updated.type === 'project')) {
        updated.targetDate = newTargetDate;
        changedDescriptions.push(`target date to **${newTargetDate}**`);
      }

      // Edit name
      const nameMatch = lower.match(/(?:name|title)\s*(?:to|is|as)?\s*[:=]?\s*([a-zA-Z0-9\s]+)$/i);
      if (nameMatch && nameMatch[1].trim()) {
        const newName = nameMatch[1].trim();
        updated.name = newName;
        if (updated.projectName) updated.projectName = newName;
        if (updated.goalName) updated.goalName = newName;
        changedDescriptions.push(`name to **"${newName}"**`);
      }

      if (changedDescriptions.length > 0) {
        let extraTable = '';
        if (updated.type === 'batch') {
          const tableHeader = `| Description | Amount | Category | Date |\n|---|---:|---|---|`;
          const tableRows = updated.items.map((it) => {
            const name = it.merchantName || it.description || it.source;
            const cat = it.category || it.source;
            return `| ${name} | ${formatCurrency(it.amount)} | ${cat} | ${it.date} |`;
          }).join('\n');
          const totalRow = `| **Total** | **${formatCurrency(updated.totalAmount)}** | | |`;
          extraTable = `\n\n📋 **Updated Batch Preview (${updated.count} transactions):**\n\n${tableHeader}\n${tableRows}\n${totalRow}`;
        }
        return {
          reply: `I've updated the pending ${updated.type.replace('_', ' ')}: ${changedDescriptions.join(' and ')}.${extraTable}\n\n`
            + `Should I confirm and save all ${updated.count || 1} transactions to your FinMan records?`,
          suggestedQuestions: ['Confirm and Add', 'Cancel'],
          pendingTransaction: updated,
        };
      }
    }

    // 1d. Conflict handling
    const newTxAmount = extractAmount(lower);
    const mentionsAddOrSpend = /\b(add|record|spent|spend|bought|paid|received|credit|deposit|put|log|create)\b/i.test(lower);
    if (newTxAmount && mentionsAddOrSpend) {
      return {
        reply: `You still have a pending ${activePending.type.replace('_', ' ')} of **${formatCurrency(activePending.amount || activePending.totalAmount || activePending.targetBudget || activePending.targetAmount)}** awaiting confirmation.\n\nWould you like to:\n• **Confirm that one first?**\n• **Discard it and record this new entry instead?**\n• **Cancel both?**`,
        suggestedQuestions: [
          'Confirm and Add',
          `Discard and record ₹${newTxAmount}`,
          'Cancel',
        ],
        pendingTransaction: activePending,
      };
    }
  }

  // Handle bare confirmations or cancellations when NO transaction is pending
  if (isConfirmationMessage(text)) {
    return {
      reply: "There is no pending transaction waiting for confirmation right now. If you'd like to add a record, tell me what you spent or earned (for example: *'I spent ₹50 on tea'* or *'Add my salary of ₹10,000'*).",
      suggestedQuestions: ['I spent ₹50 on tea today', 'Add my salary of ₹10,000', 'How much did I spend this month?'],
      pendingTransaction: null,
    };
  }

  if (isCancellationMessage(text)) {
    return {
      reply: "There is no active pending transaction or operation to cancel.",
      suggestedQuestions: ['How much did I spend this month?', 'Check my budget', 'Add an expense'],
      pendingTransaction: null,
    };
  }

  const usesBro = /\b(bro|bhai|buddy)\b/i.test(lower);
  const usesDa = /\b(da|machi|nanba)\b/i.test(lower);

  // Check if message mentions specific financial workflows (must not be swallowed by generic greetings/help)
  const hasSpecificFinancialIntent = /\b(?:budget|budgets|spend|spent|spending|expense|expenses|reduce|cut|trim|lower|save|savings|goal|goals|income|salary|project|projects|loan|loans|debt|invest|investment|tax|taxes|bill|bills|afford|last\s+month|previous\s+month)\b/i.test(lower);

  // -----------------------------------------------------------------
  // 2. HELP & CAPABILITY DISCOVERY
  // -----------------------------------------------------------------
  const isGenericHelp = !hasSpecificFinancialIntent && (
    /^(?:can\s+you\s+help\s+me|how\s+can\s+you\s+help|what\s+can\s+you\s+do|need\s+help|help\s+me|help)[?!.]*$/i.test(lower) ||
    lower === 'help' ||
    (/\b(what\s+can\s+you\s+do|how\s+can\s+you\s+help)\b/i.test(lower))
  );
  if (isGenericHelp) {
    const friendPrefix = usesBro ? 'bro! ' : (usesDa ? 'da! ' : '');
    return {
      reply: `Of course ${friendPrefix}I'm your FinMan Financial Assistant, connected directly to your verified PostgreSQL records. Here is what I can manage across your finances:\n\n`
        + `• **Add Transactions Naturally:** "Add my salary of ₹50,000" or "I spent ₹120 on lunch today".\n`
        + `• **Spending Analysis:** "Where am I spending the most?" or "How much did I spend this month?".\n`
        + `• **Period Comparisons:** "Compare this month with last month and explain what changed".\n`
        + `• **Budgets:** "Create a monthly food budget of ₹6,000" or "How much of my transport budget have I used?".\n`
        + `• **Projects:** "Create a home construction project with a target cost of ₹1 crore" or "Add a construction material expense of ₹25,000 to my home project".\n`
        + `• **Savings Goals:** "Create a savings goal of ₹5 lakh for education by December 2027" or "How much should I save monthly to reach my target?".\n`
        + `• **Investments & Holdings:** "Record an investment of ₹15,000 in gold" or "Show my current holdings".\n`
        + `• **Liabilities & EMIs:** "How much do I owe on my recorded loans?" or "Record my monthly EMI of ₹12,000".\n`
        + `• **Bills & Smart Calendar:** "Show my upcoming bills" or "Show my financial schedule".\n`
        + `• **Taxes & OCR:** "Show my tax records" or "How do I scan receipts with OCR?".\n`
        + `• **Financial Planning:** "I want to build a house worth ₹1 crore next year. Can I afford it?".`,
      suggestedQuestions: [
        'How much did I spend this month?',
        'Where am I spending the most?',
        'Show my budget status',
        'Show my project spending and remaining budget',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 3. GREETINGS & INFORMAL TONE
  // -----------------------------------------------------------------
  const isGreeting = !hasSpecificFinancialIntent && (
    /^(?:hi+|hello+|hey+|howdy|greetings|good\s*(?:morning|afternoon|evening)|yo+|sup|namaste|vanakkam)[\s!.,?:;]*$/i.test(lower) ||
    (/\b(hi+|hello+|hey+|howdy|greetings|good\s*(?:morning|afternoon|evening)|yo+|sup|namaste|vanakkam)\b/i.test(lower) && !hasSpecificFinancialIntent)
  );

  if (isGreeting) {
    const surplus = ctx.summary.totalSavings || 0;
    const deficit = ctx.summary.deficit || 0;
    let statusNote = '';
    if (deficit > 0) {
      statusNote = ` Note: You currently have a projected deficit of ${formatCurrency(deficit)} this month.`;
    } else if (surplus > 0) {
      statusNote = ` You currently have a healthy surplus of ${formatCurrency(surplus)} this month.`;
    }

    let greetingLine = `Hey ${userName}!`;
    if (usesBro) greetingLine = `Hey bro!`;
    else if (usesDa) greetingLine = `Hi da!`;

    return {
      reply: `${greetingLine} Great to connect with you.${statusNote} I'm here to help you track expenses, record income, manage budgets, projects, and goals. What would you like to explore today?`,
      suggestedQuestions: [
        'How much did I spend this month?',
        'Show my budget status',
        'Show my project spending and remaining budget',
        'Where am I spending the most?',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 4. ENTITY REFERENCES ("that expense", "the previous one", "what was my last expense")
  // -----------------------------------------------------------------
  if (lower.includes('that expense') || lower.includes('the previous one') || lower.includes('last expense') || lower.includes('last transaction')) {
    const last = ctx.lastExpense;
    if (last) {
      return {
        reply: `Your most recent recorded expense was **${formatCurrency(last.amount)}** for **${last.merchant_name || last.category_name}** on **${last.expense_date}** (${last.category_name}).`,
        suggestedQuestions: ['Add that expense to the home project', 'How much did I spend this month?', 'What bills are coming up?'],
        pendingTransaction: null,
      };
    } else {
      return {
        reply: `You don't have any recorded expenses in your records yet.`,
        suggestedQuestions: ['I spent ₹50 on tea today', 'Add my salary'],
        pendingTransaction: null,
      };
    }
  }

  // -----------------------------------------------------------------
  // 5. LARGEST EXPENSE THIS MONTH
  // -----------------------------------------------------------------
  if (lower.includes('largest expense') || lower.includes('biggest expense') || lower.includes('highest expense')) {
    if (ctx.largestExpense) {
      return {
        reply: `Your largest recorded expense for ${ctx.monthComparison.currentMonthName} was **${formatCurrency(ctx.largestExpense.amount)}** for **${ctx.largestExpense.merchant_name || ctx.largestExpense.category_name}** (${ctx.largestExpense.category_name}) on **${ctx.largestExpense.expense_date}**.`,
        suggestedQuestions: ['Where am I spending the most?', 'How much have I spent this month?'],
        pendingTransaction: null,
      };
    } else {
      return {
        reply: `You have not recorded any expenses in ${ctx.monthComparison.currentMonthName} yet.`,
        suggestedQuestions: ['I spent ₹120 on lunch today', 'Add my salary'],
        pendingTransaction: null,
      };
    }
  }

  // -----------------------------------------------------------------
  // 5b. MODULE 8A: PERSONALIZED AI FINANCIAL ANALYSIS (ONBOARDING + BEHAVIOR)
  // -----------------------------------------------------------------
  const fp = ctx.financialProfile;
  const verifiedRec = fp?.verifiedRecords || {};
  const statedProf = fp?.statedProfile || fp?.onboarding || {};
  const discr = fp?.discrepancies || {};

  // 1. "Based on my onboarding details, what should I focus on first?"
  const isFocusOnboardingQuery = (
    (/\b(?:onboarding|onboard)\b/i.test(lower) && /\b(?:focus|start|priorit(?:y|ies)|first|guidance)\b/i.test(lower)) ||
    /\bwhat\s+(?:should|can)\s+i\s+focus\s+on\s+first\b/i.test(lower) ||
    /\bmy\s+financial\s+priorities\b/i.test(lower)
  );

  if (isFocusOnboardingQuery) {
    const rawGoals = statedProf.financialGoals || ctx.user?.financial_goals;
    const goalsList = Array.isArray(rawGoals) && rawGoals.length > 0
      ? rawGoals.join(', ')
      : (typeof rawGoals === 'string' ? rawGoals : 'Wealth accumulation');
    const occupation = statedProf.occupation || ctx.user?.occupation || 'Professional';
    const rawStatedIncome = statedProf.monthlyIncome || ctx.user?.monthly_income;
    const statedIncome = rawStatedIncome ? formatCurrency(rawStatedIncome) : 'Not specified';
    const verifiedExpenses = verifiedRec.currentMonthExpenses ? formatCurrency(verifiedRec.currentMonthExpenses) : '₹0';
    const liquidBuffer = verifiedRec.liquidAssets ? formatCurrency(verifiedRec.liquidAssets) : '₹0';
    const runwayMonths = verifiedRec.emergencyFundRunwayMonths || 0;
    const isDeficit = verifiedRec.isDeficit;

    let priorityPlan = '';
    if (runwayMonths < 3) {
      const targetBuffer = formatCurrency(Math.max(30000, (verifiedRec.currentMonthExpenses || 25000) * 3));
      priorityPlan += `1. **Build a 3-Month Emergency Safety Buffer (${targetBuffer}):**\n`
        + `   • *Why:* Your liquid runway covers **${runwayMonths.toFixed(1)} months** of living expenses. Establishing an emergency fund protects your investments from unexpected disruptions.\n\n`;
    } else {
      priorityPlan += `1. **Emergency Buffer is Solid (${liquidBuffer} / ${runwayMonths.toFixed(1)} months):**\n`
        + `   • Your liquidity buffer is healthy. You can safely direct extra surplus into medium and long-term goals.\n\n`;
    }

    if (isDeficit) {
      priorityPlan += `2. **Address Monthly Cash-Flow Deficit (${formatCurrency(verifiedRec.deficitAmount)}):**\n`
        + `   • *Why:* Your recorded expenses this month (${verifiedExpenses}) exceed your recorded income. Stabilizing this should take precedence over new investments.\n\n`;
    } else {
      priorityPlan += `2. **Accelerate Stated Goals (${goalsList}):**\n`
        + `   • *Why:* You specified these priorities during onboarding. You have **${fp?.goals?.activeCount || 0} active goal(s)** in FinMan. Set up automated monthly transfers to stay on track.\n\n`;
    }

    if (discr.hasDiscrepancies && discr.savingsHabitDeficit) {
      priorityPlan += `3. **Align Savings Habit with Goal:**\n`
        + `   • You noted your savings habit as *"${statedProf.savingsHabit || 'flexible'}"*, but your actual savings rate is currently **${verifiedRec.actualSavingsRate || 0}%**. Try the *Pay Yourself First* approach on salary day.\n\n`;
    } else {
      priorityPlan += `3. **Maintain Category Budget Discipline:**\n`
        + `   • Track your discretionary spending categories (like Dining & Shopping) to maintain your target savings rate.\n\n`;
    }

    const reply = `🎯 **Personalized Focus Plan (Grounded in Onboarding & Financial Records):**\n\n`
      + `**Your Grounded Profile:**\n`
      + `• **Role / Occupation:** ${occupation}\n`
      + `• **Stated Monthly Income:** ${statedIncome} (Verified this month: ${formatCurrency(verifiedRec.currentMonthIncome || 0)})\n`
      + `• **Stated Priorities:** ${goalsList}\n`
      + `• **Verified Expenses:** ${verifiedExpenses} | **Liquid Runway:** ${runwayMonths.toFixed(1)} months\n\n`
      + `### Recommended Priorities:\n`
      + priorityPlan
      + `Would you like me to help you plan a realistic budget or review your top expense categories?`;

    return {
      reply,
      suggestedQuestions: [
        'Analyze my spending this month',
        'Help me plan a realistic budget for next month',
        'Which expenses should I review first?',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 3B. CONVERSATIONAL FOLLOW-UP: "What about last month?" / "How about last month?"
  // -----------------------------------------------------------------
  const isLastMonthFollowUp = (
    /^(?:what|how)\s+about\s+(?:the\s+)?(?:last|previous)\s+month[?!.]*$/i.test(lower.trim()) ||
    lower.trim() === 'what about last month' ||
    lower.trim() === 'last month?' ||
    lower.trim() === 'how about last month'
  );

  if (isLastMonthFollowUp) {
    const prevExp = Number(ctx.monthComparison.prevMonthTotalExpenses || 0);
    const prevInc = Number(ctx.monthComparison.prevMonthTotalIncome || 0);
    const prevNet = prevInc - prevExp;
    const prevMonthName = ctx.monthComparison.lastMonthName;

    // Check if the previous conversation turn was specifically about expenses/spending
    const isExpenseContext = lastUserTurn.includes('spend') || lastUserTurn.includes('expense') || lastAssistantTurn.includes('spending') || lastAssistantTurn.includes('expenses');
    // Check if previous context was specifically about income
    const isIncomeContext = lastUserTurn.includes('income') || lastUserTurn.includes('salary');

    if (isExpenseContext) {
      const curExp = Number(ctx.summary.totalExpenses || 0);
      const diff = curExp - prevExp;
      const trendText = diff > 0
        ? `📈 Current month spending is **+${formatCurrency(diff)} higher** than last month.`
        : (diff < 0 ? `📉 Current month spending is **${formatCurrency(Math.abs(diff))} lower** than last month.` : `Spending is roughly unchanged.`);

      const prevCats = Object.entries(ctx.monthComparison.prevCatMap).sort((a, b) => b[1] - a[1]);
      const topPrevCat = prevCats[0];
      const topCatText = topPrevCat ? `• **Highest Expense Category:** ${topPrevCat[0]} (${formatCurrency(topPrevCat[1])})\n` : '';

      return {
        reply: `📅 **Last Month Spending Breakdown (${prevMonthName}):**\n\n`
          + `• **Total Expenses in ${prevMonthName}:** **${formatCurrency(prevExp)}**\n`
          + topCatText
          + `• **Comparison with Current Month:** ${trendText}\n\n`
          + `Would you like me to compare specific categories or review where you can optimize?`,
        suggestedQuestions: [
          'Compare this month with last month and explain what changed',
          'Where can I reduce my expenses?',
          'Help me plan a realistic budget for next month',
        ],
        pendingTransaction: null,
      };
    } else if (isIncomeContext) {
      return {
        reply: `💼 **Last Month Income Summary (${prevMonthName}):**\n\n`
          + `• **Total Income Received:** **${formatCurrency(prevInc)}**\n`
          + `\nWould you like to see how much of this was saved or spent?`,
        suggestedQuestions: [
          'How much did I spend this month?',
          'Compare this month with last month',
        ],
        pendingTransaction: null,
      };
    } else {
      return {
        reply: `📅 **Summary for ${prevMonthName}:**\n\n`
          + `• **Total Income:** **${formatCurrency(prevInc)}**\n`
          + `• **Total Expenses:** **${formatCurrency(prevExp)}**\n`
          + `• **Net Cash Flow:** **${formatCurrency(prevNet)}** ${prevNet >= 0 ? '(Surplus)' : '(Deficit)'}\n\n`
          + `What aspect of last month would you like to explore further?`,
        suggestedQuestions: [
          'Compare this month with last month and explain what changed',
          'Where am I spending the most?',
          'Help me plan a realistic budget for next month',
        ],
        pendingTransaction: null,
      };
    }
  }

  // -----------------------------------------------------------------
  // 3C. CONVERSATIONAL FOLLOW-UP: "How can I reduce that?" / "How to reduce that?"
  // -----------------------------------------------------------------
  const isReduceThatFollowUp = (
    /^(?:how\s+(?:can\s+i|to)\s+reduce\s+that|how\s+do\s+i\s+cut\s+that\s+down|how\s+can\s+i\s+cut\s+that|how\s+to\s+reduce\s+it)[?!.]*$/i.test(lower.trim())
  );

  if (isReduceThatFollowUp) {
    const cats = fp?.categorySpending || [];
    const topCatName = cats[0]?.categoryName || 'Discretionary';
    const topCatTotal = cats[0]?.total || 0;

    return {
      reply: `💡 **Targeted Strategies to Reduce That Expense:**\n\n`
        + `Based on your recent breakdown (especially **${topCatName}** at ${formatCurrency(topCatTotal)}):\n\n`
        + `1. **Institute the 48-Hour Pause Rule:** For non-essential purchases over ₹1,000, wait 48 hours. Most impulse urges fade.\n`
        + `2. **Set a Category Budget Cap:** Set a monthly envelope for ${topCatName} that is 15% lower (target: **${formatCurrency(Math.round(topCatTotal * 0.85))}**). Just say *"Create a monthly ${topCatName.toLowerCase()} budget of ₹${Math.round(topCatTotal * 0.85)}"*.\n`
        + `3. **Track Micro-Spends Daily:** If small routine transactions are driving the total, use FinMan's daily reminder at your scheduled time to catch them before they add up.\n\n`
        + `Would you like me to create this category budget now?`,
      suggestedQuestions: [
        `Create a monthly ${topCatName.toLowerCase()} budget of ₹${Math.round(topCatTotal * 0.85)}`,
        'Help me plan a realistic budget for next month',
        'How can I save more money based on my current income?',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 4. SPENDING ANALYSIS & "HOW MUCH DID I SPEND THIS MONTH?"
  // -----------------------------------------------------------------
  const isAnalyzeSpendingQuery = (
    (/\b(?:analyze|analyse|analysis|breakdown)\b/i.test(lower) && /\b(?:spending|expenses?|spend)\b/i.test(lower)) ||
    /\banalyze\s+(?:my\s+)?spending\b/i.test(lower) ||
    lower === 'analyze my spending' ||
    lower === 'analyze spending' ||
    lower === 'spending analysis' ||
    lower === 'analyze my spending this month' ||
    /\bhow\s+much\s+(?:did|have)\s+i\s+spent?\s+(?:this\s+month|so\s+far)\b/i.test(lower) ||
    lower === 'how much did i spend this month' ||
    lower === 'how much did i spend this month?' ||
    lower === 'how much have i spent this month' ||
    lower === 'how much have i spent this month?' ||
    lower === 'how much did i spend' ||
    lower === 'how much did i spend?' ||
    lower === 'how much have i spent' ||
    lower === 'how much have i spent?'
  );

  if (isAnalyzeSpendingQuery) {
    const totalExp = Number(ctx.summary.totalExpenses || 0);
    const txCount = verifiedRec.expenseTransactionCount || 0;
    const catList = fp?.categorySpending || [];
    const isPrelim = txCount < 3;
    const now = new Date();
    const dateRangeStr = `${ctx.monthComparison.currentMonthName} 1, ${now.getFullYear()} – Today (${ctx.monthComparison.currentMonthName} ${now.getDate()}, ${now.getFullYear()})`;

    if (totalExp === 0 && txCount === 0) {
      return {
        reply: `You haven't recorded any expenses for **${ctx.monthComparison.currentMonthName}** yet.\n\n`
          + `• **Date Range:** ${dateRangeStr}\n`
          + `• **Total Spending:** ₹0\n\n`
          + `Once you start logging expenses (or scan receipts with OCR), I'll break down your spending distribution, top categories, and compare them against your monthly income.`,
        suggestedQuestions: ['I spent ₹120 on lunch today', 'Add my salary of ₹50,000', 'Help me plan a realistic budget for next month'],
        pendingTransaction: null,
      };
    }

    let catDetails = '';
    if (catList.length > 0) {
      catDetails = catList.slice(0, 4).map((c) => (
        `• **${c.categoryName}:** ${formatCurrency(c.total)} (${c.percentageOfTotal}%)`
      )).join('\n');
    }

    const largestExpNote = ctx.largestExpense
      ? `• **Largest Single Expense:** ${formatCurrency(ctx.largestExpense.amount)} for *${ctx.largestExpense.merchant_name || ctx.largestExpense.category_name}* (${ctx.largestExpense.category_name}) on ${ctx.largestExpense.expense_date}.\n`
      : '';

    const microNote = ctx.microSpending.count > 0
      ? `• **Micro-Transactions (≤ ₹250):** ${ctx.microSpending.count} transactions totaling ${formatCurrency(ctx.microSpending.total)}.\n`
      : '';

    const prelimWarning = isPrelim
      ? `\n> ℹ️ *Preliminary Analysis:* Based on ${txCount} transaction(s). Analysis becomes more comprehensive with ongoing records.\n\n`
      : '';

    const netSavings = Number(ctx.summary.totalSavings || 0);
    const deficit = Number(ctx.summary.deficit || 0);
    let cashFlowStatus = '';
    if (deficit > 0) {
      cashFlowStatus = `• **Cash Flow Status:** ⚠️ Expenses exceed recorded income by **${formatCurrency(deficit)}**.\n`;
    } else if (ctx.summary.totalIncome > 0) {
      cashFlowStatus = `• **Cash Flow Status:** ✅ Healthy surplus of **${formatCurrency(netSavings)}** (${Math.round((netSavings / ctx.summary.totalIncome) * 100)}% savings rate).\n`;
    }

    const reply = `📊 **Spending Analysis for ${ctx.monthComparison.currentMonthName}:**\n\n`
      + `• **Date Range:** ${dateRangeStr}\n`
      + `• **Total Recorded Spending:** **${formatCurrency(totalExp)}** across **${txCount}** transaction(s)\n`
      + (ctx.summary.totalIncome > 0 ? `• **Spending-to-Income Ratio:** **${Math.round((totalExp / ctx.summary.totalIncome) * 100)}%** of recorded income (${formatCurrency(ctx.summary.totalIncome)})\n` : '')
      + cashFlowStatus
      + largestExpNote
      + microNote
      + prelimWarning
      + (catDetails ? `**Category Breakdown:**\n${catDetails}\n\n` : '')
      + `💡 *Actionable Insight:* Review your top spending category to ensure it aligns with your monthly goals.`;

    return {
      reply,
      suggestedQuestions: [
        'Where can I reduce my expenses?',
        'How can I save more money based on my current income?',
        'Help me plan a realistic budget for next month',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 5. SAVINGS STRATEGY & "HOW CAN I SAVE MORE MONEY?"
  // -----------------------------------------------------------------
  const isSaveMoreQuery = (
    /\bhow\s+(?:can|do)\s+i\s+save\s+more\b/i.test(lower) ||
    (/\bsave\s+more\b/i.test(lower) && (/\bincome\b/i.test(lower) || /\bmoney\b/i.test(lower)))
  );

  if (isSaveMoreQuery) {
    const verifiedInc = Number(ctx.summary.totalIncome || 0);
    const statedInc = Number(statedProf.monthlyIncome || 0);
    const effectiveInc = verifiedInc > 0 ? verifiedInc : statedInc;
    const currentExp = Number(ctx.summary.totalExpenses || 0);
    const currentSavings = Number(ctx.summary.periodSavings || 0);
    const savingsRate = effectiveInc > 0 ? Math.round((currentSavings / effectiveInc) * 100) : 0;

    const discretionaryCategories = ['Food', 'Dining', 'Entertainment', 'Shopping', 'Lifestyle'];
    const discretionaryTotal = (fp?.categorySpending || [])
      .filter((c) => discretionaryCategories.some((d) => c.categoryName.toLowerCase().includes(d.toLowerCase())))
      .reduce((sum, c) => sum + Number(c.total || 0), 0);

    const potentialTrim15 = Math.round(discretionaryTotal * 0.15);
    const potentialTrim10 = Math.round((currentExp || effectiveInc * 0.5) * 0.10);

    const reply = `💡 **Personalized Savings Strategy (Grounded in Your Income):**\n\n`
      + `**Your Numbers:**\n`
      + `• **Current Monthly Income:** ${formatCurrency(effectiveInc)} ${verifiedInc > 0 ? '(Verified in records)' : '(From onboarding profile)'}\n`
      + `• **Current Expenses:** ${formatCurrency(currentExp)}\n`
      + `• **Current Monthly Surplus / Savings:** ${formatCurrency(currentSavings)} (**${savingsRate}%** savings rate)\n\n`
      + `### Practical Steps to Save More:\n`
      + (discretionaryTotal > 0
        ? `1. **Optimize Discretionary Spending (${formatCurrency(discretionaryTotal)}):**\n`
          + `   Trimming 15% from dining, entertainment, and shopping frees up **+${formatCurrency(potentialTrim15)}/month**.\n\n`
        : `1. **Target a 10% Overall Expense Optimization:**\n`
          + `   Reducing variable expenses by 10% unlocks **+${formatCurrency(potentialTrim10)}/month** directly into savings.\n\n`)
      + `2. **Automate the 20% Benchmark (${formatCurrency(Math.round(effectiveInc * 0.20))}):**\n`
        + `   Set up an automatic SIP or recurring deposit on your salary credit day before discretionary spending begins.\n\n`
      + `3. **Audit Micro-Expenses:**\n`
        + `   Small daily UPI expenses (tea, snacks, cabs) often accumulate quietly. Capping them adds ₹2,000–₹4,000 back to your wallet each month.\n\n`
      + `Would you like me to help you plan category budget limits for next month?`;

    return {
      reply,
      suggestedQuestions: [
        'Help me plan a realistic budget for next month',
        'Where can I reduce my expenses?',
        'Help me save money for my goals',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 6. SAVINGS GOALS PLANNING & "HELP ME SAVE MONEY FOR MY GOALS"
  // -----------------------------------------------------------------
  const isGoalSavingsQuery = (
    /\bam\s+i\s+on\s+track\b/i.test(lower) ||
    (/\bon\s+track\b/i.test(lower) && /\b(?:goal|goals|car|target|education|house|save|saving)\b/i.test(lower)) ||
    /\b(?:help\s+me\s+)?save\s+(?:money\s+)?for\s+(?:my\s+)?goals?\b/i.test(lower) ||
    /\bsaving\s+(?:money\s+)?for\s+(?:my\s+)?goals?\b/i.test(lower) ||
    /\bhow\s+(?:can|do)\s+i\s+save\s+for\s+(?:my\s+)?goals?\b/i.test(lower) ||
    /\bgoals?\s+(?:planning|progress|savings?)\b/i.test(lower)
  );

  if (isGoalSavingsQuery) {
    const goalsList = fp?.goals?.items || ctx.goals || [];

    if (goalsList.length === 0) {
      return {
        reply: `You don't have any active savings goals recorded yet in FinMan.\n\n`
          + `Setting clear targets is the most effective way to stay disciplined. You can create a goal like:\n`
          + `• *"Create a savings goal of ₹5 lakh for my car by December 2027"* or\n`
          + `• *"Create an emergency fund savings goal of ₹1.5 lakh"*.\n\n`
          + `Once created, you can use the **Add Savings** button on any goal to record contributions over time!`,
        suggestedQuestions: [
          'Create a savings goal of ₹5 lakh for my car by December 2027',
          'Create a savings goal of ₹1.5 lakh for emergency fund',
          'Help me plan a realistic budget for next month',
        ],
        pendingTransaction: null,
      };
    }

    // If user asked about a specific goal (car, house, education, emergency)
    let matchedGoals = goalsList;
    if (lower.includes('car')) matchedGoals = goalsList.filter((g) => (g.name || g.goal_name || g.goalName || '').toLowerCase().includes('car'));
    else if (lower.includes('house')) matchedGoals = goalsList.filter((g) => (g.name || g.goal_name || g.goalName || '').toLowerCase().includes('house'));
    else if (lower.includes('education')) matchedGoals = goalsList.filter((g) => (g.name || g.goal_name || g.goalName || '').toLowerCase().includes('education'));
    else if (lower.includes('emergency')) matchedGoals = goalsList.filter((g) => (g.name || g.goal_name || g.goalName || '').toLowerCase().includes('emergency'));
    if (matchedGoals.length === 0) matchedGoals = goalsList;

    const monthlySurplus = Number(ctx.summary.totalSavings || 0);

    const goalReports = matchedGoals.map((targetGoal) => {
      const goalName = targetGoal.goalName || targetGoal.name || targetGoal.goal_name || 'Savings Goal';
      const targetAmt = Number(targetGoal.target_amount || targetGoal.targetAmount || 0);
      const currentAmt = Number(targetGoal.current_amount || targetGoal.currentAmount || 0);
      const remainingAmt = Math.max(0, targetAmt - currentAmt);
      const progressPct = targetAmt > 0 ? Math.round((currentAmt / targetAmt) * 100) : 0;
      const targetDateStr = targetGoal.target_date || targetGoal.targetDate;

      let dateFeasibility = '';
      if (targetDateStr) {
        const targetDate = new Date(targetDateStr);
        const today = new Date();
        const diffMonths = Math.max(1, Math.round((targetDate - today) / (1000 * 60 * 60 * 24 * 30.44)));
        const requiredMonthly = Math.round(remainingAmt / diffMonths);

        const statusTag = monthlySurplus >= requiredMonthly
          ? `✅ **On Track**`
          : `⚠️ **Action Required**`;

        dateFeasibility = `  • Target Date: ${new Date(targetDateStr).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })} (${diffMonths} mo left)\n`
          + `  • Required Monthly: **${formatCurrency(requiredMonthly)}/month**\n`
          + `  • Status: ${statusTag} (Your current surplus: ${formatCurrency(monthlySurplus)}/mo)\n`;
      } else {
        dateFeasibility = `  • Target Date: Not set (Open-ended)\n`;
      }

      return `🎯 **${goalName}**\n`
        + `  • Target: ${formatCurrency(targetAmt)} | Saved: ${formatCurrency(currentAmt)} (**${progressPct}%**)\n`
        + `  • Remaining: ${formatCurrency(remainingAmt)}\n`
        + dateFeasibility;
    }).join('\n');

    const reply = `🎯 **Goal Tracking Analysis & Savings Progress:**\n\n`
      + goalReports + `\n`
      + `💡 **How to contribute:** You can record savings anytime via the **Add Savings** button on your Savings & Goals page, or just tell me *"Record a contribution of ₹5,000 to my ${matchedGoals[0]?.name || 'goal'}"*!`;

    return {
      reply,
      suggestedQuestions: [
        'Where can I reduce my expenses?',
        'Help me plan a realistic budget for next month',
        'How can I save more money based on my current income?',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 7. MONTHLY BUDGET PLANNING & "HI, I JUST WANT TO PLAN MY MONTHLY BUDGET. PLEASE HELP ME."
  // -----------------------------------------------------------------
  const isBudgetPlanQuery = (
    /\b(?:plan|planning)\b.*\b(?:budget|budgets)\b/i.test(lower) ||
    /\b(?:budget|budgets)\b.*\b(?:plan|planning)\b/i.test(lower) ||
    /\b(?:suggest|recommend|create)\s+(?:a\s+)?(?:monthly\s+|realistic\s+)?budget\b/i.test(lower) ||
    /\bhelp\s+me\s+plan\b/i.test(lower) ||
    /\bwant\s+to\s+plan\s+(?:my\s+)?(?:monthly\s+)?budget\b/i.test(lower) ||
    /\bhelp\s+me\s+with\s+(?:my\s+)?budget\b/i.test(lower) ||
    /\bhelp\s+(?:me\s+)?(?:plan|create)\s+(?:my\s+)?(?:monthly\s+)?budget\b/i.test(lower)
  );

  if (isBudgetPlanQuery) {
    const verifiedInc = Number(ctx.summary.totalIncome || 0);
    const statedInc = Number(statedProf.monthlyIncome || 0);
    const baseInc = verifiedInc > 0 ? verifiedInc : (statedInc > 0 ? statedInc : 60000);

    const needs = Math.round(baseInc * 0.50);
    const wants = Math.round(baseInc * 0.30);
    const savings = Math.round(baseInc * 0.20);

    const topCategories = fp?.categorySpending || [];
    let suggestedCatBreakdown = '';
    if (topCategories.length > 0) {
      suggestedCatBreakdown = `\n**Tailored Category Caps (Based on your past transactions):**\n`
        + topCategories.slice(0, 3).map((c) => {
          const suggested = Math.round(Number(c.total || 0) * 0.95);
          return `• **${c.categoryName}:** Suggest capping at **${formatCurrency(suggested)}** (Past: ${formatCurrency(c.total)})`;
        }).join('\n') + '\n';
    }

    // Check existing budgets
    let existingBudgetsNote = '';
    if (ctx.activeBudgets && ctx.activeBudgets.length > 0) {
      existingBudgetsNote = `\n**Your Current Active Budgets:**\n`
        + ctx.activeBudgets.map((b) => `• **${b.category_name || b.name}:** Limit ${formatCurrency(b.amount)} (Spent: ${formatCurrency(b.spent || 0)})`).join('\n') + `\n`;
    }

    const greetingPrefix = /\b(hi+|hello+|hey+|vanakkam|namaste)\b/i.test(lower)
      ? `Hello ${userName}! I'd be glad to help you plan your monthly budget.\n\n`
      : '';

    const reply = `${greetingPrefix}📋 **Realistic Monthly Budget Blueprint (50/30/20 Rule & Framework):**\n\n`
      + `**Grounded Monthly Income Base:** **${formatCurrency(baseInc)}** ${verifiedInc > 0 ? '(From your verified records)' : '(From onboarding profile)'}\n\n`
      + `• **Essentials / Needs (50%):** **${formatCurrency(needs)}**\n`
      + `  Includes: Rent, Groceries, Utilities, Essential Transport, Healthcare.\n`
      + `• **Discretionary / Wants (30%):** **${formatCurrency(wants)}**\n`
      + `  Includes: Dining out, Entertainment, Subscriptions, Shopping.\n`
      + `• **Savings & Investments / Goals Reserve (20%):** **${formatCurrency(savings)}**\n`
      + `  Directly into emergency safety funds, savings goals, or SIP investments.\n`
      + existingBudgetsNote
      + suggestedCatBreakdown + `\n`
      + `💡 *FinMan Suggestion:* This is a suggested plan. To activate any category budget limit in your records, simply tell me (e.g. *"Create a monthly food budget of ₹${Math.min(needs, 10000)}"* ) and I will confirm and save it.`;

    return {
      reply,
      suggestedQuestions: [
        `Create a monthly food budget of ₹${Math.round(needs * 0.35)}`,
        'Where can I reduce my expenses?',
        'Help me save money for my goals',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 8. EXPENSE REDUCTION & "WHERE CAN I REDUCE MY EXPENSES?"
  // -----------------------------------------------------------------
  const isReviewExpensesQuery = (
    /\b(?:which|what)\s+expenses?\s+(?:should\s+i\s+)?review\s+first\b/i.test(lower) ||
    /\bexpenses?\s+to\s+review\b/i.test(lower) ||
    /\b(?:where|how)\s+can\s+i\s+(?:reduce|cut|trim|lower|decrease)\s+(?:my\s+)?(?:expenses?|spending)\b/i.test(lower) ||
    /\breduce\s+(?:my\s+)?(?:expenses?|spending)\b/i.test(lower) ||
    /\bcut\s+(?:down|back)\s+(?:on\s+)?(?:expenses?|spending)\b/i.test(lower) ||
    /\bwhere\s+can\s+i\s+cut\s+back\b/i.test(lower) ||
    /\bwhere\s+to\s+reduce\b/i.test(lower) ||
    /\bwhere\s+can\s+i\s+save\b/i.test(lower)
  );

  if (isReviewExpensesQuery) {
    const cats = fp?.categorySpending || [];
    const overBudgets = (fp?.budgets?.items || []).filter((b) => b.isOverBudget);
    const microTotal = ctx.microSpending.total;
    const microCount = ctx.microSpending.count;

    let reviewItems = [];
    if (overBudgets.length > 0) {
      overBudgets.forEach((b) => {
        reviewItems.push(`1. **Over-Budget Category: ${b.categoryName || b.name}** — Spent **${formatCurrency(b.spent)}** against a limit of **${formatCurrency(b.amount)}** (Overrun: **${formatCurrency(b.overrun)}**). Setting an envelope limit here gives immediate control.`);
      });
    }

    if (cats.length > 0) {
      const topDiscretionary = cats.find((c) => ['food', 'dining', 'entertainment', 'shopping', 'lifestyle'].some((d) => c.categoryName.toLowerCase().includes(d)));
      const topCat = topDiscretionary || cats[0];
      const trim15 = Math.round(Number(topCat.total || 0) * 0.15);
      reviewItems.push(`${reviewItems.length + 1}. **Highest Discretionary Spend: ${topCat.categoryName}:** Currently **${formatCurrency(topCat.total)}** (${topCat.percentageOfTotal}% of spending). Trimming 15% here reclaims **+${formatCurrency(trim15)}/month** into your savings.`);
    }

    if (microCount >= 3) {
      reviewItems.push(`${reviewItems.length + 1}. **Micro-Transactions (≤ ₹250):** You have logged **${microCount} small purchases** totaling **${formatCurrency(microTotal)}**. Daily tea, quick snacks, and impulsive convenience orders often slip by without notice.`);
    }

    if (ctx.largestExpense) {
      reviewItems.push(`${reviewItems.length + 1}. **Largest Single Spend:** ${formatCurrency(ctx.largestExpense.amount)} for *${ctx.largestExpense.merchant_name || ctx.largestExpense.category_name}* on ${ctx.largestExpense.expense_date}.`);
    }

    if (reviewItems.length === 0) {
      reviewItems.push(`1. No high-risk expense concentrations or over-budget categories detected! Keep logging your daily expenses to monitor trends.`);
    }

    const reply = `🔍 **Prioritized Expense Review & Reduction Opportunities (Ranked by Financial Impact):**\n\n`
      + reviewItems.join('\n\n') + `\n\n`
      + `💡 *Tip:* Addressing the #1 item above can immediately restore surplus to your monthly cash flow. Would you like me to set a category budget cap?`;

    return {
      reply,
      suggestedQuestions: [
        'Analyze my spending this month',
        'Help me plan a realistic budget for next month',
        'Help me save money for my goals',
      ],
      pendingTransaction: null,
    };
  }

  // 7. "What financial habits should I improve?"
  const isHabitsQuery = (
    /\b(?:what|which)\s+(?:financial\s+)?habits?\s+(?:should\s+i|to)\s+improve\b/i.test(lower) ||
    /\bimprove\s+(?:my\s+)?(?:financial\s+)?habits?\b/i.test(lower)
  );

  if (isHabitsQuery) {
    const statedHabit = statedProf.savingsHabit || 'Flexible';
    const actualSavingsRate = verifiedRec.actualSavingsRate || 0;
    const hasDiscr = discr.savingsHabitDeficit;
    const runway = verifiedRec.emergencyFundRunwayMonths || 0;

    let habitAdvice = [];
    if (hasDiscr || actualSavingsRate < 15) {
      habitAdvice.push(`1. **Shift to "Pay Yourself First":**\n   You stated during onboarding that you prefer *"${statedHabit}"*, but your actual savings rate is **${actualSavingsRate}%**. Transfer your target 20% to savings on the day salary arrives rather than waiting for month-end leftovers.`);
    } else {
      habitAdvice.push(`1. **Maintain Consistent Savings Habit:**\n   Your actual savings rate of **${actualSavingsRate}%** is strong. Keep automating these transfers.`);
    }

    if (verifiedRec.expenseTransactionCount < 5) {
      habitAdvice.push(`2. **Real-Time Daily Logging:**\n   You currently have ${verifiedRec.expenseTransactionCount} expense record(s). Logging purchases immediately via chat or scanning receipts avoids the month-end memory gap.`);
    } else {
      habitAdvice.push(`2. **Pre-Purchase 48-Hour Rule for Discretionary Items:**\n   For non-essential purchases over ₹2,000, waiting 48 hours curbs impulse buying by over 40%.`);
    }

    if (runway < 3) {
      habitAdvice.push(`3. **Prioritize Emergency Liquidity:**\n   Ensure your buffer reaches 3 months of basic expenses before taking on high-risk speculative investments.`);
    }

    const reply = `🌱 **Actionable Financial Habit Improvements:**\n\n`
      + habitAdvice.join('\n\n') + `\n\n`
      + `Which area would you like to work on first?`;

    return {
      reply,
      suggestedQuestions: [
        'Based on my onboarding details, what should I focus on first?',
        'How can I save more money based on my current income?',
        'Help me plan a realistic budget for next month',
      ],
      pendingTransaction: null,
    };
  }

  // 8. "What changed in my financial situation this month?"
  const isWhatChangedQuery = (
    /\bwhat\s+(?:has\s+)?changed\s+in\s+my\s+financial\s+situation\b/i.test(lower) ||
    (/\bwhat\s+changed\b/i.test(lower) && /\b(?:financial|situation|this\s+month)\b/i.test(lower))
  );

  if (isWhatChangedQuery) {
    const curExp = Number(ctx.summary.totalExpenses || 0);
    const prevExp = ctx.incomeData.prevMonthExpenseTotal;
    const diffExp = curExp - prevExp;

    const curInc = Number(ctx.summary.totalIncome || 0);
    const prevInc = ctx.incomeData.prevMonthTotal;
    const diffInc = curInc - prevInc;

    const curSavings = Number(ctx.summary.periodSavings || 0);
    const overruns = (fp?.budgets?.items || []).filter((b) => b.isOverBudget);

    const expText = diffExp > 0
      ? `📈 Expenses rose by **${formatCurrency(diffExp)}** compared to last month`
      : (diffExp < 0 ? `📉 Expenses decreased by **${formatCurrency(Math.abs(diffExp))}** compared to last month` : `Expenses remained flat compared to last month`);

    const incText = diffInc > 0
      ? `📈 Income increased by **${formatCurrency(diffInc)}**`
      : (diffInc < 0 ? `📉 Income decreased by **${formatCurrency(Math.abs(diffInc))}**` : `Income remained steady`);

    const budgetStatusText = overruns.length > 0
      ? `⚠️ You have **${overruns.length} category budget overrun(s)** this month.`
      : `✅ All active category budgets are within limits.`;

    const reply = `🔄 **Month-over-Month Financial Shifts (${ctx.monthComparison.currentMonthName} vs. ${ctx.monthComparison.prevMonthName}):**\n\n`
      + `• **Income Shift:** ${incText} (${formatCurrency(curInc)} vs ${formatCurrency(prevInc)})\n`
      + `• **Spending Shift:** ${expText} (${formatCurrency(curExp)} vs ${formatCurrency(prevExp)})\n`
      + `• **Current Monthly Surplus:** **${formatCurrency(curSavings)}** (Deficit: ${formatCurrency(ctx.summary.deficit || 0)})\n`
      + `• **Budget Status:** ${budgetStatusText}\n\n`
      + `Top spending category this month: **${Object.entries(ctx.monthComparison.currentCatMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'None recorded yet'}**.`;

    return {
      reply,
      suggestedQuestions: [
        'Analyze my spending this month',
        'Which expenses should I review first?',
        'Help me plan a realistic budget for next month',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 6. RECORD MODIFICATION GUIDANCE
  // -----------------------------------------------------------------
  if (lower.includes('change') && (lower.includes('last salary') || lower.includes('yesterday\'s grocery') || lower.includes('previous record'))) {
    return {
      reply: `To edit an existing recorded transaction (like yesterday's grocery expense or your last salary record):\n\n`
        + `1. Go to the **Income & Expenses** ledger in your sidebar.\n`
        + `2. Locate the transaction in your records table and click the **Edit** icon.\n`
        + `3. Update the amount, category, or date and click Save.\n\n`
        + `Alternatively, tell me the correct details and I can record an adjustment entry for you!`,
      suggestedQuestions: ['I spent ₹900 on groceries yesterday', 'Add my salary of ₹50,000'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 7. MULTI-TRANSACTION / FULL-DAY NARRATION DETECTION
  // e.g. "This morning I had tea for ten rupees. Breakfast cost two hundred. I bought fruits for fifty. Later I filled petrol for five hundred, and in the evening I went to the theatre and spent another five hundred."
  // or "I spent ₹10 on tea, ₹200 on breakfast, ₹50 on fruits, ₹500 on petrol, and ₹500 at the theatre."
  // or "I received ₹10,000 from freelancing yesterday, and spent ₹450 on dinner."
  // -----------------------------------------------------------------
  const batchPending = parseDayNarration(text, ctx.categories);
  if (batchPending && batchPending.items.length >= 2) {
    const tableHeader = `| Description | Amount | Category | Date |\n|---|---:|---|---|`;
    const tableRows = batchPending.items.map((it) => {
      const name = it.merchantName || it.description || it.source;
      const cat = it.category || it.source;
      return `| ${name} | ${formatCurrency(it.amount)} | ${cat} | ${it.date} |`;
    }).join('\n');
    const totalRow = `| **Total** | **${formatCurrency(batchPending.totalAmount)}** | | |`;

    const reply = `I've identified **${batchPending.count} separate transactions** from your day narration:\n\n`
      + `📋 **Batch Transactions Preview:**\n\n`
      + `${tableHeader}\n${tableRows}\n${totalRow}\n\n`
      + `Should I confirm and save all ${batchPending.count} transactions to your FinMan records? (You can confirm, change an item, or remove any item before saving)`;

    return {
      reply,
      suggestedQuestions: ['Confirm and Add', 'Cancel'],
      pendingTransaction: batchPending,
    };
  }

  // -----------------------------------------------------------------
  // 8. OCR DOCUMENT WORKFLOW GUIDANCE
  // -----------------------------------------------------------------
  if (lower.includes('ocr') || lower.includes('scan a receipt') || lower.includes('scan receipt') || lower.includes('upload receipt') || lower.includes('upload invoice')) {
    return {
      reply: `📄 **FinMan OCR Document Workflow:**\n\n`
        + `You can automatically digitize physical and digital receipts without manual typing:\n\n`
        + `1. Navigate to **Document Upload** in the navigation menu.\n`
        + `2. Upload a receipt image (JPG, PNG) or invoice PDF.\n`
        + `3. Our local OCR engine extracts the **Merchant Name**, **Transaction Date**, **Total Amount**, and automatically predicts the expense category.\n`
        + `4. Review the parsed fields on screen and click **Save to Ledger** to commit them to your records.\n\n`
        + `All OCR files are safely processed through our local service with verified PostgreSQL storage.`,
      suggestedQuestions: ['I spent ₹120 on lunch today', 'Show my largest expense this month', 'Check my budget'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 9. TAXES (Queries & Recording)
  // -----------------------------------------------------------------
  if (lower.includes('tax') && !lower.includes('afford')) {
    // 9a. Tax recording intent: "Record a tax payment of ₹25,000" / "Record tax liability of ₹25,000"
    const detectedTaxAmount = extractAmount(lower);
    const mentionsAddTax = /\b(add|record|pay|paid|log)\b/i.test(lower);

    if (detectedTaxAmount && mentionsAddTax) {
      const taxType = lower.includes('property') ? 'Property Tax' : (lower.includes('gst') ? 'GST' : 'Income Tax');
      const pendingTx = {
        id: `tax_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'tax',
        taxType,
        taxYear: ctx.currentYear,
        amount: detectedTaxAmount,
        dueDate: todayIso(),
        status: lower.includes('paid') || lower.includes('payment') ? 'PAID' : 'PENDING',
        status: 'PENDING_CONFIRMATION',
      };

      const reply = `I've prepared this tax record for you:\n\n`
        + `📋 **Tax Record Preview:**\n`
        + `• **Type:** Tax Record\n`
        + `• **Tax Type:** ${taxType}\n`
        + `• **Tax Year:** ${ctx.currentYear}\n`
        + `• **Amount:** ${formatCurrency(detectedTaxAmount)}\n`
        + `• **Status:** ${pendingTx.status}\n\n`
        + `Should I save this tax record to your FinMan database?`;

      return {
        reply,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: pendingTx,
      };
    }

    // 9b. Tax Query: "Show my tax records / liabilities"
    if (ctx.taxes.length === 0) {
      return {
        reply: `You currently have no recorded tax records or pending tax liabilities in FinMan for ${ctx.currentYear}.`,
        suggestedQuestions: ['Record a tax payment of ₹25,000', 'What bills are coming up?', 'How much did I spend this month?'],
        pendingTransaction: null,
      };
    }

    const taxList = ctx.taxes.map((t) =>
      `• **${t.tax_type}** (${t.tax_year}): ${formatCurrency(t.amount)} — Status: **${t.status}** (Due: ${t.due_date ? t.due_date.slice(0, 10) : 'N/A'})`
    ).join('\n');
    const totalTaxes = ctx.taxes.reduce((acc, t) => acc + Number(t.amount || 0), 0);

    return {
      reply: `🧾 **Your Recorded Tax Records:**\n\n${taxList}\n\n**Total Recorded Taxes:** **${formatCurrency(totalTaxes)}**.`,
      suggestedQuestions: ['Record a tax payment of ₹25,000', 'What bills are coming up?'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 10. PROJECT WORKSPACES & PROJECT EXPENSES
  // -----------------------------------------------------------------
  const mentionsProject = /\b(project|projects|workspace|workspaces|home construction|office setup)\b/i.test(lower);
  const mentionsAddProjectExpense = (lower.includes('add') || lower.includes('record')) && lower.includes('to') && (lower.includes('project') || lower.includes('home'));

  // 10a. Adding an expense to a project workspace
  // e.g. "Add a construction material expense of ₹25,000 to my home project." / "Add that expense to the home project."
  if (mentionsAddProjectExpense || (lower.includes('add that expense to') && mentionsProject)) {
    let targetProject = ctx.projects.find((p) =>
      lower.includes(p.project_name.toLowerCase()) ||
      (lower.includes('home') && p.project_name.toLowerCase().includes('home'))
    ) || ctx.projects[0];

    // If user has no project, offer to create one first
    if (!targetProject) {
      return {
        reply: `You don't have an active project workspace yet to link expenses to. Would you like me to create a **Home Construction Project** first?`,
        suggestedQuestions: ['Create a home construction project with a target cost of ₹1 crore', 'Cancel'],
        pendingTransaction: null,
      };
    }

    let expenseAmount = extractAmount(lower);
    let expenseName = 'Project Expense';

    if (lower.includes('that expense') && ctx.lastExpense) {
      expenseAmount = Number(ctx.lastExpense.amount);
      expenseName = ctx.lastExpense.merchant_name || 'Recorded Expense';
    } else if (lower.includes('construction material')) {
      expenseName = 'Construction Material';
    } else if (lower.includes('cement') || lower.includes('steel') || lower.includes('sand')) {
      expenseName = 'Building Materials';
    }

    if (!expenseAmount) {
      return {
        reply: `Please specify the amount for the project expense (for example: *"Add a construction material expense of ₹25,000 to my ${targetProject.project_name}"*).`,
        suggestedQuestions: [`Add construction material expense of ₹25,000 to ${targetProject.project_name}`, 'Cancel'],
        pendingTransaction: null,
      };
    }

    const pendingTx = {
      id: `prjexp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'project_expense',
      projectId: targetProject.project_id,
      projectName: targetProject.project_name,
      expenseName,
      category: 'Construction',
      amount: expenseAmount,
      date: todayIso(),
      paymentMode: 'UPI',
      description: `${expenseName} for ${targetProject.project_name}`,
      status: 'PENDING_CONFIRMATION',
    };

    const reply = `I've prepared this project expense for **${targetProject.project_name}**:\n\n`
      + `📋 **Project Expense Confirmation Preview:**\n`
      + `• **Type:** Project Expense\n`
      + `• **Project:** ${targetProject.project_name}\n`
      + `• **Expense Name:** ${expenseName}\n`
      + `• **Category:** Construction\n`
      + `• **Amount:** ${formatCurrency(expenseAmount)}\n`
      + `• **Date:** ${todayIso()}\n\n`
      + `Should I link this expense to project "${targetProject.project_name}"?`;

    return {
      reply,
      suggestedQuestions: ['Confirm and Add', 'Cancel'],
      pendingTransaction: pendingTx,
    };
  }

  // 10b. Project Creation Intent: "Create a home construction project with a target cost of ₹1 crore."
  if ((lower.includes('create') || lower.includes('set up') || lower.includes('start')) && mentionsProject) {
    const targetBudget = extractAmount(lower) || 10000000;
    let projName = 'Home Construction';
    if (lower.includes('vehicle') || lower.includes('car')) projName = 'Vehicle Purchase';
    else if (lower.includes('office')) projName = 'Office Setup';
    else if (lower.includes('wedding')) projName = 'Wedding Planning';
    else if (lower.includes('renovation')) projName = 'Home Renovation';

    const targetDate = extractTargetDate(lower) || `${ctx.currentYear + 1}-12-31`;

    const pendingTx = {
      id: `prj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'project',
      projectName: projName,
      name: projName,
      targetBudget,
      amount: targetBudget,
      startDate: todayIso(),
      targetDate,
      description: `${projName} project workspace with target budget of ${formatCurrency(targetBudget)}`,
      status: 'PENDING_CONFIRMATION',
    };

    const reply = `I've prepared this new project workspace for you:\n\n`
      + `📋 **Project Workspace Preview:**\n`
      + `• **Type:** Project Workspace\n`
      + `• **Project Name:** ${projName}\n`
      + `• **Target Budget:** ${formatCurrency(targetBudget)}\n`
      + `• **Start Date:** ${todayIso()}\n`
      + `• **Target Date:** ${targetDate}\n`
      + `• **Initial Status:** Active\n\n`
      + `Should I create this project workspace in your FinMan database?`;

    return {
      reply,
      suggestedQuestions: ['Confirm and Add', 'Cancel'],
      pendingTransaction: pendingTx,
    };
  }

  // 10c. Project Query: "Show my project spending and remaining budget" / "Show my projects"
  if (mentionsProject && (lower.includes('show') || lower.includes('spending') || lower.includes('remaining') || lower.includes('status'))) {
    if (ctx.projects.length === 0) {
      return {
        reply: `You do not have any active project workspaces yet. You can create one right now (for example: *"Create a home construction project with a target cost of ₹1 crore"*).`,
        suggestedQuestions: ['Create a home construction project with a target cost of ₹1 crore', 'Can I afford a loan EMI?'],
        pendingTransaction: null,
      };
    }

    const pSummary = ctx.projectSummary;
    const projLines = ctx.projects.map((p) =>
      `• **${p.project_name}**: Target ${formatCurrency(p.target_budget)}, Spent ${formatCurrency(p.total_spent)} (${p.utilization_percentage}% used), Remaining: **${formatCurrency(p.remaining_budget)}**`
    ).join('\n');

    const reply = `🏗️ **Your Project Workspaces Summary:**\n\n${projLines}\n\n`
      + `**Portfolio Totals:**\n`
      + `• **Total Target Budgets:** ${formatCurrency(pSummary.totalTargetBudget)}\n`
      + `• **Total Spent to Date:** ${formatCurrency(pSummary.totalSpent)}\n`
      + `• **Total Remaining:** **${formatCurrency(pSummary.totalRemaining)}**`;

    return {
      reply,
      suggestedQuestions: ['Add a construction material expense of ₹25,000 to my home project', 'Show my budget status'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 11. SAVINGS GOALS (Queries, Creation & Monthly Calculations)
  // -----------------------------------------------------------------
  const mentionsGoal = /\b(goal|goals|savings goal|emergency fund target)\b/i.test(lower);

  // 11a. Monthly savings calculation: "How much should I save monthly to reach my target?"
  if (lower.includes('how much should i save') || (mentionsGoal && lower.includes('monthly'))) {
    const matchedGoal = ctx.goals.find((g) =>
      lower.includes((g.goal_name || '').toLowerCase()) ||
      (lower.includes('education') && (g.goal_name || '').toLowerCase().includes('education')) ||
      (lower.includes('house') && (g.goal_name || '').toLowerCase().includes('house')) ||
      (lower.includes('emergency') && (g.goal_name || '').toLowerCase().includes('emergency'))
    ) || ctx.goals[0];

    if (matchedGoal) {
      const monthlyContribution = calculateMonthlyGoalContribution(
        matchedGoal.target_amount,
        matchedGoal.current_amount,
        matchedGoal.target_date
      );
      const rem = Math.max(0, Number(matchedGoal.target_amount) - Number(matchedGoal.current_amount));

      return {
        reply: `🎯 **Monthly Savings Plan for "${matchedGoal.goal_name}":**\n\n`
          + `• **Target Amount:** ${formatCurrency(matchedGoal.target_amount)}\n`
          + `• **Current Saved:** ${formatCurrency(matchedGoal.current_amount)} (${Math.round((Number(matchedGoal.current_amount) / Number(matchedGoal.target_amount)) * 100)}% complete)\n`
          + `• **Remaining to Save:** ${formatCurrency(rem)}\n`
          + `• **Target Date:** ${matchedGoal.target_date || 'Flexible'}\n\n`
          + `💡 **Deterministic Monthly Savings Needed:** You need to save **${formatCurrency(monthlyContribution)} per month** to reach your target comfortably on time.`,
        suggestedQuestions: ['Show my savings goals', 'How much have I spent this month?', 'Check my budget'],
        pendingTransaction: null,
      };
    } else {
      return {
        reply: `You don't have any savings goals recorded yet. Tell me what you're saving for (e.g. *"Create a savings goal of ₹5 lakh for my education by December 2027"*) and I will calculate your monthly savings plan!`,
        suggestedQuestions: ['Create a savings goal of ₹5 lakh for my education by December 2027', 'Cancel'],
        pendingTransaction: null,
      };
    }
  }

  // 11b. Goal Creation: "Create a savings goal of ₹5 lakh for my education by December 2027."
  if ((lower.includes('create') || lower.includes('set') || lower.includes('add') || lower.includes('update')) && mentionsGoal) {
    const targetAmount = extractAmount(lower) || 500000;
    let goalName = 'Education Fund';
    if (lower.includes('education')) goalName = 'Education Fund';
    else if (lower.includes('emergency')) goalName = 'Emergency Fund';
    else if (lower.includes('house') || lower.includes('home')) goalName = 'Buying a House';
    else if (lower.includes('car') || lower.includes('vehicle')) goalName = 'Vehicle Purchase';
    else if (lower.includes('retirement')) goalName = 'Retirement Reserve';

    const targetDate = extractTargetDate(lower) || `${ctx.currentYear + 2}-12-31`;
    const suggestedMonthly = calculateMonthlyGoalContribution(targetAmount, 0, targetDate);

    const pendingTx = {
      id: `goal_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'goal',
      goalName,
      name: goalName,
      targetAmount,
      amount: targetAmount,
      currentAmount: 0,
      targetDate,
      suggestedMonthlyContribution: suggestedMonthly,
      status: 'PENDING_CONFIRMATION',
    };

    const reply = `I've prepared this savings goal for you:\n\n`
      + `📋 **Savings Goal Preview:**\n`
      + `• **Type:** Savings Goal\n`
      + `• **Goal Name:** ${goalName}\n`
      + `• **Target Amount:** ${formatCurrency(targetAmount)}\n`
      + `• **Target Date:** ${targetDate}\n`
      + `• **Current Saved Amount:** ₹0\n`
      + `• **Suggested Monthly Contribution:** **${formatCurrency(suggestedMonthly)}/month** (calculated based on your timeline)\n\n`
      + `Should I save this goal to your FinMan goals?`;

    return {
      reply,
      suggestedQuestions: ['Confirm and Add', 'Cancel'],
      pendingTransaction: pendingTx,
    };
  }

  // 11c. Goal Query: "Show my progress toward buying a house" / "Show my savings goals"
  if (mentionsGoal && (lower.includes('show') || lower.includes('progress') || lower.includes('buying a house') || lower.includes('status'))) {
    if (ctx.goals.length === 0) {
      return {
        reply: `You do not have any savings goals set up yet. Would you like to create one (for example: *"Create a savings goal of ₹5 lakh for my education by December 2027"*)?`,
        suggestedQuestions: ['Create a savings goal of ₹5 lakh for my education by December 2027', 'Cancel'],
        pendingTransaction: null,
      };
    }

    const lines = ctx.goals.map((g) => {
      const tgt = Number(g.target_amount || 0);
      const cur = Number(g.current_amount || 0);
      const pct = tgt > 0 ? Math.round((cur / tgt) * 100) : 0;
      return `• **${g.goal_name}**: Saved ${formatCurrency(cur)} of ${formatCurrency(tgt)} (${pct}% complete, Target: ${g.target_date || 'Flexible'})`;
    }).join('\n');

    return {
      reply: `🎯 **Your Savings Goals Progress:**\n\n${lines}`,
      suggestedQuestions: ['How much should I save monthly to reach my target?', 'Check my budget'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 12. INVESTMENTS & FINANCIAL HOLDINGS
  // -----------------------------------------------------------------
  const mentionsInvestment = /\b(invest|investment|investing|holding|holdings|gold|stocks?|mutual funds?|crypto|shares)\b/i.test(lower);

  // 12a. Risk Analysis: "Help me understand the risks of investing in gold."
  if (lower.includes('risk') && (lower.includes('gold') || lower.includes('invest'))) {
    return {
      reply: `🪙 **Understanding Gold Investment Risks & Considerations:**\n\n`
        + `1. **No Cash Flow / Dividend Yield:** Unlike dividend-paying stocks or rental properties, gold generates zero recurring yield. Growth is purely dependent on capital appreciation.\n`
        + `2. **Price Volatility & Currency Dependency:** Gold prices in India reflect both international USD spot rates and INR/USD currency fluctuations. In low-inflation periods, gold can experience extended consolidation.\n`
        + `3. **Physical Gold Frictional Losses:**\n`
        + `   • **Making Charges & Wastage:** Physical jewellery incurs 8%–20% non-recoverable making charges.\n`
        + `   • **GST & Purity Deductions:** 3% GST on purchase and potential resale assaying cuts.\n`
        + `   • **Theft & Locker Costs:** Requires secure storage or paid bank lockers.\n`
        + `4. **Smarter Paper Alternatives:** Consider **Sovereign Gold Bonds (SGB)** which pay **2.5% annual interest** and provide capital gains tax exemption on 8-year maturity, or low-cost **Gold ETFs**.\n\n`
        + `**Recommendation:** Financial advisors suggest capping gold exposure to **5%–10% of your total net worth** as a hedge.`,
      suggestedQuestions: ['Record an investment of ₹15,000 in gold', 'Show my current holdings', 'Can I afford a new purchase?'],
      pendingTransaction: null,
    };
  }

  // 12b. Investment Creation:
  // e.g. "I purchased 1 gram of gold on 19th September 2026, worth about ₹15,000. Add it to my investments."
  // or "Record an investment of ₹15,000 in gold."
  const isInvestmentCreation = mentionsInvestment && (
    lower.includes('record') ||
    lower.includes('add') ||
    lower.includes('purchased') ||
    lower.includes('bought') ||
    lower.includes('invested') ||
    lower.includes('holding')
  );

  if (isInvestmentCreation) {
    const entities = extractFinancialEntities(text);
    const invAmount = (entities.money.length > 0 ? entities.money[0].value : null) || extractAmount(lower);
    if (invAmount) {
      const holdingType = matchHoldingType(lower);
      let assetName = 'Gold Investment';
      if (holdingType === 'Mutual Funds') assetName = 'Mutual Fund SIP';
      else if (holdingType === 'Stocks') assetName = 'Equity Stocks';
      else if (holdingType === 'Crypto') assetName = 'Crypto Asset';
      else if (holdingType === 'Fixed Deposit') assetName = 'Fixed Deposit';
      else if (holdingType === 'Bonds') assetName = 'Government Bonds';
      else if (holdingType === 'Real Estate') assetName = 'Real Estate Asset';

      // Extract quantity: e.g. "1 gram", "10 shares", "5 units"
      let quantity = 1;
      let quantityUnit = '';
      if (entities.quantities && entities.quantities.length > 0) {
        quantity = entities.quantities[0].value;
        quantityUnit = entities.quantities[0].unit;
      }

      // Extract purchase date: e.g. "19th September 2026", "yesterday", or fallback to todayIso()
      const purchaseDate = (entities.dates && entities.dates.length > 0 ? entities.dates[0].iso : null) || extractDate(lower);

      const purchaseValue = invAmount;
      const currentValue = invAmount; // Supported schema representation where current_value is required

      const pendingTx = {
        id: `hld_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'holding',
        holdingType,
        name: assetName,
        quantity,
        quantityUnit,
        currentValue,
        purchaseValue,
        amount: invAmount,
        purchaseDate,
        date: purchaseDate,
        currency: 'INR',
        status: 'PENDING_CONFIRMATION',
      };

      const qtyDisplay = quantityUnit ? `${quantity} ${quantityUnit}` : `${quantity}`;

      const reply = `I've prepared this investment holding for you:\n\n`
        + `📋 **Investment Holding Preview:**\n`
        + `• **Action:** Create an investment holding\n`
        + `• **Asset Name:** ${assetName}\n`
        + `• **Asset Type:** ${holdingType}\n`
        + `• **Quantity:** ${qtyDisplay}\n`
        + `• **Purchase Date:** ${purchaseDate}\n`
        + `• **Purchase Value:** ${formatCurrency(purchaseValue)}\n`
        + `• **Current Value:** ${formatCurrency(currentValue)}\n`
        + `• **Currency:** INR\n`
        + `• **Status:** Pending user confirmation\n\n`
        + `Should I record this investment holding in your FinMan portfolio?`;

      return {
        reply,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: pendingTx,
      };
    }
  }

  // 12c. Investment Query: "Show my current holdings" / "Summarize my investment allocation"
  if (mentionsInvestment && (lower.includes('show') || lower.includes('current') || lower.includes('allocation') || lower.includes('portfolio'))) {
    if (ctx.holdings.length === 0) {
      return {
        reply: `You currently have no recorded investment holdings in your portfolio. You can record one now (for example: *"Record an investment of ₹15,000 in gold"*).`,
        suggestedQuestions: ['Record an investment of ₹15,000 in gold', 'Help me understand the risks of investing in gold'],
        pendingTransaction: null,
      };
    }

    const totalPortfolio = ctx.holdings.reduce((sum, h) => sum + Number(h.current_value || 0), 0);
    const typeMap = {};
    ctx.holdings.forEach((h) => {
      typeMap[h.holding_type] = (typeMap[h.holding_type] || 0) + Number(h.current_value || 0);
    });

    const lines = Object.entries(typeMap).map(([type, val]) => {
      const pct = totalPortfolio > 0 ? Math.round((val / totalPortfolio) * 100) : 0;
      return `• **${type}**: ${formatCurrency(val)} (${pct}% of portfolio)`;
    }).join('\n');

    const reply = `📈 **Your Investment Holdings & Asset Allocation:**\n\n${lines}\n\n`
      + `**Total Portfolio Value:** **${formatCurrency(totalPortfolio)}**`;

    return {
      reply,
      suggestedQuestions: ['Help me understand the risks of investing in gold', 'How much did I spend this month?'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 13. LIABILITIES, LOANS & EMIs
  // -----------------------------------------------------------------
  const mentionsLiability = /\b(loan|loans|liability|liabilities|owe|debt|emi|emis)\b/i.test(lower);

  // 13a. Debt prioritization question: "What should I prioritize: paying my loan or building my emergency fund?"
  if (lower.includes('prioritize') || (lower.includes('loan') && lower.includes('emergency fund'))) {
    return {
      reply: `⚖️ **Financial Priority Framework: Emergency Fund vs. Loan Prepayment:**\n\n`
        + `1. **Step 1 — Mini Emergency Buffer (Highest Priority):**\n`
        + `   Before aggressively prepaying debt, build a foundational safety net of **1–2 months of living expenses (~₹30,000–₹50,000)**. Without this, any medical emergency or car breakdown forces you back into expensive borrowing.\n\n`
        + `2. **Step 2 — Attack High-Interest Toxic Debt:**\n`
        + `   If you carry credit card balances (>36% APR) or personal loans (>12%–16% APR), eliminate them immediately using the **Debt Avalanche** method. No investment reliably beats a guaranteed 14%+ cost of capital.\n\n`
        + `3. **Step 3 — Balanced Wealth Building for Low-Interest Loans:**\n`
        + `   For secured home or auto loans (~8.5%–9%), continue your regular EMIs while systematically building your full 6-month emergency reserve and mutual fund investments.`,
      suggestedQuestions: ['How much do I owe on my recorded loans?', 'What bills are coming up?', 'Check my budget'],
      pendingTransaction: null,
    };
  }

  // 13b. Loan query: "How much do I owe on my recorded loans?"
  if (mentionsLiability && (lower.includes('how much') || lower.includes('owe') || lower.includes('show') || lower.includes('list'))) {
    if (ctx.liabilities.length === 0) {
      return {
        reply: `You have no recorded loans or liabilities in FinMan. That is fantastic for your debt-to-income ratio!`,
        suggestedQuestions: ['Record my monthly EMI of ₹12,000', 'What bills are coming up?'],
        pendingTransaction: null,
      };
    }

    const totalRemainingDebt = ctx.liabilities.reduce((sum, l) => sum + Number(l.remaining_amount || 0), 0);
    const loanLines = ctx.liabilities.map((l) =>
      `• **${l.name}** (${l.liability_type}): Remaining **${formatCurrency(l.remaining_amount)}** of ${formatCurrency(l.total_amount)} @ ${l.interest_rate}% interest`
    ).join('\n');

    return {
      reply: `💳 **Your Recorded Loans & Outstanding Liabilities:**\n\n${loanLines}\n\n**Total Outstanding Debt:** **${formatCurrency(totalRemainingDebt)}**.`,
      suggestedQuestions: ['What should I prioritize: paying my loan or building my emergency fund?', 'What bills are coming up?'],
      pendingTransaction: null,
    };
  }

  // 13c. Record EMI / Recurring Payment / Liability: "Record my monthly EMI of ₹12,000"
  if ((lower.includes('record') || lower.includes('add')) && lower.includes('emi')) {
    const emiAmount = extractAmount(lower);
    if (emiAmount) {
      const pendingTx = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'recurring_payment',
        name: 'Monthly Loan EMI',
        amount: emiAmount,
        frequency: 'MONTHLY',
        nextDueDate: todayIso(),
        date: todayIso(),
        status: 'PENDING_CONFIRMATION',
      };

      const reply = `I can schedule that recurring EMI payment for you:\n\n`
        + `📋 **Recurring Payment Preview:**\n`
        + `• **Type:** Recurring EMI\n`
        + `• **Name:** Monthly Loan EMI\n`
        + `• **Amount:** ${formatCurrency(emiAmount)}\n`
        + `• **Frequency:** Monthly\n`
        + `• **Next Due Date:** ${todayIso()}\n\n`
        + `Should I add this recurring EMI to your schedule?`;

      return {
        reply,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: pendingTx,
      };
    }
  }

  // -----------------------------------------------------------------
  // 14. RECURRING SUBSCRIPTIONS & BILLS
  // -----------------------------------------------------------------
  if ((lower.includes('add') || lower.includes('record')) && (lower.includes('subscription') || lower.includes('recurring'))) {
    const subAmount = extractAmount(lower);
    if (subAmount) {
      let subName = 'Monthly Subscription';
      if (lower.includes('netflix')) subName = 'Netflix Subscription';
      else if (lower.includes('prime') || lower.includes('amazon')) subName = 'Amazon Prime';
      else if (lower.includes('spotify')) subName = 'Spotify';
      else if (lower.includes('gym')) subName = 'Gym Membership';

      const pendingTx = {
        id: `rec_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'recurring_payment',
        name: subName,
        amount: subAmount,
        frequency: lower.includes('year') ? 'YEARLY' : 'MONTHLY',
        nextDueDate: todayIso(),
        date: todayIso(),
        status: 'PENDING_CONFIRMATION',
      };

      const reply = `I've prepared this recurring subscription entry for you:\n\n`
        + `📋 **Recurring Payment Preview:**\n`
        + `• **Type:** Recurring Subscription\n`
        + `• **Name:** ${subName}\n`
        + `• **Amount:** ${formatCurrency(subAmount)}\n`
        + `• **Frequency:** ${pendingTx.frequency}\n`
        + `• **Next Due Date:** ${todayIso()}\n\n`
        + `Should I save this recurring subscription to your records?`;

      return {
        reply,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: pendingTx,
      };
    }
  }

  // -----------------------------------------------------------------
  // 15. BUDGET MANAGEMENT & UTILIZATION
  // -----------------------------------------------------------------
  const mentionsBudget = /\b(budget|budgets)\b/i.test(lower);

  // 15a. Category budget check / over-budget query:
  // "How much of my transport budget have I used?" / "Show the categories where I am over budget"
  if (mentionsBudget && (lower.includes('how much') || lower.includes('used') || lower.includes('over budget') || lower.includes('status') || lower.includes('show'))) {
    // Check for specific category request (e.g. transport)
    const targetCat = ctx.categories.find((c) => lower.includes(c.name.toLowerCase()));

    if (targetCat) {
      const budget = ctx.budgets.find((b) => Number(b.category_id) === Number(targetCat.category_id));
      const actualSpent = Number(ctx.monthComparison.currentCatMap[targetCat.name] || 0);

      if (budget) {
        const budgetAmt = Number(budget.budget_amount);
        const utilPct = budgetAmt > 0 ? Math.round((actualSpent / budgetAmt) * 100) : 0;
        const rem = budgetAmt - actualSpent;
        const overNotice = rem < 0 ? ` ⚠️ You have exceeded this budget by ${formatCurrency(Math.abs(rem))}!` : ` Remaining budget: **${formatCurrency(rem)}**.`;

        return {
          reply: `📊 **${targetCat.name} Budget Utilization for ${ctx.monthComparison.currentMonthName}:**\n\n`
            + `• **Budget Limit:** ${formatCurrency(budgetAmt)}\n`
            + `• **Actual Spent:** ${formatCurrency(actualSpent)}\n`
            + `• **Utilization:** **${utilPct}%** utilized.${overNotice}`,
          suggestedQuestions: ['Show the categories where I am over budget', 'Where am I spending the most?'],
          pendingTransaction: null,
        };
      } else {
        return {
          reply: `You do not have an active budget set for **${targetCat.name}** in ${ctx.monthComparison.currentMonthName}. Recorded spending in this category so far is **${formatCurrency(actualSpent)}**.\n\nWould you like me to create a budget for ${targetCat.name}?`,
          suggestedQuestions: [`Create a monthly ${targetCat.name.toLowerCase()} budget of ₹${Math.max(2000, actualSpent * 1.2)}`, 'Show my budget status'],
          pendingTransaction: null,
        };
      }
    }

    // Check for "where I am over budget"
    if (lower.includes('over budget') || lower.includes('exceeded')) {
      const overBudgetCats = [];
      ctx.budgets.forEach((b) => {
        const cat = ctx.categories.find((c) => c.category_id === b.category_id);
        const catName = cat ? cat.name : 'Category';
        const spent = Number(ctx.monthComparison.currentCatMap[catName] || 0);
        const limit = Number(b.budget_amount || 0);
        if (spent > limit) {
          overBudgetCats.push(`• **${catName}**: Spent ${formatCurrency(spent)} of ${formatCurrency(limit)} (Exceeded by **${formatCurrency(spent - limit)}**)`);
        }
      });

      if (overBudgetCats.length > 0) {
        return {
          reply: `⚠️ **Categories where you are over budget for ${ctx.monthComparison.currentMonthName}:**\n\n${overBudgetCats.join('\n')}\n\nConsider reviewing discretionary expenses in these categories to balance your cash flow.`,
          suggestedQuestions: ['Where am I spending the most?', 'How much did I spend this month?'],
          pendingTransaction: null,
        };
      } else {
        return {
          reply: `✅ **Great news!** You are currently **not over budget** in any of your active budget categories for ${ctx.monthComparison.currentMonthName}.`,
          suggestedQuestions: ['Show my budget status', 'Where am I spending the most?'],
          pendingTransaction: null,
        };
      }
    }

    // General budget overview
    if (ctx.budgets.length === 0) {
      return {
        reply: `You haven't set any budgets for ${ctx.monthComparison.currentMonthName} yet. Setting category budgets helps you track spending discipline!`,
        suggestedQuestions: ['Create a monthly food budget of ₹6,000', 'Create a monthly transport budget of ₹3,000'],
        pendingTransaction: null,
      };
    }

    const lines = ctx.budgets.map((b) => {
      const cat = ctx.categories.find((c) => c.category_id === b.category_id);
      const catName = cat ? cat.name : 'Category';
      const spent = Number(ctx.monthComparison.currentCatMap[catName] || 0);
      const limit = Number(b.budget_amount || 0);
      const pct = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      return `• **${catName}**: ${formatCurrency(spent)} / ${formatCurrency(limit)} (${pct}%)`;
    }).join('\n');

    return {
      reply: `📊 **Active Category Budgets for ${ctx.monthComparison.currentMonthName}:**\n\n${lines}`,
      suggestedQuestions: ['Where am I spending the most?', 'Show the categories where I am over budget'],
      pendingTransaction: null,
    };
  }

  // 15b. Budget Creation / Update:
  // "Create a monthly food budget of ₹6,000." / "Increase my shopping budget to ₹4,000."
  if ((lower.includes('create') || lower.includes('set') || lower.includes('increase') || lower.includes('make')) && mentionsBudget) {
    const budgetAmt = extractAmount(lower);
    const targetCat = matchCategory(lower, ctx.categories);

    if (budgetAmt && targetCat) {
      const pendingTx = {
        id: `bgt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'budget',
        categoryId: targetCat.category_id,
        category: targetCat.name,
        categoryName: targetCat.name,
        amount: budgetAmt,
        budgetAmount: budgetAmt,
        month: ctx.currentMonth,
        year: ctx.currentYear,
        priority: 'FLEXIBLE',
        status: 'PENDING_CONFIRMATION',
      };

      const reply = `I've prepared this budget entry for you:\n\n`
        + `📋 **Budget Confirmation Preview:**\n`
        + `• **Type:** Monthly Budget\n`
        + `• **Category:** ${targetCat.name}\n`
        + `• **Limit:** ${formatCurrency(budgetAmt)}\n`
        + `• **Period:** ${ctx.monthComparison.currentMonthName} ${ctx.currentYear}\n`
        + `• **Priority:** Flexible\n\n`
        + `Should I save this ${targetCat.name} budget to your FinMan records?`;

      return {
        reply,
        suggestedQuestions: ['Confirm and Add', 'Cancel'],
        pendingTransaction: pendingTx,
      };
    }
  }

  // -----------------------------------------------------------------
  // 16. SMART CALENDAR & FINANCIAL SCHEDULE
  // -----------------------------------------------------------------
  if (lower.includes('calendar') || lower.includes('financial schedule') || lower.includes('events scheduled')) {
    if (ctx.upcomingBills.length === 0) {
      return {
        reply: `You currently have no scheduled bills or financial events in your Smart Calendar for this month.`,
        suggestedQuestions: ['Add a recurring subscription of ₹499 per month', 'What bills are coming up?'],
        pendingTransaction: null,
      };
    }

    const eventList = ctx.upcomingBills.slice(0, 6).map((b) =>
      `• **${b.title}**: ${formatCurrency(b.amount)} on ${b.event_date}`
    ).join('\n');

    return {
      reply: `📅 **Your Upcoming Financial Schedule:**\n\n${eventList}`,
      suggestedQuestions: ['Can I afford a phone worth ₹25,000?', 'How much have I spent this month?'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 17. MONTH-OVER-MONTH COMPARISON
  // "Compare this month with last month and explain what changed."
  // -----------------------------------------------------------------
  if (lower.includes('compare') && (lower.includes('last month') || lower.includes('previous month') || lower.includes('changed'))) {
    const curExp = Number(ctx.summary.totalExpenses || 0);
    const prevExp = ctx.incomeData.prevMonthExpenseTotal;
    const diffExp = curExp - prevExp;

    const curInc = Number(ctx.summary.totalIncome || 0);
    const prevInc = ctx.incomeData.prevMonthTotal;
    const diffInc = curInc - prevInc;

    const expText = diffExp > 0
      ? `Expenses have **increased by ${formatCurrency(diffExp)}** compared to ${ctx.monthComparison.prevMonthName}`
      : `Expenses have **decreased by ${formatCurrency(Math.abs(diffExp))}** compared to ${ctx.monthComparison.prevMonthName}`;

    return {
      reply: `📊 **Financial Comparison (${ctx.monthComparison.currentMonthName} vs. ${ctx.monthComparison.prevMonthName}):**\n\n`
        + `• **Income:** ${formatCurrency(curInc)} vs. ${formatCurrency(prevInc)} (${diffInc >= 0 ? '+' : ''}${formatCurrency(diffInc)})\n`
        + `• **Expenses:** ${formatCurrency(curExp)} vs. ${formatCurrency(prevExp)}\n`
        + `• **Net Spending Shift:** ${expText}.\n`
        + `• **Current Period Savings:** ${formatCurrency(ctx.summary.periodSavings)} (Deficit: ${formatCurrency(ctx.summary.deficit)}).\n\n`
        + `Top spending category this month remains **${Object.entries(ctx.monthComparison.currentCatMap).sort((a,b)=>b[1]-a[1])[0]?.[0] || 'Discretionary'}**.`,
      suggestedQuestions: ['Where am I spending the most?', 'How much did I spend this month?'],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 18. CONVERSATIONAL TRANSACTION CREATION (Income & Expense)
  // -----------------------------------------------------------------
  const isAddCommand = /\b(add|record|spent|spend|bought|paid|received|credit|deposit|put|log)\b/i.test(lower);
  const detectedAmount = extractAmount(lower);

  // Check for "Add my salary" or "Add salary" without explicit amount
  const isAddSalaryNoAmount = /^(?:(?:hey|hi)?\s*(?:bro|da)?\s*,?\s*)?(?:can you\s+)?(?:add|record|put|log)\s+(?:my\s+)?salary[\s!.]*$/i.test(lower);
  if (isAddSalaryNoAmount && !detectedAmount) {
    const profileSalary = Number(ctx.user?.monthly_income || 0);
    if (profileSalary > 0) {
      const pendingTx = {
        id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        type: 'income',
        amount: profileSalary,
        source: 'Salary',
        date: todayIso(),
        description: 'Monthly salary deposit',
        status: 'PENDING_CONFIRMATION',
      };
      const reply = `I've prepared your monthly salary entry of **${formatCurrency(profileSalary)}** based on your verified profile:\n\n`
        + `📋 **Income Confirmation Preview:**\n`
        + `• **Type:** Income\n`
        + `• **Source:** Salary\n`
        + `• **Amount:** ${formatCurrency(profileSalary)}\n`
        + `• **Date:** ${todayIso()}\n`
        + `• **Description:** Monthly salary deposit\n\n`
        + `Should I add this salary to your FinMan records?`;

      return {
        reply,
        suggestedQuestions: ['Confirm and Add', 'Change it to ₹80,000', 'Cancel'],
        pendingTransaction: pendingTx,
      };
    } else {
      return {
        reply: `Sure! How much was your salary deposit? (For example, say: *"Add my salary of ₹50,000"* or *"Salary 60,000"*).`,
        suggestedQuestions: ['Add my salary of ₹50,000', 'Add my salary of ₹75,000', 'Cancel'],
        pendingTransaction: null,
      };
    }
  }

  // Check for ambiguous request: "Add 500" or "Record 1000" without specifying income or expense
  const isAmbiguousNumberOnly = /^(?:bro\s*,?\s*)?(?:add|record|put|log)\s*(?:₹|rs\.?|inr)?\s*\d+(?:\.\d+)?\s*$/i.test(lower);
  if (isAmbiguousNumberOnly && detectedAmount) {
    return {
      reply: `Should I record ₹${detectedAmount} as income or an expense?`,
      suggestedQuestions: [
        `Record ₹${detectedAmount} as Expense`,
        `Record ₹${detectedAmount} as Income`,
        'Cancel',
      ],
      pendingTransaction: null,
    };
  }

  // Check for Income Intent: "can you add my salary of 10,000?", "received 5000 freelance"
  const isIncomeIntent = detectedAmount && (
    lower.includes('salary') ||
    lower.includes('received') ||
    lower.includes('earned') ||
    lower.includes('income') ||
    lower.includes('got paid') ||
    lower.includes('stipend') ||
    lower.includes('credit of') ||
    (isAddCommand && lower.includes('as income'))
  );

  if (isIncomeIntent) {
    const source = matchIncomeSource(lower);
    const date = extractDate(lower);
    const description = lower.includes('salary') ? 'Monthly salary' : (text.length > 25 ? text : `${source} payment`);

    const pendingTx = {
      id: `inc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'income',
      amount: detectedAmount,
      source,
      date,
      description,
      status: 'PENDING_CONFIRMATION',
    };

    const reply = `I've prepared this income entry for you:\n\n`
      + `📋 **Income Confirmation Preview:**\n`
      + `• **Type:** Income\n`
      + `• **Source:** ${source}\n`
      + `• **Amount:** ${formatCurrency(detectedAmount)}\n`
      + `• **Date:** ${date}\n`
      + `• **Description:** ${description}\n\n`
      + `Should I add this income to your FinMan records?`;

    return {
      reply,
      suggestedQuestions: ['Confirm and Add', 'Change it to ₹100', 'Cancel'],
      pendingTransaction: pendingTx,
    };
  }

  // Check for Expense Intent: "I spent 50 on tea today", "paid 200 for petrol", "bought shirt for 1500"
  const isExpenseIntent = detectedAmount && (
    lower.includes('spent') ||
    lower.includes('spend') ||
    lower.includes('bought') ||
    lower.includes('paid') ||
    lower.includes('cost') ||
    lower.includes('tea') ||
    lower.includes('chai') ||
    lower.includes('coffee') ||
    lower.includes('lunch') ||
    lower.includes('dinner') ||
    lower.includes('petrol') ||
    lower.includes('recharge') ||
    lower.includes('expense') ||
    (isAddCommand && lower.includes('as expense'))
  );

  if (isExpenseIntent) {
    const categoryObj = matchCategory(lower, ctx.categories);
    const date = extractDate(lower);
    const paymentMode = matchPaymentMode(lower);

    let merchantName = 'Expense';
    if (lower.includes('tea') || lower.includes('chai')) merchantName = 'Tea / Snacks';
    else if (lower.includes('coffee')) merchantName = 'Coffee Shop';
    else if (lower.includes('petrol') || lower.includes('fuel')) merchantName = 'Fuel Station';
    else if (lower.includes('lunch') || lower.includes('dinner') || lower.includes('restaurant')) merchantName = 'Restaurant / Dining';
    else if (lower.includes('grocery') || lower.includes('supermarket')) merchantName = 'Supermarket';
    else if (lower.includes('uber') || lower.includes('ola')) merchantName = 'Cab Service';
    else merchantName = categoryObj.name;

    const description = text.length > 30 ? text.substring(0, 100) : merchantName;

    const pendingTx = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      type: 'expense',
      amount: detectedAmount,
      categoryId: categoryObj.category_id,
      category: categoryObj.name,
      merchantName,
      date,
      paymentMode,
      description,
      status: 'PENDING_CONFIRMATION',
    };

    const reply = `I can record that for you.\n\n`
      + `📋 **Expense Confirmation Preview:**\n`
      + `• **Type:** Expense\n`
      + `• **Amount:** ${formatCurrency(detectedAmount)}\n`
      + `• **Category:** ${categoryObj.name}\n`
      + `• **Date:** ${date}\n`
      + `• **Payment Method:** ${paymentMode}\n`
      + `• **Description:** ${description}\n\n`
      + `Should I add this expense to your FinMan records?`;

    return {
      reply,
      suggestedQuestions: ['Confirm and Add', 'Change it to ₹100', 'Cancel'],
      pendingTransaction: pendingTx,
    };
  }

  // -----------------------------------------------------------------
  // 19. PERIOD QUERIES & PREVIOUS MONTH FOLLOW-UPS
  // -----------------------------------------------------------------
  const mentionsLastMonth = lower.includes('last month') || lower.includes('previous month');
  const mentionsSpending = lower.includes('spend') || lower.includes('spent') || lower.includes('expense');
  const mentionsIncome = lower.includes('income') || lower.includes('salary') || lower.includes('earn');

  if (mentionsLastMonth) {
    if (mentionsSpending && !mentionsIncome) {
      const prevExp = ctx.incomeData.prevMonthExpenseTotal;
      return {
        reply: `In ${ctx.monthComparison.prevMonthName}, your total recorded expenses were **${formatCurrency(prevExp)}**.`,
        suggestedQuestions: ['How much did I spend this month?', 'Where am I spending the most?'],
      };
    }

    if (mentionsIncome && !mentionsSpending) {
      const prevInc = ctx.incomeData.prevMonthTotal;
      const prevSal = ctx.incomeData.prevMonthSalary;
      const salNote = prevSal > 0 ? ` (including ${formatCurrency(prevSal)} in salary deposits)` : '';
      return {
        reply: `In ${ctx.monthComparison.prevMonthName}, you received a total of **${formatCurrency(prevInc)}** in income${salNote}.`,
        suggestedQuestions: ['How much did I spend last month?', 'How much income did I receive this month?'],
      };
    }

    if (lastUserTurn.includes('income') || lastUserTurn.includes('earn') || lastUserTurn.includes('salary')) {
      const prevInc = ctx.incomeData.prevMonthTotal;
      const prevSal = ctx.incomeData.prevMonthSalary;
      const salNote = prevSal > 0 ? ` (including ${formatCurrency(prevSal)} in salary deposits)` : '';
      return {
        reply: `In ${ctx.monthComparison.prevMonthName}, you received a total of **${formatCurrency(prevInc)}** in income${salNote}.`,
        suggestedQuestions: ['How much have I spent this month?', 'Where am I spending the most?'],
      };
    }

    const prevExp = ctx.incomeData.prevMonthExpenseTotal;
    return {
      reply: `In ${ctx.monthComparison.prevMonthName}, your total recorded expenses were **${formatCurrency(prevExp)}**.`,
      suggestedQuestions: ['Why is my spending higher than last month?', 'Where am I spending the most?'],
    };
  }

  // -----------------------------------------------------------------
  // 20. INCOME QUERIES
  // -----------------------------------------------------------------
  if (lower.includes('salary') && (lower.includes('last month') || lower.includes('previous month'))) {
    const sal = ctx.incomeData.prevMonthSalary;
    if (sal > 0) {
      return {
        reply: `Last month (${ctx.monthComparison.prevMonthName}), you received **${formatCurrency(sal)}** in salary income.`,
        suggestedQuestions: ['How much income did I receive this month?', 'How much have I spent this month?'],
      };
    }
    return {
      reply: `No salary deposits were recorded in your income ledger for ${ctx.monthComparison.prevMonthName}. Total recorded income for that month was ${formatCurrency(ctx.incomeData.prevMonthTotal)}.`,
      suggestedQuestions: ['How much income did I receive this month?', 'Add income'],
    };
  }

  if (lower.includes('income') || lower.includes('how much salary') || lower.includes('how much did i earn')) {
    const inc = ctx.incomeData.currentMonthTotal;
    const count = ctx.incomeData.currentMonthCount;
    return {
      reply: `For ${ctx.monthComparison.currentMonthName}, you have received a total income of **${formatCurrency(inc)}** across ${count} recorded deposit${count === 1 ? '' : 's'}.`,
      suggestedQuestions: ['How much salary did I receive last month?', 'How much have I spent this month?', 'Where am I spending the most?'],
    };
  }

  // -----------------------------------------------------------------
  // 21. POLITE CLOSING
  // -----------------------------------------------------------------
  const isPolite = /^(thanks?|thank you|cheers|great|awesome|perfect|ok|okay|got it|cool|nice)[\s!.]*$/i.test(lower);
  if (isPolite) {
    const friendPrefix = usesBro ? ', bro' : (usesDa ? ', da' : '');
    return {
      reply: `You're very welcome${friendPrefix}! Feel free to ask anytime or let me know if you want to record an expense, set a budget, or plan your goals.`,
      suggestedQuestions: ['Show my budget status', 'What bills are coming up?', 'How can I save more money?'],
    };
  }

  // -----------------------------------------------------------------
  // 22. AFFORDABILITY ANALYSIS
  // -----------------------------------------------------------------
  if (lower.includes('afford') || lower.includes('can i buy') || lower.includes('can i purchase')) {
    const requestedAmount = extractAmount(lower);
    const surplus = Number(ctx.summary.totalSavings || 0);
    const deficit = Number(ctx.summary.deficit || 0);
    const monthlyIncome = Number(ctx.summary.totalIncome || 0);
    const totalExpenses = Number(ctx.summary.totalExpenses || 0);
    const upcomingTotal = ctx.upcomingBills.reduce((acc, b) => acc + Number(b.amount || 0), 0);

    if (!requestedAmount) {
      return {
        reply: `To check if you can afford a purchase, please specify the item and price (for example: "Can I afford a phone worth ₹25,000?"). I will evaluate your monthly surplus, upcoming obligations, and budget commitments.`,
        suggestedQuestions: ['Can I afford a phone worth ₹25,000?', 'Can I buy a laptop for ₹50,000?'],
      };
    }

    const netFreeCash = Math.max(0, surplus - upcomingTotal);

    let reply = '';
    if (deficit > 0) {
      reply = `⚠️ **Affordability Analysis for ${formatCurrency(requestedAmount)}:**\n\n`
        + `• **Current Financial Position:** You are currently in a recorded deficit of **${formatCurrency(deficit)}** this month (Expenses: ${formatCurrency(totalExpenses)} vs Income: ${formatCurrency(monthlyIncome)}).\n`
        + `• **Upcoming Obligations:** You have **${formatCurrency(upcomingTotal)}** in upcoming bills and EMIs scheduled.\n\n`
        + `**Recommendation:** Purchasing this item upfront is **not recommended** right now, as it would deepen your deficit to **${formatCurrency(deficit + requestedAmount)}**. If this purchase is essential, consider waiting until next month's income or exploring a zero-interest EMI of around **${formatCurrency(Math.ceil(requestedAmount / 6))}/mo** once your cash flow stabilizes.`;
    } else if (netFreeCash >= requestedAmount) {
      reply = `✅ **Affordability Analysis for ${formatCurrency(requestedAmount)}:**\n\n`
        + `• **Monthly Income:** ${formatCurrency(monthlyIncome)}\n`
        + `• **Current Expenses:** ${formatCurrency(totalExpenses)}\n`
        + `• **Remaining Unallocated Surplus:** ${formatCurrency(surplus)}\n`
        + `• **Upcoming Bills & EMIs:** ${formatCurrency(upcomingTotal)}\n`
        + `• **Net Free Cash Flow:** **${formatCurrency(netFreeCash)}**\n\n`
        + `**Verdict:** You can **comfortably afford** this purchase upfront! Even after spending ${formatCurrency(requestedAmount)}, you will retain a buffer of **${formatCurrency(netFreeCash - requestedAmount)}** for the remainder of this month without compromising your upcoming obligations.`;
    } else {
      const emi3 = Math.ceil(requestedAmount / 3);
      reply = `⚖️ **Affordability Analysis for ${formatCurrency(requestedAmount)}:**\n\n`
        + `• **Monthly Surplus:** ${formatCurrency(surplus)}\n`
        + `• **Upcoming Bills & EMIs:** ${formatCurrency(upcomingTotal)}\n`
        + `• **Net Free Buffer:** **${formatCurrency(netFreeCash)}**\n\n`
        + `**Verdict:** Buying this upfront would leave you with a deficit of **${formatCurrency(requestedAmount - netFreeCash)}** after accounting for upcoming bills.\n\n`
        + `**Recommended Options:**\n`
        + `1. **3-Month No-Cost EMI:** At **${formatCurrency(emi3)}/month**, this fits within your projected monthly surplus.\n`
        + `2. **Save for 2 months:** Setting aside ${formatCurrency(Math.ceil(requestedAmount / 2))} over the next two months will let you buy it with zero debt stress.`;
    }

    return {
      reply,
      suggestedQuestions: ['How much can I safely save this month?', 'What bills are coming up?', 'Where am I spending the most?'],
    };
  }

  // -----------------------------------------------------------------
  // 23. WHERE AM I SPENDING THE MOST
  // -----------------------------------------------------------------
  if (lower.includes('spending the most') || lower.includes('spending too much') || lower.includes('where am i spending') || lower.includes('top category')) {
    const sortedCats = Object.entries(ctx.monthComparison.currentCatMap).sort((a, b) => b[1] - a[1]);
    if (sortedCats.length === 0) {
      return {
        reply: `You haven't recorded any expenses in ${ctx.monthComparison.currentMonthName} yet. Once you add transactions, I will analyze your top spending areas!`,
        suggestedQuestions: ['I spent ₹50 on tea today', 'How much income did I receive this month?'],
      };
    }

    const topList = sortedCats.slice(0, 4).map(([cat, amt]) => `• **${cat}**: ${formatCurrency(amt)}`).join('\n');
    const largest = sortedCats[0];

    const reply = `📊 **Top Spending Categories for ${ctx.monthComparison.currentMonthName}:**\n\n`
      + `You are spending the most on **${largest[0]}** (${formatCurrency(largest[1])}).\n\n`
      + `**Full Breakdown:**\n${topList}\n\n`
      + `Reviewing discretionary purchases in **${largest[0]}** is the fastest way to increase your monthly savings rate.`;

    return {
      reply,
      suggestedQuestions: ['How much have I spent on small purchases?', 'Can I afford a phone worth ₹25,000?', 'Check my budget'],
    };
  }

  // -----------------------------------------------------------------
  // 24. TOTAL EXPENSES THIS MONTH
  // -----------------------------------------------------------------
  if (lower.includes('spent this month') || lower.includes('spent so far') || (lower.includes('how much') && lower.includes('spend'))) {
    const curExpenses = Number(ctx.summary.totalExpenses || 0);
    const curIncome = Number(ctx.summary.totalIncome || 0);
    const deficit = Number(ctx.summary.deficit || 0);

    const sortedCats = Object.entries(ctx.monthComparison.currentCatMap).sort((a, b) => b[1] - a[1]);
    const topCat = sortedCats[0];
    const topText = topCat ? ` Your largest expense category is **${topCat[0]}** at ${formatCurrency(topCat[1])}.` : '';

    let balanceText = '';
    if (deficit > 0) {
      balanceText = ` ⚠️ Note: Your expenses exceed recorded income by ${formatCurrency(deficit)}.`;
    } else if (curIncome > 0) {
      balanceText = ` This represents ${Math.round((curExpenses / curIncome) * 100)}% of your recorded income.`;
    }

    const reply = `You have recorded **${formatCurrency(curExpenses)}** in expenses for ${ctx.monthComparison.currentMonthName}.${topText}${balanceText}`;
    return {
      reply,
      suggestedQuestions: ['Where am I spending the most?', 'What bills are coming up?', 'How much have I spent on small purchases?'],
    };
  }

  // -----------------------------------------------------------------
  // 25. RECURRING MICRO-SPENDING
  // -----------------------------------------------------------------
  if (lower.includes('small purchase') || lower.includes('micro') || lower.includes('recurring small')) {
    const micro = ctx.microSpending;
    if (micro.count === 0) {
      return {
        reply: `You haven't recorded any micro-expenses (purchases under ₹250) this month. Remember, small unrecorded spends like chai, coffee, and auto fares often accumulate quietly!`,
        suggestedQuestions: ['I spent ₹50 on tea today', 'How much have I spent this month?'],
      };
    }

    const topCats = Object.entries(micro.categories)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `• **${cat}**: ${formatCurrency(amt)}`)
      .join('\n');

    const annualized = micro.total * 12;

    const reply = `☕ **Micro-Spending Summary for This Month (≤ ₹250):**\n\n`
      + `• You recorded **${micro.count} small purchases** totaling **${formatCurrency(micro.total)}** (average ${formatCurrency(Math.round(micro.total / micro.count))} per purchase).\n`
      + `• **Top Contributing Categories:**\n${topCats}\n\n`
      + `💡 **Cumulative Effect:** At this pace, small daily purchases total **${formatCurrency(annualized)} per year**. Setting a weekly cap of **${formatCurrency(Math.ceil((micro.total * 0.8) / 4))}** could easily redirect **${formatCurrency(Math.round(annualized * 0.2))}** into your savings goals!`;

    return {
      reply,
      suggestedQuestions: ['Where am I spending the most?', 'How much can I safely save this month?'],
    };
  }

  // -----------------------------------------------------------------
  // 26. UPCOMING BILLS & EMIs
  // -----------------------------------------------------------------
  if (lower.includes('bill') || lower.includes('upcoming') || lower.includes('due')) {
    if (ctx.upcomingBills.length === 0) {
      return {
        reply: `You have no upcoming bills or EMIs scheduled in the smart calendar. You can add recurring payments on the Smart Calendar page.`,
        suggestedQuestions: ['Can I afford a new purchase?', 'How much income did I receive this month?'],
      };
    }

    const list = ctx.upcomingBills.slice(0, 5).map((b) =>
      `• **${b.title}**: ${formatCurrency(b.amount)} due on ${new Date(b.event_date).toLocaleDateString('en-IN')}`
    ).join('\n');
    const totalDue = ctx.upcomingBills.reduce((acc, b) => acc + Number(b.amount || 0), 0);

    const reply = `📅 **Upcoming Scheduled Bills & Obligations:**\n\n${list}\n\n**Total Due:** **${formatCurrency(totalDue)}**. Ensure your account balance covers these payments to avoid penalties.`;
    return {
      reply,
      suggestedQuestions: ['Can I afford a phone worth ₹25,000?', 'How much have I spent this month?'],
    };
  }

  // -----------------------------------------------------------------
  // 27. FINANCIAL HEALTH SCORE
  // -----------------------------------------------------------------
  if (lower.includes('health') || lower.includes('score')) {
    const hs = ctx.summary.financialHealthScore;
    if (hs == null) {
      return {
        reply: `There is not enough recorded data to calculate your financial health score yet. Add your income, expenses, and asset holdings to activate it!`,
        suggestedQuestions: ['I spent ₹50 on tea today', 'Add my salary of ₹10,000'],
      };
    }
    const grade = hs >= 80 ? 'Excellent 🌟' : hs >= 60 ? 'Good 👍' : hs >= 40 ? 'Fair ⚠️' : 'Needs Attention 🚨';
    const reply = `Your financial health score is **${hs}/100 — ${grade}**.\n\nThis score evaluates your Savings Rate, Budget Discipline, Debt-to-Income, Emergency Buffer, and Investment Diversity. Visit the Financial Health page for your complete report!`;
    return {
      reply,
      suggestedQuestions: ['Where am I spending the most?', 'How can I save more money?'],
    };
  }

  // -----------------------------------------------------------------
  // 28. NARRATIVE FINANCIAL PLANNING, HOME CONSTRUCTION & GOAL ROADMAPS
  // -----------------------------------------------------------------
  const mentionsHomeBuilding = /\b(home|house|plot|property|flat|apartment|villa|construction|build\s+(?:a\s+)?(?:home|house|property)|building)\b/i.test(lower);
  const mentionsPlanning = /\b(plan|planning|roadmap|strategy|how\s+should\s+i\s+plan|good\s+time\s+to\s+build|advice|guide|guidance|over\s+the\s+next\s+year|next\s+year)\b/i.test(lower);
  const mentionsVehicle = /\b(car|bike|vehicle|automobile|ev|scooter)\b/i.test(lower) && /\b(buy|purchase|plan|afford|worth)\b/i.test(lower);
  const mentionsGeneralPlanning = /\b(how\s+should\s+i\s+plan|financial\s+plan|plan\s+over\s+the\s+next\s+year|plan\s+for\s+next\s+year|yearly\s+plan|annual\s+plan)\b/i.test(lower);

  if (mentionsHomeBuilding || (mentionsVehicle && !isAddCommand) || mentionsGeneralPlanning) {
    const targetAmount = extractAmount(lower);
    const profileIncome = Number(ctx.user?.monthly_income || 0);
    const recordedIncome = Number(ctx.summary.totalIncome || 0);
    const effectiveIncome = profileIncome > 0 ? profileIncome : recordedIncome;
    const monthlyExpenses = Number(ctx.summary.totalExpenses || 0);
    const surplus = Number(ctx.summary.totalSavings || 0);
    const upcomingBillsTotal = ctx.upcomingBills.reduce((acc, b) => acc + Number(b.amount || 0), 0);

    if (mentionsHomeBuilding) {
      const projectCost = targetAmount || 10000000;
      const downPaymentPct = 0.20;
      const downPaymentAmt = projectCost * downPaymentPct;
      const bufferPct = 0.12;
      const contingencyAmt = projectCost * bufferPct;
      const selfFundNeeded = downPaymentAmt + contingencyAmt;
      const loanAmount = projectCost * (1 - downPaymentPct);
      const interestRate = 8.5;
      const tenureYears = 20;
      const monthlyEmi = calculateLoanEmi(loanAmount, interestRate, tenureYears);
      const minRequiredGrossIncome = Math.round(monthlyEmi / 0.45);

      let incomeGroundedSection = '';
      if (effectiveIncome > 0) {
        const dti = Math.round((monthlyEmi / effectiveIncome) * 100);
        if (dti <= 45) {
          incomeGroundedSection = `• **Grounded Profile Income:** ${formatCurrency(effectiveIncome)}/month. Your projected EMI represents **${dti}% of your monthly income**, which is within the safe banking eligibility limit (≤ 45–50% DTI).\n`
            + `• **Current Monthly Surplus:** ${formatCurrency(surplus)} (Expenses: ${formatCurrency(monthlyExpenses)}, Scheduled Bills: ${formatCurrency(upcomingBillsTotal)}).\n\n`;
        } else {
          incomeGroundedSection = `• **Grounded Profile Income:** ${formatCurrency(effectiveIncome)}/month. The projected EMI represents **${dti}% of your income**, which exceeds the recommended 45% DTI threshold. To comfortably qualify, consider including a co-borrower or increasing your down payment.\n`
            + `• **Current Monthly Surplus:** ${formatCurrency(surplus)}.\n\n`;
        }
      } else {
        incomeGroundedSection = `• **Income Grounding Note:** Your FinMan profile does not yet have a recorded monthly take-home salary. Indian lenders require total EMIs to stay under 40%–50% of verified net income, meaning a household net take-home of approximately **${formatCurrency(minRequiredGrossIncome)}/month** is typically required for an ${formatCurrency(loanAmount)} home loan.\n\n`;
      }

      const reply = `🏡 **Home Construction & Financial Plan for ${formatCurrency(projectCost)}:**\n\n`
        + `### 1. Market Timing & Feasibility ("Is it a good time to build?")\n`
        + `• **Raw Material Dynamics:** Construction input costs have normalized. Building in the coming year provides predictable per-square-foot costing (~₹1,800 to ₹2,500/sq.ft).\n`
        + `• **Interest Rate Cycle:** Home loan interest rates are currently stabilized in the **8.40% – 8.75% range**.\n`
        + `• **Seasonal Timing:** Begin architectural blueprints and municipal permits now so foundation work begins right after monsoon.\n\n`
        + `### 2. Capital Architecture\n`
        + `• **Self-Funded Down Payment (20%):** **${formatCurrency(downPaymentAmt)}**\n`
        + `• **Contingency Buffer (12%):** **${formatCurrency(contingencyAmt)}**\n`
        + `• **Total Self-Contribution Target:** **${formatCurrency(selfFundNeeded)}**\n`
        + `• **Estimated Home Construction Loan (80%):** **${formatCurrency(loanAmount)}** at ~${interestRate}% for ${tenureYears} years\n`
        + `• **Estimated Monthly EMI:** **${formatCurrency(monthlyEmi)}/month**\n\n`
        + `### 3. Your Financial Position\n`
        + incomeGroundedSection
        + `### 4. 12-Month Phased Action Roadmap\n`
        + `• **Q1 (Months 1–3):** Finalize architectural drawings and Panchayat/Municipal sanctions.\n`
        + `• **Q2 (Months 4–6):** Park your ${formatCurrency(selfFundNeeded)} self-contribution in liquid instruments; secure bank sanction.\n`
        + `• **Q3 (Months 7–9):** Contractor milestone agreements (plinth, slab, brickwork).\n`
        + `• **Q4 (Months 10–12):** Stage-completion disbursements and finishing.\n\n`
        + `💡 **Next Step:** Would you like me to set up a dedicated **Home Construction Project Workspace** to track your target budget of ${formatCurrency(projectCost)}?`;

      return {
        reply,
        suggestedQuestions: [
          'Create a home construction project with a target cost of ₹1 crore',
          'Create the project too',
          'Can I afford a loan EMI?',
          'Check my budget',
        ],
        pendingTransaction: null,
      };
    }

    if (mentionsVehicle) {
      const vehicleCost = targetAmount || 1500000;
      const downPaymentAmt = vehicleCost * 0.20;
      const loanAmount = vehicleCost * 0.80;
      const carEmi = calculateLoanEmi(loanAmount, 9.2, 5);

      const reply = `🚗 **Vehicle Purchase Financial Plan for ${formatCurrency(vehicleCost)}:**\n\n`
        + `• **Down Payment Target (20%):** **${formatCurrency(downPaymentAmt)}**\n`
        + `• **Estimated Auto Loan (80%):** **${formatCurrency(loanAmount)}** over 5 years @ ~9.2% p.a.\n`
        + `• **Estimated Monthly EMI:** **${formatCurrency(carEmi)}/month**\n`
        + `• **Operating Cost Buffer (Fuel, Insurance, Maintenance):** Plan an additional **₹6,000–₹8,000/month**.\n\n`
        + `**Recommendation (20/4/10 Rule):** Ensure your down payment is at least 20%, loan tenure is ≤ 4–5 years, and total monthly transportation costs (EMI + fuel) do not exceed 10%–15% of your monthly take-home salary.\n\n`
        + `💡 Would you like me to create a **Savings Goal** or **Project Workspace** for this purchase?`;

      return {
        reply,
        suggestedQuestions: [
          `Create a savings goal of ${formatCurrency(downPaymentAmt)} for vehicle down payment`,
          `Can I afford a purchase of ${formatCurrency(vehicleCost)}?`,
          'Where am I spending the most?',
        ],
        pendingTransaction: null,
      };
    }

    const reply = `📈 **12-Month Financial Roadmap & Strategy:**\n\n`
      + `• **Step 1: Emergency Reserve (Months 1–3):** Maintain an emergency fund covering 3–6 months of basic living expenses (${formatCurrency((monthlyExpenses || 30000) * 3)} to ${formatCurrency((monthlyExpenses || 30000) * 6)}) in accessible deposits.\n`
      + `• **Step 2: 50/30/20 Budget Discipline (Months 4–6):** Allocate 50% of monthly income to needs, 30% to discretionary spends, and a minimum 20% to structured savings/investments.\n`
      + `• **Step 3: High-Interest Debt Elimination (Months 7–9):** Prioritize paying off credit cards or personal loans carrying interest rates > 12%.\n`
      + `• **Step 4: Goal-Oriented Wealth Accumulation (Months 10–12):** Deploy systematic monthly investments aligned with your medium-term and long-term milestones.`;

    return {
      reply,
      suggestedQuestions: [
        'How much did I spend this month?',
        'Where am I spending the most?',
        'What bills are coming up?',
        'Check my budget',
      ],
      pendingTransaction: null,
    };
  }

  // -----------------------------------------------------------------
  // 29. FALLBACK / GENERAL FINANCIAL ASSISTANCE
  // -----------------------------------------------------------------
  const reply = `I am your FinMan Personal Finance Assistant, grounded in your real financial records.\n\nYou can ask me questions or command actions naturally:\n`
    + `• **Add Income:** "Bro, can you add my salary of ₹10,000?"\n`
    + `• **Add Expense:** "I spent ₹50 on tea today"\n`
    + `• **Budgets:** "Create a monthly food budget of ₹6,000"\n`
    + `• **Projects:** "Create a home construction project with a target cost of ₹1 crore"\n`
    + `• **Savings Goals:** "Create a savings goal of ₹5 lakh for my education by December 2027"\n`
    + `• **Investments:** "Record an investment of ₹15,000 in gold"\n`
    + `• **Spending Analysis:** "How much have I spent this month?" or "Where am I spending the most?"\n`
    + `• **Affordability:** "Can I afford a phone worth ₹25,000?"\n`
    + `• **Upcoming Bills:** "What bills are coming up?"\n\n`
    + `How can I help you right now?`;

  return {
    reply,
    suggestedQuestions: [
      'How much have I spent this month?',
      'Where am I spending the most?',
      'Show my budget status',
      'Show my project spending and remaining budget',
      'Can I afford a phone worth ₹25,000?',
    ],
  };
}

module.exports = {
  processChatMessage,
  getUserFullContext,
  executeConfirmTransaction,
  extractFinancialEntities,
  parseDayNarration,
  matchIncomeSource,
};

// bankTransactionService.js
// Business logic for statement parsing, duplicate detection, persistence, reconciliation, and posting to ledger.

const bankTransactionRepository = require('../repositories/bankTransactionRepository');
const bankStatementParser = require('./bankStatementParser');
const expenseService = require('./expenseService');
const incomeService = require('./incomeService');
const categoryRepository = require('../repositories/categoryRepository');

function notFound(message = 'Bank transaction not found') {
  const error = new Error(message);
  error.statusCode = 404;
  error.expose = true;
  return error;
}

function badRequest(message) {
  const error = new Error(message);
  error.statusCode = 400;
  error.expose = true;
  return error;
}

/**
 * Parses statement buffer, runs automated column mapping, validates rows,
 * and performs duplicate / existing match detection without persisting.
 */
async function previewStatement(userId, fileBuffer, filename, customMapping = null) {
  if (!fileBuffer || fileBuffer.length === 0) {
    throw badRequest('The uploaded bank statement file is empty.');
  }

  const { headers, dataRows, sheetName } = bankStatementParser.parseFileToRawRows(fileBuffer);
  const detectedMapping = bankStatementParser.detectColumns(headers);

  // Merge custom mapping from client if supplied
  const effectiveMapping = {
    ...detectedMapping,
    ...(customMapping || {}),
  };

  const normalizedRows = [];
  let validRowsCount = 0;
  let invalidRowsCount = 0;
  let duplicateCount = 0;
  let totalDebits = 0;
  let totalCredits = 0;

  const env = require('../config/env');
  const userCategories = await categoryRepository.findAllByUser(userId);

  for (let idx = 0; idx < dataRows.length; idx++) {
    const rawRow = dataRows[idx];
    const normalized = bankStatementParser.normalizeRow(rawRow, effectiveMapping, idx);

    if (normalized.isValid) {
      validRowsCount++;
      if (normalized.direction === 'DEBIT') {
        totalDebits += normalized.amount;

        // ML Category Classification
        let mlPrediction = null;
        try {
          if (env.aiServiceUrl) {
            const resp = await fetch(`${env.aiServiceUrl}/predict/category`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: normalized.description,
                merchant: normalized.description,
                amount: normalized.amount,
                payment_mode: 'UPI',
                day_of_week: new Date(normalized.transactionDate).getDay() || 0,
                day_of_month: new Date(normalized.transactionDate).getDate() || 1,
              }),
              signal: AbortSignal.timeout(2500),
            });
            if (resp.ok) {
              mlPrediction = await resp.json();
            }
          }
        } catch (err) {}

        if (!mlPrediction || mlPrediction.fallback) {
          const lower = (normalized.description || '').toLowerCase();
          let matchedName = 'Others';
          if (/swiggy|zomato|restaurant|food|hotel|cafe|biryani|tea|snack/i.test(lower)) matchedName = 'Food';
          else if (/petrol|diesel|fuel|uber|ola|metro|fastag|transport|auto/i.test(lower)) matchedName = 'Transportation';
          else if (/pharmacy|medical|apollo|hospital|doctor|medicine|clinic/i.test(lower)) matchedName = 'Medical';
          else if (/airtel|jio|electricity|water|broadband|bescom|tneb|gas|cylinder/i.test(lower)) matchedName = 'Bills';
          else if (/amazon|flipkart|myntra|zara|shopping|mart|store/i.test(lower)) matchedName = 'Shopping';
          else if (/netflix|movie|cinema|pvr|spotify|prime|hotstar/i.test(lower)) matchedName = 'Entertainment';
          else if (/course|udemy|coursera|college|school|tuition/i.test(lower)) matchedName = 'Education';
          else if (/lic|insurance|hdfc ergo|star health/i.test(lower)) matchedName = 'Insurance';
          else if (/zerodha|groww|sip|mutual fund|nps|stock/i.test(lower)) matchedName = 'Investments';

          mlPrediction = {
            category: matchedName,
            confidence: 0.65,
            fallback: true,
            alternatives: [],
            model_version: '2.1.0-heuristic'
          };
        }

        const matchedCategory = userCategories.find(c => c.name.toLowerCase() === mlPrediction.category.toLowerCase()) ||
          userCategories.find(c => c.name.toLowerCase() === 'others') || userCategories[0];

        normalized.predictedCategory = mlPrediction.category;
        normalized.confidence = mlPrediction.confidence || 0.65;
        normalized.isFallback = mlPrediction.fallback || false;
        normalized.alternatives = mlPrediction.alternatives || [];
        normalized.categoryId = matchedCategory ? matchedCategory.category_id : null;
        normalized.categoryName = matchedCategory ? matchedCategory.name : mlPrediction.category;
      }
      if (normalized.direction === 'CREDIT') totalCredits += normalized.amount;

      // Duplicate check against existing bank imports
      const dupCheck = await bankTransactionRepository.findExistingByReferenceOrSignature(userId, {
        referenceNo: normalized.referenceNo,
        transactionDate: normalized.transactionDate,
        amount: normalized.amount,
        description: normalized.description,
      });

      if (dupCheck) {
        duplicateCount++;
        normalized.isDuplicate = true;
        normalized.duplicateReason = dupCheck.matchedBy === 'REFERENCE_NO'
          ? `Exact match found in imported bank transactions with reference #${normalized.referenceNo}`
          : `Potential duplicate: matching date (${normalized.transactionDate}), amount (₹${normalized.amount}), and description`;
        normalized.existingRecord = dupCheck.existing;
      } else {
        normalized.isDuplicate = false;
      }

      // Check for possible existing FinMan manual records (expenses/incomes)
      const possibleMatches = await bankTransactionRepository.findPossibleFinmanMatches(userId, {
        transactionDate: normalized.transactionDate,
        amount: normalized.amount,
        direction: normalized.direction,
        description: normalized.description,
      });

      normalized.possibleMatches = possibleMatches;
      normalized.hasFinmanMatch = possibleMatches.length > 0;
    } else {
      invalidRowsCount++;
      normalized.isDuplicate = false;
      normalized.possibleMatches = [];
    }

    normalizedRows.push(normalized);
  }

  return {
    filename,
    sheetName,
    headers,
    mapping: effectiveMapping,
    totalRows: dataRows.length,
    validRowsCount,
    invalidRowsCount,
    duplicateCount,
    totalDebits: Number(totalDebits.toFixed(2)),
    totalCredits: Number(totalCredits.toFixed(2)),
    rows: normalizedRows,
  };
}

/**
 * Commits approved bank transactions into database under an import batch.
 */
async function commitImport(userId, { filename, fileFormat = 'CSV', transactions = [] }) {
  if (!transactions || !Array.isArray(transactions) || transactions.length === 0) {
    throw badRequest('No transactions provided for import.');
  }

  // Filter out excluded rows
  const toImport = [];
  let skippedCount = 0;

  for (const item of transactions) {
    if (item.excluded || item.exclude || item.isExcluded) {
      skippedCount++;
      continue;
    }

    if (!item.transactionDate || !item.amount || !item.direction || !item.description) {
      skippedCount++;
      continue;
    }

    // Server-side duplicate prevention: check against existing imported bank transactions
    const dupCheck = await bankTransactionRepository.findExistingByReferenceOrSignature(userId, {
      referenceNo: item.referenceNo,
      transactionDate: item.transactionDate,
      amount: Number(item.amount),
      description: item.description,
    });

    if (dupCheck) {
      skippedCount++;
      continue;
    }

    toImport.push({
      transactionDate: item.transactionDate,
      description: item.description,
      amount: Number(item.amount),
      direction: String(item.direction).toUpperCase(),
      referenceNo: item.referenceNo || null,
      sourceAccount: item.sourceAccount || filename || null,
      categoryId: item.categoryId || null,
      status: 'UNMATCHED',
      matchNotes: item.matchNotes || null,
    });
  }

  const batch = await bankTransactionRepository.createBatch({
    userId,
    filename: filename || 'Bank_Statement.csv',
    fileFormat: fileFormat.toUpperCase(),
    totalRows: transactions.length,
    importedCount: toImport.length,
    skippedCount,
  });

  const inserted = await bankTransactionRepository.createTransactionsBulk(userId, batch.batch_id, toImport);

  return {
    batch,
    importedCount: inserted.length,
    skippedCount,
    transactions: inserted,
  };
}

async function getTransactions(userId, options = {}) {
  const [items, total, summary] = await Promise.all([
    bankTransactionRepository.findTransactionsByUser(userId, options),
    bankTransactionRepository.countTransactionsByUser(userId, options),
    bankTransactionRepository.getSummary(userId),
  ]);

  return {
    items: items.map((tx) => ({
      ...tx,
      amount: Number(tx.amount || 0),
    })),
    total,
    page: Math.floor((options.offset || 0) / (options.limit || 50)) + 1,
    limit: options.limit || 50,
    summary,
  };
}

async function getTransaction(bankTxId, userId) {
  const tx = await bankTransactionRepository.findByIdAndUser(bankTxId, userId);
  if (!tx) throw notFound();

  // Find candidate reconciliation matches if unmatched
  let candidateMatches = [];
  if (tx.status === 'UNMATCHED') {
    candidateMatches = await bankTransactionRepository.findPossibleFinmanMatches(userId, {
      transactionDate: tx.transaction_date,
      amount: tx.amount,
      direction: tx.direction,
      description: tx.description,
    });
  }

  return {
    ...tx,
    amount: Number(tx.amount || 0),
    candidateMatches,
  };
}

async function matchTransaction(bankTxId, userId, { expenseId, incomeId, matchNotes }) {
  const existing = await bankTransactionRepository.findByIdAndUser(bankTxId, userId);
  if (!existing) throw notFound();

  if (!expenseId && !incomeId) {
    throw badRequest('Either expenseId or incomeId must be provided to match the transaction');
  }

  const matched = await bankTransactionRepository.matchTransaction(bankTxId, userId, {
    linkedExpenseId: expenseId,
    linkedIncomeId: incomeId,
    matchNotes,
  });

  return matched;
}

async function postTransactionToLedger(bankTxId, userId, { categoryId, description, date, source }) {
  const bankTx = await bankTransactionRepository.findByIdAndUser(bankTxId, userId);
  if (!bankTx) throw notFound();

  if (bankTx.status === 'POSTED') {
    throw badRequest('This bank transaction has already been posted to the FinMan ledger.');
  }

  const txAmount = Number(bankTx.amount);
  const txDate = date || bankTx.transaction_date;
  const txDesc = description || bankTx.description;

  if (bankTx.direction === 'DEBIT') {
    // Check if an identical expense already exists in ledger to prevent duplication
    const possibleMatches = await bankTransactionRepository.findPossibleFinmanMatches(userId, {
      transactionDate: txDate,
      amount: txAmount,
      direction: 'DEBIT',
      description: txDesc,
    });
    const exactMatch = possibleMatches.find(m => m.matchType === 'EXACT');
    if (exactMatch && exactMatch.id) {
      await bankTransactionRepository.postToLedger(bankTxId, userId, {
        linkedExpenseId: exactMatch.id,
        categoryId: exactMatch.categoryId || categoryId || bankTx.category_id,
      });
      return {
        success: true,
        message: 'Transaction matched and linked to existing expense in FinMan ledger (no duplicate created)',
        type: 'EXPENSE',
        record: exactMatch,
      };
    }

    // Must resolve a categoryId for expenses
    let finalCategoryId = categoryId || bankTx.category_id;
    if (!finalCategoryId) {
      // Find "Other" or fallback category
      const userCategories = await categoryRepository.findAllByUser(userId);
      const defaultCat = userCategories.find((c) =>
        c.name.toLowerCase().includes('other') ||
        c.name.toLowerCase().includes('miscellaneous') ||
        c.name.toLowerCase().includes('general')
      ) || userCategories[0];

      if (!defaultCat) {
        throw badRequest('No category found. Please select an expense category.');
      }
      finalCategoryId = defaultCat.category_id;
    }

    const createdExpense = await expenseService.createExpense(userId, {
      categoryId: finalCategoryId,
      amount: txAmount,
      expenseDate: txDate,
      description: txDesc,
    });

    await bankTransactionRepository.postToLedger(bankTxId, userId, {
      linkedExpenseId: createdExpense.expense_id,
      categoryId: finalCategoryId,
    });

    return {
      success: true,
      message: 'Transaction successfully posted to FinMan expense ledger',
      type: 'EXPENSE',
      record: createdExpense,
    };
  } else if (bankTx.direction === 'CREDIT') {
    // Check if an identical income already exists in ledger to prevent duplication
    const possibleMatches = await bankTransactionRepository.findPossibleFinmanMatches(userId, {
      transactionDate: txDate,
      amount: txAmount,
      direction: 'CREDIT',
      description: txDesc,
    });
    const exactMatch = possibleMatches.find(m => m.matchType === 'EXACT');
    if (exactMatch && exactMatch.id) {
      await bankTransactionRepository.postToLedger(bankTxId, userId, {
        linkedIncomeId: exactMatch.id,
      });
      return {
        success: true,
        message: 'Transaction matched and linked to existing income in FinMan ledger (no duplicate created)',
        type: 'INCOME',
        record: exactMatch,
      };
    }

    const validSources = new Set(['Salary', 'Freelance', 'Business', 'Scholarship', 'Rental', 'Other']);
    let finalSource = 'Other';
    if (source && validSources.has(source)) {
      finalSource = source;
    } else {
      const lower = String(source || bankTx.description || '').toLowerCase();
      if (lower.includes('salary') || lower.includes('payroll')) finalSource = 'Salary';
      else if (lower.includes('freelance') || lower.includes('consult')) finalSource = 'Freelance';
      else if (lower.includes('business')) finalSource = 'Business';
      else if (lower.includes('rent')) finalSource = 'Rental';
    }

    const createdIncome = await incomeService.createIncome(userId, {
      source: finalSource,
      amount: txAmount,
      incomeDate: txDate,
      description: txDesc,
    });

    await bankTransactionRepository.postToLedger(bankTxId, userId, {
      linkedIncomeId: createdIncome.income_id,
    });

    return {
      success: true,
      message: 'Transaction successfully posted to FinMan income ledger',
      type: 'INCOME',
      record: createdIncome,
    };
  }

  throw badRequest('Unsupported transaction direction');
}

async function excludeTransaction(bankTxId, userId) {
  const existing = await bankTransactionRepository.findByIdAndUser(bankTxId, userId);
  if (!existing) throw notFound();

  return bankTransactionRepository.excludeTransaction(bankTxId, userId);
}

async function unmatchTransaction(bankTxId, userId) {
  const existing = await bankTransactionRepository.findByIdAndUser(bankTxId, userId);
  if (!existing) throw notFound();

  return bankTransactionRepository.unmatchTransaction(bankTxId, userId);
}

async function deleteTransaction(bankTxId, userId) {
  const removed = await bankTransactionRepository.remove(bankTxId, userId);
  if (!removed) throw notFound();
  return { success: true, message: 'Bank transaction deleted successfully' };
}

async function getBatches(userId) {
  return bankTransactionRepository.getBatchesByUser(userId);
}

async function getSummary(userId) {
  return bankTransactionRepository.getSummary(userId);
}

module.exports = {
  previewStatement,
  commitImport,
  getTransactions,
  getTransaction,
  getSummary,
  matchTransaction,
  postTransactionToLedger,
  excludeTransaction,
  unmatchTransaction,
  deleteTransaction,
  getBatches,
};

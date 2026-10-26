// bankTransactionController.js
// Handles HTTP requests/responses for bank transaction statement imports, reconciliation, and ledger posting.

const bankTransactionService = require('../services/bankTransactionService');
const { sendSuccess, sendError } = require('../utils/response');

async function parsePreview(req, res) {
  try {
    if (!req.file) {
      return sendError(res, {
        statusCode: 400,
        message: 'No bank statement file uploaded. Please upload a CSV or XLSX file.',
      });
    }

    let customMapping = null;
    if (req.body.mapping) {
      try {
        customMapping = typeof req.body.mapping === 'string'
          ? JSON.parse(req.body.mapping)
          : req.body.mapping;
      } catch (e) {
        // ignore malformed custom mapping json
      }
    }

    const preview = await bankTransactionService.previewStatement(
      req.userId,
      req.file.buffer,
      req.file.originalname,
      customMapping
    );

    return sendSuccess(res, {
      message: 'Bank statement parsed successfully',
      data: preview,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to parse bank statement',
    });
  }
}

async function commitImport(req, res) {
  try {
    const { filename, fileFormat, transactions } = req.body;
    const result = await bankTransactionService.commitImport(req.userId, {
      filename,
      fileFormat,
      transactions,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: `Successfully imported ${result.importedCount} transaction(s)`,
      data: result,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to commit bank transactions import',
    });
  }
}

async function getTransactions(req, res) {
  try {
    const {
      status,
      direction,
      batchId,
      startDate,
      endDate,
      search,
      page = 1,
      limit = 50,
      sortBy,
      sortOrder,
    } = req.query;

    const offset = Math.max(0, (parseInt(page, 10) - 1) * parseInt(limit, 10));

    const result = await bankTransactionService.getTransactions(req.userId, {
      status,
      direction,
      batchId: batchId ? parseInt(batchId, 10) : undefined,
      startDate,
      endDate,
      search,
      limit: parseInt(limit, 10),
      offset,
      sortBy,
      sortOrder,
    });

    return sendSuccess(res, {
      message: 'Bank transactions fetched successfully',
      data: result,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch bank transactions',
    });
  }
}

async function getTransaction(req, res) {
  try {
    const tx = await bankTransactionService.getTransaction(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Bank transaction details fetched successfully',
      data: tx,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch bank transaction details',
    });
  }
}

async function matchTransaction(req, res) {
  try {
    const { expenseId, incomeId, matchNotes } = req.body;
    const matched = await bankTransactionService.matchTransaction(req.params.id, req.userId, {
      expenseId,
      incomeId,
      matchNotes,
    });

    return sendSuccess(res, {
      message: 'Transaction matched successfully',
      data: matched,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to match transaction',
    });
  }
}

async function postToLedger(req, res) {
  try {
    const { categoryId, description, date, source } = req.body;
    const result = await bankTransactionService.postTransactionToLedger(req.params.id, req.userId, {
      categoryId,
      description,
      date,
      source,
    });

    return sendSuccess(res, {
      statusCode: 201,
      message: result.message,
      data: result,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to post transaction to ledger',
    });
  }
}

async function excludeTransaction(req, res) {
  try {
    const excluded = await bankTransactionService.excludeTransaction(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Transaction excluded from ledger',
      data: excluded,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to exclude transaction',
    });
  }
}

async function unmatchTransaction(req, res) {
  try {
    const unmatched = await bankTransactionService.unmatchTransaction(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Transaction unmatched successfully',
      data: unmatched,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to unmatch transaction',
    });
  }
}

async function deleteTransaction(req, res) {
  try {
    const result = await bankTransactionService.deleteTransaction(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Bank transaction deleted successfully',
      data: result,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to delete bank transaction',
    });
  }
}

async function getBatches(req, res) {
  try {
    const batches = await bankTransactionService.getBatches(req.userId);
    return sendSuccess(res, {
      message: 'Import batches fetched successfully',
      data: batches,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch import batches',
    });
  }
}

async function getSummary(req, res) {
  try {
    const summary = await bankTransactionService.getSummary(req.userId);
    return sendSuccess(res, {
      message: 'Bank transaction summary fetched successfully',
      data: summary,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch bank transaction summary',
    });
  }
}

module.exports = {
  parsePreview,
  commitImport,
  getTransactions,
  getTransaction,
  getSummary,
  matchTransaction,
  postToLedger,
  excludeTransaction,
  unmatchTransaction,
  deleteTransaction,
  getBatches,
};

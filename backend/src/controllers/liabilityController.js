// liabilityController.js
// Handles HTTP requests/responses for liability management.

const liabilityService = require('../services/liabilityService');
const { sendSuccess, sendError } = require('../utils/response');

async function getLiabilities(req, res) {
  try {
    const { status, liabilityType, search, sortBy, sortOrder } = req.query;
    const [liabilities, summary] = await Promise.all([
      liabilityService.getLiabilities(req.userId, { status, liabilityType, search, sortBy, sortOrder }),
      liabilityService.getSummary(req.userId),
    ]);

    return sendSuccess(res, {
      message: 'Liabilities fetched successfully',
      data: {
        liabilities,
        summary,
      },
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch liabilities',
    });
  }
}

async function getSummary(req, res) {
  try {
    const summary = await liabilityService.getSummary(req.userId);
    return sendSuccess(res, {
      message: 'Liability summary fetched successfully',
      data: summary,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch liability summary',
    });
  }
}

async function getLiability(req, res) {
  try {
    const liability = await liabilityService.getLiability(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Liability details fetched successfully',
      data: liability,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to fetch liability details',
    });
  }
}

async function createLiability(req, res) {
  try {
    const created = await liabilityService.createLiability(req.userId, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Liability created successfully',
      data: created,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to create liability',
    });
  }
}

async function updateLiability(req, res) {
  try {
    const updated = await liabilityService.updateLiability(req.params.id, req.userId, req.body);
    return sendSuccess(res, {
      message: 'Liability updated successfully',
      data: updated,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to update liability',
    });
  }
}

async function deleteLiability(req, res) {
  try {
    const result = await liabilityService.deleteLiability(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Liability deleted successfully',
      data: result,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to delete liability',
    });
  }
}

async function archiveLiability(req, res) {
  try {
    const archived = await liabilityService.archiveLiability(req.params.id, req.userId);
    return sendSuccess(res, {
      message: 'Liability archived successfully',
      data: archived,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to archive liability',
    });
  }
}

async function recordPayment(req, res) {
  try {
    const result = await liabilityService.recordPayment(req.params.id, req.userId, req.body);
    return sendSuccess(res, {
      statusCode: 201,
      message: 'Payment recorded successfully',
      data: result,
    });
  } catch (err) {
    return sendError(res, {
      statusCode: err.statusCode || 500,
      message: err.message || 'Failed to record payment',
    });
  }
}

module.exports = {
  getLiabilities,
  getSummary,
  getLiability,
  createLiability,
  updateLiability,
  deleteLiability,
  archiveLiability,
  recordPayment,
};

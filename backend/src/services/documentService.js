const fs = require('fs');
const path = require('path');
const db = require('../config/database');
const documentRepository = require('../repositories/documentRepository');
const env = require('../config/env');
const geminiService = require('./geminiService');

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'application/pdf',
]);

const ALLOWED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.pdf']);

const CATEGORY_KEYWORDS = {
  'Fuel': ['petrol', 'diesel', 'fuel', 'indian oil', 'bpcl', 'hpcl', 'iocl', 'shell', 'filling station'],
  'Medical': ['pharmacy', 'medicine', 'apollo', 'medical', 'hospital', 'clinic', 'dr.', 'doctor', 'diagnostic', 'chemist'],
  'Food': ['restaurant', 'hotel', 'cafe', 'biryani', 'meals', 'lunch', 'dinner', 'swiggy', 'zomato', 'food', 'pizza', 'burger'],
  'Electricity': ['tneb', 'bescom', 'electricity', 'electric', 'power', 'eb bill', 'energy'],
  'Water': ['water', 'tanker', 'bwssb', 'water board'],
  'Internet': ['broadband', 'fiber', 'jio fiber', 'airtel fiber', 'bsnl', 'internet', 'wifi'],
  'Mobile': ['recharge', 'mobile', 'sim', 'jio', 'airtel', 'vodafone', 'prepaid', 'postpaid'],
  'Transport': ['bus', 'auto', 'metro', 'train', 'ola', 'uber', 'rapido', 'taxi', 'fastag'],
  'Shopping': ['supermarket', 'mart', 'dmart', 'reliance smart', 'big bazaar', 'kirana', 'amazon', 'flipkart'],
  'Education': ['school', 'college', 'university', 'tuition', 'institute', 'course', 'education'],
  'Entertainment': ['movie', 'cinema', 'netflix', 'amazon prime', 'hotstar', 'concert', 'pvr', 'inox'],
  'Dining': ['restaurant', 'pizza', 'burger', 'kfc', 'mcdonalds', 'dominos', 'cafe'],
  'Travel': ['flight', 'train ticket', 'irctc', 'railway', 'air ticket', 'goair', 'indigo', 'hotel booking'],
};

function keywordCategoryFromText(text) {
  if (!text) return null;
  const lower = text.toLowerCase();
  let best = null, bestScore = 0;
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const score = keywords.reduce((acc, kw) => acc + (lower.includes(kw) ? 1 : 0), 0);
    if (score > bestScore) { bestScore = score; best = cat; }
  }
  return best;
}

async function getOcrDiagnostics() {
  if (geminiService && geminiService.isConfigured()) {
    return {
      configured: true,
      reachable: true,
      status: 'OPERATIONAL',
      statusLabel: 'Gemini Multimodal Vision API is configured as primary OCR engine',
      serviceUrl: 'Google Gemini Generative Language API',
      engine: 'Gemini Vision (Primary)',
      checkedAt: new Date().toISOString(),
    };
  }

  if (!env.aiServiceUrl) {
    return {
      configured: false,
      reachable: false,
      status: 'UNCONFIGURED',
      statusLabel: 'OCR service is not configured',
      serviceUrl: null,
      message: 'OCR service is not configured. Set GEMINI_API_KEY or AI_SERVICE_URL in the backend environment.',
      checkedAt: new Date().toISOString(),
    };
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4000);
  const start = Date.now();

  try {
    const res = await fetch(`${env.aiServiceUrl}/health`, {
      method: 'GET',
      signal: controller.signal,
    });
    const latencyMs = Date.now() - start;

    if (!res.ok) {
      return {
        configured: true,
        reachable: false,
        status: 'UNHEALTHY',
        statusLabel: `OCR service returned HTTP ${res.status}`,
        serviceUrl: env.aiServiceUrl,
        latencyMs,
        message: 'The OCR service responded but indicated an unhealthy status.',
        checkedAt: new Date().toISOString(),
      };
    }

    const data = await res.json();
    return {
      configured: true,
      reachable: true,
      status: 'OPERATIONAL',
      statusLabel: 'OCR service is online and ready',
      serviceUrl: env.aiServiceUrl,
      latencyMs,
      details: {
        ocrAvailable: Boolean(data.ocr_available),
        tesseractAvailable: Boolean(data.tesseract_available),
        languageDataAvailable: Boolean(data.english_language_data_available),
      },
      checkedAt: new Date().toISOString(),
    };
  } catch (err) {
    const latencyMs = Date.now() - start;
    return {
      configured: true,
      reachable: false,
      status: 'UNAVAILABLE',
      statusLabel: 'OCR service is unreachable',
      serviceUrl: env.aiServiceUrl,
      latencyMs,
      message: 'Connection failed. Verify that the OCR service is running and accessible from the backend.',
      checkedAt: new Date().toISOString(),
    };
  } finally {
    clearTimeout(timer);
  }
}

async function requestOcr(file) {
  // 1. PRIMARY: Gemini Multimodal Vision API (Restored as primary per specification)
  if (geminiService && geminiService.isConfigured() && file?.path && fs.existsSync(file.path)) {
    try {
      const fileContent = await fs.promises.readFile(file.path);
      const geminiResult = await geminiService.extractReceiptWithGemini(fileContent, file.mimetype, file.originalname);
      
      if (geminiResult && geminiResult.status === 'COMPLETED') {
        // Document rejection checks based on authoritative Gemini vision classification
        if (geminiResult.is_bank_statement) {
          return {
            status: 'BANK_STATEMENT',
            statusCode: 422,
            message: "This appears to be a bank statement. Please use the 'Import Statement' feature to import bank statements.",
          };
        }

        if (geminiResult.is_financial_document === false) {
          return {
            status: 'INVALID_DOCUMENT',
            statusCode: 422,
            message: 'This document does not appear to be a valid financial receipt or invoice. Please upload a clear receipt, bill, or invoice.',
          };
        }

        return geminiResult;
      }
    } catch (geminiErr) {
      console.warn('[OCR] Primary Gemini Vision extraction failed:', geminiErr.message);
    }
  }

  // 2. SECONDARY / FALLBACK: FastAPI Tesseract microservice if configured
  if (env.aiServiceUrl && file?.path && fs.existsSync(file.path)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);
    try {
      const fileContent = await fs.promises.readFile(file.path);
      const body = new FormData();
      body.append('file', new Blob([fileContent], { type: file.mimetype }), file.originalname);
      const response = await fetch(`${env.aiServiceUrl}/ocr/receipt`, {
        method: 'POST',
        body,
        signal: controller.signal,
      });

      if (response.ok) {
        const extraction = await response.json();
        const rawText = extraction.raw_text || '';

        // Check for bank statement indicators
        if (/\b(bank statement|statement of account|account statement|opening balance|closing balance|cr\/dr|cheque no|passbook)\b/i.test(rawText)) {
          return {
            status: 'BANK_STATEMENT',
            statusCode: 422,
            message: "This appears to be a bank statement. Please use the 'Import Statement' feature to import bank statements.",
          };
        }

        // Check for non-financial indicators
        if (/\b(marksheet|grade card|certificate|hall ticket|admission|degree|curriculum vitae|resume)\b/i.test(rawText) || !/[0-9]/.test(rawText)) {
          return {
            status: 'INVALID_DOCUMENT',
            statusCode: 422,
            message: 'This document does not appear to be a valid financial receipt or invoice. Please upload a clear receipt, bill, or invoice.',
          };
        }

        // Check for Swiggy/Zomato restaurant slips with missing amount
        const isFoodDeliverySlip = /\b(swiggy|zomato|order\s*#|restaurant\s*slip|kitchen\s*order)\b/i.test(rawText);
        let amount = extraction.amount;
        let missingAmount = false;
        let userWarning = null;

        if (isFoodDeliverySlip && (!amount || amount <= 0)) {
          amount = null;
          missingAmount = true;
          userWarning = 'The restaurant order slip lists items and quantities, but does not specify the final billed amount. Please enter the amount manually from your Swiggy app or upload the Swiggy payment confirmation receipt.';
        }

        return {
          status: 'COMPLETED',
          ...extraction,
          amount,
          missing_amount: missingAmount,
          user_warning: userWarning,
          isLowConfidence: Boolean(extraction.isLowConfidence || missingAmount),
        };
      }
    } catch (error) {
      console.warn('[OCR] FastAPI microservice call failed:', error.code || error.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 3. OFFLINE / LOCAL TEXT FALLBACK: If text is discernible from the file content
  try {
    const fileContent = (file?.path && fs.existsSync(file.path)) ? await fs.promises.readFile(file.path) : null;
    const rawText = fileContent ? fileContent.toString('utf8') : '';
    if (rawText && rawText.length > 5 && /[a-zA-Z]/.test(rawText)) {
      if (/\b(bank statement|statement of account|account statement|opening balance|closing balance|cr\/dr|cheque no|passbook)\b/i.test(rawText)) {
        return {
          status: 'BANK_STATEMENT',
          statusCode: 422,
          message: "This appears to be a bank statement. Please use the 'Import Statement' feature to import bank statements.",
        };
      }

      if (/\b(marksheet|grade card|certificate|hall ticket|admission|degree|curriculum vitae|resume)\b/i.test(rawText) || !/[0-9]/.test(rawText)) {
        return {
          status: 'INVALID_DOCUMENT',
          statusCode: 422,
          message: 'This document does not appear to be a valid financial receipt or invoice. Please upload a clear receipt, bill, or invoice.',
        };
      }

      const isFoodDeliverySlip = /\b(swiggy|zomato|order\s*#|restaurant\s*slip|kitchen\s*order)\b/i.test(rawText);
      if (isFoodDeliverySlip) {
        return {
          status: 'COMPLETED',
          raw_text: rawText,
          amount: null,
          missing_amount: true,
          user_warning: 'The restaurant order slip lists items and quantities, but does not specify the final billed amount. Please enter the amount manually from your Swiggy app or upload the Swiggy payment confirmation receipt.',
          isLowConfidence: true,
          merchant: 'Swiggy / Restaurant',
          suggestedCategory: 'Food',
          documentType: 'RECEIPT',
          transactionType: 'EXPENSE',
          currency: 'INR',
        };
      }
    }
  } catch (_) {}

  // 4. Fallback error when neither service succeeded
  return {
    status: 'UNAVAILABLE',
    statusCode: 503,
    message: 'Receipt OCR service is temporarily unavailable. Please enter details manually.',
  };
}

async function processReceipt(userId, file) {
  // Clean up helper
  const removeUploadedFile = () => {
    if (file?.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
  };

  try {
    // 1. File extension and MIME type validation
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext) && !ALLOWED_MIME_TYPES.has(file.mimetype)) {
      removeUploadedFile();
      return {
        status: 'INVALID_DOCUMENT',
        statusCode: 422,
        message: 'Invalid file format. Only JPEG, PNG, WEBP, and PDF receipts or invoices are supported.',
      };
    }

    // 2. Perform OCR extraction (Gemini Vision primary, FastAPI secondary)
    const extraction = await requestOcr(file);

    // 3. Reject invalid documents or bank statements without database record creation
    if (extraction.status === 'BANK_STATEMENT' || extraction.status === 'INVALID_DOCUMENT') {
      removeUploadedFile();
      return extraction;
    }

    if (extraction.status !== 'COMPLETED') {
      removeUploadedFile();
      return {
        status: extraction.status || 'FAILED',
        statusCode: extraction.statusCode || 503,
        message: extraction.message || 'Could not process this document. Please enter the values manually.',
      };
    }

    // 4. Check for duplicate receipt upload (matching merchant, amount, date for this user)
    if (extraction.amount != null && extraction.merchant && extraction.date) {
      const duplicateCheck = await db.query(
        `SELECT dt.document_transaction_id, dt.extracted_merchant, dt.extracted_amount, dt.extracted_date
         FROM document_transactions dt
         JOIN financial_documents fd ON dt.document_id = fd.document_id
         WHERE fd.user_id = $1
           AND LOWER(TRIM(COALESCE(dt.extracted_merchant, ''))) = LOWER(TRIM($2))
           AND dt.extracted_amount = $3
           AND dt.extracted_date = $4
         LIMIT 1`,
        [userId, extraction.merchant, extraction.amount, extraction.date]
      );

      if (duplicateCheck.rows.length > 0) {
        removeUploadedFile();
        return {
          status: 'DUPLICATE',
          statusCode: 409,
          message: `This receipt has already been uploaded (Merchant: ${extraction.merchant}, Amount: ₹${extraction.amount}, Date: ${extraction.date}).`,
        };
      }
    }

    // 5. Create financial_documents record only for valid financial receipts
    const documentType = ['RECEIPT', 'SALARY_SLIP'].includes(extraction.documentType)
      ? extraction.documentType
      : 'RECEIPT';

    const document = await documentRepository.createDocument({
      userId,
      fileName: file.originalname,
      filePath: file.path,
      documentType,
    });

    const transaction = await documentRepository.createTransaction({
      documentId: document.document_id,
      amount: extraction.amount,
      date: extraction.date,
      merchant: extraction.merchant ? extraction.merchant.substring(0, 150) : null,
      rawText: extraction.raw_text,
      confidence: extraction.confidence,
    });

    // 6. Category prediction integration
    let suggestedCategory = extraction.suggestedCategory || null;
    if (!suggestedCategory || suggestedCategory === 'Other') {
      const textToClassify = `${extraction.merchant || ''} ${extraction.description || ''} ${extraction.raw_text || ''}`.trim();
      suggestedCategory = keywordCategoryFromText(textToClassify) || 'Food';
    }

    await documentRepository.updateStatus(document.document_id, userId, 'PROCESSED');

    return {
      document,
      transaction,
      extraction: {
        ...extraction,
        suggestedCategory,
      },
      status: 'AWAITING_CONFIRMATION',
    };
  } catch (error) {
    removeUploadedFile();
    console.error('[OCR] Document processing error:', error.message);
    throw error;
  }
}

module.exports = { processReceipt, requestOcr, getOcrDiagnostics };

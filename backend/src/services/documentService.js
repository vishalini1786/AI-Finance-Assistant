const fs = require('fs');
const documentRepository = require('../repositories/documentRepository');
const env = require('../config/env');
const geminiService = require('./geminiService');

// Keyword-based text analytics for OCR category suggestion.
// This runs IN NODE.JS as a fast fallback/supplement to the ML classifier.
const CATEGORY_KEYWORDS = {
  'Fuel': ['petrol', 'diesel', 'fuel', 'indian oil', 'bpcl', 'hpcl', 'iocl', 'shell', 'filling station'],
  'Medical': ['pharmacy', 'medicine', 'apollo', 'medical', 'hospital', 'clinic', 'dr.', 'doctor', 'diagnostic', 'chemist'],
  'Food': ['restaurant', 'hotel', 'cafe', 'biryani', 'meals', 'lunch', 'dinner', 'swiggy', 'zomato', 'food'],
  'Electricity': ['tneb', 'bescom', 'electricity', 'electric', 'power', 'eb bill', 'energy'],
  'Water': ['water', 'tanker', 'bwssb', 'water board'],
  'Internet': ['broadband', 'fiber', 'jio fiber', 'airtel fiber', 'bsnl', 'internet', 'wifi'],
  'Mobile': ['recharge', 'mobile', 'sim', 'jio', 'airtel', 'vodafone', 'prepaid', 'postpaid'],
  'Transport': ['bus', 'auto', 'metro', 'train', 'ola', 'uber', 'rapido', 'taxi'],
  'Shopping': ['supermarket', 'mart', 'dmart', 'reliance smart', 'big bazaar', 'kirana'],
  'Education': ['school', 'college', 'university', 'tuition', 'institute', 'course', 'education'],
  'Entertainment': ['movie', 'cinema', 'netflix', 'amazon prime', 'hotstar', 'concert', 'pvr', 'inox'],
  'Dining': ['restaurant', 'pizza', 'burger', 'kfc', 'mcdonalds', 'dominos'],
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
  if (!env.aiServiceUrl) {
    return {
      configured: false,
      reachable: false,
      status: 'UNCONFIGURED',
      statusLabel: 'OCR service is not configured',
      serviceUrl: null,
      message: 'OCR service is not configured. Set AI_SERVICE_URL in the backend environment and restart the API.',
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
    if (err.name === 'AbortError') {
      return {
        configured: true,
        reachable: false,
        status: 'TIMEOUT',
        statusLabel: 'OCR service timed out (4000ms)',
        serviceUrl: env.aiServiceUrl,
        latencyMs,
        message: 'The OCR service took longer than 4000ms to respond. It may be spinning up.',
        checkedAt: new Date().toISOString(),
      };
    }
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
  // 1. If AI_SERVICE_URL is configured, attempt the FastAPI microservice first
  if (env.aiServiceUrl) {
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
        if (extraction.raw_text && extraction.raw_text.trim()) {
          return { status: 'COMPLETED', ...extraction };
        }
      } else {
        let detailMsg = 'OCR could not process this document. Please enter the values manually or try another file.';
        try {
          const errJson = await response.json();
          if (typeof errJson?.detail === 'string' && errJson.detail.trim()) {
            detailMsg = errJson.detail.trim().slice(0, 500);
          }
        } catch (_) {}
        console.warn('[OCR] FastAPI microservice returned status', response.status, detailMsg);
      }
    } catch (error) {
      console.warn('[OCR] FastAPI microservice call failed:', error.code || error.message);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  // 2. Multimodal Vision Fallback via Gemini if configured and file exists on disk
  if (geminiService && geminiService.isConfigured() && file?.path && fs.existsSync(file.path)) {
    try {
      const fileContent = await fs.promises.readFile(file.path);
      const geminiResult = await geminiService.extractReceiptWithGemini(fileContent, file.mimetype, file.originalname);
      if (geminiResult && geminiResult.status === 'COMPLETED') {
        return geminiResult;
      }
    } catch (geminiErr) {
      console.warn('[OCR] Gemini Vision extraction fallback failed:', geminiErr.message);
    }
  }

  // 3. Fallback / error handling when neither service succeeded
  if (!env.aiServiceUrl) {
    return {
      status: 'UNAVAILABLE',
      statusCode: 503,
      message: 'OCR service is not configured. Set AI_SERVICE_URL in the backend environment and restart the API.',
    };
  }

  return {
    status: 'UNAVAILABLE',
    statusCode: 503,
    message: 'OCR service is temporarily unavailable. Please enter the values manually or try again.',
  };
}

async function processReceipt(userId, file) {
  let document;
  try {
    document = await documentRepository.createDocument({
      userId,
      fileName: file.originalname,
      filePath: file.path,
      documentType: 'RECEIPT',
    });
    console.info('[OCR] Document upload accepted for processing.');

    const extraction = await requestOcr(file);
    console.info('[OCR] Extraction status:', extraction.status);
    
    if (extraction.status !== 'COMPLETED') {
      await documentRepository.updateStatus(document.document_id, userId, 'FAILED');
      // Clean up temporary file on failure
      if (file?.path && fs.existsSync(file.path)) {
        try { fs.unlinkSync(file.path); } catch (e) {}
      }
      return { document, status: extraction.status, message: extraction.message };
    }

    const documentType = ['RECEIPT', 'SALARY_SLIP'].includes(extraction.documentType)
      ? extraction.documentType
      : 'OTHER';
    await documentRepository.updateDocumentType(document.document_id, userId, documentType);
    
    const transaction = await documentRepository.createTransaction({
      documentId: document.document_id,
      amount: extraction.amount,
      date: extraction.date,
      merchant: extraction.merchant ? extraction.merchant.substring(0, 150) : null,
      rawText: extraction.raw_text,
      confidence: extraction.confidence,
    });
    let suggestedCategory = null;
    if (env.aiServiceUrl) {
      try {
        // Parse date safely from YYYY-MM-DD string to avoid UTC timezone shift
        // new Date("2026-12-31") is UTC midnight → in UTC+5:30 it's still Dec 31 BUT
        // using split avoids any platform-specific ambiguity.
        let catMonth = new Date().getMonth() + 1;
        let catDow   = new Date().getDay();
        let catDom   = new Date().getDate();
        if (extraction.date && /^\d{4}-\d{2}-\d{2}$/.test(extraction.date)) {
          const [, mm, dd] = extraction.date.split('-').map(Number);
          const localDate  = new Date(extraction.date.replace(/-/g, '/'));
          catMonth = mm;
          catDow   = localDate.getDay();
          catDom   = dd;
        }
        const catResponse = await fetch(`${env.aiServiceUrl}/predict/category`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            feature_dict: {
              amount:             extraction.amount || 0,
              payment_mode_clean: 0,
              location_clean:     0,
              user_id:            userId,
              month_number:       catMonth,
              day_of_week:        catDow,
              day_of_month:       catDom,
              notes_clean:        0,
            },
          }),
        });
        if (catResponse.ok) {
          const catData = await catResponse.json();
          suggestedCategory = catData.category;
        } else {
          console.warn('[OCR] Category classification service returned status:', catResponse.status);
        }
      } catch (e) {
        console.warn('[OCR] Category classification is unavailable:', e.name);
      }
    }

    // HYBRID: If ML didn't produce a result, use keyword text analytics
    if (!suggestedCategory && extraction.raw_text) {
      suggestedCategory = keywordCategoryFromText(extraction.raw_text);
    }
    suggestedCategory = suggestedCategory || extraction.suggestedCategory || extraction.suggested_category || null;

    await documentRepository.updateStatus(document.document_id, userId, 'PROCESSED');
    return { document, transaction, extraction: { ...extraction, suggestedCategory }, status: 'AWAITING_CONFIRMATION' };
  } catch (error) {
    if (file?.path && fs.existsSync(file.path)) {
      try { fs.unlinkSync(file.path); } catch (e) {}
    }
    console.error('[OCR] Document processing failed:', error.code || error.name || 'UnknownError');
    throw error;
  }
}

module.exports = { processReceipt, requestOcr, getOcrDiagnostics };

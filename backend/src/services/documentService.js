const fs = require('fs');
const documentRepository = require('../repositories/documentRepository');
const env = require('../config/env');

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

async function requestOcr(file) {
  if (!env.aiServiceUrl) {
    return {
      status: 'UNAVAILABLE',
      statusCode: 503,
      message: 'OCR service is not configured. Set AI_SERVICE_URL in the backend environment and restart the API.',
    };
  }

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

    if (!response.ok) {
      let detailMsg = 'OCR could not process this document. Please enter the values manually or try another file.';
      try {
        const errJson = await response.json();
        if (typeof errJson?.detail === 'string' && errJson.detail.trim()) {
          detailMsg = errJson.detail.trim().slice(0, 500);
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) {
          throw error;
        }
      }
      return { status: 'UNAVAILABLE', statusCode: response.status, message: detailMsg };
    }

    const extraction = await response.json();
    if (!extraction.raw_text || !extraction.raw_text.trim()) {
      return {
        status: 'UNAVAILABLE',
        statusCode: 422,
        message: 'No readable text was found. Try a clearer image or enter the values manually.',
      };
    }
    return { status: 'COMPLETED', ...extraction };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        status: 'UNAVAILABLE',
        statusCode: 504,
        message: 'OCR request timed out. Please enter details manually or try again.',
      };
    }
    if (error.code === 'ENOENT' || error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return {
        status: 'UNAVAILABLE',
        statusCode: 503,
        message: 'OCR service is unavailable. Check that the configured OCR service is running.',
      };
    }
    return {
      status: 'UNAVAILABLE',
      statusCode: 503,
      message: 'OCR service is temporarily unavailable. Please enter the values manually or try again.',
    };
  } finally {
    clearTimeout(timeoutId);
  }
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

module.exports = { processReceipt, requestOcr };

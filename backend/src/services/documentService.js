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
  if (!env.aiServiceUrl) return { status: 'UNAVAILABLE', message: 'OCR service is not configured' };
  try {
    const body = new FormData();
    body.append('file', new Blob([fs.readFileSync(file.path)], { type: file.mimetype }), file.originalname);
    const response = await fetch(`${env.aiServiceUrl}/ocr/receipt`, { method: 'POST', body });
    if (!response.ok) return { status: 'UNAVAILABLE', message: 'OCR service returned an error' };
    return { status: 'COMPLETED', ...(await response.json()) };
  } catch (error) {
    return { status: 'UNAVAILABLE', message: 'OCR service is temporarily unavailable' };
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
    console.log('[OCR] Database document created:', document.document_id);

    const extraction = await requestOcr(file);
    console.log('[OCR] Extraction completed:', extraction.status);
    
    if (extraction.status !== 'COMPLETED') {
      await documentRepository.updateStatus(document.document_id, userId, 'FAILED');
      return { document, status: extraction.status, message: extraction.message };
    }
    
    console.log('[OCR] Extracted amount:', extraction.amount, 'date:', extraction.date, 'merchant:', extraction.merchant);
    
    const transaction = await documentRepository.createTransaction({
      documentId: document.document_id,
      amount: extraction.amount,
      date: extraction.date,
      merchant: extraction.merchant ? extraction.merchant.substring(0, 150) : null,
      rawText: extraction.raw_text,
      confidence: extraction.confidence,
    });
    console.log('[OCR] Document transaction inserted');

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
          console.log('[OCR] ML classification response:', suggestedCategory);
        } else {
          console.log('[OCR] ML classification response error status:', catResponse.status);
        }
      } catch (e) {
        console.log('[OCR] ML classification fetch failed:', e.message);
      }
    }

    // HYBRID: If ML didn't produce a result, use keyword text analytics
    if (!suggestedCategory && extraction.raw_text) {
      suggestedCategory = keywordCategoryFromText(extraction.raw_text);
      if (suggestedCategory) {
        console.log('[OCR] Keyword text analytics suggested category:', suggestedCategory);
      }
    }

    // Also use suggested_category from the Python OCR service if available
    if (!suggestedCategory && extraction.suggested_category) {
      suggestedCategory = extraction.suggested_category;
    }

    await documentRepository.updateStatus(document.document_id, userId, 'PROCESSED');
    return { document, transaction, extraction: { ...extraction, suggestedCategory }, status: 'AWAITING_CONFIRMATION' };
  } catch (error) {
    console.error('[OCR] Exception occurred:', error.message);
    console.error(error.stack);
    if (error.code) console.error('[OCR] PG Error Code:', error.code);
    if (error.detail) console.error('[OCR] PG Detail:', error.detail);
    if (error.constraint) console.error('[OCR] PG Constraint:', error.constraint);
    throw error;
  }
}

module.exports = { processReceipt };

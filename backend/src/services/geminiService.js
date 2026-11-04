const env = require('../config/env');
const { FINANCE_ONLY_SYSTEM_INSTRUCTION } = require('./financeGuardrails');

/**
 * Gemini Service — Server-side Google Gemini integration for conversational intelligence.
 * Complies with strict security and reliability rules:
 * - Credentials loaded only server-side.
 * - API keys are never leaked to logs or client.
 * - Deterministic validation: Gemini never executes DB writes or arbitrary SQL.
 * - Graceful fallback on missing key, timeout, rate limit, or invalid response.
 */

let cachedHealthCheck = {
  status: 'NOT_CHECKED',
  statusLabel: 'Health check not yet performed',
  healthy: null,
  latencyMs: null,
  message: null,
  checkedAt: null,
};

function isConfigured() {
  const key = env.gemini && env.gemini.apiKey;
  if (!key || typeof key !== 'string') return false;
  const trimmed = key.trim();
  if (trimmed.length === 0) return false;
  if (
    trimmed === 'YOUR_GEMINI_API_KEY' ||
    trimmed === 'your_api_key_here' ||
    trimmed === 'YOUR_API_KEY' ||
    trimmed === 'PLACEHOLDER'
  ) {
    return false;
  }
  return true;
}

/**
 * Perform a lightweight safe probe of the Google Gemini API.
 * Results are cached for 60 seconds to prevent unnecessary quota usage.
 */
async function runHealthCheck(force = false) {
  if (!isConfigured()) {
    cachedHealthCheck = {
      status: 'MISSING_CREDENTIALS',
      statusLabel: 'Missing credentials',
      healthy: false,
      latencyMs: null,
      message: 'GEMINI_API_KEY environment variable is not configured. FinMan is operating in deterministic financial reasoning mode.',
      checkedAt: new Date().toISOString(),
    };
    return cachedHealthCheck;
  }

  // Use cached result if within 60s window unless force refresh requested
  if (
    !force &&
    cachedHealthCheck.checkedAt &&
    Date.now() - new Date(cachedHealthCheck.checkedAt).getTime() < 60000
  ) {
    return cachedHealthCheck;
  }

  const probeTimeout = env.gemini?.timeoutMs || 25000;
  const start = Date.now();
  const res = await generateContent({
    prompt: 'Health check probe: reply with PONG',
    systemInstruction: '',
    temperature: 0,
    timeoutMs: probeTimeout,
  });
  const latencyMs = Date.now() - start;

  if (res.success) {
    cachedHealthCheck = {
      status: 'OPERATIONAL',
      statusLabel: 'Configured and responding',
      healthy: true,
      latencyMs,
      message: 'Google Gemini Generative Language API is responding normally.',
      checkedAt: new Date().toISOString(),
    };
  } else if (res.status === 'RATE_LIMIT') {
    cachedHealthCheck = {
      status: 'RATE_LIMIT',
      statusLabel: 'Provider quota or rate limit reached',
      healthy: false,
      latencyMs,
      message: 'Google Gemini API quota or rate limit has been reached.',
      checkedAt: new Date().toISOString(),
    };
  } else if (res.status === 'AUTH_OR_QUOTA_ERROR') {
    cachedHealthCheck = {
      status: 'AUTH_FAILED',
      statusLabel: 'Configuration present but provider health check failed',
      healthy: false,
      latencyMs,
      message: 'Configured GEMINI_API_KEY was rejected by Google API (authentication error or disabled API).',
      checkedAt: new Date().toISOString(),
    };
  } else if (res.status === 'TIMEOUT') {
    cachedHealthCheck = {
      status: 'TIMEOUT',
      statusLabel: 'Provider temporarily unavailable',
      healthy: false,
      latencyMs,
      message: `Google Gemini API request timed out after ${probeTimeout}ms.`,
      checkedAt: new Date().toISOString(),
    };
  } else {
    cachedHealthCheck = {
      status: 'ERROR',
      statusLabel: 'Configuration present but provider health check failed',
      healthy: false,
      latencyMs,
      message: res.message || 'Health check probe failed.',
      checkedAt: new Date().toISOString(),
    };
  }

  return cachedHealthCheck;
}

function getGeminiDiagnostics() {
  const configured = isConfigured();
  const status = configured
    ? (cachedHealthCheck.status === 'NOT_CHECKED' ? 'operational' : (cachedHealthCheck.healthy ? 'operational' : cachedHealthCheck.status.toLowerCase()))
    : 'unconfigured';
  const statusLabel = configured
    ? (cachedHealthCheck.statusLabel || 'Configured and responding')
    : 'Missing credentials';

  return {
    provider: 'Google Gemini',
    configured,
    model: env.gemini?.model || 'gemini-flash-lite-latest',
    status,
    statusLabel,
    healthy: configured ? (cachedHealthCheck.healthy !== false) : false,
    healthDetails: configured
      ? cachedHealthCheck
      : {
          status: 'MISSING_CREDENTIALS',
          statusLabel: 'Missing credentials',
          healthy: false,
          latencyMs: null,
          message: 'GEMINI_API_KEY environment variable is not configured. FinMan is operating in deterministic financial reasoning mode.',
          checkedAt: new Date().toISOString(),
        },
    note: configured
      ? (cachedHealthCheck.message || 'Gemini API key is configured server-side.')
      : 'GEMINI_API_KEY environment variable is not set. Conversational assistant is using deterministic financial reasoning.',
    expectedEnvVar: 'GEMINI_API_KEY',
    fallbackMode: 'Deterministic SQL Grounding Active',
  };
}

/**
 * Make an authenticated call to Google Generative Language API.
 * Uses native fetch and handles transient errors, rate limits, and timeouts.
 */
async function generateContent({
  prompt,
  systemInstruction = 'You are FinMan, an expert personal finance assistant for Indian users.',
  temperature = 0.2,
  timeoutMs = (env.gemini?.timeoutMs || 25000),
  responseSchema = null,
}) {
  if (!isConfigured()) {
    return {
      success: false,
      status: 'UNCONFIGURED',
      message: 'Gemini API key is not configured on the server.',
    };
  }

  const apiKey = env.gemini.apiKey;
  const primaryModel = env.gemini.model || 'gemini-flash-lite-latest';
  const candidateModels = [
    primaryModel,
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const requestBody = {
    contents: [
      {
        parts: [{ text: prompt }],
      },
    ],
    generationConfig: {
      temperature,
    },
  };

  const effectiveSystemInstruction = [
    FINANCE_ONLY_SYSTEM_INSTRUCTION,
    systemInstruction,
  ].filter(Boolean).join('\n\n');

  if (effectiveSystemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: effectiveSystemInstruction }],
    };
  }

  if (responseSchema) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let lastError = null;

    for (const model of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      if (!res.ok) {
        let errorDetail = 'API call failed';
        try {
          const errJson = await res.json();
          errorDetail = errJson?.error?.message || `HTTP ${res.status}`;
        } catch (e) {
          errorDetail = `HTTP ${res.status}`;
        }

        if (res.status === 404) {
          // Model deprecated or not found for this tier, try next candidate
          lastError = { success: false, status: 'ERROR', message: errorDetail };
          continue;
        }

        if (res.status === 429) {
          console.warn('[Gemini] Rate limit exceeded.');
          return { success: false, status: 'RATE_LIMIT', message: 'Gemini rate limit exceeded.' };
        }
        if (res.status === 403 || res.status === 401 || (res.status === 400 && (errorDetail.toLowerCase().includes('api key') || errorDetail.includes('API_KEY_INVALID')))) {
          console.warn('[Gemini] Authentication or quota error:', errorDetail);
          return { success: false, status: 'AUTH_OR_QUOTA_ERROR', message: 'Gemini quota or credentials issue.' };
        }

        console.warn(`[Gemini] Request failed (${res.status}): ${errorDetail}`);
        return { success: false, status: 'ERROR', message: errorDetail };
      }

      const data = await res.json();
      const candidate = data?.candidates?.[0];
      const textOutput = candidate?.content?.parts?.[0]?.text || '';

      if (!textOutput) {
        return { success: false, status: 'EMPTY_RESPONSE', message: 'Model returned empty response.' };
      }

      return {
        success: true,
        text: textOutput,
        model,
        usage: data?.usageMetadata || null,
      };
    }

    return lastError || { success: false, status: 'ERROR', message: 'No candidate Gemini model responded successfully.' };
  } catch (err) {
    if (err.name === 'AbortError') {
      console.warn('[Gemini] Request timed out after', timeoutMs, 'ms');
      return { success: false, status: 'TIMEOUT', message: 'Gemini request timed out.' };
    }
    console.warn('[Gemini] Network or connection error:', err.message);
    return { success: false, status: 'NETWORK_ERROR', message: err.message };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Parse structured JSON intent from user message using Gemini with validation.
 * Guaranteed never to throw or execute uncontrolled DB writes.
 */
async function extractFinancialIntent({ userMessage, conversationHistory = [] }) {
  if (!isConfigured()) {
    return { success: false, reason: 'UNCONFIGURED' };
  }

  const prompt = `Analyze this personal finance user message and extract financial operations as a structured JSON object.
Do NOT fabricate numbers, dates, or actions. If amounts are not stated, use null.
Supported intent types: RECORD_EXPENSE, RECORD_INCOME, BATCH_TRANSACTIONS, QUERY_SPENDING, QUERY_BUDGET, QUERY_INVESTMENTS, OTHER.

User Message: "${userMessage}"

Respond ONLY with valid JSON matching this schema:
{
  "intent": "RECORD_EXPENSE" | "RECORD_INCOME" | "BATCH_TRANSACTIONS" | "QUERY_SPENDING" | "QUERY_BUDGET" | "OTHER",
  "transactions": [
    {
      "description": string,
      "amount": number | null,
      "category": string | null,
      "date": string | null,
      "type": "income" | "expense"
    }
  ],
  "clarificationNeeded": boolean,
  "question": string | null
}`;

  const result = await generateContent({
    prompt,
    temperature: 0.1,
    timeoutMs: env.gemini?.timeoutMs || 25000,
    responseSchema: true,
  });

  if (!result.success || !result.text) {
    return { success: false, reason: result.status || 'FAILED' };
  }

  try {
    const parsed = JSON.parse(result.text);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, reason: 'INVALID_JSON_OBJECT' };
    }
    return { success: true, data: parsed };
  } catch (parseErr) {
    console.warn('[Gemini] Failed to parse model output as JSON:', parseErr.message);
    return { success: false, reason: 'MALFORMED_JSON' };
  }
}

/**
 * Perform a safe diagnostic connection test without exposing keys or sensitive data.
 */
async function testConnection() {
  const result = await runHealthCheck(true);
  const diag = getGeminiDiagnostics();
  return {
    success: result.healthy === true,
    status: result.status,
    statusLabel: result.statusLabel,
    healthy: result.healthy === true,
    latencyMs: result.latencyMs,
    message: result.message,
    model: diag.model,
    testedAt: result.checkedAt,
  };
}

/**
 * Extract financial document / receipt details using Gemini Multimodal Vision API.
 * Supports image (JPEG, PNG, WEBP) and PDF files.
 */
async function extractReceiptWithGemini(fileBuffer, mimeType = 'image/jpeg', filename = 'receipt') {
  if (!isConfigured()) {
    return {
      success: false,
      status: 'UNCONFIGURED',
      message: 'Gemini API key is not configured on the server.',
    };
  }

  let resolvedMime = mimeType;
  if (!resolvedMime || resolvedMime === 'application/octet-stream') {
    const ext = (filename || '').split('.').pop().toLowerCase();
    if (ext === 'pdf') resolvedMime = 'application/pdf';
    else if (ext === 'png') resolvedMime = 'image/png';
    else if (ext === 'webp') resolvedMime = 'image/webp';
    else resolvedMime = 'image/jpeg';
  }

  const base64Data = Buffer.isBuffer(fileBuffer)
    ? fileBuffer.toString('base64')
    : Buffer.from(fileBuffer).toString('base64');

  const prompt = `You are an expert financial document intelligence system for FinMan.
Analyze this uploaded document carefully. The document may be in English, Tamil (தமிழ்), Hindi (हिंदी), Telugu (తెలుగు), Malayalam (മലയാളം), or Kannada (ಕನ್ನಡ), or a mix of languages.

FIRST, DETERMINE THE EXACT TYPE OF DOCUMENT:
1. Is this a genuine financial document (receipt, retail bill, invoice, restaurant slip, utility bill, or salary slip)?
   - If it is a personal photo, selfie, random object, landscape, university marksheet, academic certificate, homework, ID card, or non-financial document, set "is_financial_document": false.
2. Is this a Bank Account Statement or Passbook page?
   - If it contains multiple account transaction rows, account balance summaries, or bank statement headers (e.g. SBI, HDFC, ICICI, Axis Bank statement), set "is_bank_statement": true and "is_financial_document": false.

SPECIAL CASE — FOOD DELIVERY / RESTAURANT ORDER SLIPS (Swiggy / Zomato / Restaurant KOT):
- In many Indian restaurant slips or food delivery slips, the slip lists ordered food items and quantities (e.g., "1x Chicken Biryani, 2x Butter Naan"), but does NOT show the final billed amount (because payment was processed in the app).
- CRITICAL: DO NOT INVENT, FABRICATE, OR ESTIMATE A TOTAL AMOUNT.
- If there is NO final monetary total printed on the slip, set "amount": null, "missing_amount": true, and set "user_warning": "The restaurant order slip lists items and quantities, but does not specify the final billed amount. Please enter the amount manually from your Swiggy app or upload the Swiggy payment confirmation receipt."

Extract and return ONLY a valid JSON object matching this schema:
{
  "is_financial_document": true or false,
  "is_bank_statement": true or false,
  "rejection_reason": string or null,
  "raw_text": "full transcription of text in original language",
  "document_language": "en" | "ta" | "hi" | "te" | "ml" | "kn" | "mixed",
  "currency": "INR",
  "amount": number or null,
  "missing_amount": boolean,
  "user_warning": string or null,
  "date": "YYYY-MM-DD" or null,
  "merchant": string or null,
  "description": string or null,
  "items": [
    { "name": string, "quantity": number, "price": number or null }
  ],
  "paymentMethod": "UPI" | "Cash" | "Credit Card" | "Debit Card" | "Net Banking" | null,
  "suggestedCategory": "Food" | "Transportation" | "Medical" | "Bills" | "Shopping" | "Entertainment" | "Education" | "Insurance" | "Investments" | "Other",
  "documentType": "RECEIPT" | "SALARY_SLIP" | "OTHER",
  "transactionType": "EXPENSE" | "INCOME",
  "confidence": number between 0.0 and 1.0,
  "isLowConfidence": boolean,
  "isSalarySlip": boolean,
  "grossSalary": number or null,
  "deductions": number or null,
  "netSalary": number or null
}
Return only JSON without markdown formatting or code blocks.`;

  const requestBody = {
    contents: [
      {
        parts: [
          {
            inlineData: {
              mimeType: resolvedMime,
              data: base64Data,
            },
          },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      responseMimeType: 'application/json',
    },
  };

  const apiKey = env.gemini.apiKey;
  const candidateModels = [
    env.gemini.model || 'gemini-flash-lite-latest',
    'gemini-flash-lite-latest',
    'gemini-3.5-flash-lite',
    'gemini-3.5-flash',
    'gemini-3.8-flash',
  ].filter((m, idx, arr) => arr.indexOf(m) === idx);

  const controller = new AbortController();
  const ocrTimeout = Math.max(35000, (env.gemini?.timeoutMs || 25000) + 10000);
  const timer = setTimeout(() => controller.abort(), ocrTimeout);

  try {
    for (const model of candidateModels) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        });

        if (!res.ok) {
          if (res.status === 404) continue;
          const errData = await res.json().catch(() => ({}));
          console.warn(`[Gemini OCR] Model ${model} returned HTTP ${res.status}:`, errData?.error?.message);
          continue;
        }

        const data = await res.json();
        const responseText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!responseText) continue;

        let parsed;
        try {
          parsed = JSON.parse(responseText.trim().replace(/^```json\s*/i, '').replace(/```\s*$/i, ''));
        } catch {
          const match = responseText.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
        }

        if (parsed) {
          const isFinancialDoc = parsed.is_financial_document !== false;
          const isBankStatement = Boolean(parsed.is_bank_statement);
          const isMissingAmount = Boolean(parsed.missing_amount || (parsed.amount === null && parsed.items?.length > 0));
          const numAmount = parsed.amount != null ? Number(parsed.amount) : null;

          let desc = parsed.description || '';
          if (!desc && Array.isArray(parsed.items) && parsed.items.length > 0) {
            desc = parsed.items.map(it => `${it.name || 'Item'}${it.quantity ? ` x${it.quantity}` : ''}`).join(', ');
          }

          return {
            success: true,
            status: 'COMPLETED',
            is_financial_document: isFinancialDoc,
            is_bank_statement: isBankStatement,
            missing_amount: isMissingAmount,
            user_warning: parsed.user_warning || (
              isMissingAmount
                ? 'The restaurant order slip lists items and quantities, but does not specify the final billed amount. Please enter the amount manually from your Swiggy app or upload the Swiggy payment confirmation receipt.'
                : null
            ),
            raw_text: parsed.raw_text || '',
            amount: isNaN(numAmount) ? null : numAmount,
            date: parsed.date || null,
            merchant: parsed.merchant || null,
            description: desc,
            items: Array.isArray(parsed.items) ? parsed.items : [],
            paymentMethod: parsed.paymentMethod || null,
            suggestedCategory: parsed.suggestedCategory || 'Other',
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.95,
            isLowConfidence: Boolean(parsed.isLowConfidence || isMissingAmount),
            documentType: parsed.documentType || 'RECEIPT',
            transactionType: parsed.transactionType || 'EXPENSE',
            currency: parsed.currency || 'INR',
            document_language: parsed.document_language || 'en',
            isSalarySlip: Boolean(parsed.isSalarySlip),
            grossSalary: parsed.grossSalary || null,
            deductions: parsed.deductions || null,
            netSalary: parsed.netSalary || null,
          };
        }
      } catch (err) {
        if (err.name === 'AbortError') throw err;
        console.warn(`[Gemini OCR] Error calling model ${model}:`, err.message);
      }
    }

    return {
      success: false,
      status: 'UNAVAILABLE',
      statusCode: 503,
      message: 'Gemini Vision could not parse this document. Please enter the values manually.',
    };
  } catch (error) {
    if (error.name === 'AbortError') {
      return {
        success: false,
        status: 'UNAVAILABLE',
        statusCode: 504,
        message: 'Document OCR timed out. Please enter details manually or try again.',
      };
    }
    return {
      success: false,
      status: 'UNAVAILABLE',
      statusCode: 503,
      message: 'OCR service error. Please enter the values manually.',
    };
  } finally {
    clearTimeout(timer);
  }
}

module.exports = {
  isConfigured,
  getGeminiDiagnostics,
  runHealthCheck,
  testConnection,
  generateContent,
  extractFinancialIntent,
  extractReceiptWithGemini,
};

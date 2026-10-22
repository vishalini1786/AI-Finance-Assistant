const env = require('../config/env');

/**
 * Gemini Service — Server-side Google Gemini integration for conversational intelligence.
 * Complies with strict security and reliability rules:
 * - Credentials loaded only server-side.
 * - API keys are never leaked to logs or client.
 * - Deterministic validation: Gemini never executes DB writes or arbitrary SQL.
 * - Graceful fallback on missing key, timeout, rate limit, or invalid response.
 */

function isConfigured() {
  return Boolean(env.gemini && env.gemini.apiKey && env.gemini.apiKey.trim().length > 0);
}

function getGeminiDiagnostics() {
  const configured = isConfigured();
  return {
    provider: 'Google Gemini',
    configured,
    model: env.gemini?.model || 'gemini-1.5-flash',
    status: configured ? 'operational' : 'unconfigured',
    note: configured
      ? 'Gemini API key is configured server-side.'
      : 'GEMINI_API_KEY environment variable is not set. Conversational assistant is using deterministic financial reasoning.',
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
  timeoutMs = 12000,
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
  const model = env.gemini.model || 'gemini-1.5-flash';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

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

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
    };
  }

  if (responseSchema) {
    requestBody.generationConfig.responseMimeType = 'application/json';
  }

  try {
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

      if (res.status === 429) {
        console.warn('[Gemini] Rate limit exceeded.');
        return { success: false, status: 'RATE_LIMIT', message: 'Gemini rate limit exceeded.' };
      }
      if (res.status === 403 || res.status === 401) {
        console.warn('[Gemini] Authentication or quota error.');
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
    timeoutMs: 8000,
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

module.exports = {
  isConfigured,
  getGeminiDiagnostics,
  generateContent,
  extractFinancialIntent,
};

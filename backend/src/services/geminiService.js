const env = require('../config/env');

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

  const start = Date.now();
  const res = await generateContent({
    prompt: 'Health check probe: reply with PONG',
    systemInstruction: '',
    temperature: 0,
    timeoutMs: 6000,
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
      message: 'Google Gemini API request timed out after 6000ms.',
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
    model: env.gemini?.model || 'gemini-1.5-flash',
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
  const primaryModel = env.gemini.model || 'gemini-flash-lite-latest';
  const candidateModels = [
    primaryModel,
    'gemini-flash-lite-latest',
    'gemini-3-flash-preview',
    'gemini-3.5-flash',
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

  if (systemInstruction) {
    requestBody.systemInstruction = {
      parts: [{ text: systemInstruction }],
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

module.exports = {
  isConfigured,
  getGeminiDiagnostics,
  runHealthCheck,
  testConnection,
  generateContent,
  extractFinancialIntent,
};

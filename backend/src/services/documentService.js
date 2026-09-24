const fs = require('fs');
const documentRepository = require('../repositories/documentRepository');
const env = require('../config/env');

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
  const document = await documentRepository.createDocument({
    userId,
    fileName: file.originalname,
    filePath: file.path,
    documentType: 'RECEIPT',
  });
  const extraction = await requestOcr(file);
  if (extraction.status !== 'COMPLETED') {
    await documentRepository.updateStatus(document.document_id, userId, extraction.status);
    return { document, status: extraction.status, message: extraction.message };
  }
  const transaction = await documentRepository.createTransaction({
    documentId: document.document_id,
    amount: extraction.amount,
    date: extraction.date,
    merchant: extraction.merchant,
    rawText: extraction.raw_text,
    confidence: extraction.confidence,
  });
  await documentRepository.updateStatus(document.document_id, userId, 'AWAITING_CONFIRMATION');
  return { document, transaction, extraction, status: 'AWAITING_CONFIRMATION' };
}

module.exports = { processReceipt };

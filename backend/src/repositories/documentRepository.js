const db = require('../config/database');

async function createDocument({ userId, fileName, filePath, documentType }) {
  const result = await db.query(
    `INSERT INTO financial_documents (user_id, file_name, file_path, document_type, processing_status)
     VALUES ($1, $2, $3, $4, 'PROCESSING') RETURNING *`,
    [userId, fileName, filePath, documentType || 'RECEIPT']
  );
  return result.rows[0];
}

async function updateStatus(documentId, userId, status) {
  const result = await db.query(
    `UPDATE financial_documents SET processing_status = $1 WHERE document_id = $2 AND user_id = $3 RETURNING *`,
    [status, documentId, userId]
  );
  return result.rows[0] || null;
}

async function createTransaction({ documentId, amount, date, merchant, rawText, confidence }) {
  const result = await db.query(
    `INSERT INTO document_transactions
      (document_id, extracted_amount, extracted_date, extracted_merchant, raw_ocr_text, confidence_score)
     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
    [documentId, amount ?? null, date || null, merchant || null, rawText || null, confidence ?? null]
  );
  return result.rows[0];
}

module.exports = { createDocument, updateStatus, createTransaction };

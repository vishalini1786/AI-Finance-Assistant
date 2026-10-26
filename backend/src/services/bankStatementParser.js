// bankStatementParser.js
// Handles CSV and XLSX statement parsing, automated column detection, and normalization.

const XLSX = require('xlsx');

function parseBankDate(val) {
  if (val === null || val === undefined || val === '') return null;

  // Handle Excel serial date numbers (e.g. 45000)
  if (typeof val === 'number') {
    const epoch = new Date(Date.UTC(1899, 11, 30));
    epoch.setUTCDate(epoch.getUTCDate() + Math.floor(val));
    return epoch.toISOString().slice(0, 10);
  }

  const str = String(val).trim();
  if (!str) return null;

  // YYYY-MM-DD or YYYY/MM/DD
  const mIso = str.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})/);
  if (mIso) {
    const y = mIso[1];
    const m = mIso[2].padStart(2, '0');
    const d = mIso[3].padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // DD/MM/YYYY or DD-MM-YYYY (most common in bank statements)
  const mDmy = str.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/);
  if (mDmy) {
    const d = mDmy[1].padStart(2, '0');
    const m = mDmy[2].padStart(2, '0');
    const y = mDmy[3];
    return `${y}-${m}-${d}`;
  }

  // Fallback to JS Date parser
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

function parseAmount(val) {
  if (val === null || val === undefined || val === '') return null;
  if (typeof val === 'number') return isNaN(val) ? null : val;

  // Clean strings like "₹ 1,250.50", "1,250.50 Cr", "(1,250.50)"
  let str = String(val).trim();
  const isParenthesisNegative = /^\(.*\)$/.test(str);
  str = str.replace(/[₹$,\s]/g, '');
  str = str.replace(/[()]/g, '');

  const num = parseFloat(str);
  if (isNaN(num)) return null;

  return isParenthesisNegative ? -Math.abs(num) : num;
}

function detectColumns(headers) {
  const mapping = {
    dateColumn: null,
    descriptionColumn: null,
    debitColumn: null,
    creditColumn: null,
    amountColumn: null,
    typeColumn: null,
    referenceColumn: null,
    balanceColumn: null,
  };

  const normHeaders = headers.map((h) => ({
    original: h,
    clean: String(h).trim().toLowerCase().replace(/[^a-z0-9]/g, '_'),
  }));

  for (const { original, clean } of normHeaders) {
    // Date
    if (!mapping.dateColumn && (clean.includes('date') || clean.includes('txn_dt') || clean.includes('valuedate'))) {
      mapping.dateColumn = original;
    }
    // Description / Narration
    else if (!mapping.descriptionColumn && (
      clean.includes('desc') ||
      clean.includes('narration') ||
      clean.includes('particular') ||
      clean.includes('remark') ||
      clean.includes('details') ||
      clean.includes('payee')
    )) {
      mapping.descriptionColumn = original;
    }
    // Debit
    else if (!mapping.debitColumn && (
      clean === 'dr' ||
      clean.includes('debit') ||
      clean.includes('withdrawal') ||
      clean.includes('spent') ||
      clean.includes('outflow')
    )) {
      mapping.debitColumn = original;
    }
    // Credit
    else if (!mapping.creditColumn && (
      clean === 'cr' ||
      clean.includes('credit') ||
      clean.includes('deposit') ||
      clean.includes('received') ||
      clean.includes('inflow')
    )) {
      mapping.creditColumn = original;
    }
    // General Amount
    else if (!mapping.amountColumn && (clean.includes('amount') || clean === 'amt' || clean.includes('txn_amt'))) {
      mapping.amountColumn = original;
    }
    // Type / Direction
    else if (!mapping.typeColumn && (clean.includes('type') || clean.includes('cr_dr') || clean.includes('dr_cr') || clean === 'mode')) {
      mapping.typeColumn = original;
    }
    // Reference / Cheque No
    else if (!mapping.referenceColumn && (
      clean.includes('ref') ||
      clean.includes('chq') ||
      clean.includes('cheque') ||
      clean.includes('utr') ||
      clean.includes('trans_id') ||
      clean.includes('txn_id')
    )) {
      mapping.referenceColumn = original;
    }
    // Balance
    else if (!mapping.balanceColumn && (clean.includes('balance') || clean.includes('bal'))) {
      mapping.balanceColumn = original;
    }
  }

  return mapping;
}

/**
 * Parses buffer (CSV, XLSX, XLS) into header list and raw rows.
 */
function parseFileToRawRows(buffer) {
  const workbook = XLSX.read(buffer, {
    type: 'buffer',
    raw: false,
    cellDates: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Bank statement workbook contains no readable sheets.');
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, {
    header: 1, // array of arrays
    defval: '',
    blankrows: false,
  });

  if (rawRows.length === 0) {
    throw new Error('Uploaded bank statement is empty.');
  }

  // Find header row (usually the first row with multiple non-empty columns)
  let headerIndex = 0;
  for (let i = 0; i < Math.min(rawRows.length, 10); i++) {
    const row = rawRows[i];
    const filledCount = row.filter((cell) => cell !== null && cell !== undefined && String(cell).trim() !== '').length;
    if (filledCount >= 2) {
      headerIndex = i;
      break;
    }
  }

  const headers = rawRows[headerIndex].map((h, idx) => (h ? String(h).trim() : `Column_${idx + 1}`));
  const dataRows = [];

  for (let i = headerIndex + 1; i < rawRows.length; i++) {
    const rowArr = rawRows[i];
    if (!rowArr || rowArr.length === 0) continue;

    // Check if entire row is empty
    const hasData = rowArr.some((c) => c !== null && c !== undefined && String(c).trim() !== '');
    if (!hasData) continue;

    const rowObj = {};
    headers.forEach((h, colIdx) => {
      rowObj[h] = rowArr[colIdx] !== undefined ? rowArr[colIdx] : '';
    });
    dataRows.push(rowObj);
  }

  return {
    headers,
    dataRows,
    sheetName,
  };
}

/**
 * Normalizes a data row given column mappings into internal transaction model.
 */
function normalizeRow(row, mapping, rowIndex) {
  const dateVal = row[mapping.dateColumn];
  const descVal = row[mapping.descriptionColumn];
  const refVal = mapping.referenceColumn ? row[mapping.referenceColumn] : null;

  const transactionDate = parseBankDate(dateVal);
  const description = descVal ? String(descVal).trim() : 'Bank Transaction';
  const referenceNo = refVal ? String(refVal).trim() : null;

  let amount = null;
  let direction = null;

  // Case A: Separate debit and credit columns
  if (mapping.debitColumn && mapping.creditColumn) {
    const debVal = parseAmount(row[mapping.debitColumn]);
    const credVal = parseAmount(row[mapping.creditColumn]);

    if (debVal !== null && debVal > 0) {
      amount = debVal;
      direction = 'DEBIT';
    } else if (credVal !== null && credVal > 0) {
      amount = credVal;
      direction = 'CREDIT';
    } else if (debVal !== null && debVal < 0) {
      amount = Math.abs(debVal);
      direction = 'DEBIT';
    }
  }

  // Case B: Combined amount column + type column
  if (amount === null && mapping.amountColumn) {
    const parsedAmt = parseAmount(row[mapping.amountColumn]);
    if (parsedAmt !== null && parsedAmt !== 0) {
      amount = Math.abs(parsedAmt);
      if (parsedAmt < 0) {
        direction = 'DEBIT';
      } else {
        // Check type column if present
        if (mapping.typeColumn && row[mapping.typeColumn]) {
          const t = String(row[mapping.typeColumn]).trim().toUpperCase();
          if (t.includes('DR') || t.includes('DEBIT') || t.includes('OUT') || t.includes('WITHDRAW')) {
            direction = 'DEBIT';
          } else {
            direction = 'CREDIT';
          }
        } else {
          direction = 'CREDIT';
        }
      }
    }
  }

  // Validation checks
  const errors = [];
  if (!transactionDate) {
    errors.push('Invalid or missing transaction date');
  }
  if (!description || description.length === 0) {
    errors.push('Missing description');
  }
  if (amount === null || isNaN(amount) || amount <= 0) {
    errors.push('Invalid or zero transaction amount');
  }
  if (!direction || (direction !== 'DEBIT' && direction !== 'CREDIT')) {
    errors.push('Unable to determine transaction direction (DEBIT or CREDIT)');
  }

  const isValid = errors.length === 0;

  return {
    rowIndex: rowIndex + 1,
    transactionDate,
    description,
    amount: amount ? Number(amount.toFixed(2)) : 0,
    direction: direction || 'DEBIT',
    referenceNo,
    isValid,
    validationError: errors.join(', ') || null,
    rawRow: row,
  };
}

module.exports = {
  parseBankDate,
  parseAmount,
  detectColumns,
  parseFileToRawRows,
  normalizeRow,
};

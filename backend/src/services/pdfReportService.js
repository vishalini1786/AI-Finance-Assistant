const PDFDocument = require('pdfkit');
const db = require('../config/database');
const reportService = require('./reportService');
const goalService = require('./goalService');
const expenseRepository = require('../repositories/expenseRepository');

function currency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Enhanced PDF Financial Report Generation with Assets, Liabilities,
 * Net Worth, MoM Insights, and multi-page safety.
 */
async function createReport(userId, response, queryParams = {}) {
  // Fetch unified report data matching on-screen calculations
  const [reportData, goals] = await Promise.all([
    reportService.getComprehensiveReport(userId, queryParams),
    goalService.getGoals(userId).catch(() => []),
  ]);

  const {
    periodLabel,
    startDate,
    endDate,
    summary,
    momComparison,
    categoryExpenses,
    assets,
    liabilities,
    observations,
  } = reportData;

  const document = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', 'attachment; filename="finman-financial-report.pdf"');
  document.pipe(response);

  // Multi-page helper
  const checkPageBreak = (neededHeight) => {
    if (document.y + neededHeight > 730) {
      document.addPage();
      drawPageHeaderMini();
    }
  };

  const drawPageHeaderMini = () => {
    document.rect(0, 0, 595, 35).fill('#0F172A');
    document.fillColor('#FFFFFF').fontSize(10).text('FinMan — AI Finance Assistant | Financial Report', 50, 12);
    document.fillColor('#94A3B8').fontSize(9).text(periodLabel, 545 - document.widthOfString(periodLabel), 12);
    document.y = 55;
  };

  // 1. Main Header
  document.rect(0, 0, 595, 100).fill('#0F172A');
  document.fillColor('#FFFFFF').fontSize(24).text('FinMan', 50, 25, { continued: true })
    .fontSize(12).fillColor('#94A3B8').text('  AI Personal Finance Assistant');
  document.fontSize(13).fillColor('#38BDF8').text('Comprehensive Financial & Position Report', 50, 55);
  const genDateStr = `Generated on ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  document.fontSize(9).fillColor('#94A3B8').text(`Period: ${periodLabel} | Dates: ${startDate} to ${endDate} | ${genDateStr}`, 50, 75);

  document.y = 120;

  // 2. Financial Summary Section
  document.fillColor('#0F172A').fontSize(15).text('Executive Financial Summary', 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(1);

  const drawStatBox = (label, value, x, y, valueColor = '#0F172A') => {
    document.rect(x, y, 155, 46).fillAndStroke('#F8FAFC', '#E2E8F0');
    document.fontSize(8.5).fillColor('#64748B').text(label.toUpperCase(), x + 10, y + 8);
    document.fontSize(11.5).fillColor(valueColor).text(value, x + 10, y + 23);
  };

  let rowY = document.y;
  drawStatBox('Total Income', currency(summary.totalIncome), 50, rowY, '#059669');
  drawStatBox('Total Expenses', currency(summary.totalExpenses), 215, rowY, '#DC2626');
  drawStatBox('Net Cash Flow', currency(summary.netCashFlow), 380, rowY, summary.netCashFlow >= 0 ? '#059669' : '#DC2626');

  rowY += 54;
  drawStatBox('Period Savings', currency(summary.periodSavings), 50, rowY, '#2563EB');
  drawStatBox('Total Assets', currency(summary.totalAssets), 215, rowY, '#0284C7');
  drawStatBox('Total Liabilities', currency(summary.totalLiabilities), 380, rowY, '#D97706');

  rowY += 54;
  // Net Worth Highlight Box
  document.rect(50, rowY, 320, 46).fillAndStroke('#EFF6FF', '#BFDBFE');
  document.fontSize(8.5).fillColor('#1E40AF').text('NET WORTH (ASSETS - LIABILITIES)', 60, rowY + 8);
  document.fontSize(13).fillColor('#1E3A8A').text(currency(summary.netWorth), 60, rowY + 22);

  drawStatBox('Loan Repayments', currency(summary.loanRepayments), 380, rowY, '#475569');

  document.y = rowY + 60;

  // 3. Automated Observations
  if (observations.length > 0) {
    checkPageBreak(80);
    document.fillColor('#0F172A').fontSize(13).text('Key Financial Observations', 50);
    document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
    document.moveDown(0.8);

    observations.forEach((obs) => {
      checkPageBreak(30);
      document.fontSize(9.5).fillColor('#0F172A').text(`• ${obs.title}: `, 50, document.y, { continued: true })
        .fillColor('#475569').text(obs.text);
      document.moveDown(0.4);
    });
    document.moveDown(1);
  }

  // 4. Month-over-Month Comparison Table
  if (momComparison && momComparison.hasPriorData !== false) {
    checkPageBreak(120);
    document.fillColor('#0F172A').fontSize(13).text('Period-over-Period Performance', 50);
    document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
    document.moveDown(0.8);

    // Table Header
    const thY = document.y;
    document.rect(50, thY, 495, 20).fill('#F1F5F9');
    document.fontSize(8.5).fillColor('#475569')
      .text('METRIC', 60, thY + 5)
      .text('CURRENT', 180, thY + 5)
      .text('PREVIOUS', 280, thY + 5)
      .text('ABSOLUTE CHANGE', 380, thY + 5)
      .text('CHANGE %', 480, thY + 5);

    let trY = thY + 22;
    const momRows = [
      ['Income', summary.totalIncome, momComparison.income.previous, momComparison.income.absoluteChange, momComparison.income.percentageChange],
      ['Expenses', summary.totalExpenses, momComparison.expenses.previous, momComparison.expenses.absoluteChange, momComparison.expenses.percentageChange],
      ['Net Cash Flow', summary.netCashFlow, momComparison.netCashFlow.previous, momComparison.netCashFlow.absoluteChange, momComparison.netCashFlow.percentageChange],
      ['Period Savings', summary.periodSavings, momComparison.savings.previous, momComparison.savings.absoluteChange, momComparison.savings.percentageChange],
    ];

    momRows.forEach(([metric, curr, prev, absChg, pctChg]) => {
      document.rect(50, trY, 495, 18).stroke('#F1F5F9');
      const pctStr = pctChg != null ? `${pctChg > 0 ? '+' : ''}${pctChg}%` : 'N/A';
      const absStr = `${absChg > 0 ? '+' : ''}${currency(absChg)}`;

      document.fontSize(8.5).fillColor('#1E293B').text(metric, 60, trY + 4);
      document.fontSize(8.5).fillColor('#475569').text(currency(curr), 180, trY + 4);
      document.fontSize(8.5).fillColor('#475569').text(currency(prev), 280, trY + 4);
      document.fontSize(8.5).fillColor(absChg >= 0 ? '#059669' : '#DC2626').text(absStr, 380, trY + 4);
      document.fontSize(8.5).fillColor('#1E293B').text(pctStr, 480, trY + 4);
      trY += 20;
    });

    document.y = trY + 10;
  }

  // 5. Category Spending Breakdown
  checkPageBreak(120);
  document.fillColor('#0F172A').fontSize(13).text('Expense Breakdown by Category', 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(0.8);

  if (categoryExpenses.length === 0) {
    document.fontSize(9.5).fillColor('#64748B').text('No category expenses recorded for this period.');
    document.moveDown(1);
  } else {
    const maxAmount = Math.max(...categoryExpenses.map((c) => Number(c.total_amount)));
    let barY = document.y;
    categoryExpenses.slice(0, 8).forEach((cat) => {
      checkPageBreak(25);
      barY = document.y;
      const amt = Number(cat.total_amount);
      const barWidth = maxAmount > 0 ? (amt / maxAmount) * 200 : 0;

      document.fontSize(9).fillColor('#1E293B').text(cat.category_name, 50, barY, { width: 110, ellipsis: true });
      document.rect(165, barY - 1, barWidth, 11).fill('#3B82F6');
      document.fontSize(8.5).fillColor('#475569').text(`${currency(amt)} (${cat.percentage}%)`, 175 + barWidth, barY);
      document.y = barY + 20;
    });
    document.moveDown(0.8);
  }

  // 6. Assets & Investments Section
  checkPageBreak(120);
  document.fillColor('#0F172A').fontSize(13).text(`Assets & Holdings (${currency(assets.total)})`, 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(0.8);

  if (assets.items.length === 0) {
    document.fontSize(9.5).fillColor('#64748B').text('No assets or investment holdings recorded.');
    document.moveDown(1);
  } else {
    const thY = document.y;
    document.rect(50, thY, 495, 18).fill('#F1F5F9');
    document.fontSize(8).fillColor('#475569')
      .text('HOLDING / ASSET', 60, thY + 4)
      .text('TYPE', 200, thY + 4)
      .text('CURRENT VALUE', 320, thY + 4)
      .text('PURCHASE VALUE', 430, thY + 4);

    let trY = thY + 20;
    assets.items.slice(0, 10).forEach((item) => {
      checkPageBreak(22);
      trY = document.y;
      document.rect(50, trY, 495, 18).stroke('#F1F5F9');
      document.fontSize(8.5).fillColor('#1E293B').text(item.name, 60, trY + 4, { width: 135, ellipsis: true });
      document.fontSize(8.5).fillColor('#64748B').text(String(item.holding_type || '').replace('_', ' '), 200, trY + 4);
      document.fontSize(8.5).fillColor('#0F172A').text(currency(item.current_value), 320, trY + 4);
      document.fontSize(8.5).fillColor('#64748B').text(item.purchase_value ? currency(item.purchase_value) : '—', 430, trY + 4);
      document.y = trY + 20;
    });
    document.moveDown(0.8);
  }

  // 7. Liabilities & Loans Section
  checkPageBreak(120);
  document.fillColor('#0F172A').fontSize(13).text(`Liabilities & Outstanding Debt (${currency(liabilities.total)})`, 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(0.8);

  if (liabilities.items.length === 0) {
    document.fontSize(9.5).fillColor('#64748B').text('No active liabilities or loans recorded.');
    document.moveDown(1);
  } else {
    const thY = document.y;
    document.rect(50, thY, 495, 18).fill('#F1F5F9');
    document.fontSize(8).fillColor('#475569')
      .text('LIABILITY / LOAN', 60, thY + 4)
      .text('TYPE', 200, thY + 4)
      .text('REMAINING', 300, thY + 4)
      .text('INTEREST RATE', 390, thY + 4)
      .text('DUE DATE', 480, thY + 4);

    let trY = thY + 20;
    liabilities.items.slice(0, 10).forEach((item) => {
      checkPageBreak(22);
      trY = document.y;
      document.rect(50, trY, 495, 18).stroke('#F1F5F9');
      document.fontSize(8.5).fillColor('#1E293B').text(item.name, 60, trY + 4, { width: 135, ellipsis: true });
      document.fontSize(8.5).fillColor('#64748B').text(String(item.liability_type || 'Loan').replace('_', ' '), 200, trY + 4);
      document.fontSize(8.5).fillColor('#DC2626').text(currency(item.remaining_amount), 300, trY + 4);
      document.fontSize(8.5).fillColor('#64748B').text(item.interest_rate ? `${item.interest_rate}%` : '0%', 390, trY + 4);
      document.fontSize(8.5).fillColor('#64748B').text(item.due_date || '—', 480, trY + 4);
      document.y = trY + 20;
    });
    document.moveDown(0.8);
  }

  // 8. Savings Goals Summary
  if (goals.length > 0) {
    checkPageBreak(90);
    document.fillColor('#0F172A').fontSize(13).text('Active Savings Goals', 50);
    document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
    document.moveDown(0.8);

    goals.slice(0, 6).forEach((goal) => {
      checkPageBreak(25);
      const pct = goal.progress_percent || (goal.target_amount > 0 ? Math.round((goal.current_amount / goal.target_amount) * 100) : 0);
      document.fontSize(9).fillColor('#0F172A').text(goal.goal_name, 50, document.y, { continued: true })
        .fillColor('#64748B').text(` — Saved ${currency(goal.current_amount)} of ${currency(goal.target_amount)} (${pct}% progress)`);
      document.moveDown(0.4);
    });
    document.moveDown(0.8);
  }

  // Number all pages cleanly
  const range = document.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    document.switchToPage(i);
    document.fontSize(8).fillColor('#94A3B8')
      .text(
        `FinMan AI Finance Assistant  |  Page ${i + 1} of ${range.count}  |  Confidential Financial Record`,
        50,
        780,
        { align: 'center', width: 495 }
      );
  }

  document.end();
}

async function createDailyReport(userId, response, date) {
  const expenses = await expenseRepository.findByDate(userId, date);
  const summary = await expenseRepository.getDailySummary(userId, date);

  const byCat = {};
  expenses.forEach((e) => {
    if (!byCat[e.category_name]) byCat[e.category_name] = 0;
    byCat[e.category_name] += Number(e.amount);
  });

  const document = new PDFDocument({ margin: 50, size: 'A4', bufferPages: true });
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', `attachment; filename="finman-daily-${date}.pdf"`);
  document.pipe(response);

  // Header
  document.rect(0, 0, 595, 100).fill('#0F172A');
  document.fillColor('#FFFFFF').fontSize(24).text('FinMan', 50, 25, { continued: true })
    .fontSize(12).fillColor('#94A3B8').text('  AI Personal Finance Assistant');
  document.fontSize(12).fillColor('#38BDF8').text('Daily Financial Report', 50, 55);
  document.fontSize(10).fillColor('#94A3B8').text(`Date: ${date}`, 50, 75);
  document.moveDown(3);

  // Summary
  document.fillColor('#0F172A').fontSize(15).text('Day Summary', 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(1);

  const yPos = document.y;
  document.fontSize(9).fillColor('#64748B').text('TOTAL EXPENSES', 50, yPos);
  document.fontSize(14).fillColor('#DC2626').text(currency(summary.total_expenses), 50, yPos + 15);

  document.fontSize(9).fillColor('#64748B').text('TRANSACTIONS COUNT', 220, yPos);
  document.fontSize(14).fillColor('#0F172A').text(String(summary.transaction_count || 0), 220, yPos + 15);

  document.y = yPos + 50;
  document.moveDown(1);

  // Category Breakdown
  document.fillColor('#0F172A').fontSize(14).text('Spending by Category', 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(1);

  const maxCat = Math.max(...Object.values(byCat), 1);
  let chartY = document.y;
  Object.entries(byCat).forEach(([cat, amt]) => {
    const barW = (amt / maxCat) * 220;
    document.fontSize(9.5).fillColor('#334155').text(cat, 50, chartY);
    document.rect(160, chartY - 2, barW, 12).fill('#2563EB');
    document.fontSize(9.5).fillColor('#64748B').text(currency(amt), 165 + barW, chartY);
    chartY += 24;
  });

  document.y = chartY + 15;
  document.moveDown(1);

  // Transactions list
  document.fillColor('#0F172A').fontSize(14).text('Transaction Ledger', 50);
  document.moveTo(50, document.y + 4).lineTo(545, document.y + 4).stroke('#E2E8F0');
  document.moveDown(1);

  if (expenses.length === 0) {
    document.fontSize(10).fillColor('#64748B').text('No expense transactions recorded for this day.');
  } else {
    expenses.forEach((e) => {
      const timeLabel = e.created_at ? new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
      document.fontSize(10).fillColor('#0F172A').text(`${e.category_name}${e.merchant_name ? ' — ' + e.merchant_name : ''}`, 50, document.y, { continued: true })
        .fontSize(10).fillColor('#DC2626').text(`  -${currency(e.amount)}`, { align: 'right' });
      document.fontSize(8.5).fillColor('#94A3B8').text(`${e.payment_mode || 'Manual'} | ${timeLabel} | ${e.description || 'No description'}`, 50);
      document.moveDown(0.4);
    });
  }

  const range = document.bufferedPageRange();
  for (let i = range.start; i < range.start + range.count; i++) {
    document.switchToPage(i);
    document.fontSize(8).fillColor('#94A3B8')
      .text(`FinMan Daily Report | Page ${i + 1} of ${range.count}`, 50, 780, { align: 'center', width: 495 });
  }

  document.end();
}

module.exports = {
  createReport,
  createDailyReport,
};

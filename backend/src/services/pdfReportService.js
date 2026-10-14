const PDFDocument = require('pdfkit');
const dashboardService = require('./dashboardService');
const goalService = require('./goalService');
const holdingService = require('./holdingService');
const expenseRepository = require('../repositories/expenseRepository');

function currency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

async function createReport(userId, response, queryParams = {}) {
  const [summary, categories, goals, holdings] = await Promise.all([
    dashboardService.getSummary(userId, queryParams),
    dashboardService.getCategoryExpenses(userId, queryParams),
    goalService.getGoals(userId),
    holdingService.getHoldings(userId),
  ]);

  let periodText = 'All-Time';
  if (queryParams.startDate && queryParams.endDate) {
    const s = new Date(queryParams.startDate);
    const e = new Date(queryParams.endDate);
    if (s.getMonth() === e.getMonth() && s.getFullYear() === e.getFullYear()) {
      periodText = s.toLocaleString('default', { month: 'long', year: 'numeric' });
    } else {
      periodText = `${queryParams.startDate} to ${queryParams.endDate}`;
    }
  } else if (queryParams.startDate) {
    periodText = `From ${queryParams.startDate}`;
  }

  const document = new PDFDocument({ margin: 50, size: 'A4' });
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', 'attachment; filename="finman-financial-report.pdf"');
  document.pipe(response);
  
  // Header
  document.rect(0, 0, 595, 100).fill('#0F172A');
  document.fillColor('#FFFFFF').fontSize(24).text('FinMan', 50, 25, { continued: true }).fontSize(12).text('  AI Finance Personal Assistant');
  document.fontSize(12).fillColor('#38BDF8').text('Financial Report', 50, 55);
  document.fontSize(10).fillColor('#94A3B8').text(periodText, 50, 75);
  
  document.moveDown(3);
  
  // Summary Section
  document.fillColor('#0F172A').fontSize(16).text('Financial Summary', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  
  const drawStat = (label, value, x, y) => {
    document.fontSize(10).fillColor('#64748B').text(label, x, y);
    document.fontSize(14).fillColor('#0F172A').text(value, x, y + 15);
  };
  
  let currentY = document.y;
  drawStat('Total Income', currency(summary.totalIncome), 50, currentY);
  drawStat('Total Expenses', currency(summary.totalExpenses), 200, currentY);
  drawStat('Net Cash Flow', currency(summary.netCashFlow), 350, currentY);
  
  currentY += 50;
  drawStat('Period Savings', currency(summary.periodSavings), 50, currentY);
  drawStat('Total Assets', currency(summary.totalAssets), 200, currentY);
  drawStat('Total Liabilities', currency(summary.totalLiabilities), 350, currentY);
  
  document.y = currentY + 50;
  document.moveDown(2);
  
  // Category Bar Chart
  document.fillColor('#0F172A').fontSize(16).text('Category Spending', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  
  if (categories.length === 0) {
    document.fontSize(10).fillColor('#64748B').text('No category spending recorded.');
  } else {
    const maxAmount = Math.max(...categories.map(c => Number(c.total_amount)));
    let chartY = document.y;
    categories.forEach((category) => {
      const amount = Number(category.total_amount);
      const width = maxAmount > 0 ? (amount / maxAmount) * 300 : 0;
      
      document.fontSize(10).fillColor('#334155').text(category.category_name, 50, chartY);
      
      document.rect(150, chartY - 2, width, 12).fill('#2563EB');
      
      document.fontSize(10).fillColor('#64748B').text(currency(amount), 160 + width, chartY);
      chartY += 25;
    });
    document.y = chartY;
  }
  
  document.moveDown(2);
  
  // Goals & Investments
  document.fillColor('#0F172A').fontSize(16).text('Savings Goals', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  
  if (goals.length === 0) {
    document.fontSize(10).fillColor('#64748B').text('No savings goals recorded.');
  } else {
    goals.forEach((goal) => {
      document.fontSize(12).fillColor('#0F172A').text(goal.goal_name);
      document.fontSize(10).fillColor('#64748B').text(`Saved: ${currency(goal.current_amount)} / ${currency(goal.target_amount)} (${goal.progress_percent}%)`);
      document.moveDown(0.5);
    });
  }
  
  document.moveDown(2);
  document.fillColor('#0F172A').fontSize(16).text('Investments', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  
  if (holdings.length === 0) {
    document.fontSize(10).fillColor('#64748B').text('No investments recorded.');
  } else {
    holdings.forEach((holding) => {
      document.fontSize(12).fillColor('#0F172A').text(holding.name);
      document.fontSize(10).fillColor('#64748B').text(`Type: ${holding.holding_type.replace('_', ' ')} | Value: ${currency(holding.current_value)} | Qty: ${holding.quantity}`);
      document.moveDown(0.5);
    });
  }

  // Footer
  document.fontSize(8).fillColor('#94A3B8').text('This report was generated by FinMan AI Finance Assistant.', 50, 750, { align: 'center' });

  document.end();
}

async function createDailyReport(userId, response, date) {
  const expenses = await expenseRepository.findByDate(userId, date);
  const summary = await expenseRepository.getDailySummary(userId, date);
  
  // Group by category
  const byCat = {};
  expenses.forEach(e => {
    if (!byCat[e.category_name]) byCat[e.category_name] = 0;
    byCat[e.category_name] += Number(e.amount);
  });

  const document = new PDFDocument({ margin: 50, size: 'A4' });
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', `attachment; filename="finman-daily-${date}.pdf"`);
  document.pipe(response);

  // Header
  document.rect(0, 0, 595, 100).fill('#0F172A');
  document.fillColor('#FFFFFF').fontSize(24).text('FinMan', 50, 25, { continued: true }).fontSize(12).text('  AI Finance Personal Assistant');
  document.fontSize(12).fillColor('#38BDF8').text('Daily Financial Report', 50, 55);
  document.fontSize(10).fillColor('#94A3B8').text(date, 50, 75);
  document.moveDown(3);

  // Summary
  document.fillColor('#0F172A').fontSize(16).text('Day Summary', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  
  let yPos = document.y;
  document.fontSize(10).fillColor('#64748B').text('Total Expenses', 50, yPos);
  document.fontSize(14).fillColor('#EF4444').text(currency(summary.total_expenses), 50, yPos + 15);
  document.fontSize(10).fillColor('#64748B').text('Transactions', 200, yPos);
  document.fontSize(14).fillColor('#0F172A').text(String(summary.transaction_count || 0), 200, yPos + 15);
  document.y = yPos + 50;
  document.moveDown(2);

  // Category breakdown
  document.fillColor('#0F172A').fontSize(16).text('By Category', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  const maxCat = Math.max(...Object.values(byCat), 1);
  let chartY = document.y;
  Object.entries(byCat).forEach(([cat, amt]) => {
    const barW = (amt / maxCat) * 250;
    document.fontSize(10).fillColor('#334155').text(cat, 50, chartY);
    document.rect(160, chartY - 2, barW, 12).fill('#2563EB');
    document.fontSize(10).fillColor('#64748B').text(currency(amt), 165 + barW, chartY);
    chartY += 25;
  });
  document.y = chartY + 10;
  document.moveDown(2);

  // Transactions list
  document.fillColor('#0F172A').fontSize(16).text('Transactions', 50);
  document.moveTo(50, document.y + 5).lineTo(545, document.y + 5).stroke('#E2E8F0');
  document.moveDown(1.5);
  if (expenses.length === 0) {
    document.fontSize(10).fillColor('#64748B').text('No transactions recorded for this day.');
  } else {
    expenses.forEach(e => {
      const timeLabel = e.created_at ? new Date(e.created_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : '';
      document.fontSize(11).fillColor('#0F172A').text(`${e.category_name}${e.description ? ' — ' + e.description : ''}`, 50, document.y, { continued: true })
        .fontSize(11).fillColor('#EF4444').text(`  ${currency(e.amount)}`, { align: 'right' });
      document.fontSize(9).fillColor('#94A3B8').text(`${e.payment_mode || 'Manual'} | ${timeLabel}`, 50);
      document.moveDown(0.3);
    });
  }

  document.fontSize(8).fillColor('#94A3B8').text('Generated by FinMan AI Finance Assistant', 50, 750, { align: 'center' });
  document.end();
}

module.exports = { createReport, createDailyReport };

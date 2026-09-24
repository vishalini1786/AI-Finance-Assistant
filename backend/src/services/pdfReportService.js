const PDFDocument = require('pdfkit');
const dashboardService = require('./dashboardService');
const goalService = require('./goalService');
const holdingService = require('./holdingService');

function currency(value) {
  return `INR ${Number(value || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
}

async function createReport(userId, response) {
  const [summary, categories, goals, holdings] = await Promise.all([
    dashboardService.getSummary(userId),
    dashboardService.getCategoryExpenses(userId),
    goalService.getGoals(userId),
    holdingService.getHoldings(userId),
  ]);

  const document = new PDFDocument({ margin: 48, size: 'A4' });
  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', 'attachment; filename="finman-financial-report.pdf"');
  document.pipe(response);
  document.fontSize(20).text('FinMan', { continued: true }).fontSize(12).text('  AI Finance Personal Assistant');
  document.moveDown(0.5).fontSize(10).fillColor('#64748B').text(`Financial report generated ${new Date().toLocaleDateString('en-IN')}`);
  document.fillColor('#0F172A').moveDown().fontSize(14).text('Summary');
  document.fontSize(10).text(`Total income: ${currency(summary.totalIncome)}`)
    .text(`Total expenses: ${currency(summary.totalExpenses)}`)
    .text(`Net cash flow: ${currency(summary.netCashFlow)}`)
    .text(`Period savings: ${currency(summary.periodSavings)}`)
    .text(`Deficit: ${currency(summary.deficit)}`)
    .text(`Budget utilization: ${summary.budget.utilizationPercent}%`);

  document.moveDown().fontSize(14).text('Category spending');
  if (categories.length === 0) document.fontSize(10).text('No category spending recorded.');
  categories.forEach((category) => document.fontSize(10).text(`${category.category_name}: ${currency(category.total_amount)}`));

  document.moveDown().fontSize(14).text('Savings goals');
  if (goals.length === 0) document.fontSize(10).text('No savings goals recorded.');
  goals.forEach((goal) => document.fontSize(10).text(`${goal.goal_name}: ${currency(goal.current_amount)} of ${currency(goal.target_amount)} (${goal.progress_percent}%)`));

  document.moveDown().fontSize(14).text('Investments');
  if (holdings.length === 0) document.fontSize(10).text('No investments recorded.');
  holdings.forEach((holding) => document.fontSize(10).text(`${holding.name} (${holding.holding_type}): ${currency(holding.current_value)}`));
  document.end();
}

module.exports = { createReport };

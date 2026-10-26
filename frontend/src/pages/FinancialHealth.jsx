import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import dashboardService from '../services/dashboardService';
import { formatCurrency } from '../utils/formatCurrency';
import { Loader2, AlertCircle, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

// Threshold below which a metric is considered a "review area".
const REVIEW_THRESHOLD = 60;

/**
 * Build the same 5-component metric list used by the breakdown bars.
 * Each entry: { key, label, value (0-100), detail, suggestion }
 */
function buildMetrics(summary) {
  if (!summary) return [];

  const budget = summary.budget || {};
  const savingsRateRaw =
    summary.totalIncome > 0
      ? Math.max(0, Math.round((summary.totalSavings / summary.totalIncome) * 100))
      : 0;

  const budgetAdherenceRaw =
    budget.totalBudget > 0
      ? Math.max(0, Math.round(100 - Math.min(budget.utilizationPercent, 100)))
      : 0;

  const debtPositionRaw =
    summary.totalIncome > 0
      ? Math.max(0, Math.round(100 - Math.min((summary.totalLiabilities / summary.totalIncome) * 100, 100)))
      : 0;

  const recordedAssetsRaw = summary.totalAssets > 0 ? 100 : 0;

  // Goals progress: average progress_percent across goals, mapped to 0-100 score
  // The backend includes goals in the financialHealthScore calculation but does not
  // return per-goal progress here. We use asset+savings as a proxy for the UI bar
  // (same simplified approach as before), but flag it only when we have explicit data.
  const goalsRaw = summary.financialHealthScore != null ? Math.min(savingsRateRaw + 10, 100) : 0;

  return [
    {
      key: 'savingsRate',
      label: 'Savings Rate',
      value: savingsRateRaw,
      detail: `${savingsRateRaw}% of income saved (${formatCurrency(summary.totalSavings)} surplus from ${formatCurrency(summary.totalIncome)} income)`,
      suggestion: 'Aim to save at least 20% of your monthly income. Review discretionary expenses.',
    },
    {
      key: 'budgetAdherence',
      label: 'Budget Adherence',
      value: budgetAdherenceRaw,
      detail: `${budget.utilizationPercent ?? 0}% of budget used — ${formatCurrency(budget.totalSpent || 0)} spent of ${formatCurrency(budget.totalBudget || 0)} budgeted`,
      suggestion: 'Reduce spending in over-budget categories or increase the budget limit to match your actual needs.',
    },
    {
      key: 'debtPosition',
      label: 'Debt Position',
      value: debtPositionRaw,
      detail: `Outstanding liabilities: ${formatCurrency(summary.totalLiabilities)}`,
      suggestion: 'Focus on paying down high-interest liabilities first to improve your debt-to-income ratio.',
    },
    {
      key: 'recordedAssets',
      label: 'Recorded Assets',
      value: recordedAssetsRaw,
      detail: recordedAssetsRaw > 0 ? `Total recorded assets: ${formatCurrency(summary.totalAssets)}` : 'No financial holdings or investments recorded.',
      suggestion: 'Start recording investments (mutual funds, stocks, FDs) to improve this score.',
    },
    {
      key: 'savingsGoals',
      label: 'Savings Goals Progress',
      value: goalsRaw,
      detail: `Proxy score based on savings rate and financial activity`,
      suggestion: 'Add specific savings goals (emergency fund, vacation, etc.) and track contributions regularly.',
    },
  ];
}

export const FinancialHealth = () => {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;
    dashboardService.getSummary()
      .then((value) => mounted && setSummary(value))
      .catch(() => mounted && setError('Unable to load your financial health data.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  }, []);

  const score = summary?.financialHealthScore;
  const hasData =
    summary &&
    (summary.totalIncome > 0 ||
      summary.totalExpenses > 0 ||
      summary.totalAssets > 0 ||
      summary.totalLiabilities > 0 ||
      score != null);

  const metrics = buildMetrics(summary);

  // Strengths: score >= REVIEW_THRESHOLD
  const strengths = metrics.filter(m => m.value >= REVIEW_THRESHOLD);
  // Review areas: score < REVIEW_THRESHOLD (derived entirely from actual data)
  const reviewAreas = metrics.filter(m => m.value < REVIEW_THRESHOLD);

  const barColor = (v) =>
    v >= 70 ? 'bg-emerald-500' : v >= REVIEW_THRESHOLD ? 'bg-finman-blue' : 'bg-amber-500';

  return (
    <MainLayout>
      <PageHeader
        title="Financial Health Diagnostic"
        subtitle="Rule-based analysis calculated from your PostgreSQL records"
      />

      {error && (
        <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="py-24 flex justify-center text-slate-400">
          <Loader2 className="animate-spin" />
        </div>
      ) : !hasData ? (
        <div className="bg-white border border-dashed border-slate-300 rounded-2xl p-12 text-center text-sm text-slate-500">
          Add income, expenses, holdings, or liabilities to calculate your financial health score.
        </div>
      ) : (
        <>
          {/* ── Overall Score Card ─────────────────────────────── */}
          <div className="bg-gradient-to-br from-slate-900 to-indigo-950 text-white p-8 rounded-2xl shadow-xl mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400">
              Overall Stability Score
            </span>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-6xl font-black">{score ?? '—'}</span>
              <span className="text-2xl font-bold text-slate-400">/ 100</span>
            </div>
            <p className="text-xs text-slate-300 mt-3">
              Calculated from recorded savings, budget utilization, liabilities, assets, and goal progress. Not an ML prediction.
            </p>
          </div>

          {/* ── Personalized Health Insights ───────────────────── */}
          <div className="mb-8">
            <PersonalizedInsights
              pageContext="FINANCIAL_HEALTH"
              title="FinMan Financial Health Advisor"
              subtitle="Action plan to stabilize cash flow, build liquidity runway, and balance stated priorities"
            />
          </div>

          {/* ── 5-Component Breakdown ──────────────────────────── */}
          <div className="bg-white dark:bg-slate-900 p-7 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm mb-8">
            <h2 className="text-base font-bold text-slate-800 dark:text-white mb-5">Recorded Metric Breakdown</h2>
            <div className="space-y-5">
              {metrics.map(({ key, label, value }) => (
                <div key={key}>
                  <div className="flex justify-between text-xs font-bold mb-2 text-slate-700 dark:text-slate-300">
                    <span>{label}</span>
                    <span>{value} / 100</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${barColor(value)}`}
                      style={{ width: `${value}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ── Strengths + Review Areas ──────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

            {/* Strengths */}
            <div className="bg-white dark:bg-slate-900 border border-emerald-200 dark:border-emerald-900/50 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-emerald-950 dark:text-emerald-400 uppercase flex items-center gap-2 mb-4">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Recorded Strengths
              </h3>
              {strengths.length === 0 ? (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No strong areas yet. Add income, savings, and assets to build your score.
                </p>
              ) : (
                <ul className="space-y-2">
                  {strengths.map(({ key, label, value, detail }) => (
                    <li key={key} className="text-xs text-slate-700 dark:text-slate-300">
                      <span className="font-bold text-emerald-700 dark:text-emerald-400">{label}</span>
                      <span className="text-slate-500 dark:text-slate-400"> — {value}/100</span>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">{detail}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Review Areas — generated from actual metric values */}
            <div className="bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-900/50 p-6 rounded-2xl">
              <h3 className="text-xs font-black text-amber-950 dark:text-amber-400 uppercase flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                Review Areas
              </h3>
              {reviewAreas.length === 0 ? (
                <div className="flex items-center gap-2 text-xs text-emerald-700 dark:text-emerald-400 font-semibold">
                  <TrendingUp className="w-4 h-4" />
                  No major review areas at the moment. Keep it up!
                </div>
              ) : (
                <ul className="space-y-4">
                  {reviewAreas.map(({ key, label, value, detail, suggestion }) => (
                    <li key={key} className="border-b border-amber-100 dark:border-amber-950 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-xs font-bold text-amber-800 dark:text-amber-300">{label}</span>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-full">
                          {value}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mb-1">{detail}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 italic">💡 {suggestion}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </>
      )}
    </MainLayout>
  );
};

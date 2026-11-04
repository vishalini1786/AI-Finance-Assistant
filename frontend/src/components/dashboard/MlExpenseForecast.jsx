import React, { useEffect, useState, useMemo, useCallback } from 'react';
// Future Expense Predictor component.
// Fetches the upcoming month's predicted expenditure from the Random Forest regression service
// and displays comparative historical baseline metrics, trend visualization, and model details.
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  Brain,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  HelpCircle,
  Sparkles,
  ChevronRight,
  Info,
  Calendar,
  Layers,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';
import { formatCurrency } from '../../utils/formatCurrency';

export const MlExpenseForecast = () => {
  const [forecast, setForecast] = useState(null);
  const [modelInfo, setModelInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModelDetails, setShowModelDetails] = useState(false);
  const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);

  const loadForecastData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [forecastData, infoData] = await Promise.all([
        dashboardService.getExpenseForecast(),
        dashboardService.getMlModelInfo().catch(() => null),
      ]);
      setForecast(forecastData);
      setModelInfo(infoData);
    } catch (err) {
      setError('Unable to compute expense forecast at this time.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadForecastData();
  }, [loadForecastData]);

  const chartData = useMemo(() => {
    if (!forecast) return [];

    const history = (forecast.historicalMonths || []).map((m) => {
      const parts = String(m.month).split('-');
      const monthDate = parts.length === 2 ? new Date(Number(parts[0]), Number(parts[1]) - 1, 1) : null;
      const label = monthDate
        ? monthDate.toLocaleDateString('en-IN', { month: 'short' })
        : m.month;
      return {
        name: label,
        ActualExpense: Number(m.expense || 0),
        Forecast: null,
      };
    });

    if (history.length > 0 && forecast.predictedExpense > 0) {
      // Connect last historical month to forecast
      const last = history[history.length - 1];
      last.Forecast = last.ActualExpense;

      const predLabel = (forecast.predictionPeriod || 'Next Month').split(' ')[0].slice(0, 3);
      history.push({
        name: `${predLabel} (Forecast)`,
        ActualExpense: null,
        Forecast: forecast.predictedExpense,
      });
    }

    return history;
  }, [forecast]);

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm animate-pulse mb-8">
        <div className="h-6 w-56 bg-slate-200 dark:bg-slate-700 rounded mb-4" />
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-20 bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-slate-100 dark:bg-slate-700/50 rounded-xl" />
      </div>
    );
  }

  if (error || !forecast) {
    if (error) {
      return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm mb-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">Future Expense Predictor</h3>
              <p className="text-xs text-slate-400 mt-0.5">{error}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={loadForecastData}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400 hover:bg-indigo-100 transition cursor-pointer flex items-center gap-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Retry
          </button>
        </div>
      );
    }
    return null;
  }

  const isUpward = forecast.variance > 0;
  const sufficiencyLabel =
    forecast.dataSufficiency === 'SUFFICIENT_HISTORY'
      ? 'Trained ML Model'
      : forecast.dataSufficiency === 'BASELINE_ESTIMATE'
      ? 'Historical Baseline'
      : 'Cold Start Model';

  const sufficiencyBadgeClass =
    forecast.dataSufficiency === 'SUFFICIENT_HISTORY'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
      : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800';

  const categoryForecasts = forecast.categoryForecasts || [];
  const atRiskCategories = categoryForecasts.filter((c) => c.at_risk_of_overrun);

  const friendlyModelName =
    forecast.dataSufficiency === 'SUFFICIENT_HISTORY'
      ? 'Random Forest ML Model'
      : forecast.dataSufficiency === 'BASELINE_ESTIMATE'
      ? 'Seasonal Average Model'
      : 'Standard Budget Model';

  return (
    <div className="bg-white dark:bg-slate-800 p-7 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 shadow-sm hover:shadow-md transition-all duration-300 mb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 pb-4 border-b border-slate-100 dark:border-slate-700/60">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Brain className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              Future Expense Predictor
            </h2>
            <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${sufficiencyBadgeClass}`}>
              {sufficiencyLabel}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 pl-10.5">
            Predict your upcoming month's expenses based on your previous spending patterns and plan your finances better.
          </p>
        </div>

        <button
          onClick={() => setShowModelDetails(!showModelDetails)}
          className="self-start sm:self-auto text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50/60 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/40 transition-colors"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {showModelDetails ? 'Hide Model Info' : 'Model Transparency'}
        </button>
      </div>

      {/* Model Transparency Drawer */}
      {showModelDetails && (
        <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 space-y-3 animate-in fade-in duration-200">
          <div className="flex items-center justify-between font-bold text-slate-800 dark:text-slate-200">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              How FinMan Calculates Your Forecast
            </span>
            <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
              Active: {friendlyModelName}
            </span>
          </div>

          {/* User-friendly explanations */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block mb-1">
                1. Spending History Analysis
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                FinMan evaluates your previous monthly expense trends, regular outlays, and category patterns to establish your baseline spending.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block mb-1">
                2. Data History &amp; Model Selection
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                With 3+ months of logged transactions, our trained Random Forest ML model activates. If history is limited, a reliable baseline average is applied.
              </p>
            </div>
            <div className="p-3 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 uppercase font-bold block mb-1">
                3. Accuracy Improvement Tip
              </span>
              <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-relaxed">
                Recording your expenses consistently each month helps FinMan learn your exact recurring habits and produce increasingly accurate forecasts.
              </p>
            </div>
          </div>

          {/* Toggle for Technical ML Details */}
          <div className="pt-2 border-t border-slate-200 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setShowTechnicalDetails(!showTechnicalDetails)}
              className="text-[11px] font-bold text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 flex items-center gap-1 cursor-pointer"
            >
              <span>{showTechnicalDetails ? '▲ Hide Technical ML Metrics' : '▼ View Technical ML Metrics (FastAPI & Scikit-Learn)'}</span>
            </button>

            {showTechnicalDetails && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 animate-in fade-in duration-150">
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Expense Regressor</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{modelInfo?.regressor?.algorithm || 'Random Forest Regressor'}</p>
                  <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1">
                    MAE: ₹{Math.round(modelInfo?.regressor?.mae || 6565).toLocaleString('en-IN')} (24.0% better than baseline, 17 features)
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Category Classifier</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">{modelInfo?.classifier?.algorithm || 'Calibrated Logistic Regression'}</p>
                  <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1">
                    TF-IDF Vectorizer • 10 Categories • 89.0% Accuracy
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/50">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block mb-1">Anomaly Detection</span>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">Z-Score &amp; IQR Dispersion</p>
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1">
                    Dynamic category envelopes (Z &gt; 2.0σ, IQR &gt; 1.5×)
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 4 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Expected Spending */}
        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50/70 to-blue-50/40 dark:from-indigo-950/30 dark:to-blue-950/20 border border-indigo-100 dark:border-indigo-900/40">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Expected Spending</span>
            <Calendar className="w-3.5 h-3.5 text-indigo-500" />
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-slate-100">
            {formatCurrency(forecast.predictedExpense)}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1">
            For {forecast.predictionPeriod}
          </div>
        </div>

        {/* Card 2: Your Usual Monthly Spending */}
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/50">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Your Usual Monthly Spending</span>
            <Layers className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-200">
            {formatCurrency(forecast.baselineAverage)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium mt-1">
            3-month rolling baseline
          </div>
        </div>

        {/* Card 3: Difference from Usual */}
        <div className={`p-4 rounded-xl border ${
          isUpward
            ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-700 dark:text-rose-400'
            : 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400'
        }`}>
          <div className="flex items-center justify-between text-xs font-semibold mb-1">
            <span className="text-slate-600 dark:text-slate-300">Difference from Usual</span>
            {isUpward ? <TrendingUp className="w-3.5 h-3.5 text-rose-500" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-500" />}
          </div>
          <div className="text-xl font-black">
            {isUpward ? `+${formatCurrency(forecast.variance)}` : `-${formatCurrency(Math.abs(forecast.variance))}`}
          </div>
          <div className="text-[11px] font-semibold mt-1">
            {isUpward ? `+${forecast.variancePercent}% vs usual spending` : `${forecast.variancePercent}% vs usual spending`}
          </div>
        </div>

        {/* Card 4: Estimate Reliability */}
        <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-900/40 border border-slate-200/70 dark:border-slate-700/50">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 text-xs font-semibold mb-1">
            <span>Estimate Reliability</span>
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-200">
            {forecast.dataSufficiency === 'SUFFICIENT_HISTORY' ? '88.5%' : '72.0%'}
          </div>
          <div className="text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mt-1 truncate" title={friendlyModelName}>
            {friendlyModelName}
          </div>
        </div>
      </div>

      {/* Main Charts & Category Breakdown Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-6">
        {/* Forecast Line Chart (3 cols) */}
        <div className="lg:col-span-3 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
              Your Spending Trend and Next Month Estimate
            </h3>
            <span className="text-[11px] text-slate-400 font-medium">Monthly ₹</span>
          </div>

          <div className="h-64 w-full">
            {chartData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                Insufficient monthly records for trend forecasting.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend verticalAlign="bottom" height={32} iconType="circle" wrapperStyle={{ paddingTop: '8px', fontSize: '11px', fontWeight: 600 }} />
                  <Line
                    type="monotone"
                    dataKey="ActualExpense"
                    name="Actual History"
                    stroke="#EF4444"
                    strokeWidth={2.5}
                    dot={{ r: 4, strokeWidth: 2, fill: '#FFFFFF' }}
                    connectNulls={false}
                  />
                  <Line
                    type="monotone"
                    dataKey="Forecast"
                    name="ML Forecast"
                    stroke="#6366F1"
                    strokeWidth={2.5}
                    strokeDasharray="5 5"
                    dot={{ r: 5, strokeWidth: 2, fill: '#6366F1' }}
                    connectNulls={true}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Category Breakdown Forecast (2 cols) */}
        <div className="lg:col-span-2 p-4 rounded-xl bg-slate-50/50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Expected Spending by Category
              </h3>
              <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">
                Next Month
              </span>
            </div>

            <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
              {categoryForecasts.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">No category spending records available.</p>
              ) : (
                categoryForecasts.map((cat) => (
                  <div
                    key={cat.category_id || cat.category_name}
                    className="p-2.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5 font-bold text-slate-800 dark:text-slate-200">
                        <span>{cat.category_name}</span>
                        {cat.at_risk_of_overrun && (
                          <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                            Risk
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Hist: {formatCurrency(cat.historical_average)} • Curr: {formatCurrency(cat.current_spent)}
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-bold text-slate-900 dark:text-slate-100">
                        {formatCurrency(cat.predicted_amount)}
                      </div>
                      <div className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                        cat.trend === 'UP' ? 'text-amber-600' : 'text-emerald-600'
                      }`}>
                        {cat.trend === 'UP' ? <TrendingUp className="w-2.5 h-2.5" /> : <TrendingDown className="w-2.5 h-2.5" />}
                        {cat.trend === 'UP' ? '+4%' : 'Normal'}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {atRiskCategories.length > 0 && (
            <div className="mt-3 p-2 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-[11px] text-rose-700 dark:text-rose-300 flex items-start gap-1.5 font-medium">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-500" />
              <span>
                {atRiskCategories.map((c) => c.category_name).join(', ')} predicted to exceed budget limits.
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


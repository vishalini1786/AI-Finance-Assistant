// frontend/src/components/common/PersonalizedInsights.jsx
// Module 8A: Personalized AI Financial Insights and Recommendations component
// Grounded in verified PostgreSQL records, onboarding preferences, and actual user behavior.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  Info,
  CheckCircle2,
  TrendingUp,
  X,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Check,
  Clock,
  Layers,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';

const SEVERITY_STYLES = {
  CRITICAL: {
    badgeBg: 'bg-rose-100 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-900',
    border: 'border-rose-200/80 dark:border-rose-900/50',
    icon: AlertTriangle,
    iconColor: 'text-rose-600 dark:text-rose-400',
    glow: 'from-rose-500/10 via-transparent to-transparent',
  },
  WARNING: {
    badgeBg: 'bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900',
    border: 'border-amber-200/80 dark:border-amber-900/50',
    icon: AlertTriangle,
    iconColor: 'text-amber-600 dark:text-amber-400',
    glow: 'from-amber-500/10 via-transparent to-transparent',
  },
  OPPORTUNITY: {
    badgeBg: 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-900',
    border: 'border-emerald-200/80 dark:border-emerald-900/50',
    icon: TrendingUp,
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    glow: 'from-emerald-500/10 via-transparent to-transparent',
  },
  INFO: {
    badgeBg: 'bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900',
    border: 'border-blue-200/80 dark:border-blue-900/50',
    icon: Info,
    iconColor: 'text-blue-600 dark:text-blue-400',
    glow: 'from-blue-500/10 via-transparent to-transparent',
  },
};

export const PersonalizedInsights = ({
  pageContext = 'DASHBOARD',
  title = 'AI Financial Insights & Recommendations',
  subtitle = 'Personalized analysis grounded in your onboarding profile and verified records',
  limit = 5,
  compact = false,
  className = '',
}) => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackState, setFeedbackState] = useState({});
  const [dismissedIds, setDismissedIds] = useState(new Set());

  const fetchInsights = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);

      const params = { status: 'ACTIVE' };
      if (pageContext && pageContext !== 'ALL') {
        params.page_context = pageContext;
      }

      let data = [];
      if (isRefresh) {
        data = await dashboardService.refreshInsights();
        if (pageContext && pageContext !== 'ALL') {
          data = data.filter((item) => !item.page_context || item.page_context === pageContext || item.page_context === 'DASHBOARD');
        }
      } else {
        data = await dashboardService.getInsights(params);
      }

      setInsights(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[PersonalizedInsights] Failed to load insights:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [pageContext]);

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  const handleDismiss = async (insightId, e) => {
    e.stopPropagation();
    try {
      setDismissedIds((prev) => new Set([...prev, insightId]));
      await dashboardService.dismissInsight(insightId);
      setInsights((prev) => prev.filter((i) => i.insight_id !== insightId));
    } catch (err) {
      console.error('[PersonalizedInsights] Failed to dismiss insight:', err);
    }
  };

  const handleFeedback = async (insightId, feedbackValue, e) => {
    e.stopPropagation();
    try {
      setFeedbackState((prev) => ({ ...prev, [insightId]: feedbackValue }));
      await dashboardService.submitInsightFeedback(insightId, feedbackValue);
    } catch (err) {
      console.error('[PersonalizedInsights] Failed to submit feedback:', err);
    }
  };

  const visibleInsights = insights
    .filter((item) => !dismissedIds.has(item.insight_id))
    .slice(0, limit);

  if (loading) {
    return (
      <div className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm animate-pulse ${className}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="h-5 bg-slate-200 dark:bg-slate-800 rounded w-64"></div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-20"></div>
        </div>
        <div className="space-y-3">
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
          <div className="h-24 bg-slate-100 dark:bg-slate-800/60 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (visibleInsights.length === 0) {
    return (
      <div className={`p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors"
            title="Recalculate insights"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
        <div className="py-4 text-center">
          <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <p className="text-xs font-bold text-slate-700 dark:text-slate-300">All indicators healthy</p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
            Your records are consistent with your goals and budget limits. Log new transactions to receive fresh contextual insights.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
      {/* Header */}
      <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-600 text-white shadow-sm shadow-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {title}
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/60 dark:border-indigo-900">
                Live &amp; Grounded
              </span>
            </h3>
            {subtitle && (
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-all"
          title="Recalculate personalized insights"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
          <span>{refreshing ? 'Analyzing...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Insights List */}
      <div className="p-4 space-y-3">
        {visibleInsights.map((insight) => {
          const style = SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.INFO;
          const IconComponent = style.icon;
          const currentFeedback = feedbackState[insight.insight_id] || insight.feedback;

          return (
            <div
              key={insight.insight_id}
              className={`group relative p-4 rounded-xl border bg-gradient-to-r ${style.glow} bg-white dark:bg-slate-900/90 ${style.border} hover:shadow-md transition-all duration-200`}
            >
              {/* Dismiss Button */}
              <button
                onClick={(e) => handleDismiss(insight.insight_id, e)}
                className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Dismiss this recommendation"
                aria-label="Dismiss insight"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {/* Title & Badges */}
              <div className="flex items-start gap-2.5 pr-6">
                <div className={`p-1.5 rounded-lg shrink-0 mt-0.5 ${style.badgeBg}`}>
                  <IconComponent className={`w-4 h-4 ${style.iconColor}`} />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      {insight.title}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${style.badgeBg}`}>
                      {insight.severity}
                    </span>
                    {insight.is_preliminary && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border border-amber-200/50">
                        Preliminary Data
                      </span>
                    )}
                  </div>

                  {/* Explanation */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed font-normal">
                    {insight.message}
                  </p>

                  {/* Data Grounding Pill */}
                  {insight.data_grounding && (
                    <div className="mt-2.5 flex items-start gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 shrink-0 mt-0.5" />
                      <span>
                        <strong className="text-slate-700 dark:text-slate-300">Data Grounding: </strong>
                        {insight.data_grounding}
                      </span>
                    </div>
                  )}

                  {/* Expected Benefit Banner */}
                  {insight.expected_benefit && (
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-200/50 dark:border-emerald-900/50">
                      <TrendingUp className="w-3.5 h-3.5 shrink-0" />
                      <span>Expected Benefit: {insight.expected_benefit}</span>
                    </div>
                  )}

                  {/* Action & Feedback Footer */}
                  <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
                    {/* Action Button */}
                    {insight.action_link ? (
                      <button
                        onClick={() => navigate(insight.action_link)}
                        className="text-xs font-bold text-finman-blue dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 flex items-center gap-1 hover:underline transition-all"
                      >
                        <span>{insight.action_text || 'Take action'}</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    ) : (
                      <div className="text-[10px] text-slate-400 font-medium">
                        Insight active • Grounded analysis
                      </div>
                    )}

                    {/* Feedback (Helpful / Unhelpful) */}
                    <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                      <span className="text-[10px] font-medium mr-1">Was this helpful?</span>
                      <button
                        onClick={(e) => handleFeedback(insight.insight_id, 'HELPFUL', e)}
                        className={`p-1 rounded transition-colors ${
                          currentFeedback === 'HELPFUL'
                            ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                            : 'hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Mark as helpful"
                        aria-label="Helpful"
                      >
                        <ThumbsUp className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => handleFeedback(insight.insight_id, 'UNHELPFUL', e)}
                        className={`p-1 rounded transition-colors ${
                          currentFeedback === 'UNHELPFUL'
                            ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 font-bold'
                            : 'hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                        title="Mark as unhelpful"
                        aria-label="Unhelpful"
                      >
                        <ThumbsDown className="w-3.5 h-3.5" />
                      </button>
                      {currentFeedback && (
                        <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold ml-1">
                          Thanks!
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default PersonalizedInsights;

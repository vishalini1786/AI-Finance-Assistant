// frontend/src/components/common/PersonalizedInsights.jsx
// Compact, single-container AI Advisor component per page.
// Conforms to Module 2 requirements:
// Advisor icon | Page-specific advisor heading | Refresh action
// Multiple bullet points inside one single compact container.

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sparkles,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  X,
  ChevronRight,
  Check,
  AlertCircle,
  Lightbulb,
} from 'lucide-react';
import dashboardService from '../../services/dashboardService';

export const PersonalizedInsights = ({
  pageContext = 'DASHBOARD',
  title = 'FinMan Financial Advisor',
  subtitle = 'Grounded in your verified records, budgets, and financial habits',
  limit = 4,
  className = '',
}) => {
  const navigate = useNavigate();
  const [insights, setInsights] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [feedbackState, setFeedbackState] = useState({});
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [fetchError, setFetchError] = useState(null);

  const fetchInsights = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setFetchError(null);

        const params = { status: 'ACTIVE' };
        if (pageContext && pageContext !== 'ALL') {
          params.page_context = pageContext;
        }

        let data = [];
        if (isRefresh) {
          data = await dashboardService.refreshInsights({
            page_context: pageContext,
            pageContext,
          });
          if (pageContext && pageContext !== 'ALL') {
            data = data.filter((item) => item.page_context === pageContext);
          }
        } else {
          data = await dashboardService.getInsights(params);
          if (pageContext && pageContext !== 'ALL') {
            data = data.filter((item) => item.page_context === pageContext);
          }
        }

        // Deduplicate insights by title to prevent repeated recommendations
        const seenTitles = new Set();
        const unique = [];
        for (const item of Array.isArray(data) ? data : []) {
          const key = (item.title || item.message || '').trim().toLowerCase();
          if (!seenTitles.has(key)) {
            seenTitles.add(key);
            unique.push(item);
          }
        }

        setInsights(unique);
      } catch (err) {
        console.warn('[PersonalizedInsights] Unable to load advisor recommendations:', err.message);
        setFetchError('Advisor suggestions are temporarily unavailable.');
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [pageContext]
  );

  useEffect(() => {
    fetchInsights();
  }, [fetchInsights]);

  // Listen to global financial & expense updates to automatically refresh suggestions
  useEffect(() => {
    const handleUpdate = () => {
      fetchInsights(true).catch(() => null);
    };
    window.addEventListener('finman:expense-updated', handleUpdate);
    window.addEventListener('finman:financial-updated', handleUpdate);
    return () => {
      window.removeEventListener('finman:expense-updated', handleUpdate);
      window.removeEventListener('finman:financial-updated', handleUpdate);
    };
  }, [fetchInsights]);

  const handleDismiss = async (insightId, e) => {
    if (e) e.stopPropagation();
    try {
      setDismissedIds((prev) => new Set([...prev, insightId]));
      await dashboardService.dismissInsight(insightId);
      setInsights((prev) => prev.filter((i) => i.insight_id !== insightId));
    } catch (err) {
      console.error('[PersonalizedInsights] Failed to dismiss recommendation:', err);
    }
  };

  const handleFeedback = async (insightId, feedbackValue, e) => {
    if (e) e.stopPropagation();
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

  // Compact Loading State
  if (loading) {
    return (
      <div
        className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 animate-pulse ${className}`}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-indigo-200 dark:bg-indigo-900/50" />
            <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-44" />
          </div>
          <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-16" />
        </div>
        <div className="space-y-2 pl-2">
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-5/6" />
          <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-4/6" />
        </div>
      </div>
    );
  }

  // Graceful Error State
  if (fetchError && visibleInsights.length === 0) {
    return (
      <div
        className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 ${className}`}
      >
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400 shrink-0" />
          <span className="font-bold text-slate-700 dark:text-slate-300">{title}</span>
          <span className="text-[11px] text-slate-400">— {fetchError}</span>
        </div>
        <button
          type="button"
          onClick={() => fetchInsights(true)}
          className="text-finman-blue dark:text-sky-400 font-bold hover:underline flex items-center gap-1 cursor-pointer"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  // Friendly Empty State
  if (visibleInsights.length === 0) {
    return (
      <div
        className={`p-4 rounded-2xl bg-gradient-to-r from-blue-50/60 via-indigo-50/30 to-slate-50/40 dark:from-slate-900 dark:via-slate-900/90 dark:to-indigo-950/20 border border-blue-200/60 dark:border-slate-800 ${className}`}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200/50 dark:border-indigo-900/50">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => fetchInsights(true)}
            disabled={refreshing}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-indigo-600' : ''}`} />
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-300 pl-8 leading-relaxed">
          All records look balanced. As you add more transactions and update goals, FinMan will surface tailored, calm observations here.
        </p>
      </div>
    );
  }

  // Required Layout: One single compact container with concise bullet points
  return (
    <div
      className={`rounded-2xl bg-gradient-to-r from-blue-50/80 via-indigo-50/40 to-slate-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950/30 border border-blue-200/70 dark:border-slate-800 shadow-xs p-4 sm:p-5 transition-colors ${className}`}
    >
      {/* Top Header Row: Icon | Page-Specific Advisor Title | Refresh Action */}
      <div className="flex items-center justify-between mb-3 pb-2.5 border-b border-blue-100/80 dark:border-slate-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
              {title}
            </h3>
            {subtitle && (
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium hidden sm:block">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={() => fetchInsights(true)}
          disabled={refreshing}
          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-200/90 dark:border-slate-700 bg-white/70 dark:bg-slate-800/80 hover:bg-white dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer"
          title="Recalculate advisor recommendations"
        >
          <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-indigo-600 dark:text-indigo-400' : ''}`} />
          <span>{refreshing ? 'Updating...' : 'Refresh'}</span>
        </button>
      </div>

      {/* Bullet Points Container (No separate full-width cards) */}
      <ul className="space-y-2.5">
        {visibleInsights.map((insight) => {
          const currentFeedback = feedbackState[insight.insight_id] || insight.feedback;

          // Build a clean, clear message from available recommendation fields
          let bulletText = '';
          if (insight.try_this) {
            bulletText = insight.try_this;
          } else if (insight.whats_happening) {
            bulletText = insight.whats_happening;
          } else if (insight.description) {
            bulletText = insight.description;
          } else if (insight.message) {
            bulletText = insight.message;
          } else {
            bulletText = insight.title;
          }

          // Clean repetitive prefixes if any
          bulletText = bulletText.replace(/^(suggestion|action|tip|recommendation):\s*/i, '');

          return (
            <li
              key={insight.insight_id}
              className="flex items-start justify-between gap-2.5 text-xs text-slate-700 dark:text-slate-200 group"
            >
              {/* Bullet point & text */}
              <div className="flex items-start gap-2.5 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-finman-blue dark:bg-sky-400 mt-1.5 shrink-0" />
                <div className="leading-relaxed">
                  <span className="font-bold text-slate-900 dark:text-white mr-1.5">
                    {insight.title}:
                  </span>
                  <span>{bulletText}</span>

                  {/* Inline Action Link */}
                  {insight.action_link && (
                    <button
                      type="button"
                      onClick={() => navigate(insight.action_link)}
                      className="ml-2 inline-flex items-center gap-0.5 text-finman-blue dark:text-sky-400 font-bold hover:underline cursor-pointer"
                    >
                      <span>{insight.action_text || 'Open'}</span>
                      <ChevronRight className="w-3 h-3 inline" />
                    </button>
                  )}
                </div>
              </div>

              {/* Compact Feedback & Dismiss Controls */}
              <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition-opacity">
                <button
                  type="button"
                  onClick={(e) => handleFeedback(insight.insight_id, 'HELPFUL', e)}
                  className={`p-1 rounded transition-colors ${
                    currentFeedback === 'HELPFUL'
                      ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 font-bold'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Helpful recommendation"
                  aria-label="Helpful"
                >
                  <ThumbsUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleFeedback(insight.insight_id, 'UNHELPFUL', e)}
                  className={`p-1 rounded transition-colors ${
                    currentFeedback === 'UNHELPFUL'
                      ? 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 font-bold'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
                  title="Not helpful"
                  aria-label="Not helpful"
                >
                  <ThumbsDown className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={(e) => handleDismiss(insight.insight_id, e)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded transition-colors"
                  title="Dismiss"
                  aria-label="Dismiss recommendation"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PersonalizedInsights;

import React, { useState } from 'react';
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { userProfile, healthScoreBreakdown, healthTrendData } from '../data/mockData';
import { CheckCircle2, AlertTriangle, Sparkles, TrendingUp, Award, Shield } from 'lucide-react';

export const FinancialHealth = () => {
  const [hoveredMetric, setHoveredMetric] = useState(null);

  return (
    <MainLayout>
      <PageHeader
        title="Financial Health Diagnostic"
        subtitle="Machine Learning analysis of stability, liquidity, and risk exposure"
        rightElement={
          <span className="text-xs font-bold text-slate-600 bg-white border border-slate-200 px-3.5 py-2 rounded-xl shadow-xs">
            Model Run: August 15, 2026
          </span>
        }
      />

      {/* Hero Score Diagnostic Card with Interactive 3D Glow */}
      <div className="group relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 text-white p-8 rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 mb-8 border border-slate-700">
        <div className="absolute -right-20 -bottom-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none group-hover:scale-125 transition-transform duration-700"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-blue-400 block mb-1">
              Overall Stability Score
            </span>
            <div className="flex items-baseline gap-4 mt-2">
              <span className="text-6xl font-black tracking-tight text-white group-hover:text-blue-400 transition-colors">82</span>
              <span className="text-2xl font-bold text-slate-400">/ 100</span>
              <span className="text-xs font-black text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-3 py-1 rounded-full">
                High Health Grade
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-3 max-w-lg font-medium leading-relaxed">
              Your liquidity ratio, low debt service burden, and consistent 50% savings place you in a prime risk profile.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/10 p-5 rounded-2xl max-w-sm">
            <div className="flex items-center gap-2 text-amber-300 font-bold text-xs mb-1.5">
              <Sparkles className="w-4 h-4" /> AI Diagnostic Summary
            </div>
            <p className="text-xs text-slate-200 font-medium leading-relaxed">
              Score progressed from 78 to 82 this month. Lowering dining-out expenses will push you into the 90+ elite band.
            </p>
          </div>
        </div>
      </div>

      {/* Interactive Score Breakdown & Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        
        {/* Metric Progress Bars with Hover Physics */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300">
          <h2 className="text-base font-bold text-slate-800 mb-5">Sub-Metric Performance Breakdown</h2>
          <div className="space-y-4">
            {healthScoreBreakdown.map((item) => (
              <div 
                key={item.metric}
                onMouseEnter={() => setHoveredMetric(item.metric)}
                onMouseLeave={() => setHoveredMetric(null)}
                className={`p-3 rounded-xl transition-all duration-200 cursor-pointer ${
                  hoveredMetric === item.metric ? 'bg-slate-50 shadow-xs scale-[1.01]' : ''
                }`}
              >
                <div className="flex justify-between text-xs font-bold mb-2">
                  <span className={`${hoveredMetric === item.metric ? 'text-finman-blue font-black' : 'text-slate-700'}`}>
                    {item.metric}
                  </span>
                  <span className="text-slate-900 font-black">{item.score} / 100</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      item.score >= 85 ? 'bg-emerald-500' : item.score >= 75 ? 'bg-finman-blue' : 'bg-amber-500'
                    } ${hoveredMetric === item.metric ? 'brightness-110 scale-y-125' : ''}`}
                    style={{ width: `${item.score}%` }}
                  ></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Health Trend Line Chart */}
        <div className="bg-white p-7 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 mb-1">6-Month Trend Trajectory</h2>
            <p className="text-xs text-slate-400 mb-4">Historical score progression over time</p>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={healthTrendData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <YAxis domain={[60, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0F172A', borderRadius: '12px', border: 'none', color: '#FFF' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="score" 
                  stroke="#2563EB" 
                  strokeWidth={3.5} 
                  dot={{ r: 5, fill: '#2563EB', strokeWidth: 2, stroke: '#FFFFFF' }}
                  activeDot={{ r: 8, strokeWidth: 3, stroke: '#2563EB', fill: '#FFFFFF' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Strengths and Action Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-emerald-200/80 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:border-emerald-400 transition-all">
          <h3 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" /> Core Financial Strengths
          </h3>
          <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
            <li className="flex items-center gap-2">✓ Strong savings rate sustained for 3 consecutive months</li>
            <li className="flex items-center gap-2">✓ Low debt-to-income liability ratio (21%)</li>
            <li className="flex items-center gap-2">✓ Healthy overall budget adherence with buffer</li>
          </ul>
        </div>

        <div className="bg-white border border-amber-200/80 p-6 rounded-2xl shadow-sm hover:shadow-lg hover:border-amber-400 transition-all">
          <h3 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2 mb-4">
            <AlertTriangle className="w-5 h-5 text-amber-600" /> Opportunities For Improvement
          </h3>
          <ul className="text-xs text-slate-700 space-y-2.5 font-medium">
            <li className="flex items-center gap-2">! Reduce restaurant food orders to unlock ₹1,200 monthly</li>
            <li className="flex items-center gap-2">! Set up an automated recurring SIP for the 1st of every month</li>
            <li className="flex items-center gap-2">! Build emergency fund liquidity to cover 3 months of fixed bills</li>
          </ul>
        </div>
      </div>
    </MainLayout>
  );
};
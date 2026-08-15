import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { calendarEvents } from '../data/mockData';
import { ChevronLeft, ChevronRight, Sparkles } from 'lucide-react';

export const SmartCalendar = () => {
  const [selectedDay, setSelectedDay] = useState(15);
  const daysInMonth = Array.from({ length: 31 }, (_, i) => i + 1);

  const selectedDetails = calendarEvents[selectedDay] || [];

  return (
    <MainLayout>
      <PageHeader
        title="Smart Financial Calendar"
        subtitle="Visualize cash flow cycles, scheduled EMIs, and daily spending"
        rightElement={
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-xl p-1 text-xs font-bold text-slate-700">
            <button className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
            <span className="px-2">August 2026</span>
            <button className="p-1.5 hover:bg-slate-50 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-4 mb-6 text-xs text-slate-600 font-medium">
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Income Received</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Normal Day</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bill Due</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> EMI / High Outflow</span>
        <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Savings Milestone</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase">
            <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysInMonth.map((day) => {
              const hasEvents = calendarEvents[day];
              const isSelected = selectedDay === day;

              return (
                <button
                  key={day}
                  onClick={() => setSelectedDay(day)}
                  className={`h-20 p-1.5 rounded-xl border text-left flex flex-col justify-between transition-all ${
                    isSelected
                      ? 'border-finman-purple bg-purple-50/50 shadow-sm ring-2 ring-finman-purple/20'
                      : 'border-slate-100 hover:border-slate-300 bg-white'
                  }`}
                >
                  <span className={`text-xs font-bold ${isSelected ? 'text-finman-purple' : 'text-slate-700'}`}>
                    {day}
                  </span>
                  <div className="space-y-1">
                    {hasEvents &&
                      hasEvents.map((evt, idx) => (
                        <div
                          key={idx}
                          className={`text-[9px] font-bold text-white px-1 py-0.5 rounded truncate ${evt.color}`}
                        >
                          {evt.text}
                        </div>
                      ))}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
            <h3 className="text-sm font-bold text-slate-900 mb-1">Details for August {selectedDay}, 2026</h3>
            <p className="text-xs text-slate-400 mb-4">Scheduled and logged items</p>

            {selectedDetails.length > 0 ? (
              <div className="space-y-3">
                {selectedDetails.map((evt, i) => (
                  <div key={i} className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">{evt.text}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No scheduled bills or transactions for this date.</p>
            )}
          </div>

          <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border border-purple-100 p-5 rounded-2xl">
            <div className="flex items-center gap-2 text-finman-purple font-bold text-xs mb-2">
              <Sparkles className="w-4 h-4" /> Upcoming Commitments
            </div>
            <p className="text-xs text-purple-900 leading-relaxed">
              You have 1 utility bill (₹1,500) and 1 auto EMI (₹5,000) due over the next 10 days. Ensure sufficient liquidity.
            </p>
          </div>
        </div>
      </div>
    </MainLayout>
  );
};
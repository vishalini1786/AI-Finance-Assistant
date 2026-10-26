import React, { useEffect, useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Filter, 
  Calendar as CalendarIcon,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Plus
} from 'lucide-react';
import calendarService from '../services/calendarService';
import { AddCalendarEventModal } from '../components/calendar/AddCalendarEventModal';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = Array.from({ length: 11 }, (_, index) => new Date().getFullYear() - 5 + index);

// Key format: "YYYY-M-D" (e.g., "2026-7-15" for August 15, 2026)
// Calendar records are not seeded in the frontend. Events added in this UI
// are temporary until a recurring-payments/calendar API is connected.
const EVENT_COLORS = {
  income: 'bg-emerald-500', bill: 'bg-rose-500', emi: 'bg-blue-600',
  investment: 'bg-purple-600', subscription: 'bg-amber-500', savings: 'bg-teal-600', tax: 'bg-orange-600',
};

export const SmartCalendar = () => {
  const today = new Date();
  
  // Navigation State (Month: 0-11, Year: 2024-2030)
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [selectedDay, setSelectedDay] = useState(today.getDate());
  const [activeFilter, setActiveFilter] = useState('All');
  const [allEvents, setAllEvents] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchEvents = () => {
    let mounted = true;
    calendarService.getEvents()
      .then((events) => {
        if (!mounted) return;
        const grouped = {};
        events.forEach((event) => {
          if (!event.event_date) return;
          const date = new Date(`${event.event_date}T00:00:00`);
          const type = event.event_type;
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          grouped[key] = [...(grouped[key] || []), {
            id: `${event.source_type}-${event.source_id}`,
            name: event.title,
            amount: Number(event.amount || 0),
            type,
            color: EVENT_COLORS[type] || 'bg-slate-500',
          }];
        });
        setAllEvents(grouped);
      })
      .catch(() => mounted && setError('Unable to load saved calendar events.'))
      .finally(() => mounted && setLoading(false));
    return () => { mounted = false; };
  };

  useEffect(() => {
    return fetchEvents();
  }, []);
  

  // Calendar Date Math
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
  // Adjust so Monday = 0, Sunday = 6
  const startingDayOffset = (firstDayIndex + 6) % 7;

  // Month Navigation Handlers
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prev) => prev - 1);
    } else {
      setCurrentMonth((prev) => prev - 1);
    }
    setSelectedDay(1);
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prev) => prev + 1);
    } else {
      setCurrentMonth((prev) => prev + 1);
    }
    setSelectedDay(1);
  };

  const handleGoToday = () => {
    setCurrentMonth(today.getMonth());
    setCurrentYear(today.getFullYear());
    setSelectedDay(today.getDate());
  };

  // Filter Helper
  const filterMatches = (type) => {
    if (activeFilter === 'All') return true;
    const map = {
      'Income': 'income',
      'Bills': 'bill',
      'EMI': 'emi',
      'Investments': 'investment',
      'Subscriptions': 'subscription',
      'Savings': 'savings',
      'Taxes': 'tax'
    };
    return map[activeFilter] ? type === map[activeFilter] : true;
  };

  // Retrieve events for a given day in current viewed month/year
  const getEventsForDay = (day) => {
    const key = `${currentYear}-${currentMonth}-${day}`;
    const dayEvents = allEvents[key] || [];
    return dayEvents.filter((e) => filterMatches(e.type));
  };

  const selectedDateEvents = getEventsForDay(selectedDay);

  // Aggregate all events for the current month
  const currentMonthEventsList = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const evts = getEventsForDay(d);
    evts.forEach(e => currentMonthEventsList.push({ ...e, day: d }));
  }

  // Monthly totals
  const totalInflow = currentMonthEventsList
    .filter(e => e.type === 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalOutflow = currentMonthEventsList
    .filter(e => e.type !== 'income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Calculate preselected date string (YYYY-MM-DD)
  const preselectedDateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(selectedDay).padStart(2, '0')}`;

  return (
    <MainLayout>
      <PageHeader
        title="Smart Financial Calendar"
        subtitle="Track income, expenses, bills, EMIs and scheduled financial events"
        rightElement={
          <div className="flex flex-wrap items-center gap-3">
            {/* Add Event Button */}
            <button 
              onClick={() => setIsModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-finman-blue text-white rounded-lg text-xs font-bold hover:bg-finman-blueDark transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Event
            </button>

            {/* Interactive Month & Year Selectors */}
            <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1 shadow-xs text-xs font-bold text-slate-700 dark:text-slate-300">
              <button 
                onClick={handleGoToday} 
                className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-md font-semibold transition-colors"
                title="Go to Current Real-World Date"
              >
                Today
              </button>

              <button 
                onClick={handlePrevMonth} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
                title="Previous Month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <select
                value={currentMonth}
                onChange={(e) => {
                  setCurrentMonth(Number(e.target.value));
                  setSelectedDay(1);
                }}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer px-1 py-0.5 hover:text-finman-blue"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{m}</option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => {
                  setCurrentYear(Number(e.target.value));
                  setSelectedDay(1);
                }}
                className="bg-transparent font-bold text-slate-800 dark:text-slate-200 outline-none cursor-pointer px-1 py-0.5 hover:text-finman-blue border-l border-slate-200 dark:border-slate-700 pl-2"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y} className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white">{y}</option>
                ))}
              </select>

              <button 
                onClick={handleNextMonth} 
                className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded text-slate-600 dark:text-slate-400 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

          </div>
        }
      />

      <AddCalendarEventModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={() => fetchEvents()}
        preselectedDate={preselectedDateStr}
      />

      {error && <div className="mb-6 rounded-xl border border-rose-200 bg-rose-50 dark:bg-rose-950/40 dark:border-rose-900 p-4 text-sm font-semibold text-rose-700 dark:text-rose-300">{error}</div>}
      {loading && <div className="mb-6 text-center text-xs font-semibold text-slate-400">Loading saved financial events...</div>}

      {/* FinMan Calendar Advisor */}
      <PersonalizedInsights
        pageContext="CALENDAR"
        title="FinMan Calendar Advisor"
        subtitle="Upcoming bills, subscription audits, and obligation buffers"
        className="mb-6"
      />

      {/* Filter Tabs & Monthly Flow Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['All', 'Income', 'Bills', 'EMI', 'Investments', 'Subscriptions', 'Savings', 'Taxes'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                activeFilter === tab
                  ? 'bg-finman-blue text-white shadow-xs'
                  : 'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Quick Month Cash-Flow Snapshot */}
        <div className="flex items-center gap-4 bg-white dark:bg-slate-900 px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Inflow:</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">₹{totalInflow.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500 dark:text-slate-400 font-medium">Outflow:</span>
            <span className="font-bold text-rose-600 dark:text-rose-400">₹{totalOutflow.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dynamic Monthly Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-6 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-bold text-slate-800">
              {MONTH_NAMES[currentMonth]} {currentYear}
            </h2>
            <span className="text-xs font-semibold text-slate-400">
              {currentMonthEventsList.length} events scheduled
            </span>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase">
            <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
          </div>

          <div className="grid grid-cols-7 gap-2">
            {/* Blank Placeholder Days for correct Day of Week Alignment */}
            {Array.from({ length: startingDayOffset }).map((_, i) => (
              <div key={`empty-${i}`} className="min-h-[82px] p-1.5 rounded-lg bg-slate-50/40 border border-transparent opacity-30"></div>
            ))}

            {/* Real Days of the Active Month */}
            {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
              const events = getEventsForDay(day);
              const isSelected = selectedDay === day;
              const isToday = currentYear === today.getFullYear()
                && currentMonth === today.getMonth()
                && day === today.getDate();
              const hasEvents = events.length > 0;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[82px] p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all group ${
                    isSelected
                      ? 'border-finman-blue bg-blue-50/50 shadow-xs ring-2 ring-finman-blue/20'
                      : isToday
                      ? 'border-emerald-500 bg-emerald-50/60 shadow-xs'
                      : hasEvents
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-xs font-bold ${isSelected ? 'text-finman-blue' : isToday ? 'text-emerald-700' : 'text-slate-700'}`}>
                      {day}
                    </span>
                    {isToday && <span className="text-[9px] font-black uppercase tracking-wide text-emerald-600">Today</span>}
                    {hasEvents && (
                      <span className="w-1.5 h-1.5 rounded-full bg-finman-blue"></span>
                    )}
                  </div>
                  
                  <div className="space-y-1 w-full mt-1">
                    {events.slice(0, 2).map((evt) => (
                      <div
                        key={evt.id}
                        className={`text-[9px] font-bold text-white px-1 py-0.5 rounded truncate ${evt.color}`}
                        title={`${evt.name}: ₹${evt.amount}`}
                      >
                        {evt.name}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <span className="text-[8px] font-bold text-slate-400 block text-right">
                        +{events.length - 2} more
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-600 font-semibold">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Income</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Bills</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> EMI</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-purple-600"></span> Investment</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Subscription</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span> Savings</span>
          </div>
        </div>

        {/* Day Details & Scheduled Commitments (1 Col) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-sm font-bold text-slate-900">
                {MONTH_NAMES[currentMonth]} {selectedDay}, {currentYear}
              </h3>
              <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-0.5 rounded">
                {selectedDateEvents.length} Scheduled
              </span>
            </div>
            <p className="text-xs text-slate-400 mb-4">Commitments for selected date</p>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2.5">
                {selectedDateEvents.map((evt) => (
                  <div key={evt.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-bold text-slate-800 block">{evt.name}</span>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">
                        {evt.type} • Status: Upcoming
                      </span>
                    </div>
                    <span className={`font-bold text-sm ${evt.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {evt.type === 'income' ? '+' : '-'}₹{evt.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <Clock className="w-6 h-6 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400 italic">No commitments scheduled on this date.</p>
              </div>
            )}
          </div>

          {/* Filtered Monthly Upcoming List */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              {MONTH_NAMES[currentMonth]} Commitments ({currentMonthEventsList.length})
            </h3>
            {currentMonthEventsList.length > 0 ? (
              <div className="space-y-2 text-xs max-h-56 overflow-y-auto divide-y divide-slate-100">
                {currentMonthEventsList.map((evt) => (
                  <div key={evt.id} className="flex justify-between items-center py-2 first:pt-0">
                    <div>
                      <span className="font-bold text-slate-800 block">{evt.name}</span>
                      <span className="text-[10px] text-slate-400">{MONTH_NAMES[currentMonth].slice(0, 3)} {evt.day}, {currentYear} • {evt.type}</span>
                    </div>
                    <span className={`font-bold ${evt.type === 'income' ? 'text-emerald-600' : 'text-slate-900'}`}>
                      {evt.type === 'income' ? '+' : '-'}₹{evt.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                No events found for {MONTH_NAMES[currentMonth]} {currentYear}.
              </p>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl">
            <div className="flex items-center gap-1.5 text-finman-blue font-bold text-xs mb-1">
              <Sparkles className="w-3.5 h-3.5" /> AI Calendar Planning
            </div>
            <p className="text-xs text-slate-700 font-medium leading-relaxed">
              Viewing {MONTH_NAMES[currentMonth]} {currentYear}. Navigating ahead allows proactive buffer planning for future EMIs and annual insurance payments.
            </p>
          </div>
        </div>
      </div>

    </MainLayout>
  );
};
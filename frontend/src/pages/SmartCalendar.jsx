import React, { useState } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Filter, 
  Plus, 
  X, 
  Calendar as CalendarIcon,
  Clock,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const YEARS = [2024, 2025, 2026, 2027, 2028, 2029, 2030];

// Key format: "YYYY-M-D" (e.g., "2026-7-15" for August 15, 2026)
const INITIAL_SCHEDULED_EVENTS = {
  // August 2026
  "2026-7-15": [{ id: 1, name: "Salary Credit", amount: 65000, type: "income", color: "bg-emerald-500", text: "+₹65,000" }],
  "2026-7-18": [{ id: 2, name: "Electricity Bill", amount: 1500, type: "bill", color: "bg-rose-500", text: "-₹1,500" }],
  "2026-7-20": [{ id: 3, name: "SIP Investment", amount: 2000, type: "investment", color: "bg-purple-600", text: "-₹2,000" }],
  "2026-7-24": [{ id: 4, name: "Home Loan EMI", amount: 12500, type: "emi", color: "bg-blue-600", text: "-₹12,500" }],
  "2026-7-28": [{ id: 5, name: "Netflix Renewal", amount: 649, type: "subscription", color: "bg-amber-500", text: "-₹649" }],
  "2026-7-30": [{ id: 6, name: "Emergency Savings Fund", amount: 10000, type: "savings", color: "bg-teal-600", text: "+₹10,000" }],
  
  // September 2026
  "2026-8-1":  [{ id: 7, name: "House Rent", amount: 18000, type: "bill", color: "bg-rose-500", text: "-₹18,000" }],
  "2026-8-15": [{ id: 8, name: "Salary Credit", amount: 65000, type: "income", color: "bg-emerald-500", text: "+₹65,000" }],
  "2026-8-20": [{ id: 9, name: "SIP Investment", amount: 2000, type: "investment", color: "bg-purple-600", text: "-₹2,000" }],
  "2026-8-24": [{ id: 10, name: "Home Loan EMI", amount: 12500, type: "emi", color: "bg-blue-600", text: "-₹12,500" }],
  
  // July 2026
  "2026-6-15": [{ id: 11, name: "Salary Credit", amount: 65000, type: "income", color: "bg-emerald-500", text: "+₹65,000" }],
  "2026-6-24": [{ id: 12, name: "Home Loan EMI", amount: 12500, type: "emi", color: "bg-blue-600", text: "-₹12,500" }],
};

export const SmartCalendar = () => {
  const today = new Date();
  
  // Navigation State (Month: 0-11, Year: 2024-2030)
  const [currentMonth, setCurrentMonth] = useState(7); // August (0-indexed: 7)
  const [currentYear, setCurrentYear] = useState(2026);
  const [selectedDay, setSelectedDay] = useState(24);
  const [activeFilter, setActiveFilter] = useState('All');
  const [allEvents, setAllEvents] = useState(INITIAL_SCHEDULED_EVENTS);
  
  // Add Event Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    name: '',
    amount: '',
    type: 'bill',
    day: 15
  });

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
      'Savings': 'savings'
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

  // Handle Adding New Commitment
  const handleAddCommitment = (e) => {
    e.preventDefault();
    if (!newEvent.name || !newEvent.amount) return;

    const colorMap = {
      income: 'bg-emerald-500',
      bill: 'bg-rose-500',
      emi: 'bg-blue-600',
      investment: 'bg-purple-600',
      subscription: 'bg-amber-500',
      savings: 'bg-teal-600'
    };

    const key = `${currentYear}-${currentMonth}-${newEvent.day}`;
    const newEntry = {
      id: Date.now(),
      name: newEvent.name,
      amount: Number(newEvent.amount),
      type: newEvent.type,
      color: colorMap[newEvent.type] || 'bg-slate-500',
      text: `${newEvent.type === 'income' ? '+' : '-'}₹${Number(newEvent.amount).toLocaleString('en-IN')}`
    };

    setAllEvents(prev => ({
      ...prev,
      [key]: [...(prev[key] || []), newEntry]
    }));

    setIsModalOpen(false);
    setNewEvent({ name: '', amount: '', type: 'bill', day: selectedDay });
  };

  return (
    <MainLayout>
      <PageHeader
        title="Smart Financial Calendar"
        subtitle="Track income, expenses, bills, EMIs and scheduled financial events"
        rightElement={
          <div className="flex flex-wrap items-center gap-3">
            {/* Interactive Month & Year Selectors */}
            <div className="flex items-center gap-1.5 bg-white border border-slate-200 rounded-lg p-1 shadow-xs text-xs font-bold text-slate-700">
              <button 
                onClick={handleGoToday} 
                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md font-semibold transition-colors"
                title="Go to Current Real-World Date"
              >
                Today
              </button>

              <button 
                onClick={handlePrevMonth} 
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
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
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer px-1 py-0.5 hover:text-finman-blue"
              >
                {MONTH_NAMES.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>

              <select
                value={currentYear}
                onChange={(e) => {
                  setCurrentYear(Number(e.target.value));
                  setSelectedDay(1);
                }}
                className="bg-transparent font-bold text-slate-800 outline-none cursor-pointer px-1 py-0.5 hover:text-finman-blue border-l border-slate-200 pl-2"
              >
                {YEARS.map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>

              <button 
                onClick={handleNextMonth} 
                className="p-1 hover:bg-slate-100 rounded text-slate-600 transition-colors"
                title="Next Month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>

            <button
              onClick={() => {
                setNewEvent({ ...newEvent, day: selectedDay });
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-finman-blue hover:bg-finman-blueDark text-white rounded-lg text-xs font-bold shadow-sm transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Event
            </button>
          </div>
        }
      />

      {/* Filter Tabs & Monthly Flow Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-400 font-bold flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          {['All', 'Income', 'Bills', 'EMI', 'Investments', 'Subscriptions', 'Savings'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition-all ${
                activeFilter === tab
                  ? 'bg-finman-blue text-white shadow-xs'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Quick Month Cash-Flow Snapshot */}
        <div className="flex items-center gap-4 bg-white px-4 py-2 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-1.5">
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-500" />
            <span className="text-slate-500 font-medium">Inflow:</span>
            <span className="font-bold text-emerald-600">₹{totalInflow.toLocaleString('en-IN')}</span>
          </div>
          <div className="w-px h-4 bg-slate-200"></div>
          <div className="flex items-center gap-1.5">
            <ArrowDownRight className="w-3.5 h-3.5 text-rose-500" />
            <span className="text-slate-500 font-medium">Outflow:</span>
            <span className="font-bold text-rose-600">₹{totalOutflow.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Dynamic Monthly Calendar Grid (2 Cols) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
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
              const hasEvents = events.length > 0;

              return (
                <button
                  key={`day-${day}`}
                  onClick={() => setSelectedDay(day)}
                  className={`min-h-[82px] p-1.5 rounded-lg border text-left flex flex-col justify-between transition-all group ${
                    isSelected
                      ? 'border-finman-blue bg-blue-50/50 shadow-xs ring-2 ring-finman-blue/20'
                      : hasEvents
                      ? 'border-slate-200 bg-white hover:border-slate-300'
                      : 'border-slate-100 bg-slate-50/50 text-slate-400 hover:bg-white'
                  }`}
                >
                  <div className="flex justify-between items-center w-full">
                    <span className={`text-xs font-bold ${isSelected ? 'text-finman-blue' : 'text-slate-700'}`}>
                      {day}
                    </span>
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
                <button
                  onClick={() => {
                    setNewEvent({ ...newEvent, day: selectedDay });
                    setIsModalOpen(true);
                  }}
                  className="mt-3 text-xs font-bold text-finman-blue hover:underline"
                >
                  + Add commitment for {MONTH_NAMES[currentMonth]} {selectedDay}
                </button>
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

      {/* Add Event Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 border border-slate-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                Schedule Financial Event
              </h3>
              <button onClick={() => setIsModalOpen(false)}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>

            <form onSubmit={handleAddCommitment} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Name / Merchant</label>
                <input
                  type="text"
                  required
                  value={newEvent.name}
                  onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                  placeholder="e.g. WiFi Bill, Car Loan EMI, Quarterly SIP"
                  className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={newEvent.amount}
                    onChange={(e) => setNewEvent({ ...newEvent, amount: e.target.value })}
                    placeholder="2500"
                    className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-finman-blue font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-finman-blue font-medium"
                  >
                    <option value="bill">Bill</option>
                    <option value="emi">EMI</option>
                    <option value="investment">Investment</option>
                    <option value="subscription">Subscription</option>
                    <option value="income">Income</option>
                    <option value="savings">Savings</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Day of Month</label>
                  <select
                    value={newEvent.day}
                    onChange={(e) => setNewEvent({ ...newEvent, day: Number(e.target.value) })}
                    className="w-full border border-slate-200 rounded-lg p-2.5 outline-none focus:border-finman-blue font-medium"
                  >
                    {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((d) => (
                      <option key={d} value={d}>Day {d}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Month/Year</label>
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg font-bold text-slate-700 truncate">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg text-slate-500 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-finman-blue text-white font-bold rounded-lg hover:bg-finman-blueDark"
                >
                  Save Commitment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
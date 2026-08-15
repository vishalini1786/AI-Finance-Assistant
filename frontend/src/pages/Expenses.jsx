import React, { useState, useMemo } from 'react';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { SummaryCard } from '../components/common/SummaryCard';
import { initialExpenses, dashboardSummary } from '../data/mockData';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  X, 
  Download, 
  Sparkles, 
  Filter, 
  ArrowUpDown, 
  ChevronUp, 
  ChevronDown, 
  ChevronRight,
  CheckSquare,
  Square,
  Receipt,
  CreditCard,
  Calendar,
  Layers,
  ArrowRight
} from 'lucide-react';

export const Expenses = () => {
  const [expenses, setExpenses] = useState(initialExpenses.filter(e => !e.isIncome));
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedMode, setSelectedMode] = useState('All');
  
  // Table Interactions State
  const [sortField, setSortField] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' | 'desc'
  const [selectedRowIds, setSelectedRowIds] = useState([]);
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState(null);
  const [formData, setFormData] = useState({
    category: 'Food',
    merchant: '',
    amount: '',
    mode: 'UPI',
    date: '15 Aug 2026',
  });

  // Sorting Handler
  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // Bulk Selection Handlers
  const handleSelectAll = () => {
    if (selectedRowIds.length === filteredAndSortedExpenses.length) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(filteredAndSortedExpenses.map(e => e.id));
    }
  };

  const handleToggleSelectRow = (id, e) => {
    e.stopPropagation();
    if (selectedRowIds.includes(id)) {
      setSelectedRowIds(selectedRowIds.filter(rowId => rowId !== id));
    } else {
      setSelectedRowIds([...selectedRowIds, id]);
    }
  };

  const handleBulkDelete = () => {
    setExpenses(expenses.filter(e => !selectedRowIds.includes(e.id)));
    setSelectedRowIds([]);
  };

  const handleDelete = (id, e) => {
    e?.stopPropagation();
    setExpenses(expenses.filter((e) => e.id !== id));
    setSelectedRowIds(selectedRowIds.filter(rowId => rowId !== id));
  };

  const handleEditClick = (expense, e) => {
    e?.stopPropagation();
    setEditingExpenseId(expense.id);
    setFormData({
      category: expense.category,
      merchant: expense.merchant,
      amount: expense.amount,
      mode: expense.mode,
      date: expense.date,
    });
    setIsModalOpen(true);
  };

  const handleOpenAddModal = () => {
    setEditingExpenseId(null);
    setFormData({ category: 'Food', merchant: '', amount: '', mode: 'UPI', date: '15 Aug 2026' });
    setIsModalOpen(true);
  };

  const handleSaveExpense = (e) => {
    e.preventDefault();
    if (!formData.merchant || !formData.amount) return;

    if (editingExpenseId) {
      setExpenses(expenses.map(item => 
        item.id === editingExpenseId 
          ? { ...item, ...formData, amount: Number(formData.amount) }
          : item
      ));
    } else {
      const newEntry = {
        id: Date.now(),
        date: formData.date,
        category: formData.category,
        merchant: formData.merchant,
        amount: Number(formData.amount),
        mode: formData.mode,
      };
      setExpenses([newEntry, ...expenses]);
    }

    setIsModalOpen(false);
    setEditingExpenseId(null);
  };

  // Filter and Sort Processing
  const filteredAndSortedExpenses = useMemo(() => {
    return expenses
      .filter((e) => {
        const matchesSearch = e.merchant.toLowerCase().includes(searchTerm.toLowerCase()) || e.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'All' || e.category === selectedCategory;
        const matchesMode = selectedMode === 'All' || e.mode === selectedMode;
        return matchesSearch && matchesCategory && matchesMode;
      })
      .sort((a, b) => {
        let valA = a[sortField];
        let valB = b[sortField];

        if (sortField === 'amount') {
          return sortOrder === 'asc' ? valA - valB : valB - valA;
        }
        if (typeof valA === 'string') {
          return sortOrder === 'asc' 
            ? valA.localeCompare(valB) 
            : valB.localeCompare(valA);
        }
        return 0;
      });
  }, [expenses, searchTerm, selectedCategory, selectedMode, sortField, sortOrder]);

  // Pagination calculation
  const totalPages = Math.ceil(filteredAndSortedExpenses.length / rowsPerPage) || 1;
  const paginatedExpenses = filteredAndSortedExpenses.slice(
    (currentPage - 1) * rowsPerPage,
    currentPage * rowsPerPage
  );

  const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <MainLayout>
      <PageHeader
        title="Expense Ledger"
        subtitle="Live CRUD tracking, search filtering, and categorized ledger logs"
        rightElement={
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-1.5 px-3.5 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 shadow-xs transition-all hover:scale-105">
              <Download className="w-3.5 h-3.5 text-slate-500" /> Export CSV
            </button>
            <button onClick={handleOpenAddModal} className="flex items-center gap-1.5 px-4 py-2 bg-finman-blue hover:bg-finman-blueDark text-white rounded-xl text-xs font-bold shadow-md hover:shadow-blue-500/20 hover:scale-105 transition-all">
              <Plus className="w-4 h-4" /> Add Expense
            </button>
          </div>
        }
      />

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        <SummaryCard title="Total Expenses" amount={totalSpent} indicator="This Month" type="expense" />
        <SummaryCard title="Average Daily" amount={dashboardSummary.dailyAverage} indicator="This Month" />
        <SummaryCard title="Top Expense Category" amount={`Food (₹${dashboardSummary.highestCategoryAmount.toLocaleString('en-IN')})`} indicator="35% allocation" type="blue" />
        <SummaryCard title="Active Records" amount={expenses.length} isCount={true} indicator="Live Entries" type="teal" />
      </div>

      {/* Interactive Filter Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 w-full md:w-80 focus-within:ring-2 focus-within:ring-finman-blue/20 focus-within:border-finman-blue focus-within:bg-white transition-all">
          <Search className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
          <input
            type="text"
            placeholder="Search merchant, notes..."
            value={searchTerm}
            onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
            className="bg-transparent border-none outline-none text-xs text-slate-800 w-full font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="All">All Categories</option>
            <option value="Food">Food</option>
            <option value="Transport">Transport</option>
            <option value="Shopping">Shopping</option>
            <option value="Bills">Bills</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Healthcare">Healthcare</option>
          </select>

          <select
            value={selectedMode}
            onChange={(e) => { setSelectedMode(e.target.value); setCurrentPage(1); }}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100 transition-colors"
          >
            <option value="All">All Payment Modes</option>
            <option value="UPI">UPI</option>
            <option value="Credit Card">Credit Card</option>
            <option value="Net Banking">Net Banking</option>
            <option value="Cash">Cash</option>
          </select>

          {(searchTerm || selectedCategory !== 'All' || selectedMode !== 'All') && (
            <button
              onClick={() => { setSearchTerm(''); setSelectedCategory('All'); setSelectedMode('All'); }}
              className="text-xs text-finman-blue font-bold hover:underline px-2 py-1"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Floating Bulk Actions Bar (Reveals when items are selected) */}
      {selectedRowIds.length > 0 && (
        <div className="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center justify-between mb-4 animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="flex items-center gap-3 text-xs font-bold">
            <span className="bg-finman-blue px-2.5 py-0.5 rounded-full text-white text-[11px]">
              {selectedRowIds.length}
            </span>
            <span>transactions selected</span>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleBulkDelete}
              className="flex items-center gap-1.5 bg-rose-600 hover:bg-rose-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected
            </button>
            <button
              onClick={() => setSelectedRowIds([])}
              className="text-xs text-slate-400 hover:text-white font-bold px-2 py-1"
            >
              Deselect All
            </button>
          </div>
        </div>
      )}

      {/* Interactive Expense Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
        {paginatedExpenses.length === 0 ? (
          <div className="p-16 text-center">
            <Filter className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="text-sm font-bold text-slate-800">No matching expense records</h4>
            <p className="text-xs text-slate-400 mt-1">Try relaxing your search parameters or log a new transaction.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-4 w-10 text-center">
                    <button onClick={handleSelectAll} className="p-1 hover:text-finman-blue">
                      {selectedRowIds.length === filteredAndSortedExpenses.length && filteredAndSortedExpenses.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-finman-blue" />
                      ) : (
                        <Square className="w-4 h-4 text-slate-400" />
                      )}
                    </button>
                  </th>
                  
                  {/* Clickable Header: Date */}
                  <th 
                    onClick={() => handleSort('date')} 
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Date</span>
                      {sortField === 'date' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Clickable Header: Category */}
                  <th 
                    onClick={() => handleSort('category')} 
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      {sortField === 'category' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  {/* Clickable Header: Merchant */}
                  <th 
                    onClick={() => handleSort('merchant')} 
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Merchant</span>
                      {sortField === 'merchant' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  <th className="py-3.5 px-4">Payment Mode</th>

                  {/* Clickable Header: Amount */}
                  <th 
                    onClick={() => handleSort('amount')} 
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 hover:text-slate-900 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Amount</span>
                      {sortField === 'amount' ? (
                        sortOrder === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-finman-blue" /> : <ChevronDown className="w-3.5 h-3.5 text-finman-blue" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-300" />
                      )}
                    </div>
                  </th>

                  <th className="py-3.5 px-4 text-center">Actions</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
                {paginatedExpenses.map((tx) => {
                  const isSelected = selectedRowIds.includes(tx.id);
                  const isExpanded = expandedRowId === tx.id;

                  return (
                    <React.Fragment key={tx.id}>
                      <tr 
                        onClick={() => setExpandedRowId(isExpanded ? null : tx.id)}
                        className={`group transition-all duration-200 cursor-pointer ${
                          isSelected 
                            ? 'bg-blue-50/50' 
                            : 'hover:bg-slate-50/80 hover:shadow-xs'
                        }`}
                      >
                        <td className="py-4 px-4 text-center" onClick={(e) => handleToggleSelectRow(tx.id, e)}>
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-finman-blue mx-auto" />
                          ) : (
                            <Square className="w-4 h-4 text-slate-300 group-hover:text-slate-500 mx-auto" />
                          )}
                        </td>

                        <td className="py-4 px-4 text-slate-400 font-semibold flex items-center gap-2">
                          <ChevronRight className={`w-3.5 h-3.5 transition-transform duration-200 ${isExpanded ? 'rotate-90 text-finman-blue' : 'text-slate-300'}`} />
                          <span>{tx.date}</span>
                        </td>

                        <td className="py-4 px-4">
                          <span className="bg-blue-50 text-finman-blue border border-blue-200/60 font-bold px-2.5 py-1 rounded-lg text-[11px] inline-block shadow-2xs group-hover:bg-finman-blue group-hover:text-white transition-colors">
                            {tx.category}
                          </span>
                        </td>

                        <td className="py-4 px-4 font-bold text-slate-900 group-hover:text-finman-blue transition-colors">
                          {tx.merchant}
                        </td>

                        <td className="py-4 px-4 text-slate-500 font-semibold">
                          <span className="inline-flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                            {tx.mode}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-black text-rose-600 text-sm">
                          -₹{tx.amount.toLocaleString('en-IN')}
                        </td>

                        <td className="py-4 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              onClick={(e) => handleEditClick(tx, e)} 
                              className="p-1.5 hover:bg-blue-100/70 text-slate-400 hover:text-finman-blue rounded-lg transition-colors"
                              title="Edit Expense"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => handleDelete(tx.id, e)} 
                              className="p-1.5 hover:bg-rose-100/70 text-slate-400 hover:text-rose-600 rounded-lg transition-colors"
                              title="Delete Expense"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable Inline Transaction Detail Card */}
                      {isExpanded && (
                        <tr className="bg-slate-50/90 border-y border-slate-200/80 animate-in fade-in zoom-in-99 duration-200">
                          <td colSpan={7} className="p-5">
                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Transaction Reference</span>
                                <span className="text-xs font-mono font-bold text-slate-800">TXN_2026_{tx.id}</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Payment Method</span>
                                <span className="text-xs font-bold text-slate-800">{tx.mode} • Verified</span>
                              </div>
                              <div>
                                <span className="text-[10px] uppercase font-bold text-slate-400 block">Receipt Attachment</span>
                                <span className="text-xs font-bold text-finman-blue cursor-pointer hover:underline flex items-center gap-1 mt-0.5">
                                  <Receipt className="w-3.5 h-3.5" /> View OCR Slip
                                </span>
                              </div>
                              <div className="flex justify-end items-center gap-2">
                                <button 
                                  onClick={(e) => handleEditClick(tx, e)}
                                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors"
                                >
                                  Modify Entry
                                </button>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Table Pagination Footer */}
        <div className="p-4 bg-slate-50/70 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs font-semibold text-slate-500">
          <div className="flex items-center gap-2">
            <span>Showing</span>
            <select
              value={rowsPerPage}
              onChange={(e) => { setRowsPerPage(Number(e.target.value)); setCurrentPage(1); }}
              className="bg-white border border-slate-200 rounded-lg px-2 py-1 font-bold text-slate-700 outline-none"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span>of {filteredAndSortedExpenses.length} transactions</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-bold"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-slate-800">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-white border border-slate-200 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-100 font-bold"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* AI Spending Insight Banner */}
      <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-100 p-5 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-3">
          <Sparkles className="w-5 h-5 text-finman-blue shrink-0" />
          <div>
            <h4 className="text-xs font-bold text-slate-900">AI Spending Insight</h4>
            <p className="text-xs text-slate-600 font-medium mt-0.5">
              Food delivery spending is 18% higher than last month. Reallocating ₹1,200 from Dining to Savings will hit your quarterly milestone.
            </p>
          </div>
        </div>
        <button className="px-4 py-2 bg-white border border-blue-200 text-finman-blue font-bold text-xs rounded-xl hover:bg-blue-50 shadow-sm shrink-0 transition-all hover:scale-105">
          Analyze Category Breakdown →
        </button>
      </div>

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-900">
                {editingExpenseId ? 'Edit Transaction' : 'Record New Expense'}
              </h3>
              <button onClick={() => { setIsModalOpen(false); setEditingExpenseId(null); }}>
                <X className="w-4 h-4 text-slate-400 hover:text-slate-600" />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Merchant / Recipient</label>
                <input
                  type="text"
                  required
                  value={formData.merchant}
                  onChange={(e) => setFormData({ ...formData, merchant: e.target.value })}
                  placeholder="e.g. Starbucks, Amazon, Uber"
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    required
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="650"
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                  >
                    <option value="Food">Food</option>
                    <option value="Transport">Transport</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills">Bills</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Healthcare">Healthcare</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Payment Method</label>
                <select
                  value={formData.mode}
                  onChange={(e) => setFormData({ ...formData, mode: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl p-2.5 outline-none focus:border-finman-blue font-medium"
                >
                  <option value="UPI">UPI</option>
                  <option value="Credit Card">Credit Card</option>
                  <option value="Net Banking">Net Banking</option>
                  <option value="Cash">Cash</option>
                  <option value="Debit Card">Debit Card</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <button 
                  type="button" 
                  onClick={() => { setIsModalOpen(false); setEditingExpenseId(null); }} 
                  className="px-4 py-2 rounded-xl text-slate-500 font-bold hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-finman-blue text-white font-bold rounded-xl hover:bg-finman-blueDark shadow-md"
                >
                  {editingExpenseId ? 'Update Record' : 'Save Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </MainLayout>
  );
};
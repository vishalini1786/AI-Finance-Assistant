import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { AddProjectExpenseModal } from '../components/projects/AddProjectExpenseModal';
import { PersonalizedInsights } from '../components/common/PersonalizedInsights';
import projectService from '../services/projectService';
import { formatDate } from '../utils/formatDate';
import { ArrowLeft, Plus, Loader2, AlertCircle, Trash2, Calendar, Target, CheckCircle2 } from 'lucide-react';

export const ProjectDetail = () => {
  const { projectId } = useParams();
  const navigate = useNavigate();
  
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProject(projectId);
      setProject(data);
      setError('');
    } catch (err) {
      setError('Unable to load project details.');
    } finally {
      setLoading(false);
    }
  };

  const handleExpenseAdded = async () => {
    // Re-fetch project to get updated stats and expense list
    await fetchProject();
  };

  const handleDeleteProject = async () => {
    if (window.confirm('Are you sure you want to delete this project? All associated project expenses will be deleted permanently.')) {
      try {
        setIsDeleting(true);
        await projectService.deleteProject(projectId);
        navigate('/projects');
      } catch (err) {
        alert('Failed to delete project.');
        setIsDeleting(false);
      }
    }
  };

  const handleDeleteExpense = async (expenseId) => {
    if (window.confirm('Are you sure you want to delete this expense?')) {
      try {
        await projectService.deleteProjectExpense(projectId, expenseId);
        await fetchProject();
      } catch (err) {
        alert('Failed to delete expense.');
      }
    }
  };

  if (loading) {
    return (
      <MainLayout>
        <div className="flex flex-col items-center justify-center py-40 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-finman-blue" />
          <p className="text-sm font-medium">Loading project...</p>
        </div>
      </MainLayout>
    );
  }

  if (error || !project) {
    return (
      <MainLayout>
        <div className="p-8">
          <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 mb-6 font-bold text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Projects
          </button>
          <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-100 dark:border-rose-900 p-6 rounded-2xl flex items-center gap-4 text-rose-600 dark:text-rose-400">
            <AlertCircle className="w-6 h-6" />
            <div>
              <h3 className="font-bold text-rose-800 dark:text-rose-300">Error</h3>
              <p className="text-sm">{error || 'Project not found'}</p>
            </div>
          </div>
        </div>
      </MainLayout>
    );
  }

  const isOver = project.is_over_budget;

  return (
    <MainLayout>
      <div className="mb-6 flex justify-between items-center">
        <button onClick={() => navigate('/projects')} className="flex items-center gap-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 font-bold text-sm transition-colors cursor-pointer">
          <ArrowLeft className="w-4 h-4" /> Back to Projects
        </button>
        <button 
          onClick={handleDeleteProject}
          disabled={isDeleting}
          className="text-xs font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" /> {isDeleting ? 'Deleting...' : 'Delete Project'}
        </button>
      </div>

      {/* FinMan Project Advisor */}
      <PersonalizedInsights
        pageContext="PROJECTS"
        title="FinMan Project Advisor"
        subtitle="Dedicated milestone budgets and project expenditure recommendations"
        className="mb-6"
      />

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden mb-8">
        <div className="p-8 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900 dark:to-slate-800/60">
          <div className="flex justify-between items-start">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">{project.project_name}</h1>
                <span className={`px-2.5 py-1 rounded-md text-[10px] font-black tracking-widest uppercase ${project.status === 'ACTIVE' ? 'bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400' : 'bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'}`}>
                  {project.status}
                </span>
              </div>
              {project.description && (
                <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl">{project.description}</p>
              )}
            </div>
            <div className="text-right flex items-center gap-6">
              <div>
                <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5 justify-end">
                  <Calendar className="w-3.5 h-3.5" /> Start Date
                </p>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(project.start_date)}</p>
              </div>
              {project.target_date && (
                <div>
                  <p className="text-xs font-bold text-slate-400 mb-1 flex items-center gap-1.5 justify-end">
                    <Target className="w-3.5 h-3.5" /> Target Date
                  </p>
                  <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{formatDate(project.target_date)}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-5 border border-slate-100 dark:border-slate-800">
              <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1">Target Budget</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white">₹{project.target_budget.toLocaleString('en-IN')}</p>
            </div>
            <div className="bg-blue-50/50 dark:bg-blue-950/30 rounded-xl p-5 border border-blue-100/50 dark:border-blue-900/40">
              <p className="text-xs font-bold text-finman-blue uppercase tracking-wider mb-1">Total Spent</p>
              <p className={`text-3xl font-black ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-finman-blue'}`}>
                ₹{project.total_spent.toLocaleString('en-IN')}
              </p>
            </div>
            <div className={`${isOver ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900' : 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-100 dark:border-emerald-900'} rounded-xl p-5 border`}>
              <p className={`text-xs font-bold uppercase tracking-wider mb-1 ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
                {isOver ? 'Amount Over Budget' : 'Remaining Budget'}
              </p>
              <p className={`text-3xl font-black ${isOver ? 'text-rose-700 dark:text-rose-300' : 'text-emerald-800 dark:text-emerald-300'}`}>
                ₹{Math.abs(project.remaining_budget).toLocaleString('en-IN')}
              </p>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-end mb-2">
              <p className="text-sm font-bold text-slate-700 dark:text-slate-300">Budget Utilization</p>
              <p className={`text-xl font-black ${isOver ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>
                {project.utilization_percentage}%
              </p>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-3 mb-2 overflow-hidden border border-slate-200/60 dark:border-slate-700">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ease-out ${isOver ? 'bg-rose-500' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}
                style={{ width: `${Math.min(project.utilization_percentage, 100)}%` }}
              ></div>
            </div>
            {isOver && (
              <p className="text-xs font-bold text-rose-600 dark:text-rose-400 mt-2 flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5" /> This project has exceeded its target budget.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/90 dark:border-slate-800 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/40">
          <h2 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
            Project Expenses <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs">{project.expenses.length}</span>
          </h2>
          <button 
            onClick={() => setIsExpenseModalOpen(true)}
            className="bg-finman-blue hover:bg-finman-blueDark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Expense
          </button>
        </div>
        
        {project.expenses.length === 0 ? (
          <div className="p-12 text-center text-slate-500 dark:text-slate-400">
            <CheckCircle2 className="w-12 h-12 mx-auto text-slate-300 dark:text-slate-700 mb-3" />
            <p className="font-bold text-slate-700 dark:text-slate-300">No expenses recorded yet.</p>
            <p className="text-sm mt-1">Add your first expense to track your budget utilization.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white dark:bg-slate-900 text-[10px] font-black text-slate-400 uppercase tracking-wider border-b border-slate-100 dark:border-slate-800">
                  <th className="p-4 pl-6">Date</th>
                  <th className="p-4">Expense Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Mode</th>
                  <th className="p-4 text-right pr-6">Amount</th>
                  <th className="p-4 w-10"></th>
                </tr>
              </thead>
              <tbody className="text-sm divide-y divide-slate-50 dark:divide-slate-800/50 text-slate-700 dark:text-slate-300">
                {project.expenses.map((exp) => (
                  <tr key={exp.project_expense_id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group">
                    <td className="p-4 pl-6 text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
                      {formatDate(exp.expense_date)}
                    </td>
                    <td className="p-4">
                      <p className="font-bold text-slate-900 dark:text-white">{exp.expense_name}</p>
                      {exp.description && <p className="text-xs text-slate-400 mt-0.5 truncate max-w-xs">{exp.description}</p>}
                    </td>
                    <td className="p-4">
                      <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2.5 py-1 rounded-md text-[11px] font-bold">
                        {exp.category}
                      </span>
                    </td>
                    <td className="p-4 text-slate-500 dark:text-slate-400 font-medium">
                      {exp.payment_mode || '-'}
                    </td>
                    <td className="p-4 text-right pr-6 font-black text-slate-900 dark:text-white">
                      ₹{Number(exp.amount).toLocaleString('en-IN')}
                    </td>
                    <td className="p-4 text-right">
                      <button 
                        onClick={() => handleDeleteExpense(exp.project_expense_id)}
                        className="text-slate-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/50 cursor-pointer"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AddProjectExpenseModal 
        isOpen={isExpenseModalOpen} 
        onClose={() => setIsExpenseModalOpen(false)} 
        projectId={projectId}
        onExpenseAdded={handleExpenseAdded}
      />
    </MainLayout>
  );
};

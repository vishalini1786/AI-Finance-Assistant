import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import projectService from '../../services/projectService';

export const CreateProjectModal = ({ isOpen, onClose, onProjectCreated }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    description: '',
    targetBudget: '',
    startDate: '',
    targetDate: '',
    status: 'ACTIVE'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    // Basic validation
    if (!formData.projectName) {
      return setError('Project Name is required.');
    }
    if (Number(formData.targetBudget) < 0) {
      return setError('Target Budget cannot be negative.');
    }
    if (!formData.startDate) {
      return setError('Start Date is required.');
    }
    if (formData.targetDate && new Date(formData.targetDate) < new Date(formData.startDate)) {
      return setError('Target Date cannot be before Start Date.');
    }

    try {
      setLoading(true);
      const newProject = await projectService.createProject({
        ...formData,
        targetBudget: Number(formData.targetBudget)
      });
      onProjectCreated(newProject);
      setFormData({
        projectName: '',
        description: '',
        targetBudget: '',
        startDate: '',
        targetDate: '',
        status: 'ACTIVE'
      });
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create project.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="flex justify-between items-center p-5 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Create New Project</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="bg-rose-50 text-rose-600 p-3 rounded-lg text-sm font-medium border border-rose-100">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Project Name *</label>
            <input 
              type="text" 
              name="projectName" 
              value={formData.projectName} 
              onChange={handleChange}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              placeholder="e.g. House Construction"
              required 
            />
          </div>
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Target Budget (₹) *</label>
            <input 
              type="number" 
              name="targetBudget" 
              value={formData.targetBudget} 
              onChange={handleChange}
              min="0"
              step="0.01"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              placeholder="0.00"
              required 
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Start Date *</label>
              <input 
                type="date" 
                name="startDate" 
                value={formData.startDate} 
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
                required 
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Target Date (Optional)</label>
              <input 
                type="date" 
                name="targetDate" 
                value={formData.targetDate} 
                onChange={handleChange}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Description (Optional)</label>
            <textarea 
              name="description" 
              value={formData.description} 
              onChange={handleChange}
              rows="3"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-finman-blue focus:ring-1 focus:ring-finman-blue"
              placeholder="Details about this project..."
            />
          </div>
          
          <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-2">
            <button 
              type="button" 
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 text-sm font-bold text-white bg-finman-blue hover:bg-finman-blueDark rounded-lg transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? 'Creating...' : 'Create Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

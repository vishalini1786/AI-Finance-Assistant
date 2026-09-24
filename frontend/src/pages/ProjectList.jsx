import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { MainLayout } from '../components/layout/MainLayout';
import { PageHeader } from '../components/common/PageHeader';
import { CreateProjectModal } from '../components/projects/CreateProjectModal';
import projectService from '../services/projectService';
import { FolderKanban, Plus, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';

export const ProjectList = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const data = await projectService.getProjects();
      setProjects(data);
      setError('');
    } catch (err) {
      setError('Unable to load project workspaces.');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectCreated = (newProject) => {
    setProjects(prev => [newProject, ...prev]);
  };

  return (
    <MainLayout>
      <PageHeader
        title="Project Workspaces"
        subtitle="Manage dedicated budgets and isolated expenses for specific milestones"
      />

      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-slate-800">Your Projects</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-finman-blue hover:bg-finman-blueDark text-white px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-sm hover:shadow-md"
        >
          <Plus className="w-4 h-4" /> Create Project
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin mb-4 text-finman-blue" />
          <p className="text-sm font-medium">Loading project workspaces...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-100 p-6 rounded-2xl flex items-center gap-4 text-rose-600">
          <AlertCircle className="w-6 h-6" />
          <div>
            <h3 className="font-bold text-rose-800">Error</h3>
            <p className="text-sm">{error}</p>
          </div>
        </div>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-slate-200 border-dashed rounded-2xl p-12 text-center">
          <div className="w-16 h-16 bg-blue-50 text-finman-blue rounded-full flex items-center justify-center mx-auto mb-4">
            <FolderKanban className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">No project workspaces yet</h3>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
            Create a dedicated workspace to track isolated budgets for large milestones like House Construction or a Vehicle Purchase.
          </p>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 transition-colors"
          >
            <Plus className="w-4 h-4" /> Create Your First Project
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map(project => {
            const isOver = project.is_over_budget;
            return (
              <div 
                key={project.project_id}
                onClick={() => navigate(`/projects/${project.project_id}`)}
                className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-sm hover:shadow-xl hover:border-blue-400/50 hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1 pr-4">
                      <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1 truncate">
                        {project.project_name}
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${project.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-slate-300'}`}></span>
                        {project.status} • {new Date(project.start_date).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <div className="mb-5">
                    <div className="flex justify-between items-end mb-2">
                      <div>
                        <p className="text-xs font-bold text-slate-500 mb-0.5">Target Budget</p>
                        <p className="text-base font-black text-slate-900">₹{project.target_budget.toLocaleString('en-IN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-slate-500 mb-0.5">Spent</p>
                        <p className={`text-base font-black ${isOver ? 'text-rose-600' : 'text-finman-blue'}`}>
                          ₹{project.total_spent.toLocaleString('en-IN')}
                        </p>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 rounded-full h-2 mb-2 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-500 ${isOver ? 'bg-rose-500' : 'bg-finman-blue'}`}
                        style={{ width: `${Math.min(project.utilization_percentage, 100)}%` }}
                      ></div>
                    </div>
                    
                    <div className="flex justify-between items-center text-xs font-bold">
                      <span className={isOver ? 'text-rose-600 bg-rose-50 px-2 py-0.5 rounded' : 'text-slate-400'}>
                        {isOver ? 'OVER BUDGET' : `Remaining: ₹${project.remaining_budget.toLocaleString('en-IN')}`}
                      </span>
                      <span className={isOver ? 'text-rose-600' : 'text-slate-500'}>
                        {project.utilization_percentage}%
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between text-sm font-bold text-finman-blue">
                  <span>View Project</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreateProjectModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onProjectCreated={handleProjectCreated}
      />
    </MainLayout>
  );
};

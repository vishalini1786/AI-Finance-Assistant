import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { FileText, CheckCircle, Clock, XCircle } from 'lucide-react';

const STATUS_CONFIG = {
  processed:  { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
  pending:    { icon: Clock,        color: 'text-amber-400',   bg: 'bg-amber-400/10'   },
  failed:     { icon: XCircle,      color: 'text-rose-400',    bg: 'bg-rose-400/10'    },
};

export const AdminDocuments = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    adminService.getDocuments()
      .then((d) => { if (m) { setData(d); setLoading(false); } })
      .catch(() => { if (m) setLoading(false); });
    return () => { m = false; };
  }, []);

  // Summarise stats by status
  const summary = {};
  (data?.stats || []).forEach((s) => {
    const st = s.processing_status || 'unknown';
    summary[st] = (summary[st] || 0) + parseInt(s.count, 10);
  });

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-white">OCR & Documents</h2>
          <p className="text-sm text-slate-400 mt-1">Monitor uploaded financial documents across all users</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="w-8 h-8 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* Status Summary */}
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(summary).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || { icon: FileText, color: 'text-slate-400', bg: 'bg-slate-700' };
                const Icon = cfg.icon;
                return (
                  <div key={status} className={`rounded-xl p-4 border border-slate-700/50 bg-slate-800/60 flex items-center gap-3`}>
                    <div className={`w-10 h-10 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-400 capitalize">{status}</p>
                      <p className="text-xl font-black text-white">{count}</p>
                    </div>
                  </div>
                );
              })}
              {Object.keys(summary).length === 0 && (
                <div className="col-span-3 text-center text-slate-500 text-sm py-4">No documents found</div>
              )}
            </div>

            {/* Recent Documents Table */}
            <div className="bg-slate-800/60 border border-slate-700/50 rounded-xl overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-700/50">
                <h3 className="text-sm font-bold text-white">Recent Uploads</h3>
              </div>
              <table className="w-full text-xs">
                <thead className="bg-slate-900/60 border-b border-slate-700/30">
                  <tr>
                    <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">File</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Type</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">User</th>
                    <th className="px-4 py-3 text-left text-slate-400 font-semibold uppercase tracking-wider">Uploaded</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700/20">
                  {(data?.recent || []).length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-slate-500">No documents uploaded yet</td>
                    </tr>
                  ) : (
                    (data?.recent || []).map((doc) => {
                      const cfg = STATUS_CONFIG[doc.processing_status] || { icon: FileText, color: 'text-slate-400', bg: 'bg-slate-700' };
                      const Icon = cfg.icon;
                      return (
                        <tr key={doc.document_id} className="hover:bg-slate-700/10 transition-colors">
                          <td className="px-4 py-3 text-slate-300 font-medium max-w-xs truncate">{doc.file_name}</td>
                          <td className="px-4 py-3 text-slate-400 capitalize">{doc.document_type || '—'}</td>
                          <td className="px-4 py-3">
                            <span className={`flex items-center gap-1.5 w-fit ${cfg.color}`}>
                              <Icon className="w-3 h-3" />
                              <span className="capitalize">{doc.processing_status}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div>
                              <p className="text-slate-300 font-semibold">{doc.user_name}</p>
                              <p className="text-slate-500 text-[10px]">{doc.user_email}</p>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {new Date(doc.upload_date).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

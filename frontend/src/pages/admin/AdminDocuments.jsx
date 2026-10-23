import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/layout/AdminLayout';
import adminService from '../../services/adminService';
import { FileText, CheckCircle, Clock, XCircle, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

const STATUS_CONFIG = {
  processed: { icon: CheckCircle, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-100 dark:bg-emerald-950/60' },
  pending: { icon: Clock, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-100 dark:bg-amber-950/60' },
  failed: { icon: XCircle, color: 'text-rose-600 dark:text-rose-400', bg: 'bg-rose-100 dark:bg-rose-950/60' },
};

export const AdminDocuments = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let m = true;
    adminService
      .getDocuments()
      .then((d) => {
        if (m) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (m) setLoading(false);
      });
    return () => {
      m = false;
    };
  }, []);

  // Summarise stats by status
  const summary = {};
  (data?.stats || []).forEach((s) => {
    const st = s.processing_status || 'unknown';
    summary[st] = (summary[st] || 0) + parseInt(s.count, 10);
  });

  const ocrStatus = data?.ocrStatus;

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white">OCR & Documents</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Monitor uploaded receipts and financial invoices across all users
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-violet-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* OCR Service Connection Status Banner */}
            {ocrStatus && (
              <div
                className={`p-4 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${
                  ocrStatus.configured && ocrStatus.reachable
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900/60'
                    : ocrStatus.configured && !ocrStatus.reachable
                    ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-900/60'
                    : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-900/60'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    ocrStatus.configured && ocrStatus.reachable
                      ? 'bg-emerald-600 text-white'
                      : ocrStatus.configured && !ocrStatus.reachable
                      ? 'bg-rose-600 text-white'
                      : 'bg-amber-600 text-white'
                  }`}
                >
                  {ocrStatus.configured && ocrStatus.reachable ? (
                    <CheckCircle className="w-5 h-5" />
                  ) : (
                    <AlertTriangle className="w-5 h-5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3
                      className={`text-xs font-black uppercase tracking-wider ${
                        ocrStatus.configured && ocrStatus.reachable
                          ? 'text-emerald-900 dark:text-emerald-200'
                          : ocrStatus.configured && !ocrStatus.reachable
                          ? 'text-rose-900 dark:text-rose-200'
                          : 'text-amber-900 dark:text-amber-200'
                      }`}
                    >
                      {ocrStatus.statusLabel}
                    </h3>
                    {ocrStatus.latencyMs !== undefined && ocrStatus.latencyMs !== null && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                        {ocrStatus.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p
                    className={`text-xs mt-0.5 leading-relaxed ${
                      ocrStatus.configured && ocrStatus.reachable
                        ? 'text-emerald-800 dark:text-emerald-300 font-medium'
                        : ocrStatus.configured && !ocrStatus.reachable
                        ? 'text-rose-800 dark:text-rose-300 font-medium'
                        : 'text-amber-800 dark:text-amber-300 font-medium'
                    }`}
                  >
                    {ocrStatus.message ||
                      (ocrStatus.reachable
                        ? 'Tesseract 5.x engine is online and processing receipts, bills, and salary slips.'
                        : 'OCR service is not responding.')}
                  </p>
                  {!ocrStatus.configured && (
                    <p className="text-[11px] text-amber-700 dark:text-amber-400 mt-1">
                      Configure <code className="font-mono font-bold bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded">AI_SERVICE_URL</code> on your Render backend deployment pointing to your FastAPI OCR service.
                    </p>
                  )}
                </div>
              </div>
            )}
            {/* Status Summary */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {Object.entries(summary).map(([status, count]) => {
                const cfg = STATUS_CONFIG[status] || {
                  icon: FileText,
                  color: 'text-slate-500 dark:text-slate-400',
                  bg: 'bg-slate-100 dark:bg-slate-800',
                };
                const Icon = cfg.icon;
                return (
                  <div
                    key={status}
                    className="rounded-2xl p-4 border border-slate-200 dark:border-slate-700/60 bg-white dark:bg-slate-800/80 shadow-xs flex items-center gap-3.5"
                  >
                    <div className={`w-11 h-11 rounded-xl ${cfg.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`w-5 h-5 ${cfg.color}`} />
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 dark:text-slate-400 capitalize font-medium">{status}</p>
                      <p className="text-xl font-black text-slate-900 dark:text-white">{count}</p>
                    </div>
                  </div>
                );
              })}
              {Object.keys(summary).length === 0 && (
                <div className="col-span-3 text-center text-slate-400 text-sm py-4">No documents found</div>
              )}
            </div>

            {/* Recent Documents Table */}
            <div className="bg-white dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 rounded-2xl overflow-hidden shadow-xs">
              <div className="px-5 py-4 border-b border-slate-200 dark:border-slate-700/50">
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Recent Uploads</h3>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs min-w-[650px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/60 border-b border-slate-200 dark:border-slate-700/50">
                    <tr>
                      <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        File
                      </th>
                      <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-4 py-3 text-left text-slate-500 dark:text-slate-400 font-bold uppercase tracking-wider">
                        Uploaded
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/30">
                    {(data?.recent || []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-slate-400">
                          No documents uploaded yet.
                        </td>
                      </tr>
                    ) : (
                      (data?.recent || []).map((doc) => {
                        const cfg = STATUS_CONFIG[doc.processing_status] || {
                          icon: FileText,
                          color: 'text-slate-500',
                          bg: 'bg-slate-100',
                        };
                        const Icon = cfg.icon;
                        return (
                          <tr
                            key={doc.document_id}
                            className="hover:bg-slate-50 dark:hover:bg-slate-700/20 transition-colors"
                          >
                            <td className="px-4 py-3 text-slate-900 dark:text-white font-medium max-w-xs truncate">
                              {doc.file_name}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-400 capitalize">
                              {doc.document_type || '—'}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`flex items-center gap-1.5 w-fit font-bold ${cfg.color}`}>
                                <Icon className="w-3.5 h-3.5" />
                                <span className="capitalize">{doc.processing_status}</span>
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div>
                                <p className="text-slate-900 dark:text-slate-200 font-semibold">{doc.user_name}</p>
                                <p className="text-slate-400 dark:text-slate-500 text-[10px]">{doc.user_email}</p>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                              {new Date(doc.upload_date).toLocaleDateString()}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminDocuments;

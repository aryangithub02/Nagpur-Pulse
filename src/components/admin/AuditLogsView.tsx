import React, { useState, useEffect } from 'react';
import { ShieldCheck, RefreshCw, Filter, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { AuditLogItem } from '../../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const AuditLogsView: React.FC = () => {
  const { token, activeZone, user } = useAuth();
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [actionFilter, setActionFilter] = useState<string>('ALL');

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let url = `${API_BASE_URL}/api/v1/admin/audit-logs?limit=100`;
      if (activeZone && activeZone !== 'ALL') {
        url += `&zone_code=${activeZone}`;
      }
      if (actionFilter !== 'ALL') {
        url += `&action=${actionFilter}`;
      }

      const resp = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (resp.ok) {
        const data = await resp.json();
        setLogs(data.audit_logs || []);
      }
    } catch (err) {
      console.warn('Audit fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, [activeZone, actionFilter]);

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* Top Ribbon */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white">Security & Dispatch Audit Trail</h2>
            <p className="text-xs text-slate-400 font-mono">
              Immutable Operation Logs — Zone Scope: <strong className="text-amber-400">{activeZone}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={fetchAuditLogs}
          className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition border border-slate-700"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Action Filters */}
      <div className="flex items-center gap-3 font-mono text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
        <Filter className="w-3.5 h-3.5 text-slate-400" />
        <span className="text-slate-400">Filter Event Action:</span>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-cyan-500 font-bold"
        >
          <option value="ALL">Action: ALL AUDIT EVENTS</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILED">LOGIN_FAILED</option>
          <option value="DISPATCH_APPROVED">DISPATCH_APPROVED</option>
          <option value="DISPATCH_REJECTED">DISPATCH_REJECTED</option>
          <option value="PASSWORD_CHANGED">PASSWORD_CHANGED</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_UPDATED">USER_UPDATED</option>
        </select>
      </div>

      {/* Audit Log Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a0c16] shadow-xl">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <th className="p-3 font-bold">TIMESTAMP</th>
              <th className="p-3 font-bold">USER</th>
              <th className="p-3 font-bold">ROLE</th>
              <th className="p-3 font-bold">ZONE</th>
              <th className="p-3 font-bold">ACTION</th>
              <th className="p-3 font-bold">DETAILS</th>
              <th className="p-3 font-bold text-right">RESULT</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {logs.map((log) => (
              <tr key={log.id} className="hover:bg-slate-900/60 transition">
                <td className="p-3 text-slate-400 font-bold whitespace-nowrap">
                  {new Date(log.timestamp).toLocaleString()}
                </td>
                <td className="p-3 font-extrabold text-white">{log.username}</td>
                <td className="p-3 text-slate-300">{log.role}</td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                    {log.zone_code || 'ALL'}
                  </span>
                </td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      log.action.includes('SUCCESS') || log.action.includes('APPROVED')
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                        : log.action.includes('FAILED') || log.action.includes('REJECTED')
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                        : 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                    }`}
                  >
                    {log.action}
                  </span>
                </td>
                <td className="p-3 text-slate-300 max-w-xs truncate">{log.details || 'N/A'}</td>
                <td className="p-3 text-right">
                  {log.success ? (
                    <span className="text-emerald-400 font-bold flex items-center justify-end gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> SUCCESS
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center justify-end gap-1">
                      <XCircle className="w-3.5 h-3.5" /> FAILED
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-6 text-center text-slate-500">
                  No security audit events recorded for zone {activeZone}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

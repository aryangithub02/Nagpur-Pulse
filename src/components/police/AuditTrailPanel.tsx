/**
 * Nagpur Pulse — Human Decision Record & Audit Trail Panel
 * Shows:
 *  1. Audit Analytics KPI cards (acceptance rate, override rate, AI-Human agreement %)
 *  2. Live append-only audit event log with action badges & timestamps
 *  3. Decision History with ACCEPT / MODIFY / REJECT chips & full lineage
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  CheckCircle2,
  XCircle,
  Edit3,
  RefreshCw,
  Search,
  ShieldCheck,
  FileText,
  User,
  MapPin,
  Clock,
  Filter,
  ChevronRight,
  BarChart2,
  Lock,
} from 'lucide-react';
import {
  getAuditLogs,
  getAuditAnalytics,
  getDecisionHistory,
  AuditLog,
  AuditAnalytics,
  DecisionRecord,
} from '../../services/api/decisions';

// ─── Small helpers ────────────────────────────────────────────────────────────

function actionColor(action: string) {
  const a = action.toUpperCase();
  if (a.includes('ACCEPT') || a.includes('DECISION_ACCEPT')) return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
  if (a.includes('REJECT') || a.includes('DECISION_REJECT')) return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
  if (a.includes('MODIFY') || a.includes('DECISION_MODIFY')) return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
  if (a.includes('LOGIN')) return 'text-sky-400 bg-sky-500/10 border-sky-500/30';
  return 'text-slate-300 bg-slate-700/40 border-slate-600/30';
}

function fmtTime(ts: string) {
  try { return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }); } catch { return ts; }
}

function fmtDate(ts: string) {
  try { return new Date(ts).toLocaleDateString([], { day: '2-digit', month: 'short' }); } catch { return ''; }
}

// ─── Component ────────────────────────────────────────────────────────────────

export const AuditTrailPanel: React.FC = () => {
  const [analytics, setAnalytics] = useState<AuditAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'analytics' | 'decisions' | 'logs'>('analytics');
  const [searchQuery, setSearchQuery] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [ana, logs, decs] = await Promise.all([
        getAuditAnalytics().catch(() => null),
        getAuditLogs({ limit: 50, search: searchQuery || undefined, action: actionFilter || undefined }),
        getDecisionHistory(30),
      ]);
      if (ana) setAnalytics(ana);
      setAuditLogs(logs);
      setDecisions(decs);
    } catch (err) {
      console.error('AuditTrailPanel load error:', err);
    } finally {
      setLoading(false);
    }
  }, [searchQuery, actionFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  // Auto-refresh every 30 s
  useEffect(() => {
    const t = setInterval(() => { loadData(); }, 30_000);
    return () => clearInterval(t);
  }, [loadData]);

  return (
    <div className="bg-[#0a0c16] border border-slate-800/70 rounded-2xl overflow-hidden shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/70 bg-slate-900/50">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center">
            <FileText className="w-4.5 h-4.5 text-indigo-400" />
          </div>
          <div>
            <h2 className="text-sm font-extrabold text-white tracking-wide flex items-center gap-2">
              Human Decision Record & Audit Trail
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                <Lock className="w-2.5 h-2.5" />
                APPEND-ONLY
              </span>
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">AI Recommends → Human Reviews → ACCEPT / MODIFY / REJECT → Recorded → Authorized Dispatch → Audit Event</p>
          </div>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Tab Bar */}
      <div className="flex items-center gap-1 px-5 pt-3 border-b border-slate-800/50">
        {(['analytics', 'decisions', 'logs'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-t-lg transition capitalize ${
              activeTab === tab
                ? 'bg-slate-800 text-white border border-b-0 border-slate-700'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {tab === 'analytics' && <BarChart2 className="w-3 h-3 inline mr-1" />}
            {tab === 'decisions' && <ShieldCheck className="w-3 h-3 inline mr-1" />}
            {tab === 'logs' && <Activity className="w-3 h-3 inline mr-1" />}
            {tab}
          </button>
        ))}
      </div>

      <div className="p-5 space-y-4">

        {/* ── ANALYTICS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'analytics' && (
          <div className="space-y-4">
            {analytics ? (
              <>
                {/* KPI Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { label: 'Total Decisions', value: analytics.total_recommendations_decided, color: 'text-white' },
                    { label: 'Accept Rate', value: `${analytics.rates.acceptance_rate_pct}%`, color: 'text-emerald-400' },
                    { label: 'Override Rate', value: `${analytics.rates.modification_rate_pct}%`, color: 'text-amber-400' },
                    { label: 'AI-Human Agreement', value: `${analytics.rates.ai_human_agreement_pct}%`, color: 'text-indigo-400' },
                  ].map((k) => (
                    <div key={k.label} className="bg-slate-900/60 border border-slate-800 rounded-xl p-3">
                      <span className="text-[11px] text-slate-400 block mb-1">{k.label}</span>
                      <span className={`text-xl font-extrabold font-mono ${k.color}`}>{k.value}</span>
                    </div>
                  ))}
                </div>

                {/* Action Breakdown */}
                <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                    Controller Action Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-emerald-950/30 border border-emerald-500/20 rounded-xl p-3 text-center">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                      <div className="text-2xl font-extrabold text-emerald-300">{analytics.actions.accepted}</div>
                      <div className="text-[10px] text-emerald-400/80 font-mono">ACCEPTED</div>
                    </div>
                    <div className="bg-amber-950/30 border border-amber-500/20 rounded-xl p-3 text-center">
                      <Edit3 className="w-5 h-5 text-amber-400 mx-auto mb-1" />
                      <div className="text-2xl font-extrabold text-amber-300">{analytics.actions.modified}</div>
                      <div className="text-[10px] text-amber-400/80 font-mono">MODIFIED</div>
                    </div>
                    <div className="bg-rose-950/30 border border-rose-500/20 rounded-xl p-3 text-center">
                      <XCircle className="w-5 h-5 text-rose-400 mx-auto mb-1" />
                      <div className="text-2xl font-extrabold text-rose-300">{analytics.actions.rejected}</div>
                      <div className="text-[10px] text-rose-400/80 font-mono">REJECTED</div>
                    </div>
                  </div>
                </div>

                {/* Override Reason Breakdown */}
                {Object.keys(analytics.override_reasons_breakdown).length > 0 && (
                  <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-3">Override Reason Breakdown</h4>
                    <div className="space-y-2">
                      {Object.entries(analytics.override_reasons_breakdown)
                        .sort(([, a], [, b]) => b - a)
                        .map(([reason, count]) => {
                          const maxCount = Math.max(...Object.values(analytics.override_reasons_breakdown));
                          const pct = Math.round((count / maxCount) * 100);
                          return (
                            <div key={reason} className="flex items-center gap-2">
                              <span className="text-[11px] text-slate-400 font-mono w-44 shrink-0 truncate">{reason.replace(/_/g, ' ')}</span>
                              <div className="flex-1 bg-slate-800 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full bg-indigo-500" style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-[11px] text-slate-300 font-mono w-4 text-right">{count}</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center py-10 text-slate-500 text-sm">
                {loading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'No analytics data yet. Decisions will appear here after controllers take actions.'}
              </div>
            )}
          </div>
        )}

        {/* ── DECISIONS TAB ──────────────────────────────────────────────── */}
        {activeTab === 'decisions' && (
          <div className="space-y-3">
            {decisions.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-sm font-mono">
                No decision records yet. ACCEPT, MODIFY, or REJECT an AI recommendation to create the first entry.
              </div>
            ) : (
              decisions.map((d) => (
                <div key={d.decision_id} className="bg-slate-900/50 border border-slate-800 rounded-xl p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-mono font-extrabold px-2 py-0.5 rounded border ${actionColor(d.action)}`}>
                        {d.action}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{d.decision_id}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-500 font-mono">{fmtDate(d.created_at)} {fmtTime(d.created_at)}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Rec. ID</span>
                      <span className="text-slate-300">{d.recommendation_id}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Final Unit</span>
                      <span className="text-cyan-300">{d.final_unit_id ?? '—'}</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Controller</span>
                      <span className="text-slate-300">{d.operator.username} ({d.operator.role})</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Dispatch</span>
                      <span className={d.dispatch.status === 'DISPATCHED' ? 'text-emerald-400' : 'text-slate-500'}>
                        {d.dispatch.status}
                      </span>
                    </div>
                  </div>

                  {(d.reason_code || d.comment) && (
                    <div className="text-[11px] text-slate-400 font-mono bg-slate-950/40 rounded-lg px-2.5 py-1.5 flex items-start gap-1.5">
                      <ChevronRight className="w-3 h-3 text-slate-600 mt-0.5 shrink-0" />
                      <span><strong className="text-slate-300">{d.reason_code?.replace(/_/g, ' ')}</strong>{d.comment ? ` — ${d.comment}` : ''}</span>
                    </div>
                  )}

                  {/* AI Snapshot Strip */}
                  {d.previous_recommendation?.target_location_name && (
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono">
                      <Lock className="w-2.5 h-2.5 text-indigo-400 shrink-0" />
                      <span>AI Snapshot: Rec Unit <strong className="text-indigo-300">{d.previous_recommendation.recommended_unit_id ?? '—'}</strong> → <strong className="text-slate-300">{d.previous_recommendation.target_location_name}</strong> | Model <strong className="text-slate-400">{d.model_version}</strong></span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {/* ── AUDIT LOGS TAB ─────────────────────────────────────────────── */}
        {activeTab === 'logs' && (
          <div className="space-y-3">
            {/* Search & Filter Bar */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search username, resource, action..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg pl-8 pr-3 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <select
                value={actionFilter}
                onChange={(e) => setActionFilter(e.target.value)}
                className="bg-slate-900/60 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:outline-none focus:border-indigo-500"
              >
                <option value="">All Actions</option>
                <option value="DECISION_ACCEPT">DECISION_ACCEPT</option>
                <option value="DECISION_MODIFY">DECISION_MODIFY</option>
                <option value="DECISION_REJECT">DECISION_REJECT</option>
                <option value="LOGIN">LOGIN</option>
              </select>
            </div>

            {/* Log Entries */}
            <div className="border border-slate-800 rounded-xl overflow-hidden">
              <div className="bg-slate-900 px-4 py-2 border-b border-slate-800 flex items-center justify-between">
                <span className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Activity className="w-3 h-3 text-indigo-400" />
                  Append-Only Audit Event Log
                </span>
                <span className="text-[10px] text-slate-500 font-mono">{auditLogs.length} events</span>
              </div>

              <div className="divide-y divide-slate-800/60 max-h-80 overflow-y-auto">
                {auditLogs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-slate-500 text-xs font-mono">
                    {loading ? <RefreshCw className="w-4 h-4 animate-spin mx-auto" /> : 'No audit events found.'}
                  </div>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="px-4 py-2.5 bg-[#0a0c16] hover:bg-slate-900/50 flex items-start gap-3 text-xs">
                      {/* Action Badge */}
                      <span className={`text-[9px] font-mono font-extrabold px-2 py-0.5 rounded border whitespace-nowrap mt-0.5 ${actionColor(log.action)}`}>
                        {log.action.replace('DECISION_', '')}
                      </span>

                      {/* Event Body */}
                      <div className="flex-1 min-w-0">
                        <div className="text-slate-300 truncate">{log.details || log.action}</div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 font-mono mt-0.5">
                          <span className="flex items-center gap-0.5"><User className="w-2.5 h-2.5" />{log.username}</span>
                          {log.zone_code && <span className="flex items-center gap-0.5"><MapPin className="w-2.5 h-2.5" />{log.zone_code}</span>}
                          {log.resource_id && <span className="flex items-center gap-0.5"><FileText className="w-2.5 h-2.5" />{log.resource_id}</span>}
                        </div>
                      </div>

                      {/* Timestamp */}
                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400 font-mono">{fmtTime(log.timestamp)}</div>
                        <div className="text-[9px] text-slate-600 font-mono">{fmtDate(log.timestamp)}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

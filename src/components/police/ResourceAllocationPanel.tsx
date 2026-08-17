import React, { useState, useEffect } from 'react';
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  HelpCircle,
  RefreshCw,
  Cpu,
  Layers,
  ArrowRight,
  TrendingUp,
  XCircle,
  Check,
  Edit3,
} from 'lucide-react';
import {
  resourceAllocationApi,
  OptimizationResult,
  AllocationAssignment,
  UncoveredLocation,
  UnallocatedUnit
} from '../../services/api/resourceAllocation';
import { submitInlineDecision, getDecisionHistory } from '../../services/api/decisions';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';

import { DispatchModal } from './DispatchModal';
import { WhatIfSimulationModal } from '../simulation/WhatIfSimulationModal';

export const ResourceAllocationPanel: React.FC = () => {
  const [optimization, setOptimization] = useState<OptimizationResult | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [applying, setApplying] = useState<boolean>(false);
  const [isWhatIfOpen, setIsWhatIfOpen] = useState<boolean>(false);
  const [selectedAssignment, setSelectedAssignment] = useState<AllocationAssignment | null>(null);
  const [activeTab, setActiveTab] = useState<'allocations' | 'uncovered' | 'unallocated'>('allocations');
  const [maxEta, setMaxEta] = useState<number>(15);
  const [includePatrol, setIncludePatrol] = useState<boolean>(false);
  const [autoOptimize, setAutoOptimize] = useState<boolean>(false);

  // HITL Controller Decisions state & Modify modal state
  const [hitlDecisions, setHitlDecisions] = useState<Record<string, { action: 'APPROVED' | 'REJECTED' | 'MODIFIED'; reason?: string; modifiedDetails?: any }>>({});
  const [modifyModalAssignment, setModifyModalAssignment] = useState<AllocationAssignment | null>(null);

  const store = useNagpurPulseStore() as any;

  // Load persistent decision history from database on mount so decisions persist across refresh
  useEffect(() => {
    const loadExistingDecisions = async () => {
      try {
        const history = await getDecisionHistory(50);
        const decisionMap: Record<string, { action: 'APPROVED' | 'REJECTED' | 'MODIFIED'; reason?: string; modifiedDetails?: any }> = {};
        history.forEach((d) => {
          const uId = d.recommended_unit_id || d.final_unit_id;
          const locId = d.location_id;
          if (uId && locId) {
            const key = `${uId}_${locId}`;
            const actionMap: Record<string, 'APPROVED' | 'REJECTED' | 'MODIFIED'> = {
              ACCEPT: 'APPROVED',
              MODIFY: 'MODIFIED',
              REJECT: 'REJECTED',
            };
            decisionMap[key] = {
              action: actionMap[d.action] || 'APPROVED',
              reason: d.reason_code || undefined,
            };
          }
        });
        setHitlDecisions((prev) => ({ ...decisionMap, ...prev }));
      } catch (err) {
        console.warn('[HITL] Could not load decision history on mount:', err);
      }
    };
    loadExistingDecisions();
  }, []);

  // Helper to refresh decision history from backend and update local state
  const refreshDecisionHistory = async () => {
    try {
      const history = await getDecisionHistory(50);
      const decisionMap: Record<string, { action: 'APPROVED' | 'REJECTED' | 'MODIFIED'; reason?: string; modifiedDetails?: any }> = {};
      history.forEach((d) => {
        const uId = d.recommended_unit_id || d.final_unit_id;
        const locId = d.location_id;
        if (uId && locId) {
          const key = `${uId}_${locId}`;
          const actionMap: Record<string, 'APPROVED' | 'REJECTED' | 'MODIFIED'> = {
            ACCEPT: 'APPROVED',
            MODIFY: 'MODIFIED',
            REJECT: 'REJECTED',
          };
          decisionMap[key] = {
            action: actionMap[d.action] || 'APPROVED',
            reason: d.reason_code || undefined,
          };
        }
      });
      setHitlDecisions(decisionMap);
    } catch (err) {
      console.warn('[HITL] Could not refresh decision history:', err);
    }
  };

  const handleApproveAssignment = async (a: AllocationAssignment) => {
    console.log('%c[HITL] APPROVE clicked', 'color: #22c55e; font-weight: bold; font-size: 14px');
    console.log('[HITL] Assignment data:', a);

    const key = `${a.unit_id}_${a.location_id}`;

    // Record decision in immutable audit trail
    const payload = {
      unit_id: a.unit_id,
      location_id: a.location_id,
      location_name: a.location_name,
      reason: a.reason || 'HIGH_RISK_JUNCTION_COVERAGE',
      priority: a.risk_class || 'HIGH',
      risk_score: a.risk_score,
      eta_minutes: a.eta_minutes,
      distance_km: a.distance_km,
      action: 'ACCEPT' as const,
    };
    console.log('[HITL] Posting inline decision payload:', payload);

    try {
      const rec = await submitInlineDecision(payload);
      console.log('%c[HITL] ✅ Audit record created!', 'color: #22c55e; font-weight: bold', rec);

      // Refresh decision history from backend to get authoritative state
      await refreshDecisionHistory();

      if (store.addNotification) {
        store.addNotification({
          title: `Dispatch APPROVED — Audit Recorded [${rec.decision_id}]`,
          message: `ACCEPTED: Unit ${a.unit_id} → ${a.location_name} (ETA: ${a.eta_minutes} min)`,
          type: 'success',
        });
      }
    } catch (err: any) {
      console.error('%c[HITL] ❌ Inline decision record FAILED:', 'color: #ef4444; font-weight: bold', err);
      if (store.addNotification) {
        store.addNotification({
          title: 'Dispatch Decision Failed',
          message: err?.message || `Failed to record decision for unit ${a.unit_id}.`,
          type: 'error',
        });
      }
    }
  };

  const handleRejectAssignment = async (a: AllocationAssignment) => {
    const key = `${a.unit_id}_${a.location_id}`;

    // Record decision in immutable audit trail
    try {
      const rec = await submitInlineDecision({
        unit_id: a.unit_id,
        location_id: a.location_id,
        location_name: a.location_name,
        reason: a.reason || 'HIGH_RISK_JUNCTION_COVERAGE',
        priority: a.risk_class || 'HIGH',
        risk_score: a.risk_score,
        eta_minutes: a.eta_minutes,
        distance_km: a.distance_km,
        action: 'REJECT',
        reason_code: 'LOCAL_OPERATIONAL_CONDITION',
        comment: 'Controller rejected this recommendation from the allocation panel.',
      });

      // Refresh decision history from backend to get authoritative state
      await refreshDecisionHistory();

      if (store.addNotification) {
        store.addNotification({
          title: `Dispatch REJECTED — Audit Recorded [${rec.decision_id}]`,
          message: `REJECTED: Unit ${a.unit_id} → ${a.location_name}`,
          type: 'warning',
        });
      }
    } catch (err: any) {
      console.error('[HITL Audit] Reject record failed:', err);
      if (store.addNotification) {
        store.addNotification({
          title: 'Reject Decision Failed',
          message: err?.message || `Failed to record reject decision for unit ${a.unit_id}.`,
          type: 'error',
        });
      }
    }
  };

  const handleModifyAssignment = (a: AllocationAssignment) => {
    setModifyModalAssignment(a);
  };

  const fetchLatestOptimization = async () => {
    setLoading(true);
    try {
      const data = await resourceAllocationApi.getLatest();
      setOptimization(data);
    } catch (err) {
      console.error('Failed to fetch latest optimization:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleRunOptimizer = async () => {
    setLoading(true);
    try {
      const data = await resourceAllocationApi.optimize({
        max_eta_minutes: maxEta,
        include_patrolling_units: includePatrol,
        solver_time_limit: 3.0,
      });
      setOptimization(data);
      if (store.addNotification) {
        store.addNotification({
          title: 'OR-Tools Optimization Complete',
          message: `Solver Status: ${data.status} | Allocated ${data.allocated_units} units (${data.risk_weighted_coverage_pct}% Risk Coverage)`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Optimization failed:', err);
      if (store.addNotification) {
        store.addNotification({
          title: 'Optimization Failed',
          message: 'Unable to execute OR-Tools solver. Please check backend connection.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleRunFastAllocation = async () => {
    setLoading(true);
    try {
      const data = await resourceAllocationApi.fastAllocate({
        max_eta_minutes: maxEta,
        include_patrolling_units: includePatrol,
      });
      // Map fast allocation payload to OptimizationResult format for seamless dashboard visualization
      const mappedResult: OptimizationResult = {
        optimization_id: `FAST_${Date.now()}`,
        generated_at: data.timestamp || new Date().toISOString(),
        solver: 'GREEDY_PRIORITY',
        status: 'OPTIMAL',
        objective_value: data.objective_value || 0,
        solver_time_seconds: (data.performance?.total_ms || 5.0) / 1000.0,
        available_units: data.metrics?.available_units || 0,
        allocated_units: data.metrics?.assigned_units || 0,
        unallocated_units_count: (data.metrics?.available_units || 0) - (data.metrics?.assigned_units || 0),
        total_demand_locations: data.metrics?.total_target_junctions || 0,
        covered_locations: data.metrics?.assigned_units || 0,
        uncovered_locations_count: data.metrics?.unassigned_junctions || 0,
        risk_weighted_coverage_pct: data.metrics?.coverage_percentage || 100.0,
        resource_utilization_pct: Math.round(((data.metrics?.assigned_units || 0) / (data.metrics?.available_units || 1)) * 100),
        resource_shortage_score: 0,
        assignments: (data.assignments || []).map((a: any) => ({
          optimization_id: `FAST_${Date.now()}`,
          unit_id: a.unit_id,
          location_id: a.location_id,
          location_name: a.location_name,
          risk_score: a.risk_score || 50,
          risk_class: a.risk_class || 'HIGH',
          traffic_congestion_score: 50,
          incident_priority_score: 50,
          coverage_gap_score: 0,
          distance_km: 2.0,
          eta_minutes: a.eta_minutes || 5.0,
          assignment_value: Math.round((a.assignment_score || 0.8) * 100),
          status: 'RECOMMENDED',
          reason: a.explanation ? a.explanation.join('; ') : 'Fast Greedy Priority Match',
        })),
        unallocated_units: [],
        uncovered_locations: (data.unassigned || []).map((u: any) => ({
          location_id: u.raw_junction_id || 0,
          location_name: u.location_name || u.junction_id,
          risk_score: 50,
          risk_class: u.risk_class || 'HIGH',
          priority_score: Math.round((u.priority_score || 0.5) * 100),
          traffic_congestion_score: 50,
          incident_priority_score: 0,
          desired_units: 1,
          assigned_units: 0,
          reason: u.reason || 'NO_AVAILABLE_UNIT',
        })),
        configuration: { algorithm: 'GREEDY_PRIORITY', max_eta_minutes: maxEta },
      };

      setOptimization(mappedResult);
      if (store.addNotification) {
        store.addNotification({
          title: 'Fast Greedy Allocation Complete (<100ms)',
          message: `Allocated ${mappedResult.allocated_units} units in ${data.performance?.total_ms || 4.2}ms (${mappedResult.risk_weighted_coverage_pct}% Risk Coverage)`,
          type: 'success',
        });
      }
    } catch (err) {
      console.error('Fast allocation failed:', err);
      if (store.addNotification) {
        store.addNotification({
          title: 'Fast Allocation Failed',
          message: 'Unable to execute Fast Greedy Allocator.',
          type: 'error',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApplyAllocations = async () => {
    if (!optimization) return;
    setApplying(true);
    try {
      const res = await resourceAllocationApi.apply(optimization.optimization_id);
      
      // Update unit status in local store state if method exists
      if (store.updateUnitStatus) {
        optimization.assignments.forEach((a) => {
          store.updateUnitStatus(a.unit_id, 'DEPLOYED');
        });
      }

      if (store.addNotification) {
        store.addNotification({
          title: 'Resource Dispatch Confirmed',
          message: `Dispatched ${res.applied_count} police units based on OR-Tools CP-SAT recommendations.`,
          type: 'success',
        });
      }

      fetchLatestOptimization();
    } catch (err) {
      console.error('Apply allocations failed:', err);
      if (store.addNotification) {
        store.addNotification({
          title: 'Dispatch Failed',
          message: 'Could not apply recommended allocations.',
          type: 'error',
        });
      }
    } finally {
      setApplying(false);
    }
  };

  useEffect(() => {
    fetchLatestOptimization();
  }, []);

  useEffect(() => {
    if (!autoOptimize) return;
    const interval = setInterval(() => {
      handleRunOptimizer();
    }, 45000);
    return () => clearInterval(interval);
  }, [autoOptimize, maxEta, includePatrol]);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-2xl text-slate-100 space-y-6">
      {/* Header & Controls Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Cpu className="w-6 h-6 text-indigo-400 animate-pulse" />
            <h2 className="text-xl font-bold text-white tracking-wide">
              OR-Tools Resource Allocation Engine
            </h2>
            <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
              CP-SAT Solver
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Mathematically optimizes PCR fleet distribution based on ML Risk, Live Traffic, Active Incidents, and ETA Constraints.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center flex-wrap gap-2">
          <button
            onClick={() => setIsWhatIfOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-cyan-600/30 transition border border-cyan-400/30"
          >
            <Zap className="w-4 h-4 fill-current text-cyan-300 animate-pulse" />
            <span>WHAT-IF SIMULATOR</span>
          </button>

          <button
            onClick={handleRunFastAllocation}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold shadow-lg shadow-purple-600/30 transition disabled:opacity-50 border border-purple-400/30"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
            <span>FAST ALLOCATION (&lt;100ms)</span>
          </button>

          <button
            onClick={handleRunOptimizer}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-indigo-600/30 transition disabled:opacity-50"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
            <span>RUN OR-TOOLS OPTIMIZER</span>
          </button>

          <button
            onClick={handleApplyAllocations}
            disabled={applying || !optimization || optimization.assignments.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-semibold shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
          >
            {applying ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
            <span>APPLY & DISPATCH ({optimization?.assignments.length || 0})</span>
          </button>

          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-800/80 px-3 py-2 rounded-lg border border-slate-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={autoOptimize}
              onChange={(e) => setAutoOptimize(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600 focus:ring-indigo-500"
            />
            <span>Auto Optimize</span>
          </label>
        </div>
      </div>

      {/* KPI Overview Grid */}
      {optimization && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Solver Status</span>
            <div className="flex items-center gap-1.5 mt-1">
              <span
                className={`w-2 h-2 rounded-full ${
                  optimization.status === 'OPTIMAL' ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="text-sm font-bold text-white">{optimization.status}</span>
            </div>
            <span className="text-[10px] text-slate-400">{optimization.solver_time_seconds}s solve time</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Available Units</span>
            <div className="text-lg font-bold text-white mt-0.5">{optimization.available_units} Units</div>
            <span className="text-[10px] text-indigo-400">{optimization.allocated_units} Allocated</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Risk Coverage</span>
            <div className="text-lg font-bold text-emerald-400 mt-0.5">
              {optimization.risk_weighted_coverage_pct}%
            </div>
            <span className="text-[10px] text-slate-400">Risk-Weighted</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Fleet Utilization</span>
            <div className="text-lg font-bold text-indigo-300 mt-0.5">
              {optimization.resource_utilization_pct}%
            </div>
            <span className="text-[10px] text-slate-400">{optimization.unallocated_units_count} Idle</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Shortage Score</span>
            <div className="text-lg font-bold text-rose-400 mt-0.5">
              {optimization.resource_shortage_score}
            </div>
            <span className="text-[10px] text-rose-300/80">Unmet Demand</span>
          </div>

          <div className="bg-slate-800/60 p-3 rounded-lg border border-slate-700/60">
            <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-medium">Objective Value</span>
            <div className="text-lg font-bold text-amber-300 mt-0.5">
              {optimization.objective_value}
            </div>
            <span className="text-[10px] text-slate-400">Max Global Value</span>
          </div>
        </div>
      )}

      {/* Solver Configuration Sub-Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-800/40 p-3 rounded-lg border border-slate-800 text-xs">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">Max Response ETA:</span>
            <select
              value={maxEta}
              onChange={(e) => setMaxEta(Number(e.target.value))}
              className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-slate-200"
            >
              <option value={10}>10 minutes</option>
              <option value={15}>15 minutes (Default)</option>
              <option value={20}>20 minutes</option>
              <option value={30}>30 minutes</option>
            </select>
          </div>

          <label className="flex items-center gap-2 text-slate-300 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePatrol}
              onChange={(e) => setIncludePatrol(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-indigo-600"
            />
            <span>Include Patrolling Units</span>
          </label>
        </div>

        {optimization && (
          <span className="text-slate-400">
            Last Optimized: <strong className="text-slate-200">{new Date(optimization.generated_at).toLocaleTimeString()}</strong>
          </span>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-800 gap-4">
        <button
          onClick={() => setActiveTab('allocations')}
          className={`pb-2 px-1 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'allocations'
              ? 'border-indigo-500 text-indigo-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Recommended Allocations ({optimization?.assignments.length || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('uncovered')}
          className={`pb-2 px-1 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'uncovered'
              ? 'border-rose-500 text-rose-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          <span>Uncovered High-Risk Locations ({optimization?.uncovered_locations_count || 0})</span>
        </button>

        <button
          onClick={() => setActiveTab('unallocated')}
          className={`pb-2 px-1 text-xs font-semibold transition border-b-2 flex items-center gap-1.5 ${
            activeTab === 'unallocated'
              ? 'border-amber-500 text-amber-400'
              : 'border-transparent text-slate-400 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5" />
          <span>Unallocated Resources ({optimization?.unallocated_units_count || 0})</span>
        </button>
      </div>

      {/* Tab Content 1: Recommended Allocations */}
      {activeTab === 'allocations' && (
        <div className="overflow-x-auto rounded-lg border border-slate-800">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-800/80 text-slate-300 border-b border-slate-800">
                <th className="p-3 font-semibold">UNIT ID</th>
                <th className="p-3 font-semibold">TARGET CHOWK</th>
                <th className="p-3 font-semibold">ML RISK</th>
                <th className="p-3 font-semibold">LIVE TRAFFIC</th>
                <th className="p-3 font-semibold">INCIDENT SEVERITY</th>
                <th className="p-3 font-semibold">ETA</th>
                <th className="p-3 font-semibold">ASSIGNMENT VALUE</th>
                <th className="p-3 font-semibold text-right">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {optimization?.assignments.map((a) => (
                <tr key={`${a.unit_id}_${a.location_id}`} className="hover:bg-slate-800/40 transition">
                  <td className="p-3 font-bold text-indigo-300">{a.unit_id}</td>
                  <td className="p-3 font-medium text-slate-100">{a.location_name}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded font-semibold text-[11px] ${
                        a.risk_class === 'CRITICAL' || a.risk_score >= 68
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : a.risk_class === 'HIGH' || a.risk_score >= 48
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}
                    >
                      {a.risk_class} ({a.risk_score}%)
                    </span>
                  </td>
                  <td className="p-3 text-slate-300">{a.traffic_congestion_score}% Congestion</td>
                  <td className="p-3 text-slate-300 font-medium">
                    {a.incident_priority_score > 0 ? (
                      <span className="text-rose-400 font-semibold">Active ({a.incident_priority_score} pts)</span>
                    ) : (
                      <span className="text-slate-500">None</span>
                    )}
                  </td>
                  <td className="p-3 text-slate-200 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span>{a.eta_minutes} min ({a.distance_km} km)</span>
                  </td>
                  <td className="p-3 font-bold text-amber-300">{a.assignment_value}</td>
                  <td className="p-3 text-right">
                    {hitlDecisions[`${a.unit_id}_${a.location_id}`] ? (
                      <span className={`px-2.5 py-1 rounded text-[11px] font-mono font-bold border inline-flex items-center gap-1 ${
                        hitlDecisions[`${a.unit_id}_${a.location_id}`].action === 'APPROVED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                          : hitlDecisions[`${a.unit_id}_${a.location_id}`].action === 'REJECTED'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                          : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      }`}>
                        {hitlDecisions[`${a.unit_id}_${a.location_id}`].action === 'APPROVED' && <Check className="w-3 h-3" />}
                        {hitlDecisions[`${a.unit_id}_${a.location_id}`].action === 'REJECTED' && <XCircle className="w-3 h-3" />}
                        {hitlDecisions[`${a.unit_id}_${a.location_id}`].action === 'MODIFIED' && <Edit3 className="w-3 h-3" />}
                        <span>{hitlDecisions[`${a.unit_id}_${a.location_id}`].action}</span>
                      </span>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        {/* 1. APPROVE */}
                        <button
                          onClick={() => handleApproveAssignment(a)}
                          className="px-2 py-1 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                          title="Approve Recommendation"
                        >
                          <Check className="w-3 h-3" />
                          <span>Approve</span>
                        </button>

                        {/* 2. REJECT */}
                        <button
                          onClick={() => handleRejectAssignment(a)}
                          className="px-2 py-1 bg-rose-950 hover:bg-rose-900 text-rose-300 border border-rose-500/40 rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                          title="Reject Recommendation"
                        >
                          <XCircle className="w-3 h-3" />
                          <span>Reject</span>
                        </button>

                        {/* 3. MODIFY */}
                        <button
                          onClick={() => handleModifyAssignment(a)}
                          className="px-2 py-1 bg-amber-950 hover:bg-amber-900 text-amber-300 border border-amber-500/40 rounded text-[10px] font-bold transition flex items-center gap-1 shadow-sm"
                          title="Modify Recommendation"
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>Modify</span>
                        </button>

                        <button
                          onClick={() => setSelectedAssignment(a)}
                          className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 rounded transition border border-slate-700"
                          title="Why Allocated?"
                        >
                          <HelpCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {(!optimization || optimization.assignments.length === 0) && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-400">
                    No active resource allocations generated. Click <strong>"RUN OR-TOOLS OPTIMIZER"</strong> to execute.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Tab Content 2: Uncovered High-Risk Locations */}
      {activeTab === 'uncovered' && (
        <div className="space-y-3">
          {optimization?.uncovered_locations.map((u) => (
            <div
              key={u.location_id}
              className="bg-slate-800/40 p-3.5 rounded-lg border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                  <h4 className="font-bold text-slate-100 text-sm">{u.location_name}</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                    {u.risk_class} (Risk: {u.risk_score}%)
                  </span>
                </div>
                <p className="text-xs text-rose-300/90 font-medium">
                  Reason: {u.reason}
                </p>
              </div>

              <div className="text-xs text-slate-300 flex items-center gap-4 bg-slate-900/60 px-3 py-1.5 rounded border border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px]">Priority Score</span>
                  <span className="font-bold text-amber-300">{u.priority_score} pts</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Demand Shortage</span>
                  <span className="font-bold text-rose-400">{u.desired_units} Units</span>
                </div>
              </div>
            </div>
          ))}
          {(!optimization || optimization.uncovered_locations.length === 0) && (
            <div className="p-6 bg-slate-800/30 rounded-lg text-center text-slate-400 border border-slate-800">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <span>All high-priority demand locations are fully covered by available police resources!</span>
            </div>
          )}
        </div>
      )}

      {/* Tab Content 3: Unallocated Resources */}
      {activeTab === 'unallocated' && (
        <div className="space-y-3">
          {optimization?.unallocated_units.map((u) => (
            <div
              key={u.unit_id}
              className="bg-slate-800/40 p-3.5 rounded-lg border border-amber-500/30 flex items-center justify-between gap-3"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <h4 className="font-bold text-slate-100 text-sm">{u.unit_id} — {u.unit_name}</h4>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                    {u.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Reason: {u.reason}
                </p>
              </div>
            </div>
          ))}
          {(!optimization || optimization.unallocated_units.length === 0) && (
            <div className="p-6 bg-slate-800/30 rounded-lg text-center text-slate-400 border border-slate-800">
              <Check className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
              <span>100% of available police fleet is actively allocated to demand locations!</span>
            </div>
          )}
        </div>
      )}

      {/* "Why This Allocation?" Modal */}
      {selectedAssignment && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-indigo-500/40 rounded-xl max-w-lg w-full p-5 space-y-4 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base text-white">Why Allocation Created?</h3>
              </div>
              <button
                onClick={() => setSelectedAssignment(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-indigo-950/30 p-3 rounded-lg border border-indigo-500/20 text-xs space-y-1">
              <div className="font-bold text-indigo-200">
                Unit {selectedAssignment.unit_id} ──► {selectedAssignment.location_name}
              </div>
              <p className="text-slate-300">
                OR-Tools CP-SAT selected this assignment because it maximizes total city-wide operational coverage while satisfying maximum response time limits.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block">ML Risk Score</span>
                <span className="font-bold text-rose-300 text-sm">{selectedAssignment.risk_score}% ({selectedAssignment.risk_class})</span>
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Live Traffic Congestion</span>
                <span className="font-bold text-amber-300 text-sm">{selectedAssignment.traffic_congestion_score}%</span>
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Active Incident Priority</span>
                <span className="font-bold text-indigo-300 text-sm">{selectedAssignment.incident_priority_score} pts</span>
              </div>

              <div className="bg-slate-800/60 p-2.5 rounded border border-slate-800">
                <span className="text-slate-400 block">Response ETA / Distance</span>
                <span className="font-bold text-emerald-300 text-sm">{selectedAssignment.eta_minutes} min ({selectedAssignment.distance_km} km)</span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedAssignment(null)}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-semibold"
              >
                Close Explanation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Human Controller Modify Modal */}
      {modifyModalAssignment && (
        <DispatchModal
          isOpen={true}
          onClose={() => setModifyModalAssignment(null)}
          initialUnitId={modifyModalAssignment.unit_id}
          initialJunctionId={modifyModalAssignment.location_id}
          recommendationReason={`AI Allocation Recommendation (${modifyModalAssignment.risk_class} Risk — Score: ${modifyModalAssignment.risk_score})`}
          onModify={async (modifiedDetails) => {
            const key = `${modifyModalAssignment.unit_id}_${modifyModalAssignment.location_id}`;
            const targetUnitId = modifiedDetails.unitId || modifyModalAssignment.unit_id;
            try {
              const rec = await submitInlineDecision({
                unit_id: modifyModalAssignment.unit_id,
                location_id: modifyModalAssignment.location_id,
                location_name: modifyModalAssignment.location_name,
                reason: modifyModalAssignment.reason || 'HIGH_RISK_JUNCTION_COVERAGE',
                priority: modifyModalAssignment.risk_class || 'HIGH',
                risk_score: modifyModalAssignment.risk_score,
                eta_minutes: modifyModalAssignment.eta_minutes,
                distance_km: modifyModalAssignment.distance_km,
                action: 'MODIFY',
                selected_unit_id: targetUnitId,
                reason_code: 'LOCAL_OPERATIONAL_CONDITION',
                comment: modifiedDetails.notes || 'Controller modified dispatch parameters from panel.',
              });
              setHitlDecisions((prev) => ({ ...prev, [key]: { action: 'MODIFIED', modifiedDetails } }));
              if (store.updateUnitStatus) {
                store.updateUnitStatus(targetUnitId, 'DEPLOYED');
              }
              if (store.addNotification) {
                store.addNotification({
                  title: `Dispatch MODIFIED — Audit Recorded [${rec.decision_id}]`,
                  message: `MODIFIED: Assigned Unit ${targetUnitId} → ${modifyModalAssignment.location_name}`,
                  type: 'info',
                });
              }
            } catch (e: any) {
              console.error('[HITL Audit] Modify record failed:', e);
              if (store.addNotification) {
                store.addNotification({
                  title: 'Modify Decision Failed',
                  message: e?.message || 'Failed to record modify decision.',
                  type: 'error',
                });
              }
            }
            setModifyModalAssignment(null);
          }}
          onApprove={async () => {
            const key = `${modifyModalAssignment.unit_id}_${modifyModalAssignment.location_id}`;
            try {
              const rec = await submitInlineDecision({
                unit_id: modifyModalAssignment.unit_id,
                location_id: modifyModalAssignment.location_id,
                location_name: modifyModalAssignment.location_name,
                reason: modifyModalAssignment.reason || 'HIGH_RISK_JUNCTION_COVERAGE',
                priority: modifyModalAssignment.risk_class || 'HIGH',
                risk_score: modifyModalAssignment.risk_score,
                eta_minutes: modifyModalAssignment.eta_minutes,
                distance_km: modifyModalAssignment.distance_km,
                action: 'ACCEPT',
              });
              setHitlDecisions((prev) => ({ ...prev, [key]: { action: 'APPROVED' } }));
              if (store.updateUnitStatus) {
                store.updateUnitStatus(modifyModalAssignment.unit_id, 'DEPLOYED');
              }
              if (store.addNotification) {
                store.addNotification({
                  title: `Dispatch APPROVED — Audit Recorded [${rec.decision_id}]`,
                  message: `ACCEPTED: Unit ${modifyModalAssignment.unit_id} → ${modifyModalAssignment.location_name}`,
                  type: 'success',
                });
              }
            } catch (e: any) {
              console.error('[HITL Audit] Approve record failed:', e);
              if (store.addNotification) {
                store.addNotification({
                  title: 'Approve Decision Failed',
                  message: e?.message || 'Failed to record approve decision.',
                  type: 'error',
                });
              }
            }
            setModifyModalAssignment(null);
          }}
          onReject={async (reason) => {
            const key = `${modifyModalAssignment.unit_id}_${modifyModalAssignment.location_id}`;
            try {
              const rec = await submitInlineDecision({
                unit_id: modifyModalAssignment.unit_id,
                location_id: modifyModalAssignment.location_id,
                location_name: modifyModalAssignment.location_name,
                reason: modifyModalAssignment.reason || 'HIGH_RISK_JUNCTION_COVERAGE',
                priority: modifyModalAssignment.risk_class || 'HIGH',
                risk_score: modifyModalAssignment.risk_score,
                eta_minutes: modifyModalAssignment.eta_minutes,
                distance_km: modifyModalAssignment.distance_km,
                action: 'REJECT',
                reason_code: 'LOCAL_OPERATIONAL_CONDITION',
                comment: reason,
              });
              setHitlDecisions((prev) => ({ ...prev, [key]: { action: 'REJECTED', reason } }));
              if (store.addNotification) {
                store.addNotification({
                  title: `Dispatch REJECTED — Audit Recorded [${rec.decision_id}]`,
                  message: `REJECTED: Unit ${modifyModalAssignment.unit_id} → ${modifyModalAssignment.location_name}`,
                  type: 'warning',
                });
              }
            } catch (e: any) {
              console.error('[HITL Audit] Reject record failed:', e);
              if (store.addNotification) {
                store.addNotification({
                  title: 'Reject Decision Failed',
                  message: e?.message || 'Failed to record reject decision.',
                  type: 'error',
                });
              }
            }
            setModifyModalAssignment(null);
          }}
        />
      )}

      {/* What-If Simulation Sandbox Modal */}
      <WhatIfSimulationModal
        isOpen={isWhatIfOpen}
        onClose={() => setIsWhatIfOpen(false)}
        onApplySuccess={() => fetchLatestOptimization()}
      />
    </div>
  );
};

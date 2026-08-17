import React, { useState } from 'react';
import {
  Zap,
  Play,
  CheckCircle2,
  AlertTriangle,
  X,
  Clock,
  MapPin,
  TrendingUp,
  RefreshCw,
  ShieldAlert,
  Sliders,
  ChevronRight,
  Shield,
  Layers,
} from 'lucide-react';
import {
  runSimulationScenario,
  applySimulationPlan,
  SimulationRunResponse,
  SimulationScenarioChange,
} from '../../services/api/simulation';

interface WhatIfSimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  userZone?: string;
  onApplySuccess?: () => void;
}

const PRESET_SCENARIOS = [
  {
    id: 'unit_offline',
    title: '🚨 UNIT OFFLINE',
    description: 'Temporarily remove Unit PU002 from available resources (in-memory only)',
    changes: [{ type: 'UNIT_STATUS', unit_id: 'PU002', value: 'OFFLINE' }] as SimulationScenarioChange[],
  },
  {
    id: 'critical_incident',
    title: '🔥 NEW CRITICAL INCIDENT',
    description: 'Add new CRITICAL incident at Indora Sq J-22 in-memory and rerun optimizer',
    changes: [
      {
        type: 'NEW_INCIDENT',
        junction_id: 22,
        location_name: 'Indora Square (J-22)',
        risk_score: 95,
        risk_class: 'CRITICAL',
      },
    ] as SimulationScenarioChange[],
  },
  {
    id: 'route_blocked',
    title: '🚧 ROUTE BLOCKED',
    description: 'Temporarily mark Sitabuldi-Variety Corridor route R-17 unavailable',
    changes: [{ type: 'ROUTE_UNAVAILABLE', route_id: 'R-17', junction_id: 17 }] as SimulationScenarioChange[],
  },
];

export const WhatIfSimulationModal: React.FC<WhatIfSimulationModalProps> = ({
  isOpen,
  onClose,
  userZone = 'CENTRAL',
  onApplySuccess,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('unit_offline');
  const [customScenarioName, setCustomScenarioName] = useState<string>('Custom Scenario 1');
  const [scenarioType, setScenarioType] = useState<string>('UNIT_STATUS');
  const [unitId, setUnitId] = useState<string>('PU002');
  const [unitStatus, setUnitStatus] = useState<string>('OFFLINE');
  const [junctionId, setJunctionId] = useState<number>(17);
  const [congestion, setCongestion] = useState<number>(85);

  const [loading, setLoading] = useState<boolean>(false);
  const [simulationResult, setSimulationResult] = useState<SimulationRunResponse | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [applying, setApplying] = useState<boolean>(false);
  const [applyStatus, setApplyStatus] = useState<{ success: boolean; message: string } | null>(null);

  const handleRunSimulation = async (presetId?: string) => {
    setLoading(true);
    setErrorMessage(null);
    setApplyStatus(null);
    try {
      let name = 'Hypothetical Operational Scenario';
      let changes: SimulationScenarioChange[] = [];

      const activeId = presetId || selectedPreset;

      if (activeId !== 'custom') {
        const preset = PRESET_SCENARIOS.find((p) => p.id === activeId);
        if (preset) {
          name = preset.title;
          changes = preset.changes;
        }
      } else {
        name = customScenarioName;
        if (scenarioType === 'UNIT_STATUS') {
          changes = [{ type: 'UNIT_STATUS', unit_id: unitId, value: unitStatus }];
        } else if (scenarioType === 'JUNCTION_UNAVAILABLE') {
          changes = [{ type: 'JUNCTION_UNAVAILABLE', junction_id: Number(junctionId) }];
        } else if (scenarioType === 'TRAFFIC_CHANGE') {
          changes = [{ type: 'TRAFFIC_CHANGE', junction_id: Number(junctionId), congestion: Number(congestion) }];
        }
      }

      const res = await runSimulationScenario(name, changes);
      console.log('Simulation Run Result:', res);
      if (res.data) {
        setSimulationResult(res.data);
      } else {
        setErrorMessage(res.error || 'Simulation run failed.');
      }
    } catch (err: any) {
      console.error('Simulation error:', err);
      setErrorMessage(err?.message || 'Error running OR-Tools scenario simulation.');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    if (isOpen) {
      handleRunSimulation();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplySimulation = async () => {
    if (!simulationResult) return;
    setApplying(true);
    setApplyStatus(null);
    try {
      const res = await applySimulationPlan(simulationResult.simulation_id);
      if (res.data) {
        setApplyStatus({
          success: res.data.success,
          message: res.data.message,
        });
        if (res.data.success && onApplySuccess) {
          onApplySuccess();
        }
      } else {
        setApplyStatus({
          success: false,
          message: res.error || 'Failed to apply simulation plan.',
        });
      }
    } catch (err: any) {
      setApplyStatus({
        success: false,
        message: err.message || 'Error applying simulation plan.',
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-5xl bg-[#0f111a] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-gradient-to-r from-slate-900 via-[#121829] to-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <Zap className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-wide">
                  What-If Resource Simulation & Contingency
                </h2>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded">
                  ZONE: {userZone}
                </span>
              </div>
              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                <Shield className="w-3.5 h-3.5 text-emerald-400" />
                Fast Greedy Priority-Scoring Scenario Sandbox • Zero live database mutations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Spec 17 Prominent Simulation Banner */}
          <div className="p-3.5 bg-cyan-950/40 border-2 border-cyan-500/50 rounded-xl flex items-center justify-between font-mono text-xs shadow-lg">
            <div className="flex items-center gap-2 text-cyan-300 font-bold">
              <ShieldAlert className="w-5 h-5 text-cyan-400 shrink-0" />
              <span>WHAT-IF SIMULATION — NOT LIVE</span>
            </div>
            <span className="text-slate-300 font-semibold text-[11px]">
              Live police assignments and database state have NOT changed.
            </span>
          </div>

          {/* Preset Scenario Cards */}
          <div>
            <label className="block text-xs font-mono font-bold text-slate-300 mb-3 uppercase tracking-wider">
              1. Select Operational Scenario Preset
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {PRESET_SCENARIOS.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => {
                    setSelectedPreset(preset.id);
                    handleRunSimulation(preset.id);
                  }}
                  className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    selectedPreset === preset.id
                      ? 'bg-cyan-950/40 border-cyan-500/60 shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div>
                    <h3 className="text-xs font-bold text-slate-200 mb-1">{preset.title}</h3>
                    <p className="text-[11px] text-slate-400 leading-snug">{preset.description}</p>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-[10px] font-mono text-cyan-400">
                    <span>Run Simulation</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Custom Scenario Builder Toggle */}
          <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-purple-400" />
                Custom Scenario Controls
              </span>
              <button
                onClick={() => {
                  setSelectedPreset('custom');
                  handleRunSimulation('custom');
                }}
                disabled={loading}
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 shadow"
              >
                {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
                Run Custom Simulation
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Scenario Type</label>
                <select
                  value={scenarioType}
                  onChange={(e) => setScenarioType(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono focus:border-cyan-500"
                >
                  <option value="UNIT_STATUS">Unit Status Transition</option>
                  <option value="JUNCTION_UNAVAILABLE">Junction Road Blockade</option>
                  <option value="TRAFFIC_CHANGE">Traffic Congestion Spike</option>
                </select>
              </div>

              {scenarioType === 'UNIT_STATUS' && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Target Police Unit</label>
                    <input
                      type="text"
                      value={unitId}
                      onChange={(e) => setUnitId(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Simulated Status</label>
                    <select
                      value={unitStatus}
                      onChange={(e) => setUnitStatus(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    >
                      <option value="OFFLINE">OFFLINE</option>
                      <option value="DISPATCHED">DISPATCHED</option>
                      <option value="AVAILABLE">AVAILABLE</option>
                    </select>
                  </div>
                </>
              )}

              {scenarioType === 'JUNCTION_UNAVAILABLE' && (
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Blocked Junction ID</label>
                  <input
                    type="number"
                    value={junctionId}
                    onChange={(e) => setJunctionId(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                  />
                </div>
              )}

              {scenarioType === 'TRAFFIC_CHANGE' && (
                <>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Junction ID</label>
                    <input
                      type="number"
                      value={junctionId}
                      onChange={(e) => setJunctionId(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">Congestion % (0-100)</label>
                    <input
                      type="number"
                      value={congestion}
                      onChange={(e) => setCongestion(Number(e.target.value))}
                      className="w-full bg-slate-950 border border-slate-700 text-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-mono"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Loading Indicator */}
          {loading && (
            <div className="flex items-center justify-center p-8 bg-slate-900/30 rounded-xl border border-slate-800">
              <div className="flex items-center gap-3 text-cyan-400 font-mono text-xs">
                <RefreshCw className="w-5 h-5 animate-spin" />
                Calculating Fast Resource Allocation (Greedy Priority Scoring)...
              </div>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/40 rounded-xl flex items-center gap-3 text-rose-300 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Simulation Output Scorecard & Diffs */}
          {simulationResult && !loading && (
            <div className="space-y-4 animate-fade-in">
              {/* Summary Header */}
              <div className="p-4 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-cyan-200">
                      {simulationResult.scenario_name || 'Operational Contingency Scenario'}
                    </h4>
                    <span className="text-[10px] font-mono bg-purple-500/20 text-purple-300 border border-purple-500/40 px-2 py-0.5 rounded font-bold">
                      FAST ALLOCATION (Greedy)
                    </span>
                    <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded">
                      ID: {simulationResult.simulation_id}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                    {simulationResult.human_readable_summary || simulationResult.summary || simulationResult.comparison?.human_readable_summary}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    LIVE DB UNTOUCHED
                  </span>
                </div>
              </div>

              {/* Scorecard Diff Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block mb-1">Baseline Live Coverage</span>
                  <span className="text-base font-mono font-bold text-slate-200">
                    {simulationResult.comparison?.coverage_before ?? simulationResult.coverage_before ?? 100}%
                  </span>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block mb-1">Simulated Scenario Coverage</span>
                  <span className="text-base font-mono font-bold text-cyan-300">
                    {simulationResult.comparison?.coverage_after ?? simulationResult.coverage_after ?? 100}%
                  </span>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block mb-1">Risk Coverage Delta</span>
                  <span
                    className={`text-base font-mono font-bold ${
                      (simulationResult.comparison?.delta_coverage_pct ?? 0) < 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {(simulationResult.comparison?.delta_coverage_pct ?? 0) >= 0 ? '+' : ''}
                    {simulationResult.comparison?.delta_coverage_pct ?? 0}%
                  </span>
                </div>
                <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
                  <span className="text-[11px] text-slate-400 block mb-1">Reassigned Fleet Units</span>
                  <span className="text-base font-mono font-bold text-amber-300">
                    {simulationResult.comparison?.reassigned_units_count ?? 0} Units
                  </span>
                </div>
              </div>

              {/* Assignment Diff Table */}
              <div className="border border-slate-800 rounded-xl overflow-hidden">
                <div className="bg-slate-900 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between">
                  <span className="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5 text-cyan-400" />
                    Resource Assignment Changes (Live Plan vs What-If Plan)
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    {(simulationResult.comparison?.changes_in_plan || []).length} Unit Assignment Diffs
                  </span>
                </div>
                <div className="divide-y divide-slate-800/60 max-h-48 overflow-y-auto">
                  {(simulationResult.comparison?.changes_in_plan || []).map((diff, idx) => (
                    <div key={idx} className="p-3 bg-[#0d1017] hover:bg-slate-900/50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                        <span className="font-bold font-mono text-slate-200">{diff.unit_id}</span>
                      </div>
                      <div className="flex items-center gap-3 font-mono text-[11px]">
                        <div>
                          <span className="text-slate-500 mr-1">Live:</span>
                          <span className="text-slate-300">{diff.live_location_name || 'UNASSIGNED'}</span>
                        </div>
                        <ChevronRight className="w-3 h-3 text-slate-600" />
                        <div>
                          <span className="text-slate-500 mr-1">Simulated:</span>
                          <span className="text-cyan-300 font-bold">
                            {diff.simulated_location_name || 'UNASSIGNED'}
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            diff.change_type === 'UNCHANGED'
                              ? 'bg-slate-800 text-slate-400'
                              : diff.change_type === 'REASSIGNED'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : diff.change_type === 'REMOVED'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          }`}
                        >
                          {diff.change_type}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Apply Notification */}
              {applyStatus && (
                <div
                  className={`p-3.5 rounded-xl border flex items-center gap-3 text-xs ${
                    applyStatus.success
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                  }`}
                >
                  {applyStatus.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
                  )}
                  <span>{applyStatus.message}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Controls */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 border-t border-slate-800">
          <div className="text-xs text-slate-400 font-mono">
            {simulationResult ? `Snapshot: ${simulationResult.base_snapshot_id}` : 'Select a scenario to evaluate'}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition"
            >
              Close Sandbox
            </button>

            {simulationResult && (
              <button
                onClick={handleApplySimulation}
                disabled={applying}
                className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-lg shadow-cyan-950/50"
              >
                {applying ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Apply What-If Plan to Live System
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

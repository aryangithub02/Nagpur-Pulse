import React from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { Shield, AlertTriangle, Activity, Navigation, Clock, ChevronRight, Zap, CheckCircle2, AlertOctagon } from 'lucide-react';

export const OverviewDashboard: React.FC<{ onNavigateTab: (tab: string) => void }> = ({ onNavigateTab }) => {
  const {
    units,
    incidents,
    citySummary,
    riskData,
    setSelectedIncident,
    setSelectedUnit,
    triggerEmergencyIncident,
  } = useNagpurPulseStore();

  const availableUnits = units.filter((u) => u.availability === 'AVAILABLE').length;
  const activeDispatches = units.filter((u) => u.availability === 'EN_ROUTE' || u.availability === 'ON_SCENE').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'Critical');
  const highRiskLocations = riskData.filter((r) => r.riskLevel === 'HIGH' || r.riskLevel === 'CRITICAL');

  return (
    <div className="flex flex-col gap-6 w-full">
      {/* Overview Top Stats Ribbon */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Active Emergency Incidents */}
        <div
          onClick={() => onNavigateTab('incidents')}
          className="bg-slate-900/90 border border-slate-800 hover:border-rose-500/50 p-4 rounded-2xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">ACTIVE INCIDENTS</span>
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-rose-400">{incidents.length}</span>
            <span className="text-xs text-rose-300 font-mono">({criticalIncidents.length} Critical)</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
            <span>View Incident Stream</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* KPI 2: Police Fleet Readiness */}
        <div
          onClick={() => onNavigateTab('police')}
          className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 p-4 rounded-2xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">POLICE FLEET READINESS</span>
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
              <Shield className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-blue-400">{availableUnits}</span>
            <span className="text-xs text-slate-400 font-mono">of {units.length} Units Available</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
            <span>Open Police Command</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* KPI 3: Traffic Network Velocity */}
        <div
          onClick={() => onNavigateTab('traffic')}
          className="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/50 p-4 rounded-2xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">AVG TRAFFIC SPEED</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
              <Activity className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-emerald-400">{citySummary?.avgSpeed || 32} km/h</span>
            <span className="text-xs text-slate-400 font-mono">across 40 Chowks</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
            <span>Inspect Corridors</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>

        {/* KPI 4: AI High Risk Predictions */}
        <div
          onClick={() => onNavigateTab('risk')}
          className="bg-slate-900/90 border border-slate-800 hover:border-amber-500/50 p-4 rounded-2xl shadow-xl transition-all cursor-pointer group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-slate-400 font-medium">HIGH RISK ZONES</span>
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 group-hover:scale-110 transition-transform">
              <AlertOctagon className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold font-mono text-amber-400">{highRiskLocations.length || 4}</span>
            <span className="text-xs text-amber-300 font-mono">Predicted Hotspots</span>
          </div>
          <p className="text-[11px] text-slate-500 font-mono mt-1 flex items-center gap-1">
            <span>View ML Predictions</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </p>
        </div>
      </section>

      {/* Main Map & Command Feed Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        {/* Central Map Canvas (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Nagpur Command Map
            </h2>
            <button
              onClick={() => onNavigateTab('police')}
              className="text-xs font-mono text-blue-400 hover:text-blue-300 font-semibold"
            >
              Expand Tactical Mode →
            </button>
          </div>
          <UnifiedMap heightClass="h-[520px]" />
        </div>

        {/* Right Side Feed (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          {/* Critical Incidents Feed */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3 flex-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Active Triage Stream
              </span>
              <button
                onClick={triggerEmergencyIncident}
                className="text-[10px] font-mono font-bold bg-rose-600/20 text-rose-400 border border-rose-500/30 px-2 py-0.5 rounded-lg hover:bg-rose-600/30 transition"
              >
                + 112 Call
              </button>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[250px] pr-1">
              {incidents.slice(0, 4).map((inc) => (
                <div
                  key={inc.id}
                  onClick={() => {
                    setSelectedIncident(inc);
                    onNavigateTab('incidents');
                  }}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    inc.severity === 'Critical'
                      ? 'bg-rose-950/30 border-rose-500/40 hover:border-rose-500'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between font-mono text-xs">
                    <span className="font-bold text-slate-200">{inc.category}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        inc.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>
                  <div className="text-xs font-semibold text-slate-300 mt-1">{inc.roadName}</div>
                  <div className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">{inc.description}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Available Police Fleet Roster Quick Action */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold font-mono text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Shield className="w-4 h-4 text-blue-400" />
                Available Response Units
              </span>
              <button
                onClick={() => onNavigateTab('police')}
                className="text-[11px] font-mono font-semibold text-blue-400 hover:text-blue-300"
              >
                Dispatch Center →
              </button>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {units.slice(0, 3).map((unit) => (
                <div
                  key={unit.id}
                  onClick={() => {
                    setSelectedUnit(unit);
                    onNavigateTab('police');
                  }}
                  className="p-2.5 bg-slate-950/60 border border-slate-800 hover:border-blue-500/40 rounded-xl flex items-center justify-between text-xs font-mono cursor-pointer transition"
                >
                  <div>
                    <div className="font-bold text-slate-200">{unit.callSign}</div>
                    <div className="text-[10px] text-slate-400">{unit.location?.nearestJunctionName || 'Nagpur Sector'}</div>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {unit.availability}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

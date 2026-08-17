import React, { useState } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { DispatchModal } from './DispatchModal';
import { ResourceAllocationPanel } from './ResourceAllocationPanel';
import { AuditTrailPanel } from './AuditTrailPanel';
import { Shield, Navigation, Radio, Activity, AlertTriangle, ChevronRight, CheckCircle2, Zap } from 'lucide-react';
import { WhatIfSimulationModal } from '../simulation/WhatIfSimulationModal';

export const PoliceCommandView: React.FC = () => {
  const {
    units,
    selectedUnit,
    setSelectedUnit,
    updateUnitStatus,
    radioLogs,
    triggerEmergencyIncident,
    recommendations,
  } = useNagpurPulseStore() as any;

  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [isWhatIfModalOpen, setIsWhatIfModalOpen] = useState<boolean>(false);
  const [targetUnitId, setTargetUnitId] = useState<string | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filteredUnits = units.filter((u: any) => {
    const matchesSearch =
      u.callSign.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.location.nearestJunctionName.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'ALL' || u.availability === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const availableCount = units.filter((u: any) => u.availability === 'AVAILABLE').length;

  return (
    <div className="flex flex-col gap-5 w-full">
      {/* Top Police Telemetry Ribbon */}
      <section className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fleet Readiness</p>
            <p className="text-xl font-bold text-blue-400 mt-0.5">
              {Math.round((availableCount / (units.length || 1)) * 100)}%
            </p>
            <span className="text-[10px] text-slate-500">{availableCount} of {units.length} Units Available</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Dispatches</p>
            <p className="text-xl font-bold text-amber-400 mt-0.5">
              {units.filter((u: any) => u.availability === 'EN_ROUTE' || u.availability === 'ON_SCENE').length}
            </p>
            <span className="text-[10px] text-slate-500">Live GPS Polylines</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-amber-600/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Navigation className="w-5 h-5" />
          </div>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between font-mono">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Radio Trunking</p>
            <p className="text-sm font-bold text-emerald-400 mt-0.5">156.800 MHz</p>
            <span className="text-[10px] text-slate-500">HQ Frequency Clear</span>
          </div>
          <div className="w-9 h-9 rounded-lg bg-emerald-600/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
        </div>

        <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-center gap-2 font-mono">
          <button
            onClick={() => setIsWhatIfModalOpen(true)}
            className="w-full py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-600/20 transition"
          >
            <Zap className="w-3.5 h-3.5 text-cyan-300 fill-current animate-pulse" />
            <span>WHAT-IF SIMULATOR</span>
          </button>
          <button
            onClick={() => {
              setTargetUnitId(selectedUnit?.id);
              setIsDispatchModalOpen(true);
            }}
            className="w-full py-1.5 bg-blue-600/80 hover:bg-blue-500 text-white font-bold rounded-lg text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Dispatch Modal</span>
          </button>
        </div>
      </section>

      {/* Main Split: Tactical Map & Fleet Roster */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Tactical Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-400 animate-pulse"></span>
              Tactical Fleet Map
            </span>
            <span className="text-slate-400">Nagpur Police Headquarters</span>
          </div>
          <UnifiedMap heightClass="h-[540px]" />
        </div>

        {/* Fleet Roster Panel (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 flex flex-col gap-3 shadow-xl">
          <div className="flex items-center justify-between font-mono text-xs">
            <span className="font-bold text-slate-200 uppercase tracking-wider">Police Fleet Roster ({filteredUnits.length})</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-[11px]"
            >
              <option value="ALL">ALL STATUS</option>
              <option value="AVAILABLE">AVAILABLE</option>
              <option value="EN_ROUTE">EN_ROUTE</option>
              <option value="ON_SCENE">ON_SCENE</option>
            </select>
          </div>

          {/* Search Box */}
          <input
            type="text"
            placeholder="Search unit callsign or junction..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
          />

          {/* Roster List */}
          <div className="space-y-2.5 overflow-y-auto max-h-[420px] pr-1">
            {filteredUnits.map((unit: any) => {
              const isSelected = selectedUnit?.id === unit.id;
              return (
                <div
                  key={unit.id}
                  onClick={() => setSelectedUnit(unit)}
                  className={`p-3 rounded-xl border font-mono transition cursor-pointer ${
                    isSelected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-100 shadow-lg'
                      : 'bg-slate-950/70 border-slate-800/80 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs">
                    <div className="font-bold text-slate-100">{unit.callSign}</div>
                    <span
                      className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                        unit.availability === 'AVAILABLE'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : unit.availability === 'EN_ROUTE'
                          ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                          : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      }`}
                    >
                      {unit.availability}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
                    <span>Near: {unit.location?.nearestJunctionName || 'Nagpur Central'}</span>
                    <span>Fuel: {unit.telemetry?.fuelPercentage || 85}%</span>
                  </div>

                  {unit.currentAssignment && (
                    <div className="mt-2 pt-2 border-t border-slate-800 text-[10px] text-amber-300 flex items-center justify-between">
                      <span>Assignment: {unit.currentAssignment.junctionName}</span>
                      <span>ETA: {unit.currentAssignment.etaMinutes}m</span>
                    </div>
                  )}

                  <div className="mt-2.5 flex items-center justify-end gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setTargetUnitId(unit.id);
                        setIsDispatchModalOpen(true);
                      }}
                      className="px-2.5 py-1 text-[11px] font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition"
                    >
                      Dispatch
                    </button>
                    {unit.availability !== 'AVAILABLE' && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateUnitStatus(unit.id, 'AVAILABLE');
                        }}
                        className="px-2.5 py-1 text-[11px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition"
                      >
                        Clear Scene
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* OR-Tools Resource Allocation Command Panel */}
      <ResourceAllocationPanel />

      {/* Human Decision Record & Audit Trail */}
      <AuditTrailPanel />

      {/* Live Radio Log Section */}
      <section className="bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl space-y-3 font-mono">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            Live Police Radio Dispatch Feed (156.800 MHz)
          </span>
          <span className="text-[10px] text-slate-500">Audio FX Active</span>
        </div>

        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
          {radioLogs.map((log: any) => (
            <div key={log.id} className="p-2 bg-slate-950/80 rounded-lg border border-slate-800/80 text-[11px] flex items-start gap-3">
              <span className="text-cyan-400 font-bold whitespace-nowrap">[{new Date(log.timestamp).toLocaleTimeString()}]</span>
              <span className="text-slate-200 font-semibold">{log.callSign}:</span>
              <span className="text-slate-400 flex-1">{log.message}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Dispatch Modal */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        initialUnitId={targetUnitId}
      />

      {/* What-If Simulation Sandbox Modal */}
      <WhatIfSimulationModal
        isOpen={isWhatIfModalOpen}
        onClose={() => setIsWhatIfModalOpen(false)}
      />
    </div>
  );
};

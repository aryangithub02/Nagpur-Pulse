import React, { useState, useMemo } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { IncidentItem } from '../../types/incident';
import { AlertTriangle, Shield, Navigation, Filter, Download, PhoneCall, X, Flame } from 'lucide-react';

export const IncidentMonitorView: React.FC<{ onOpenDispatchModalWithIncident?: (inc: IncidentItem) => void }> = ({
  onOpenDispatchModalWithIncident,
}) => {
  const { incidents, selectedIncident, setSelectedIncident, triggerEmergencyIncident } = useNagpurPulseStore();

  const [modalIncident, setModalIncident] = useState<IncidentItem | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');

  const filteredIncidents = useMemo(() => {
    return incidents.filter((i) => {
      const matchesSearch =
        i.roadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'ALL' || i.category === filterCategory;
      const matchesSeverity = filterSeverity === 'ALL' || i.severity === filterSeverity;
      return matchesSearch && matchesCategory && matchesSeverity;
    });
  }, [incidents, searchQuery, filterCategory, filterSeverity]);

  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredIncidents, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Nagpur_Pulse_Incidents_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Top Incident Filter & Triage Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-2xl border border-slate-800 font-mono text-xs shadow-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-rose-500" />
          <span className="font-bold text-slate-200 uppercase">Triage Filter</span>
          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold">
            {filteredIncidents.length} Records
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search road or description..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 w-52"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-300"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="Accident">Accident</option>
            <option value="Jam">Traffic Jam</option>
            <option value="Hazard">Hazard</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-1.5 text-slate-300"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="Critical">Critical</option>
            <option value="Heavy">Heavy</option>
            <option value="Moderate">Moderate</option>
          </select>

          <button
            onClick={handleExportData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Geospatial Incident Map & Stream Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
        {/* Map (7 Cols) */}
        <div className="lg:col-span-7">
          <UnifiedMap heightClass="h-[540px]" />
        </div>

        {/* Incident Stream (5 Cols) */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              Live Incident Telemetry Stream
            </span>
            <button
              onClick={triggerEmergencyIncident}
              className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition"
            >
              + Citizen 112
            </button>
          </div>

          <div className="space-y-3 overflow-y-auto max-h-[460px] pr-1">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-3.5 rounded-xl border transition cursor-pointer ${
                    isSelected
                      ? 'bg-rose-950/40 border-rose-500 text-rose-100 shadow-xl'
                      : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold">
                    <span className="text-slate-100">{inc.category}</span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] ${
                        inc.severity === 'Critical'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-amber-500/20 text-amber-400'
                      }`}
                    >
                      {inc.severity}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-slate-200 mt-1">{inc.roadName}</div>
                  <p className="text-[11px] text-slate-400 font-sans mt-1 line-clamp-2">{inc.description}</p>

                  <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800 text-[10px] text-slate-400">
                    <span>Delay: ~{inc.delayMinutes} mins</span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalIncident(inc);
                      }}
                      className="text-blue-400 hover:text-blue-300 font-bold"
                    >
                      View Telemetry →
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Emergency Contact Helplines */}
      <section className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-slate-200">Nagpur Police Emergency Helplines</div>
            <div className="text-[11px] text-slate-400">Integrated Citizen Dial 112 & Traffic HQ Control Room</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="text-rose-400">Police 112</span>
          <span className="text-sky-400">Traffic HQ: 0712-2560800</span>
          <span className="text-emerald-400">Ambulance: 108</span>
        </div>
      </section>

      {/* Incident Detail Modal */}
      {modalIncident && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative font-mono text-slate-100">
            <button
              onClick={() => setModalIncident(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-600/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">{modalIncident.category} Telemetry</h3>
                <p className="text-xs text-rose-400">{modalIncident.severity} Severity Level</p>
              </div>
            </div>

            <div className="space-y-3 text-xs bg-slate-950/80 p-4 rounded-xl border border-slate-800">
              <div><span className="text-slate-500">Location:</span> <span className="text-slate-200 font-bold">{modalIncident.roadName}</span></div>
              <div><span className="text-slate-500">Details:</span> <span className="text-slate-300 font-sans">{modalIncident.description}</span></div>
              <div><span className="text-slate-500">Coordinates:</span> <span className="text-slate-400">{modalIncident.location[0].toFixed(5)}, {modalIncident.location[1].toFixed(5)}</span></div>
              <div><span className="text-slate-500">Assigned Unit:</span> <span className="text-sky-400 font-bold">{modalIncident.assignedUnitName || 'Unassigned'}</span></div>
            </div>

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                onClick={() => {
                  setModalIncident(null);
                  if (onOpenDispatchModalWithIncident) onOpenDispatchModalWithIncident(modalIncident);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>Dispatch Police Response Unit</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

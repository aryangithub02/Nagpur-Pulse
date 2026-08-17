import React, { useState, useMemo } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { IncidentItem } from '../../types/incident';
import {
  AlertTriangle,
  Shield,
  Filter,
  Download,
  PhoneCall,
  X,
  Flame,
  ChevronRight,
  Clock,
  Layers,
} from 'lucide-react';

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
    <div className="flex flex-col gap-5 w-full font-sans bg-[#0b0c10] p-1 text-slate-100 selection:bg-purple-500/30">
      {/* Top Incident Filter & Triage Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-[#12141d]/90 p-3 rounded-2xl border border-slate-800/80 font-mono text-xs shadow-xl">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-purple-400" />
          <span className="font-bold text-slate-200 uppercase tracking-wider">Live GIS Incident Telemetry</span>
          <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 font-bold text-[11px]">
            {filteredIncidents.length} Active Events
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Filter location or details..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0f1118] border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-purple-500 w-56 text-xs"
          />

          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="bg-[#0f1118] border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 text-xs"
          >
            <option value="ALL">ALL CATEGORIES</option>
            <option value="Road Closed">Road Closed</option>
            <option value="Road Works">Road Works</option>
            <option value="Accident">Accident / Crash</option>
            <option value="Jam">Jam / Congestion</option>
          </select>

          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="bg-[#0f1118] border border-slate-800 rounded-xl px-2.5 py-1.5 text-slate-300 text-xs"
          >
            <option value="ALL">ALL SEVERITIES</option>
            <option value="Critical">Critical</option>
            <option value="Heavy">Heavy</option>
            <option value="Moderate">Moderate</option>
            <option value="Minor">Minor</option>
          </select>

          <button
            onClick={handleExportData}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1.5 transition text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Main Grid: GIS Map Left & Incident Card Stream Right (Matching Screenshot 2) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
        {/* Left GIS Layer Map (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col gap-2 relative">
          <UnifiedMap heightClass="h-[560px]" />

          {/* Bottom Left Floating Legend matching Screenshot 2 */}
          <div className="absolute bottom-4 left-4 z-20 flex flex-wrap items-center gap-3 px-3.5 py-2 bg-[#0d0e14]/90 backdrop-blur-md rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 shadow-2xl">
            <span className="font-bold text-slate-400 uppercase tracking-wider text-[10px]">LIVE GIS LAYER:</span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shadow-sm shadow-blue-500/50"></span>
              <span>Accident / Crash</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-sm shadow-amber-500/50"></span>
              <span>Jam / Congestion</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-purple-500 shadow-sm shadow-purple-500/50"></span>
              <span>Road Closure</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400/50"></span>
              <span>Road Works</span>
            </span>
          </div>
        </div>

        {/* Right Incident Cards Feed (5 Cols) - Matching Screenshot 2 Cards */}
        <div className="lg:col-span-5 bg-[#10121a]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-slate-800/80">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-purple-400" />
              Incidents Feed Stream
            </span>
            <button
              onClick={triggerEmergencyIncident}
              className="px-2.5 py-1 text-[10px] font-bold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow-md shadow-rose-600/30"
            >
              + Citizen 112
            </button>
          </div>

          {/* Card Stream */}
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {filteredIncidents.map((inc) => {
              const isSelected = selectedIncident?.id === inc.id;
              const isClosed = inc.category === 'Road Closed';
              const isRoadWorks = inc.category === 'Roadworks';
              
              // Border and Badge Color Palette matching Screenshot 2
              const borderClass = isClosed
                ? 'border-purple-500/80 bg-purple-950/20 shadow-purple-500/10'
                : isRoadWorks
                ? 'border-amber-500/80 bg-amber-950/20 shadow-amber-500/10'
                : 'border-rose-500/80 bg-rose-950/20 shadow-rose-500/10';

              const badgeBg = isClosed
                ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                : isRoadWorks
                ? 'bg-amber-600/30 text-amber-300 border-amber-500/50'
                : 'bg-rose-600/30 text-rose-300 border-rose-500/50';

              return (
                <div
                  key={inc.id}
                  onClick={() => setSelectedIncident(inc)}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer shadow-lg ${borderClass} ${
                    isSelected ? 'ring-2 ring-white scale-[1.01]' : 'hover:border-opacity-100'
                  }`}
                >
                  {/* Category Pills Header */}
                  <div className="flex items-center justify-between text-xs mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold border ${badgeBg}`}>
                        🚫 {inc.category.toUpperCase()}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-400 font-bold border border-slate-700">
                        {inc.severity.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{inc.timeAgo || 'Just now'}</span>
                    </div>
                  </div>

                  {/* Incident Road Name & Description */}
                  <h4 className="font-extrabold text-sm text-slate-100 font-sans tracking-wide">
                    {inc.roadName || 'Nagpur Arterial Route'}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans mt-1">
                    {inc.description || 'Traffic incident reported'}
                  </p>

                  {/* Location & Details Button Footer */}
                  <div className="mt-3.5 flex items-center justify-between pt-2.5 border-t border-slate-800/80 text-xs">
                    <div className="flex items-center gap-1.5 text-amber-400 text-[11px] truncate max-w-[220px]">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                      <span>Near {inc.nearestJunction?.name || inc.roadName} (~{inc.delayMinutes} km)</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalIncident(inc);
                      }}
                      className="px-3 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 rounded-xl border border-slate-700 flex items-center gap-1 font-bold text-xs transition"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5 text-purple-400" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Emergency Contact Helplines */}
      <section className="bg-[#12141d]/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <PhoneCall className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="font-bold text-slate-200">Nagpur Police Emergency Helplines</div>
            <div className="text-[11px] text-slate-400">Integrated Citizen Dial 112 & Traffic Control Room</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="text-purple-400">Police 112</span>
          <span className="text-sky-400">Traffic HQ: 0712-2560800</span>
          <span className="text-emerald-400">Ambulance: 108</span>
        </div>
      </section>

      {/* Incident Detail Modal */}
      {modalIncident && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#12141d] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative font-mono text-slate-100">
            <button
              onClick={() => setModalIncident(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-base">{modalIncident.category} Telemetry</h3>
                <p className="text-xs text-purple-400">{modalIncident.severity} Severity Level</p>
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
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/30 flex items-center gap-2"
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

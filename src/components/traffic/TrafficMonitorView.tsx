import React, { useState } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { NAGPUR_JUNCTIONS } from '../../data/nagpurJunctions';
import { Activity, Zap, MapPin, Navigation, BarChart3, RefreshCw, Clock } from 'lucide-react';

export const TrafficMonitorView: React.FC = () => {
  const {
    junctionStates,
    citySummary,
    selectedJunction,
    setSelectedJunction,
    refreshTraffic,
  } = useNagpurPulseStore();

  const [activeSubTab, setActiveSubTab] = useState<'map' | 'corridors' | 'analytics'>('map');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredJunctions = junctionStates.filter((j) =>
    j.junction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.junction.zone.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-5 w-full font-sans">
      {/* Top Metrics Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 font-mono">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Avg Traffic Speed</p>
            <p className="text-2xl font-bold text-emerald-400 mt-0.5">{citySummary?.avgSpeed || 32} km/h</p>
            <span className="text-[10px] text-slate-500">Freeflow: {citySummary?.avgFreeFlowSpeed || 50} km/h</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Congested Chowks</p>
            <p className="text-2xl font-bold text-amber-400 mt-0.5">{citySummary?.congestedCount || 8}</p>
            <span className="text-[10px] text-slate-500">of {junctionStates.length} Monitored Junctions</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <Zap className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Overall Congestion Score</p>
            <p className="text-2xl font-bold text-rose-400 mt-0.5">{citySummary?.overallCongestionScore || 38}%</p>
            <span className="text-[10px] text-slate-500">City-wide Index</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <BarChart3 className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <button
            onClick={refreshTraffic}
            className="w-full h-full bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs flex items-center justify-center gap-2 border border-slate-700 transition"
          >
            <RefreshCw className="w-4 h-4 text-sky-400" />
            <span>Sync Live TomTom Data</span>
          </button>
        </div>
      </section>

      {/* Sub-Tab Navigation Bar */}
      <div className="flex items-center justify-between bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 font-mono text-xs">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveSubTab('map')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeSubTab === 'map' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Map View
          </button>
          <button
            onClick={() => setActiveSubTab('corridors')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeSubTab === 'corridors' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Corridors & Chowks ({NAGPUR_JUNCTIONS.length})
          </button>
          <button
            onClick={() => setActiveSubTab('analytics')}
            className={`px-4 py-2 rounded-xl font-bold transition ${
              activeSubTab === 'analytics' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Analytics Chart
          </button>
        </div>

        <input
          type="text"
          placeholder="Filter Chowk or Zone..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 w-60"
        />
      </div>

      {/* Sub-Tab Content */}
      {activeSubTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 min-h-[580px]">
          {/* Map (8 Cols) */}
          <div className="lg:col-span-8">
            <UnifiedMap heightClass="h-[560px]" />
          </div>

          {/* Selected Chowk Detail Sidebar (4 Cols) */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-4">
            <div className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              Chowk Flow Inspector
            </div>

            {selectedJunction ? (
              <div className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col gap-3 font-mono">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-sm text-slate-100">{selectedJunction.name}</h3>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedJunction.zone}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                  <div>
                    <span className="text-[10px] text-slate-400 block">Speed</span>
                    <span className="font-bold text-emerald-400 text-sm">
                      {junctionStates.find((j) => j.junction.id === selectedJunction.id)?.metrics?.currentSpeed || 32} km/h
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block">Delay</span>
                    <span className="font-bold text-rose-400 text-sm">
                      +{junctionStates.find((j) => j.junction.id === selectedJunction.id)?.metrics?.delaySeconds || 45}s
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1 pt-2 border-t border-slate-800 font-sans">
                  <div>Junction Type: <span className="text-slate-200">{selectedJunction.type}</span></div>
                  <div>CCTV Surveillance: <span className="text-slate-200">{selectedJunction.cctvCount} Active Cameras</span></div>
                  <div>Priority Level: <span className="text-rose-400 font-bold">{selectedJunction.priorityLevel}</span></div>
                </div>
              </div>
            ) : (
              <div className="p-8 text-center text-slate-400 text-xs font-mono">
                Click any Chowk marker on the map to inspect speed, travel delay & CCTV status.
              </div>
            )}
          </div>
        </div>
      )}

      {activeSubTab === 'corridors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredJunctions.map(({ junction, metrics }) => (
            <div
              key={junction.id}
              onClick={() => {
                setSelectedJunction(junction);
                setActiveSubTab('map');
              }}
              className="bg-slate-900/90 border border-slate-800 hover:border-blue-500/50 p-4 rounded-2xl shadow-xl transition cursor-pointer font-mono"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-slate-100">{junction.name}</span>
                <span className="text-[10px] text-slate-400">{junction.zone}</span>
              </div>

              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Flow Speed:</span>
                <span className="font-bold text-emerald-400 text-sm">{metrics?.currentSpeed || 32} km/h</span>
              </div>

              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Delay Time:</span>
                <span className="font-bold text-rose-400">+{metrics?.delaySeconds || 45}s</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {activeSubTab === 'analytics' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col gap-4 font-mono">
          <h2 className="text-sm font-bold text-slate-200 uppercase tracking-wider">Nagpur Traffic Speed vs Density Analytics</h2>
          <div className="h-72 w-full bg-slate-950/80 rounded-xl border border-slate-800 p-4 flex items-end justify-between gap-2">
            {junctionStates.slice(0, 20).map(({ junction, metrics }) => {
              const heightPct = Math.min(100, Math.max(10, ((metrics?.currentSpeed || 20) / 50) * 100));
              return (
                <div key={junction.id} className="flex-1 flex flex-col items-center gap-2 group">
                  <div
                    style={{ height: `${heightPct}%` }}
                    className="w-full bg-gradient-to-t from-blue-600 to-sky-400 rounded-t group-hover:from-rose-500 group-hover:to-amber-400 transition-all"
                    title={`${junction.name}: ${metrics?.currentSpeed} km/h`}
                  />
                  <span className="text-[9px] text-slate-500 truncate w-full text-center">{junction.name.split(' ')[0]}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useState, useEffect, useMemo } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { useAuth } from '../../store/authContext';
import { isJunctionInZone } from '../../utils/geoUtils';
import { UnifiedMap } from '../map/UnifiedMap';
import { NAGPUR_JUNCTIONS } from '../../data/nagpurJunctions';
import {
  Activity,
  Zap,
  MapPin,
  RefreshCw,
  Clock,
  Radio,
  Key,
  Flame,
  AlertTriangle,
  ChevronRight,
  Maximize2,
} from 'lucide-react';

export const TrafficMonitorView: React.FC = () => {
  const {
    junctionStates,
    citySummary,
    selectedJunction,
    setSelectedJunction,
    refreshTraffic,
  } = useNagpurPulseStore();

  const { activeZone, user } = useAuth();
  const currentZone = user?.role === 'ZONE_ADMIN' ? user.zone : activeZone;

  const [activeSubTab, setActiveSubTab] = useState<'map' | 'corridors' | 'analytics'>('map');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentTimeStr, setCurrentTimeStr] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTimeStr(
        now.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true,
        }) + ' IST'
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const zoneScopedJunctions = useMemo(() => {
    return junctionStates.filter((j) => isJunctionInZone(j.junction.zone, currentZone));
  }, [junctionStates, currentZone]);

  const filteredJunctions = useMemo(() => {
    return zoneScopedJunctions.filter(
      (j) =>
        j.junction.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        j.junction.zone.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [zoneScopedJunctions, searchQuery]);

  const slowestChowks = useMemo(() => {
    return [...zoneScopedJunctions]
      .filter((j) => j.metrics !== null)
      .sort((a, b) => (a.metrics?.currentSpeed ?? 999) - (b.metrics?.currentSpeed ?? 999))
      .slice(0, 4);
  }, [zoneScopedJunctions]);

  return (
    <div className="flex flex-col gap-4 w-full font-sans bg-[#0b0c10] p-1 text-slate-100 selection:bg-pink-500/30">
      {/* Top Banner Status Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-[#12141d]/90 border border-slate-800/80 rounded-xl text-xs font-mono">
        <div className="flex items-center gap-2 text-slate-400 text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-bold text-slate-200">TomTom Traffic Flow API Active</span>
          <span>•</span>
          <span>Nagpur Urban Road Network (40 Key Chowks)</span>
        </div>

        <div className="flex items-center gap-3 text-[11px]">
          <span className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3.5 h-3.5 text-pink-400" />
            {currentTimeStr || '07:31:48 pm IST'}
          </span>
          <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-bold uppercase text-[10px]">
            REGULAR FLOW
          </span>
        </div>
      </div>

      {/* Main Title & Nav Controls Header */}
      <header className="flex flex-wrap items-center justify-between gap-4 px-2 py-1">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shadow-lg shadow-blue-500/10">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-white font-sans">
                Nagpur Traffic Monitor
              </h1>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-blue-600/30 text-blue-300 border border-blue-500/40">
                LIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Speed, Flow & Travel Time Analytics • Zero Mile City
            </p>
          </div>
        </div>

        {/* Action Controls & Navigation Pills */}
        <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
          <div className="flex items-center bg-[#151722] p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveSubTab('map')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'map'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Live Map & Chowks</span>
            </button>
            <button
              onClick={() => setActiveSubTab('corridors')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'corridors'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>Corridor Travel Times</span>
            </button>
            <button
              onClick={() => setActiveSubTab('analytics')}
              className={`px-3.5 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 ${
                activeSubTab === 'analytics'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>All 40 Junctions</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-2.5 py-1.5 bg-[#151722] border border-slate-800 rounded-xl text-[11px] text-slate-400">
              Auto: 60s
            </span>
            <button
              onClick={refreshTraffic}
              className="px-3 py-1.5 bg-[#151722] hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl flex items-center gap-1.5 text-xs transition"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Syncing...</span>
            </button>
            <button className="px-3 py-1.5 bg-[#151722] hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-xl flex items-center gap-1.5 text-xs transition">
              <Key className="w-3.5 h-3.5 text-amber-400" />
              <span>TomTom Key</span>
            </button>
          </div>
        </div>
      </header>

      {/* Top Metric Cards Row (4 Grid Cards) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 font-mono">
        {/* Card 1: Nagpur Avg Speed */}
        <div className="bg-[#12141d]/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              Nagpur Avg Speed
            </span>
            <span className="text-[11px] text-slate-500">free: 52 km/h</span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-white">
              {citySummary?.avgSpeed || 27} <span className="text-sm font-normal text-slate-400">km/h</span>
            </div>
            <span className="text-xs font-bold text-sky-400">16% ~</span>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-sky-400 h-full w-[16%] rounded-full"></div>
          </div>
        </div>

        {/* Card 2: Congestion Index */}
        <div className="bg-[#12141d]/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              Congestion Index
            </span>
            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Smooth / Fluid
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <div className="text-3xl font-extrabold text-emerald-400">
              {citySummary?.overallCongestionScore || 16}% <span className="text-sm font-normal text-slate-400">city load</span>
            </div>
          </div>
          <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
            <div className="bg-emerald-400 h-full w-[16%] rounded-full"></div>
          </div>
        </div>

        {/* Card 3: Top Congested Hotspot */}
        <div className="bg-[#12141d]/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" />
              Top Congested Hotspot
            </span>
            <span className="text-[10px] text-slate-500 hover:text-slate-300 cursor-pointer">View →</span>
          </div>
          <div className="mt-2">
            <div className="text-sm font-bold text-white">Pratap Nagar Chowk</div>
            <div className="text-xs text-amber-400 font-bold mt-0.5">
              11 km/h <span className="text-[11px] text-orange-400 font-normal">+275s delay</span>
            </div>
            <div className="text-[10px] text-slate-500 mt-1">Ring Road South-West</div>
          </div>
        </div>

        {/* Card 4: Network Coverage */}
        <div className="bg-[#12141d]/90 border border-slate-800/80 p-4 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="flex items-center gap-1.5 text-blue-400">
              <MapPin className="w-3.5 h-3.5" />
              Network Coverage
            </span>
            <span className="text-xs font-bold text-blue-400">40 chowks</span>
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1 text-center text-xs">
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-emerald-400 font-bold">20</span>
              <span className="text-[9px] text-slate-500">Smooth (&gt;30%)</span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-amber-400 font-bold">16</span>
              <span className="text-[9px] text-slate-500">Moderate</span>
            </div>
            <div className="bg-slate-950/60 p-1.5 rounded-lg border border-slate-800">
              <span className="block text-rose-400 font-bold">4</span>
              <span className="text-[9px] text-slate-500">Heavy Jam</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-slate-500">
            <span>Road Closures: 1</span>
            <span>TomTom s4</span>
          </div>
        </div>
      </section>

      {/* Middle Map & Inspector Grid */}
      {activeSubTab === 'map' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start min-h-[580px]">
          {/* Left Map View (8 Cols) */}
          <div className="lg:col-span-8 flex flex-col gap-2">
            {/* Map Top Control Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-[#12141d] p-2 rounded-xl border border-slate-800 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 bg-pink-500/20 text-pink-400 border border-pink-500/40 rounded-lg font-bold text-[11px]">
                  40 SPOT PINS
                </span>
                <span className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px]">
                  Nagpur CITY LIMITS
                </span>
                <select className="bg-slate-950 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-[11px]">
                  <option>All Corridors (Network)</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <button className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px] hover:bg-slate-700">
                  Labels: Smart
                </button>
                <button className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded-lg text-[11px] hover:bg-slate-700">
                  Reset View
                </button>
                <button className="p-1.5 bg-slate-800 text-slate-300 rounded-lg hover:bg-slate-700">
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Map Component */}
            <UnifiedMap heightClass="h-[560px]" />
          </div>

          {/* Right Inspector & Slowest List Sidebar (4 Cols) */}
          <div className="lg:col-span-4 flex flex-col gap-4 font-mono">
            {/* Selected Junction Details or Blank State */}
            {selectedJunction ? (
              <div className="bg-[#12141d]/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-pink-500" />
                    {selectedJunction.name}
                  </span>
                  <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    {selectedJunction.zone}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800/80">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Flow Speed</span>
                    <span className="font-extrabold text-emerald-400 text-lg">
                      {junctionStates.find((j) => j.junction.id === selectedJunction.id)?.metrics?.currentSpeed || 27} km/h
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Travel Delay</span>
                    <span className="font-extrabold text-rose-400 text-lg">
                      +{junctionStates.find((j) => j.junction.id === selectedJunction.id)?.metrics?.delaySeconds || 120}s
                    </span>
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 space-y-1.5 pt-2 border-t border-slate-800/80 font-sans">
                  <div>Junction Type: <span className="text-slate-200 font-mono">{selectedJunction.type}</span></div>
                  <div>CCTV Surveillance: <span className="text-emerald-400 font-mono">{selectedJunction.cctvCount} Cameras Active</span></div>
                  <div>Priority Index: <span className="text-rose-400 font-mono font-bold">{selectedJunction.priorityLevel}</span></div>
                </div>
              </div>
            ) : (
              <div className="bg-[#12141d]/90 border border-slate-800/80 rounded-2xl p-6 shadow-xl flex flex-col items-center justify-center text-center gap-3 min-h-[260px]">
                <div className="w-12 h-12 rounded-full bg-pink-500/10 border border-pink-500/30 flex items-center justify-center text-pink-500 shadow-lg shadow-pink-500/20">
                  <MapPin className="w-6 h-6 animate-bounce" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-100">No Junction Selected</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs leading-relaxed font-sans">
                    Click any spot pin on the map or corridor card to inspect live speed, travel time and road coordinates.
                  </p>
                </div>
              </div>
            )}

            {/* Slowest Chowks Right Now Panel */}
            <div className="bg-[#12141d]/90 border border-slate-800/80 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Zap className="w-4 h-4 text-pink-500" />
                  Slowest Chowks Right Now
                </span>
                <button
                  onClick={() => setActiveSubTab('corridors')}
                  className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition"
                >
                  View All 40 →
                </button>
              </div>

              <div className="space-y-2">
                {slowestChowks.map(({ junction, metrics }) => (
                  <div
                    key={junction.id}
                    onClick={() => setSelectedJunction(junction)}
                    className={`p-3 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                      selectedJunction?.id === junction.id
                        ? 'bg-slate-800/90 border-pink-500/70 text-pink-200'
                        : 'bg-[#151722]/80 border-slate-800/80 hover:border-pink-500/40 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-white text-xs truncate max-w-[140px]">
                        {junction.name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {junction.zone} • FRC1
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-extrabold text-pink-400 text-xs">{metrics?.currentSpeed || 11} km/h</div>
                      <div className="text-[10px] text-orange-400">+{metrics?.delaySeconds || 263}s delay</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Corridors Tab */}
      {activeSubTab === 'corridors' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 font-mono">
          {filteredJunctions.map(({ junction, metrics }) => (
            <div
              key={junction.id}
              onClick={() => {
                setSelectedJunction(junction);
                setActiveSubTab('map');
              }}
              className="bg-[#12141d]/90 border border-slate-800 hover:border-pink-500/50 p-4 rounded-2xl shadow-xl transition cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-extrabold text-white text-sm">{junction.name}</span>
                <span className="text-[10px] text-slate-400">{junction.zone}</span>
              </div>

              <div className="mt-3 flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Live Speed:</span>
                <span className="font-extrabold text-emerald-400 text-base">{metrics?.currentSpeed || 27} km/h</span>
              </div>

              <div className="mt-1 flex items-baseline justify-between text-xs">
                <span className="text-slate-400">Congestion Delay:</span>
                <span className="font-extrabold text-rose-400">+{metrics?.delaySeconds || 120}s</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

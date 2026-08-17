import React, { useState, useMemo } from 'react';
import { Search, Filter, ArrowUpDown, MapPin, Gauge, Clock, TrendingDown, ArrowRight, ShieldCheck } from 'lucide-react';
import { Junction, JunctionTrafficState, Zone } from '../types';
import { formatTravelTime } from '../services/tomtomService';

interface CorridorsListProps {
  junctionStates: JunctionTrafficState[];
  selectedJunction: Junction | null;
  onSelectJunction: (junction: Junction) => void;
  onSwitchToMap: () => void;
}

type SortOption = 'slowest' | 'highest_delay' | 'fastest' | 'name';

export const CorridorsList: React.FC<CorridorsListProps> = ({
  junctionStates,
  selectedJunction,
  onSelectJunction,
  onSwitchToMap,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedZone, setSelectedZone] = useState<Zone | 'All'>('All');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortOption>('slowest');

  const filteredJunctions = useMemo(() => {
    return junctionStates.filter(item => {
      const { junction, metrics } = item;
      // Search match
      const query = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !query ||
        junction.name.toLowerCase().includes(query) ||
        (junction.corridor && junction.corridor.toLowerCase().includes(query)) ||
        (junction.description && junction.description.toLowerCase().includes(query)) ||
        junction.zone.toLowerCase().includes(query);

      if (!matchesSearch) return false;

      // Zone match
      if (selectedZone !== 'All' && junction.zone !== selectedZone) {
        return false;
      }

      // Status match
      if (selectedStatus !== 'All') {
        const level = metrics?.congestionLevel || 'fluid';
        if (selectedStatus === 'fluid' && level !== 'fluid') return false;
        if (selectedStatus === 'moderate' && level !== 'moderate') return false;
        if (selectedStatus === 'congested' && level !== 'heavy' && level !== 'gridlock') return false;
      }

      return true;
    }).sort((a, b) => {
      const speedA = a.metrics?.currentSpeed ?? 999;
      const speedB = b.metrics?.currentSpeed ?? 999;
      const delayA = a.metrics?.delaySeconds ?? 0;
      const delayB = b.metrics?.delaySeconds ?? 0;

      if (sortBy === 'slowest') {
        return speedA - speedB; // Slowest speeds at top
      }
      if (sortBy === 'fastest') {
        return speedB - speedA; // Fastest speeds at top
      }
      if (sortBy === 'highest_delay') {
        return delayB - delayA; // Highest delay at top
      }
      return a.junction.name.localeCompare(b.junction.name);
    });
  }, [junctionStates, searchQuery, selectedZone, selectedStatus, sortBy]);

  const getStatusPill = (level: string) => {
    switch (level) {
      case 'fluid':
        return { label: 'Smooth', bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20' };
      case 'moderate':
        return { label: 'Moderate', bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20' };
      case 'heavy':
        return { label: 'Heavy', bg: 'bg-orange-500/10 text-orange-300 border-orange-500/20' };
      case 'gridlock':
      default:
        return { label: 'Jam', bg: 'bg-rose-500/10 text-rose-300 border-rose-500/20' };
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full sm:max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by chowk, road, landmark (e.g. Sitabuldi, Lokmat, Kamptee)..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-950/80 border border-slate-800 focus:border-cyan-500 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none transition"
            />
          </div>

          {/* Sort By selector */}
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <ArrowUpDown className="w-3.5 h-3.5 text-cyan-400" />
              Sort:
            </span>
            <select
              value={sortBy}
              onChange={e => setSortBy(e.target.value as SortOption)}
              className="bg-slate-800 text-cyan-300 text-xs font-medium px-3 py-1.5 rounded-xl border border-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="slowest">Slowest Speed First</option>
              <option value="highest_delay">Highest Delay First</option>
              <option value="fastest">Fastest Flow First</option>
              <option value="name">Alphabetical (A-Z)</option>
            </select>
          </div>
        </div>

        {/* Zone Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-800 pt-3">
          <div className="flex items-center gap-1 overflow-x-auto max-w-full">
            <span className="text-xs font-medium text-slate-400 mr-1 hidden sm:inline">Zone:</span>
            {(['All', 'Central', 'North', 'South', 'East', 'West'] as const).map(zone => (
              <button
                key={zone}
                onClick={() => setSelectedZone(zone)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
                  selectedZone === zone
                    ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/20'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {zone}
              </button>
            ))}
          </div>

          {/* Status filters */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setSelectedStatus('All')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                selectedStatus === 'All' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All ({junctionStates.length})
            </button>
            <button
              onClick={() => setSelectedStatus('congested')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                selectedStatus === 'congested' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Congested
            </button>
            <button
              onClick={() => setSelectedStatus('fluid')}
              className={`px-2 py-0.5 rounded text-[11px] font-semibold transition ${
                selectedStatus === 'fluid' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Fluid
            </button>
          </div>
        </div>
      </div>

      {/* Junctions Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredJunctions.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400 text-xs bg-slate-900/60 rounded-2xl border border-slate-800">
            No Nagpur junctions match your search query or filters.
          </div>
        ) : (
          filteredJunctions.map(({ junction, metrics, isLoading }) => {
            const isSelected = selectedJunction?.id === junction.id;
            const statusPill = getStatusPill(metrics?.congestionLevel || 'fluid');
            const speedRatio = metrics ? Math.min(100, Math.round((metrics.currentSpeed / (metrics.freeFlowSpeed || 50)) * 100)) : 100;

            return (
              <div
                key={junction.id}
                onClick={() => {
                  onSelectJunction(junction);
                }}
                className={`bg-slate-900/80 backdrop-blur border rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-pointer transition-all duration-200 hover:scale-[1.01] ${
                  isSelected
                    ? 'border-cyan-400 ring-1 ring-cyan-400/40 bg-slate-850 shadow-cyan-900/20'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Top */}
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 font-mono">
                          {junction.zone}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${statusPill.bg}`}>
                          {statusPill.label}
                        </span>
                        {junction.approximate && (
                          <span className="text-[10px] text-slate-500 font-mono" title="OSM junction approximate coordinate">
                            ~approx
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-white mt-1.5 group-hover:text-cyan-300">
                        {junction.name}
                      </h4>
                    </div>

                    {/* Speed Badge */}
                    <div className="flex flex-col items-end">
                      <div className="flex items-baseline gap-1 font-mono">
                        <span className="text-xl font-black text-cyan-300">
                          {metrics?.currentSpeed ?? '--'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-semibold">km/h</span>
                      </div>
                      <span className="text-[10px] text-slate-500 font-mono">
                        Free: {metrics?.freeFlowSpeed ?? 50}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 line-clamp-1">
                    {junction.corridor || junction.description}
                  </p>
                </div>

                {/* Card Bottom Progress & Delay */}
                <div className="mt-3 pt-2.5 border-t border-slate-800/80 flex flex-col gap-1.5">
                  {/* Speed Progress Bar */}
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${
                        speedRatio > 75 ? 'bg-emerald-400' : speedRatio > 45 ? 'bg-amber-400' : 'bg-rose-500'
                      }`}
                      style={{ width: `${speedRatio}%` }}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-500" />
                      Travel: {metrics ? formatTravelTime(metrics.currentTravelTime) : '--'}
                    </span>

                    <span className={metrics && metrics.delaySeconds > 0 ? 'text-orange-400 font-semibold' : 'text-emerald-400'}>
                      {metrics && metrics.delaySeconds > 0 ? `+${metrics.delaySeconds}s delay` : 'No delay'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

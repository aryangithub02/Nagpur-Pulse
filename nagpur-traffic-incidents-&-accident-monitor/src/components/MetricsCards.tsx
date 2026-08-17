import React from 'react';
import { IncidentStats } from '../types';
import { 
  AlertOctagon, 
  Flame, 
  Clock, 
  AlertTriangle, 
  Construction, 
  Route, 
  TrendingUp,
  Activity
} from 'lucide-react';

interface MetricsCardsProps {
  stats: IncidentStats;
  onFilterAccidents: () => void;
  onFilterCritical: () => void;
  onFilterClosures: () => void;
  onResetFilters: () => void;
  currentFilterCategory: string;
  currentFilterSeverity: string;
}

export const MetricsCards: React.FC<MetricsCardsProps> = ({
  stats,
  onFilterAccidents,
  onFilterCritical,
  onFilterClosures,
  onResetFilters,
  currentFilterCategory,
  currentFilterSeverity,
}) => {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {/* 1. Total Incidents */}
      <div 
        onClick={onResetFilters}
        className="bento-card cursor-pointer p-4 hover:border-slate-600 transition relative overflow-hidden group"
      >
        <div className="flex items-center justify-between text-slate-400 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Active</span>
          <div className="p-1.5 rounded-xl bg-slate-800/80 text-slate-300 group-hover:text-white transition">
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-black text-white font-mono tracking-tight">
          {stats.total}
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Nagpur Metro</span>
        </div>
      </div>

      {/* 2. Accidents & Collisions */}
      <div 
        onClick={onFilterAccidents}
        className={`bento-card cursor-pointer p-4 transition relative overflow-hidden group ${
          currentFilterCategory === 'Accident'
            ? 'bg-rose-950/80 border-rose-500 ring-2 ring-rose-500/30'
            : 'hover:bg-rose-950/40 hover:border-rose-700/80'
        }`}
      >
        <div className="flex items-center justify-between text-rose-300 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Accidents</span>
          <div className="p-1.5 rounded-xl bg-rose-500/20 text-rose-400">
            <Flame className="w-3.5 h-3.5 animate-bounce" />
          </div>
        </div>
        <div className="text-2xl font-black text-rose-400 font-mono tracking-tight flex items-baseline gap-1.5">
          {stats.accidents}
          <span className="text-[10px] font-normal text-rose-300/80">Active</span>
        </div>
        <div className="text-[11px] text-rose-300/90 mt-1.5 font-medium truncate">
          {stats.accidents > 0 ? 'Urgent Caution' : 'Zero Crashes'}
        </div>
      </div>

      {/* 3. Critical Severity */}
      <div 
        onClick={onFilterCritical}
        className={`bento-card cursor-pointer p-4 transition relative overflow-hidden group ${
          currentFilterSeverity === 'Critical'
            ? 'bg-orange-950/80 border-orange-500 ring-2 ring-orange-500/30'
            : 'hover:bg-orange-950/40 hover:border-orange-700/80'
        }`}
      >
        <div className="flex items-center justify-between text-orange-300 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400">Critical / Major</span>
          <div className="p-1.5 rounded-xl bg-orange-500/20 text-orange-400">
            <AlertOctagon className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-black text-orange-400 font-mono tracking-tight">
          {stats.critical + stats.major}
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 truncate">
          Severe Bottlenecks
        </div>
      </div>

      {/* 4. Total Cumulative Delay */}
      <div className="bento-card p-4 relative overflow-hidden group hover:border-amber-700/60 transition">
        <div className="flex items-center justify-between text-amber-300 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Total Delay</span>
          <div className="p-1.5 rounded-xl bg-amber-500/20 text-amber-400">
            <Clock className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-black text-amber-300 font-mono tracking-tight">
          +{stats.totalDelayMinutes} <span className="text-xs font-normal text-slate-400">min</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
          <TrendingUp className="w-3 h-3 text-amber-400" />
          <span>Commuter Loss</span>
        </div>
      </div>

      {/* 5. Road Closures & Diversions */}
      <div 
        onClick={onFilterClosures}
        className={`bento-card cursor-pointer p-4 transition relative overflow-hidden group ${
          currentFilterCategory === 'Road Closed'
            ? 'bg-purple-950/80 border-purple-500 ring-2 ring-purple-500/30'
            : 'hover:bg-purple-950/40 hover:border-purple-700/80'
        }`}
      >
        <div className="flex items-center justify-between text-purple-300 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400">Closures</span>
          <div className="p-1.5 rounded-xl bg-purple-500/20 text-purple-400">
            <Construction className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-black text-purple-400 font-mono tracking-tight">
          {stats.roadClosures}
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 truncate">
          Diverted Corridors
        </div>
      </div>

      {/* 6. Affected Corridors */}
      <div className="bento-card p-4 relative overflow-hidden group hover:border-cyan-700/60 transition">
        <div className="flex items-center justify-between text-cyan-300 mb-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Affected Span</span>
          <div className="p-1.5 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Route className="w-3.5 h-3.5" />
          </div>
        </div>
        <div className="text-2xl font-black text-cyan-300 font-mono tracking-tight">
          {stats.totalLengthKm} <span className="text-xs font-normal text-slate-400">km</span>
        </div>
        <div className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
          <Activity className="w-3 h-3 text-cyan-400" />
          <span>Disrupted Stretch</span>
        </div>
      </div>
    </div>
  );
};

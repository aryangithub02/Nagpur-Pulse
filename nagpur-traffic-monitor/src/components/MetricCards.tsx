import React from 'react';
import { Gauge, Activity, AlertTriangle, CheckCircle2, TrendingDown, Clock, ShieldAlert } from 'lucide-react';
import { CitySummary, Junction } from '../types';

interface MetricCardsProps {
  summary: CitySummary | null;
  onSelectJunction: (junction: Junction) => void;
}

export const MetricCards: React.FC<MetricCardsProps> = ({ summary, onSelectJunction }) => {
  if (!summary) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 animate-pulse h-24" />
        ))}
      </div>
    );
  }

  const getCongestionColor = (score: number) => {
    if (score < 25) return { text: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Smooth / Fluid' };
    if (score < 50) return { text: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'Moderate Flow' };
    if (score < 75) return { text: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', label: 'Heavy Traffic' };
    return { text: 'text-rose-400', bg: 'bg-rose-500/10', border: 'border-rose-500/20', label: 'Severe Congestion' };
  };

  const congState = getCongestionColor(summary.overallCongestionScore);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 1. City Average Speed Card */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Gauge className="w-4 h-4 text-cyan-400" />
            Nagpur Avg Speed
          </span>
          <span className="text-[11px] font-mono text-slate-500">
            Free: {summary.avgFreeFlowSpeed} km/h
          </span>
        </div>

        <div className="my-2 flex items-baseline gap-2">
          <span className="text-3xl font-extrabold font-mono tracking-tight text-white">
            {summary.avgSpeed}
          </span>
          <span className="text-xs font-semibold text-slate-400">km/h</span>
          
          <div className="ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-slate-800 text-cyan-300 font-mono">
            <span>{Math.round(((summary.avgFreeFlowSpeed - summary.avgSpeed) / (summary.avgFreeFlowSpeed || 1)) * 100)}%</span>
            <TrendingDown className="w-3 h-3 text-cyan-400" />
          </div>
        </div>

        {/* Mini progress bar comparing speed */}
        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-gradient-to-r from-cyan-500 to-blue-500 h-full rounded-full transition-all duration-500"
            style={{ width: `${Math.min(100, (summary.avgSpeed / (summary.avgFreeFlowSpeed || 50)) * 100)}%` }}
          />
        </div>
      </div>

      {/* 2. City Congestion Score Card */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-amber-400" />
            Congestion Index
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${congState.bg} ${congState.text} border ${congState.border}`}>
            {congState.label}
          </span>
        </div>

        <div className="my-2 flex items-baseline gap-2">
          <span className={`text-3xl font-extrabold font-mono tracking-tight ${congState.text}`}>
            {summary.overallCongestionScore}%
          </span>
          <span className="text-xs text-slate-400">city load</span>
        </div>

        <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              summary.overallCongestionScore < 30
                ? 'bg-emerald-500'
                : summary.overallCongestionScore < 60
                ? 'bg-amber-500'
                : 'bg-rose-500'
            }`}
            style={{ width: `${Math.min(100, Math.max(5, summary.overallCongestionScore))}%` }}
          />
        </div>
      </div>

      {/* 3. Peak Delay Hotspot Card */}
      <div
        onClick={() => summary.highestDelayJunction && onSelectJunction(summary.highestDelayJunction.junction)}
        className="bg-slate-900/80 backdrop-blur border border-slate-800 hover:border-orange-500/50 rounded-xl p-4 flex flex-col justify-between shadow-sm cursor-pointer transition group"
      >
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span className="flex items-center gap-1.5 text-orange-400">
            <AlertTriangle className="w-4 h-4" />
            Top Congested Hotspot
          </span>
          <span className="text-[10px] text-slate-500 group-hover:text-cyan-400 font-mono transition">
            View →
          </span>
        </div>

        <div className="my-1">
          <h4 className="text-sm font-bold text-white truncate group-hover:text-cyan-300 transition">
            {summary.highestDelayJunction ? summary.highestDelayJunction.junction.name : 'All Corridors Clear'}
          </h4>
          <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
            <span className="text-orange-400 font-mono font-semibold">
              {summary.highestDelayJunction?.metrics?.currentSpeed ?? 0} km/h
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-mono">
              +{summary.highestDelayJunction?.metrics?.delaySeconds ?? 0}s delay
            </span>
          </div>
        </div>

        <div className="text-[11px] text-slate-500 truncate">
          {summary.highestDelayJunction?.junction.corridor || 'Nagpur Central Grid'}
        </div>
      </div>

      {/* 4. Active Network Status Card */}
      <div className="bg-slate-900/80 backdrop-blur border border-slate-800 rounded-xl p-4 flex flex-col justify-between shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Network Coverage
          </span>
          <span className="text-[11px] font-mono text-emerald-400 font-semibold">
            {summary.totalTracked} Chowks
          </span>
        </div>

        <div className="my-2 flex items-center justify-between text-xs">
          <div className="flex flex-col">
            <span className="text-lg font-bold font-mono text-emerald-400">
              {summary.fluidCount}
            </span>
            <span className="text-[10px] text-slate-400">Smooth (&gt;80%)</span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-lg font-bold font-mono text-amber-400">
              {summary.totalTracked - summary.fluidCount - summary.congestedCount}
            </span>
            <span className="text-[10px] text-slate-400">Moderate</span>
          </div>

          <div className="h-6 w-px bg-slate-800" />

          <div className="flex flex-col">
            <span className="text-lg font-bold font-mono text-rose-400">
              {summary.congestedCount}
            </span>
            <span className="text-[10px] text-slate-400">Heavy Jam</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] text-slate-500">
          <span>Road Closures: {summary.closedRoadsCount}</span>
          <span className="font-mono text-[10px]">TomTom v4</span>
        </div>
      </div>
    </div>
  );
};

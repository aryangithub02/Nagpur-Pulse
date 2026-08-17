import React from 'react';
import { IncidentStats, IncidentItem } from '../types';
import { ShieldCheck, AlertTriangle, Flame, Gauge, Zap, Compass } from 'lucide-react';

interface HazardIndexBentoTileProps {
  stats: IncidentStats;
  incidents: IncidentItem[];
  onFocusCorridor: (corridorName: string) => void;
}

export const HazardIndexBentoTile: React.FC<HazardIndexBentoTileProps> = ({
  stats,
  incidents,
  onFocusCorridor,
}) => {
  // Hazard index calculation out of 10
  // Accidents weight: 2.5 each, Critical: 1.5, Major: 0.8, Delays > 60min: +1.5
  const rawScore = 
    (stats.accidents * 2.2) + 
    (stats.critical * 1.5) + 
    (stats.major * 0.8) + 
    (stats.totalDelayMinutes > 45 ? 1.5 : (stats.totalDelayMinutes / 45) * 1.0);
  
  const hazardIndex = Math.min(10, Math.max(1.0, Number(rawScore.toFixed(1))));

  let hazardLabel = 'Low Disruption';
  let hazardColor = 'text-emerald-400';
  let hazardBg = 'bg-emerald-500/10 border-emerald-500/30';
  let gaugeBarColor = 'bg-emerald-500';
  let advisory = 'Normal traffic flow across major Nagpur arterial roads.';

  if (hazardIndex >= 7.5) {
    hazardLabel = 'Severe Congestion & Hazard';
    hazardColor = 'text-rose-400';
    hazardBg = 'bg-rose-500/15 border-rose-500/40';
    gaugeBarColor = 'bg-rose-500';
    advisory = 'High accident risk & severe bottleneck alert. Consider alternate bypass.';
  } else if (hazardIndex >= 4.5) {
    hazardLabel = 'Elevated Disruption';
    hazardColor = 'text-amber-400';
    hazardBg = 'bg-amber-500/15 border-amber-500/40';
    gaugeBarColor = 'bg-amber-500';
    advisory = 'Active jams & bottleneck reports at central junctions.';
  }

  // Nagpur key corridors with active incident counts
  const corridors = [
    { name: 'Wardha Road (NH-44)', query: 'Wardha', icon: '🛣️' },
    { name: 'Inner Ring Road', query: 'Ring Road', icon: '🔄' },
    { name: 'Amravati Road (NH-53)', query: 'Amravati', icon: '🚗' },
    { name: 'Central Avenue (CA Rd)', query: 'Central Avenue', icon: '🏙️' },
    { name: 'Hingna Road', query: 'Hingna', icon: '🏭' },
  ].map((c) => {
    const count = incidents.filter(
      (i) =>
        i.roadName.toLowerCase().includes(c.query.toLowerCase()) ||
        i.description.toLowerCase().includes(c.query.toLowerCase())
    ).length;
    return { ...c, count };
  });

  return (
    <div className="bento-card p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-400">
              <Gauge className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Nagpur Hazard Index</h3>
              <p className="text-[11px] text-slate-400">Live safety & velocity metric</p>
            </div>
          </div>
          <div className={`px-2.5 py-1 rounded-lg border text-xs font-mono font-bold ${hazardBg} ${hazardColor}`}>
            {hazardIndex} / 10
          </div>
        </div>

        {/* Hazard Score Display */}
        <div className="p-3 rounded-2xl bg-slate-950/50 border border-slate-800/80 mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs font-semibold text-slate-200">{hazardLabel}</span>
            <span className="text-[11px] text-slate-400 font-mono">Intensity</span>
          </div>

          {/* Meter progress bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden mb-2">
            <div
              className={`h-full ${gaugeBarColor} rounded-full transition-all duration-700`}
              style={{ width: `${(hazardIndex / 10) * 100}%` }}
            />
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed">
            {advisory}
          </p>
        </div>

        {/* Key Corridors Quick Status */}
        <div>
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Compass className="w-3 h-3 text-slate-500" />
            <span>Arterial Corridors Pulse</span>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {corridors.map((c) => (
              <button
                key={c.name}
                onClick={() => onFocusCorridor(c.query)}
                className="px-2.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-800/80 hover:border-slate-700 text-slate-300 hover:text-white text-[11px] flex items-center gap-1.5 transition active:scale-95"
              >
                <span>{c.icon}</span>
                <span>{c.name}</span>
                {c.count > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold border border-rose-500/30">
                    {c.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center gap-1 text-emerald-400 font-medium">
          <Zap className="w-3 h-3" /> Auto-computed in realtime
        </span>
        <span className="font-mono text-slate-500">TomTom AI Engine</span>
      </div>
    </div>
  );
};

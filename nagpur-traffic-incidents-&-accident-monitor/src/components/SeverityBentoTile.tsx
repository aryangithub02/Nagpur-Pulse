import React from 'react';
import { IncidentStats, IncidentItem } from '../types';
import { BarChart3, AlertOctagon, AlertTriangle, Info, ShieldAlert } from 'lucide-react';

interface SeverityBentoTileProps {
  stats: IncidentStats;
  incidents: IncidentItem[];
  onSelectSeverity: (severity: string) => void;
  currentSeverity: string;
}

export const SeverityBentoTile: React.FC<SeverityBentoTileProps> = ({
  stats,
  incidents,
  onSelectSeverity,
  currentSeverity,
}) => {
  const total = stats.total || 1;
  const criticalPct = Math.round((stats.critical / total) * 100);
  const majorPct = Math.round((stats.major / total) * 100);
  const moderatePct = Math.round((stats.moderate / total) * 100);
  const minorPct = Math.round((stats.minor / total) * 100);

  const levels = [
    {
      name: 'Critical',
      count: stats.critical,
      pct: criticalPct,
      color: 'bg-rose-500',
      textColor: 'text-rose-400',
      bgColor: 'bg-rose-500/10',
      borderColor: 'border-rose-500/30',
      icon: <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />,
      desc: 'Severe blockage / Multi-vehicle'
    },
    {
      name: 'Major',
      count: stats.major,
      pct: majorPct,
      color: 'bg-orange-500',
      textColor: 'text-orange-400',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-500/30',
      icon: <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />,
      desc: 'Heavy delays & lane stoppage'
    },
    {
      name: 'Moderate',
      count: stats.moderate,
      pct: moderatePct,
      color: 'bg-amber-500',
      textColor: 'text-amber-400',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      icon: <Info className="w-3.5 h-3.5 text-amber-400" />,
      desc: 'Slow moving / Construction'
    },
    {
      name: 'Minor',
      count: stats.minor,
      pct: minorPct,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      icon: <ShieldAlert className="w-3.5 h-3.5 text-emerald-400" />,
      desc: 'Low disruption / Caution'
    },
  ];

  return (
    <div className="bento-card p-5 flex flex-col justify-between h-full relative overflow-hidden group">
      {/* Top Header */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-rose-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Severity Distribution</h3>
              <p className="text-[11px] text-slate-400">Telemetry impact breakdown</p>
            </div>
          </div>
          <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
            {stats.total} Total
          </span>
        </div>

        {/* Severity Bars */}
        <div className="space-y-2.5 mt-4">
          {levels.map((item) => {
            const isSelected = currentSeverity === item.name;
            return (
              <div
                key={item.name}
                onClick={() => onSelectSeverity(isSelected ? 'ALL' : item.name)}
                className={`p-2.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                  isSelected
                    ? `${item.bgColor} ${item.borderColor} ring-1 ring-white/20`
                    : 'bg-slate-950/40 hover:bg-slate-900 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="flex items-center gap-1.5 font-medium text-slate-200">
                    {item.icon}
                    {item.name}
                  </span>
                  <div className="flex items-center gap-2 font-mono">
                    <span className={`font-bold ${item.textColor}`}>{item.count}</span>
                    <span className="text-slate-500 text-[10px]">({item.pct}%)</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full h-1.5 bg-slate-800/80 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.color} rounded-full transition-all duration-500`}
                    style={{ width: `${Math.max(item.pct, item.count > 0 ? 5 : 0)}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer hint */}
      <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
        <span>Click any tier to filter feed</span>
        <span className="font-mono text-slate-500">Live Metric</span>
      </div>
    </div>
  );
};

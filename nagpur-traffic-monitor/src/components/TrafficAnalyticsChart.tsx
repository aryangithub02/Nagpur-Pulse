import React from 'react';
import { BarChart3, TrendingUp, PieChart, Activity, Gauge } from 'lucide-react';
import { JunctionTrafficState, Zone } from '../types';

interface TrafficAnalyticsChartProps {
  junctionStates: JunctionTrafficState[];
}

export const TrafficAnalyticsChart: React.FC<TrafficAnalyticsChartProps> = ({ junctionStates }) => {
  // Sort junctions to get the top 12 representative corridors
  const topCorridors = [...junctionStates]
    .filter(j => j.metrics !== null)
    .sort((a, b) => (a.metrics?.currentSpeed ?? 0) - (b.metrics?.currentSpeed ?? 0))
    .slice(0, 10);

  // Group by Zone
  const zones: Zone[] = ['Central', 'North', 'South', 'East', 'West'];
  const zoneStats = zones.map(zone => {
    const list = junctionStates.filter(j => j.junction.zone === zone && j.metrics);
    const avgSpeed = list.length
      ? Math.round(list.reduce((acc, cur) => acc + (cur.metrics?.currentSpeed || 0), 0) / list.length)
      : 0;
    const avgDelay = list.length
      ? Math.round(list.reduce((acc, cur) => acc + (cur.metrics?.delaySeconds || 0), 0) / list.length)
      : 0;
    const congestedCount = list.filter(
      j => j.metrics?.congestionLevel === 'heavy' || j.metrics?.congestionLevel === 'gridlock'
    ).length;

    return {
      zone,
      count: list.length,
      avgSpeed,
      avgDelay,
      congestedCount,
    };
  });

  return (
    <div className="flex flex-col gap-5">
      {/* Zone-by-Zone Traffic Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        {zoneStats.map(stat => (
          <div
            key={stat.zone}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col justify-between"
          >
            <div className="flex items-center justify-between text-xs text-slate-400 font-semibold">
              <span>{stat.zone} Nagpur</span>
              <span className="text-[10px] font-mono text-cyan-400">{stat.count} Chowks</span>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black font-mono text-cyan-300">
                {stat.avgSpeed} <span className="text-xs text-slate-400 font-normal">km/h</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Avg delay: <span className="text-orange-400 font-mono">+{stat.avgDelay}s</span>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800 text-[10px] flex items-center justify-between text-slate-500">
              <span>Jams:</span>
              <span
                className={`font-bold ${
                  stat.congestedCount > 0 ? 'text-rose-400' : 'text-emerald-400'
                }`}
              >
                {stat.congestedCount} congested
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Speed Comparison Across Slowest Corridors */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Gauge className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Nagpur Corridors Speed & Flow Degradation (Slowest to Fastest)
              </h3>
              <p className="text-xs text-slate-400">
                Current Recorded Speed (km/h) vs Ideal Free-Flow Speed baseline
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono hidden sm:flex">
            <span className="flex items-center gap-1.5 text-cyan-300">
              <span className="w-2.5 h-2.5 rounded-sm bg-cyan-400" /> Current Speed
            </span>
            <span className="flex items-center gap-1.5 text-slate-500">
              <span className="w-2.5 h-2.5 rounded-sm bg-slate-700" /> Free-Flow Baseline
            </span>
          </div>
        </div>

        {/* Custom Bar Comparison List */}
        <div className="space-y-3">
          {topCorridors.map(({ junction, metrics }) => {
            if (!metrics) return null;
            const currentPct = Math.min(100, Math.round((metrics.currentSpeed / 70) * 100));
            const freeFlowPct = Math.min(100, Math.round((metrics.freeFlowSpeed / 70) * 100));

            return (
              <div key={junction.id} className="flex flex-col gap-1">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{junction.name}</span>
                    <span className="text-[10px] text-slate-500 font-mono">({junction.zone})</span>
                  </div>

                  <div className="flex items-center gap-3 font-mono text-xs">
                    <span className="text-cyan-300 font-bold">{metrics.currentSpeed} km/h</span>
                    <span className="text-slate-500">/ {metrics.freeFlowSpeed} km/h</span>
                    {metrics.delaySeconds > 0 && (
                      <span className="text-orange-400 text-[11px] font-semibold">
                        +{metrics.delaySeconds}s delay
                      </span>
                    )}
                  </div>
                </div>

                {/* Overlapped bar */}
                <div className="w-full bg-slate-950 h-3 rounded-full overflow-hidden relative p-0.5 border border-slate-800">
                  {/* Free flow shadow bar */}
                  <div
                    className="absolute top-0 left-0 h-full bg-slate-800/80 rounded-full"
                    style={{ width: `${freeFlowPct}%` }}
                  />
                  {/* Current speed bar */}
                  <div
                    className={`relative h-full rounded-full transition-all duration-500 ${
                      metrics.congestionLevel === 'fluid'
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : metrics.congestionLevel === 'moderate'
                        ? 'bg-gradient-to-r from-amber-500 to-yellow-400'
                        : 'bg-gradient-to-r from-rose-600 to-orange-500'
                    }`}
                    style={{ width: `${currentPct}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

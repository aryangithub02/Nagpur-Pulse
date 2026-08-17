import React, { useState } from 'react';
import {
  Gauge,
  Clock,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  ShieldCheck,
  AlertTriangle,
  MapPin,
  TrendingDown,
  X,
  Compass,
  Zap,
} from 'lucide-react';
import { Junction, TrafficMetrics } from '../types';
import { formatTravelTime } from '../services/tomtomService';

interface JunctionDetailCardProps {
  junction: Junction | null;
  metrics: TrafficMetrics | null;
  isLoading: boolean;
  onClose: () => void;
  onSetRouteOrigin?: (junction: Junction) => void;
  onSetRouteDestination?: (junction: Junction) => void;
}

export const JunctionDetailCard: React.FC<JunctionDetailCardProps> = ({
  junction,
  metrics,
  isLoading,
  onClose,
  onSetRouteOrigin,
  onSetRouteDestination,
}) => {
  const [copied, setCopied] = useState(false);

  if (!junction) return null;

  const handleCopyCoord = () => {
    navigator.clipboard.writeText(`${junction.latitude}, ${junction.longitude}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getCongestionBadge = (level: string) => {
    switch (level) {
      case 'fluid':
        return {
          label: 'Fluid / Free Flow',
          bg: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
          dot: 'bg-emerald-400',
        };
      case 'moderate':
        return {
          label: 'Moderate Slowdown',
          bg: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
          dot: 'bg-amber-400',
        };
      case 'heavy':
        return {
          label: 'Heavy Congestion',
          bg: 'bg-orange-500/10 text-orange-300 border-orange-500/20',
          dot: 'bg-orange-400',
        };
      case 'gridlock':
      default:
        return {
          label: 'Severe Gridlock / Jam',
          bg: 'bg-rose-500/10 text-rose-300 border-rose-500/20',
          dot: 'bg-rose-400',
        };
    }
  };

  const badge = getCongestionBadge(metrics?.congestionLevel || 'fluid');
  const speedPercentage = metrics
    ? Math.min(100, Math.round((metrics.currentSpeed / (metrics.freeFlowSpeed || 50)) * 100))
    : 0;

  return (
    <div className="bg-slate-900/95 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-2xl flex flex-col gap-4 text-slate-100 relative">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-mono">
              {junction.zone} Zone
            </span>
            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1.5 ${badge.bg}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
              {badge.label}
            </span>
          </div>

          <h3 className="text-lg font-bold text-white mt-1 tracking-tight">
            {junction.name}
          </h3>

          <p className="text-xs text-slate-400 mt-0.5">
            {junction.corridor || junction.description || 'Nagpur Urban Network'}
          </p>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition"
          title="Close Card"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Main Speedometer & Delay Matrix */}
      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center gap-2 text-cyan-400 animate-pulse">
          <Zap className="w-6 h-6 animate-spin" />
          <span className="text-xs font-mono">Querying TomTom Flow API...</span>
        </div>
      ) : metrics ? (
        <>
          {/* Key Metric Blocks */}
          <div className="grid grid-cols-2 gap-3">
            {/* Speed Box */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  Traffic Speed
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Free: {metrics.freeFlowSpeed} km/h
                </span>
              </div>

              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono tracking-tight text-cyan-300">
                  {metrics.currentSpeed}
                </span>
                <span className="text-xs font-semibold text-slate-400">km/h</span>

                {metrics.speedDropPct > 0 && (
                  <span className="ml-auto text-[11px] font-mono font-bold text-amber-400 flex items-center">
                    -{metrics.speedDropPct}%
                    <TrendingDown className="w-3 h-3 ml-0.5" />
                  </span>
                )}
              </div>

              {/* Visual gauge bar */}
              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    speedPercentage > 75
                      ? 'bg-emerald-400'
                      : speedPercentage > 45
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{ width: `${speedPercentage}%` }}
                />
              </div>
            </div>

            {/* Travel Time Box */}
            <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
                <span className="flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  Travel Time
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Base: {formatTravelTime(metrics.freeFlowTravelTime)}
                </span>
              </div>

              <div className="my-1.5 flex items-baseline gap-1.5">
                <span className="text-2xl font-black font-mono tracking-tight text-white">
                  {formatTravelTime(metrics.currentTravelTime)}
                </span>
              </div>

              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">Delay:</span>
                <span
                  className={
                    metrics.delaySeconds > 0
                      ? 'text-orange-400 font-bold'
                      : 'text-emerald-400'
                  }
                >
                  {metrics.delaySeconds > 0 ? `+${formatTravelTime(metrics.delaySeconds)}` : 'Zero Delay (Free Flow)'}
                </span>
              </div>
            </div>
          </div>

          {/* Road Segment Details */}
          <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl p-3 text-xs space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Functional Road Class (FRC):</span>
              <span className="font-semibold text-slate-200">{metrics.frcDescription}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">TomTom Confidence Factor:</span>
              <span className="font-mono text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5" />
                {metrics.confidencePct}% Statistical Reliability
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-400">Road Closure Status:</span>
              <span className={metrics.roadClosure ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                {metrics.roadClosure ? 'CLOSED / DETOUR' : 'Open for Traffic'}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">GPS Coordinates:</span>
              <div className="flex items-center gap-1.5 font-mono text-[11px] text-cyan-300">
                <span>
                  {junction.latitude.toFixed(5)}, {junction.longitude.toFixed(5)}
                </span>
                <button
                  onClick={handleCopyCoord}
                  className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition"
                  title="Copy Lat/Lng"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                </button>
              </div>
            </div>
          </div>

          {/* Route Planning Quick Actions */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            {onSetRouteOrigin && (
              <button
                onClick={() => onSetRouteOrigin(junction)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold active:scale-95 transition"
              >
                <Navigation className="w-3.5 h-3.5" />
                Start Route Here
              </button>
            )}

            {onSetRouteDestination && (
              <button
                onClick={() => onSetRouteDestination(junction)}
                className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-indigo-300 text-xs font-semibold active:scale-95 transition"
              >
                <Compass className="w-3.5 h-3.5" />
                Set as Destination
              </button>
            )}
          </div>
        </>
      ) : (
        <div className="py-6 text-center text-slate-400 text-xs">
          No traffic data available. Click Refresh to poll TomTom API.
        </div>
      )}
    </div>
  );
};

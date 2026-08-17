import React, { useState, useEffect } from 'react';
import {
  Navigation,
  ArrowRightLeft,
  Clock,
  Gauge,
  MapPin,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  Compass,
  ArrowRight,
  Zap,
} from 'lucide-react';
import { Junction, RouteCalculation, TrafficMetrics } from '../types';
import { calculateCorridorTravel, formatTravelTime } from '../services/tomtomService';

interface RoutePlannerProps {
  allJunctions: Junction[];
  metricsMap: Map<number, TrafficMetrics>;
  activeRoute: RouteCalculation | null;
  setActiveRoute: (route: RouteCalculation | null) => void;
  onSwitchToMap: () => void;
  defaultOrigin?: Junction | null;
  defaultDestination?: Junction | null;
}

export const RoutePlanner: React.FC<RoutePlannerProps> = ({
  allJunctions,
  metricsMap,
  activeRoute,
  setActiveRoute,
  onSwitchToMap,
  defaultOrigin,
  defaultDestination,
}) => {
  const [originId, setOriginId] = useState<number>(defaultOrigin ? defaultOrigin.id : 11); // Airport T-Point
  const [destinationId, setDestinationId] = useState<number>(defaultDestination ? defaultDestination.id : 22); // Sitabuldi Chowk
  const [isCalculating, setIsCalculating] = useState<boolean>(false);

  useEffect(() => {
    if (defaultOrigin) setOriginId(defaultOrigin.id);
    if (defaultDestination) setDestinationId(defaultDestination.id);
  }, [defaultOrigin, defaultDestination]);

  const originJunction = allJunctions.find(j => j.id === originId) || allJunctions[0];
  const destinationJunction = allJunctions.find(j => j.id === destinationId) || allJunctions[1];

  const handleCalculateRoute = async (orig = originJunction, dest = destinationJunction) => {
    if (!orig || !dest || orig.id === dest.id) return;
    setIsCalculating(true);
    try {
      const calculation = await calculateCorridorTravel(orig, dest, allJunctions, metricsMap);
      setActiveRoute(calculation);
    } catch (err) {
      console.error('Error calculating corridor travel time:', err);
    } finally {
      setIsCalculating(false);
    }
  };

  useEffect(() => {
    handleCalculateRoute(originJunction, destinationJunction);
  }, [originId, destinationId]);

  const handleSwap = () => {
    const temp = originId;
    setOriginId(destinationId);
    setDestinationId(temp);
  };

  const presetRoutes = [
    { name: 'Airport → Sitabuldi Core', fromId: 11, toId: 22 },
    { name: 'VNIT/Laxmi Nagar → Sadar/KP', fromId: 13, toId: 10 },
    { name: 'Manewada → Itwari Market', fromId: 32, toId: 21 },
    { name: 'Hingna MIDC → Railway Station', fromId: 31, toId: 25 },
    { name: 'Kamptee Road → Wardha Road/Ajni', fromId: 30, toId: 34 },
  ];

  return (
    <div className="flex flex-col gap-5">
      {/* Route Selector Card */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Nagpur Corridor Travel Time & Delay Estimator
            </h2>
          </div>
          <span className="text-xs text-slate-400 hidden sm:inline font-mono">
            Powered by TomTom Flow Metrics
          </span>
        </div>

        {/* Origin / Destination Controls */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr,auto,1fr] gap-3 items-center">
          {/* Origin */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-cyan-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400" />
              Origin Chowk (Start Point)
            </label>
            <select
              value={originId}
              onChange={e => setOriginId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl p-3 text-xs text-white focus:outline-none cursor-pointer"
            >
              {allJunctions.map(j => (
                <option key={j.id} value={j.id} disabled={j.id === destinationId}>
                  {j.name} ({j.zone} Zone) - {j.corridor || 'Corridor'}
                </option>
              ))}
            </select>
          </div>

          {/* Swap Button */}
          <div className="flex justify-center pt-2 md:pt-4">
            <button
              onClick={handleSwap}
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white transition active:scale-95 shadow-md"
              title="Swap Origin & Destination"
            >
              <ArrowRightLeft className="w-4 h-4" />
            </button>
          </div>

          {/* Destination */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-indigo-300 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-400" />
              Destination Chowk (End Point)
            </label>
            <select
              value={destinationId}
              onChange={e => setDestinationId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-xs text-white focus:outline-none cursor-pointer"
            >
              {allJunctions.map(j => (
                <option key={j.id} value={j.id} disabled={j.id === originId}>
                  {j.name} ({j.zone} Zone) - {j.corridor || 'Corridor'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Preset Commute Routes */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Popular Commutes:</span>
          {presetRoutes.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setOriginId(p.fromId);
                setDestinationId(p.toId);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Route Result Display */}
      {isCalculating ? (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 text-cyan-400 animate-pulse">
          <Zap className="w-6 h-6 animate-spin" />
          <span className="text-xs font-mono">Aggregating live segment flow & travel times...</span>
        </div>
      ) : activeRoute ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Main Key Route Stats */}
          <div className="lg:col-span-2 bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between gap-4">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs font-semibold text-slate-400">Total Estimated Drive Duration</span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-4xl font-black font-mono text-cyan-300 tracking-tight">
                    {formatTravelTime(activeRoute.totalTravelTimeSec)}
                  </span>
                  <span className="text-xs font-semibold text-slate-400">
                    across {activeRoute.totalDistanceKm} km
                  </span>
                </div>
              </div>

              <button
                onClick={onSwitchToMap}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 active:scale-95 transition"
              >
                <MapPin className="w-3.5 h-3.5" />
                View on Live Map
              </button>
            </div>

            {/* Comparison Metrics */}
            <div className="grid grid-cols-3 gap-3 bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-center">
              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">Free-Flow Time</span>
                <span className="text-lg font-bold font-mono text-slate-200 mt-0.5">
                  {formatTravelTime(activeRoute.freeFlowTravelTimeSec)}
                </span>
              </div>

              <div className="flex flex-col border-x border-slate-800">
                <span className="text-[11px] text-slate-400">Traffic Delay</span>
                <span
                  className={`text-lg font-bold font-mono mt-0.5 ${
                    activeRoute.totalDelaySec > 0 ? 'text-orange-400' : 'text-emerald-400'
                  }`}
                >
                  {activeRoute.totalDelaySec > 0
                    ? `+${formatTravelTime(activeRoute.totalDelaySec)}`
                    : 'Zero Delay'}
                </span>
              </div>

              <div className="flex flex-col">
                <span className="text-[11px] text-slate-400">Avg Route Speed</span>
                <span className="text-lg font-bold font-mono text-cyan-300 mt-0.5">
                  {activeRoute.averageSpeedKmph} km/h
                </span>
              </div>
            </div>

            {/* Congestion Summary Bar */}
            <div className="flex items-center justify-between text-xs bg-slate-950/40 p-3 rounded-xl border border-slate-800/50">
              <span className="text-slate-400">Route Traffic Condition:</span>
              <span
                className={`px-2.5 py-0.5 rounded-full font-bold text-xs uppercase font-mono ${
                  activeRoute.congestionStatus === 'fluid'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : activeRoute.congestionStatus === 'moderate'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                }`}
              >
                {activeRoute.congestionStatus}
              </span>
            </div>
          </div>

          {/* Segment-by-segment Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-cyan-400" />
              Corridor Nodes ({activeRoute.segments.length})
            </h3>

            <div className="flex flex-col gap-2 overflow-y-auto max-h-[260px] pr-1">
              {activeRoute.segments.map((seg, idx) => (
                <div
                  key={idx}
                  className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-2.5 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 text-[10px] font-mono flex items-center justify-center font-bold">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="font-semibold text-white truncate max-w-[140px]">
                        {seg.name}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {seg.speed} km/h (Free: {seg.freeFlowSpeed})
                      </div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-slate-200">{formatTravelTime(seg.travelTimeSec)}</div>
                    {seg.delaySec > 0 ? (
                      <div className="text-[10px] text-orange-400">+{seg.delaySec}s</div>
                    ) : (
                      <div className="text-[10px] text-emerald-400">Smooth</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
};

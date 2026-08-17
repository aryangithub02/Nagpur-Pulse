import React, { useState } from 'react';
import { NAGPUR_JUNCTIONS, NagpurJunction } from '../data/nagpurJunctions';
import { PoliceUnit } from '../types/police';
import { calculateHaversineDistanceKm } from '../utils/geoUtils';
import { MapPin, Navigation, Video, AlertCircle, Shield, Search, Filter, CheckCircle2 } from 'lucide-react';

interface JunctionsOverviewProps {
  units: PoliceUnit[];
  onDispatchToJunction: (junction: NagpurJunction) => void;
  onSelectJunctionOnMap?: (junction: NagpurJunction) => void;
}

export const JunctionsOverview: React.FC<JunctionsOverviewProps> = ({
  units,
  onDispatchToJunction,
  onSelectJunctionOnMap
}) => {
  const [zoneFilter, setZoneFilter] = useState<string>('ALL');
  const [congestionFilter, setCongestionFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredJunctions = NAGPUR_JUNCTIONS.filter((junc) => {
    if (zoneFilter !== 'ALL' && junc.zone !== zoneFilter) return false;
    if (congestionFilter !== 'ALL' && junc.trafficCongestion !== congestionFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = junc.name.toLowerCase().includes(q);
      const matchZone = junc.zone.toLowerCase().includes(q);
      const matchType = junc.type.toLowerCase().includes(q);
      if (!matchName && !matchZone && !matchType) return false;
    }
    return true;
  });

  // Calculate nearest unit for each junction
  const getNearestUnitInfo = (junction: NagpurJunction) => {
    let nearestUnit: PoliceUnit | null = null;
    let minDistance = Infinity;

    for (const unit of units) {
      const dist = calculateHaversineDistanceKm(
        unit.location.latitude,
        unit.location.longitude,
        junction.latitude,
        junction.longitude
      );
      if (dist < minDistance) {
        minDistance = dist;
        nearestUnit = unit;
      }
    }

    return { nearestUnit, distanceKm: minDistance };
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
      {/* Top Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-rose-400" />
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Nagpur Junctions & Traffic Intersections Grid ({filteredJunctions.length}/{NAGPUR_JUNCTIONS.length})
            </h3>
          </div>
          <p className="text-xs text-slate-400">
            Real-time coverage surveillance, CCTV network, and unit proximity analysis
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <div className="relative">
            <input
              id="input-search-junctions"
              type="text"
              placeholder="Search Chowk, Square, Zone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 w-44"
            />
          </div>

          <select
            id="select-junction-zone-filter"
            value={zoneFilter}
            onChange={(e) => setZoneFilter(e.target.value)}
            aria-label="Filter junctions by zone"
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Zones (40 Junctions)</option>
            <option value="Zone 1 - Central">Zone 1 - Central</option>
            <option value="Zone 2 - North">Zone 2 - North</option>
            <option value="Zone 3 - East">Zone 3 - East</option>
            <option value="Zone 4 - South">Zone 4 - South</option>
            <option value="Zone 5 - West">Zone 5 - West</option>
          </select>

          <select
            id="select-junction-congestion-filter"
            value={congestionFilter}
            onChange={(e) => setCongestionFilter(e.target.value)}
            aria-label="Filter junctions by traffic congestion"
            className="bg-slate-900 border border-slate-700/80 rounded-lg px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Congestion Levels</option>
            <option value="Normal">Normal Flow</option>
            <option value="Moderate">Moderate Traffic</option>
            <option value="Heavy">Heavy Traffic</option>
            <option value="Gridlock">Gridlock Alert</option>
          </select>
        </div>
      </div>

      {/* Junctions Grid */}
      <div className="flex-1 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredJunctions.map((junc) => {
          const { nearestUnit, distanceKm } = getNearestUnitInfo(junc);
          const isGridlock = junc.trafficCongestion === 'Gridlock';
          const isHeavy = junc.trafficCongestion === 'Heavy';

          return (
            <div
              key={junc.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                isGridlock
                  ? 'bg-rose-950/20 border-rose-700/50 shadow-md ring-1 ring-rose-500/20'
                  : isHeavy
                  ? 'bg-amber-950/20 border-amber-700/40 shadow-xs'
                  : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                        #{junc.id}
                      </span>
                      <h4 className="text-sm font-bold text-white tracking-tight">{junc.name}</h4>
                    </div>
                    <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                      {junc.zone} • {junc.type}
                    </p>
                  </div>

                  <span
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-full border ${
                      isGridlock
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 animate-pulse'
                        : isHeavy
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    }`}
                  >
                    {junc.trafficCongestion}
                  </span>
                </div>

                {/* Info row */}
                <div className="grid grid-cols-2 gap-2 text-xs mb-3 font-mono">
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                    <Video className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{junc.cctvCount} CCTV Feeds</span>
                  </div>
                  <div className="p-1.5 rounded bg-slate-900/80 border border-slate-800 flex items-center gap-1.5 text-slate-300">
                    <Shield className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Priority: {junc.priorityLevel}</span>
                  </div>
                </div>

                {/* Nearest Unit */}
                {nearestUnit && (
                  <div className="p-2 rounded bg-slate-900 border border-slate-800 text-xs mb-3">
                    <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono mb-1">
                      <span>Nearest Unit Proximity:</span>
                      <span className="text-cyan-400 font-bold">{distanceKm} km</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-200">
                      <span className="font-semibold flex items-center gap-1">
                        {nearestUnit.unitType === 'Beat Marshal (Bike)' ? '🏍️' : '🚔'} {nearestUnit.callSign}
                      </span>
                      <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                        nearestUnit.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                      }`}>
                        {nearestUnit.availability}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Button */}
              <button
                id={`btn-dispatch-junc-card-${junc.id}`}
                onClick={() => onDispatchToJunction(junc)}
                className="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-medium text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 shadow-xs"
              >
                <Navigation className="w-3.5 h-3.5" />
                Dispatch Unit to {junc.name.split(' ')[0]}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

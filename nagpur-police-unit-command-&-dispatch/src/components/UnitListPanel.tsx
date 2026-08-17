import React from 'react';
import { PoliceUnit, AvailabilityStatus, UnitType } from '../types/police';
import { Shield, Radio, Fuel, MapPin, AlertTriangle, CheckCircle, Navigation, Activity, Zap, Search } from 'lucide-react';

interface UnitListPanelProps {
  units: PoliceUnit[];
  selectedUnit: PoliceUnit | null;
  onSelectUnit: (unit: PoliceUnit) => void;
  onOpenDispatchModal: (unit: PoliceUnit) => void;
  onStatusChange: (unitId: string, newStatus: AvailabilityStatus) => void;
  filterAvailability: string;
  setFilterAvailability: (val: string) => void;
  filterUnitType: string;
  setFilterUnitType: (val: string) => void;
  filterZone: string;
  setFilterZone: (val: string) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
}

export const UnitListPanel: React.FC<UnitListPanelProps> = ({
  units,
  selectedUnit,
  onSelectUnit,
  onOpenDispatchModal,
  onStatusChange,
  filterAvailability,
  setFilterAvailability,
  filterUnitType,
  setFilterUnitType,
  filterZone,
  setFilterZone,
  searchQuery,
  setSearchQuery,
}) => {
  const filteredUnits = units.filter((u) => {
    if (filterAvailability !== 'ALL' && u.availability !== filterAvailability) return false;
    if (filterUnitType !== 'ALL' && u.unitType !== filterUnitType) return false;
    if (filterZone !== 'ALL' && u.zone !== filterZone) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = u.callSign.toLowerCase().includes(q);
      const matchCode = u.unitCode.toLowerCase().includes(q);
      const matchOfficer = u.commanderName.toLowerCase().includes(q);
      const matchJunction = u.location.nearestJunctionName.toLowerCase().includes(q);
      const matchAsg = u.currentAssignment?.assignmentTitle.toLowerCase().includes(q) || false;
      if (!matchName && !matchCode && !matchOfficer && !matchJunction && !matchAsg) return false;
    }
    return true;
  });

  const getStatusBadge = (status: AvailabilityStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return (
          <span className="text-[10px] font-mono font-bold bg-green-900/50 text-green-400 px-2 py-0.5 rounded border border-green-500/30">
            AVAILABLE
          </span>
        );
      case 'EN_ROUTE':
        return (
          <span className="text-[10px] font-mono font-bold bg-yellow-900/50 text-yellow-400 px-2 py-0.5 rounded border border-yellow-500/30 animate-pulse">
            EN ROUTE
          </span>
        );
      case 'ON_SCENE':
        return (
          <span className="text-[10px] font-mono font-bold bg-red-900/50 text-red-400 px-2 py-0.5 rounded border border-red-500/30">
            ON SCENE
          </span>
        );
      case 'INVESTIGATING':
        return (
          <span className="text-[10px] font-mono font-bold bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
            INVESTIGATING
          </span>
        );
      case 'BUSY':
        return (
          <span className="text-[10px] font-mono font-bold bg-purple-900/50 text-purple-400 px-2 py-0.5 rounded border border-purple-500/30">
            BUSY
          </span>
        );
      case 'OFF_DUTY':
      default:
        return (
          <span className="text-[10px] font-mono font-bold bg-slate-700 text-slate-300 px-2 py-0.5 rounded">
            OFF DUTY
          </span>
        );
    }
  };

  const getUnitTypeIcon = (type: UnitType) => {
    switch (type) {
      case 'Beat Marshal (Bike)':
        return '🏍️';
      case 'Traffic Interceptor':
        return '🚨';
      case 'QRT SWAT Unit':
        return '🛡️';
      case 'Damini Squad (Women Safety)':
        return '⭐';
      case 'Highway Patrol':
        return '⚡';
      case 'PCR Van':
      default:
        return '🚔';
    }
  };

  const getBorderColorClass = (status: AvailabilityStatus, isSelected: boolean) => {
    if (isSelected) return 'border-l-4 border-l-blue-500 bg-slate-700/40';
    switch (status) {
      case 'AVAILABLE':
        return 'border-l-4 border-l-green-500 hover:bg-slate-700/20';
      case 'EN_ROUTE':
        return 'border-l-4 border-l-yellow-500 hover:bg-slate-700/20';
      case 'ON_SCENE':
        return 'border-l-4 border-l-red-500 hover:bg-slate-700/20';
      case 'INVESTIGATING':
      case 'BUSY':
        return 'border-l-4 border-l-purple-500 hover:bg-slate-700/20';
      default:
        return 'border-l-4 border-l-slate-600 hover:bg-slate-700/20';
    }
  };

  return (
    <aside className="flex flex-col h-full bg-slate-800/60 border border-slate-700 rounded-xl overflow-hidden shadow-2xl backdrop-blur-xs">
      {/* Sidebar Header */}
      <div className="p-3.5 border-b border-slate-700 bg-slate-800/90 flex flex-col gap-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase text-slate-200 tracking-wider font-sans flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-400" />
            Active Patrol Units
          </h2>
          <span className="px-2 py-0.5 rounded-full bg-slate-700 text-[10px] font-mono font-bold text-slate-200">
            {filteredUnits.length} / {units.length} TOTAL
          </span>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            id="input-search-units"
            type="text"
            placeholder="Search Call Sign, Officer, Sector..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-700 rounded-lg pl-8 pr-7 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-200"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-1.5 text-xs font-mono">
          <select
            id="select-filter-status"
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            aria-label="Filter by unit availability status"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Statuses</option>
            <option value="AVAILABLE">Available</option>
            <option value="EN_ROUTE">En Route</option>
            <option value="ON_SCENE">On Scene</option>
            <option value="INVESTIGATING">Investigating</option>
            <option value="OFF_DUTY">Off Duty</option>
          </select>

          <select
            id="select-filter-type"
            value={filterUnitType}
            onChange={(e) => setFilterUnitType(e.target.value)}
            aria-label="Filter by unit type"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Unit Types</option>
            <option value="PCR Van">PCR Vans</option>
            <option value="Traffic Interceptor">Traffic Interceptors</option>
            <option value="Beat Marshal (Bike)">Beat Marshals</option>
            <option value="QRT SWAT Unit">QRT SWAT</option>
            <option value="Damini Squad (Women Safety)">Damini Squad</option>
            <option value="Highway Patrol">Highway Patrol</option>
          </select>

          <select
            id="select-filter-zone"
            value={filterZone}
            onChange={(e) => setFilterZone(e.target.value)}
            aria-label="Filter by Nagpur police zone"
            className="bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Sectors</option>
            <option value="Zone 1 - Central">Sector 1 • Central</option>
            <option value="Zone 2 - North">Sector 2 • North</option>
            <option value="Zone 3 - East">Sector 3 • East</option>
            <option value="Zone 4 - South">Sector 4 • South</option>
            <option value="Zone 5 - West">Sector 5 • West</option>
          </select>
        </div>
      </div>

      {/* Units List */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-700/80 bg-slate-900/40">
        {filteredUnits.length === 0 ? (
          <div className="p-8 text-center text-slate-400">
            <AlertTriangle className="w-8 h-8 mx-auto text-slate-500 mb-2" />
            <p className="text-sm font-medium">No units found</p>
            <button
              onClick={() => {
                setFilterAvailability('ALL');
                setFilterUnitType('ALL');
                setFilterZone('ALL');
                setSearchQuery('');
              }}
              className="mt-2 text-xs text-blue-400 hover:underline font-mono"
            >
              Reset filters
            </button>
          </div>
        ) : (
          filteredUnits.map((unit) => {
            const isSelected = selectedUnit?.id === unit.id;
            return (
              <div
                key={unit.id}
                id={`unit-card-${unit.id}`}
                onClick={() => onSelectUnit(unit)}
                className={`p-3.5 cursor-pointer transition-all ${getBorderColorClass(unit.availability, isSelected)}`}
              >
                {/* Top Row: Unit ID & Status */}
                <div className="flex justify-between items-center mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm">{getUnitTypeIcon(unit.unitType)}</span>
                    <span className="font-mono font-bold text-slate-100 text-xs">
                      {unit.callSign.split(' ')[0]} ({unit.unitCode})
                    </span>
                  </div>
                  <div>{getStatusBadge(unit.availability)}</div>
                </div>

                {/* Subtitle / Commander & Sector */}
                <p className="text-xs text-slate-300 font-sans">
                  {unit.zone.split(' - ')[0]} • {unit.commanderName}
                </p>

                {/* Assignment or Status details */}
                {unit.currentAssignment ? (
                  <div className="mt-2 p-2 rounded bg-slate-900/90 border border-slate-700/70 text-xs">
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-slate-400">Incident:</span>
                      <span className="text-red-400 font-bold truncate max-w-[140px]">{unit.currentAssignment.incidentType}</span>
                    </div>
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-slate-400">Target:</span>
                      <span className="text-slate-200 font-semibold">{unit.currentAssignment.junctionName}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>Near {unit.location.nearestJunctionName}</span>
                    <span className="text-[10px] font-mono text-emerald-400/90">• Standby Patrol</span>
                  </p>
                )}

                {/* Location Monospace Telemetry */}
                <p className="text-[10px] text-slate-500 mt-2 font-mono flex items-center justify-between">
                  <span>
                    LOCATION: {unit.location.latitude.toFixed(4)}° N, {unit.location.longitude.toFixed(4)}° E
                  </span>
                  {unit.telemetry.speedKmH > 0 && (
                    <span className="text-cyan-400 font-bold">{unit.telemetry.speedKmH} KM/H</span>
                  )}
                </p>

                {/* Quick Action Buttons */}
                <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex items-center justify-between text-xs" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center gap-2 text-[10px] font-mono text-slate-400">
                    <span className="flex items-center gap-1">
                      <Fuel className="w-3 h-3 text-slate-500" />
                      {unit.telemetry.fuelPercentage}%
                    </span>
                    <span>•</span>
                    <span>{unit.crewCount} Officers</span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {unit.availability === 'AVAILABLE' ? (
                      <button
                        id={`btn-dispatch-${unit.id}`}
                        onClick={() => onOpenDispatchModal(unit)}
                        className="px-2.5 py-1 text-[10px] font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors flex items-center gap-1 shadow-xs"
                      >
                        <Navigation className="w-3 h-3" />
                        DISPATCH
                      </button>
                    ) : unit.availability === 'EN_ROUTE' ? (
                      <button
                        id={`btn-onscene-${unit.id}`}
                        onClick={() => onStatusChange(unit.id, 'ON_SCENE')}
                        className="px-2 py-1 text-[10px] font-mono font-bold bg-yellow-600 hover:bg-yellow-500 text-white rounded transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        ON SCENE
                      </button>
                    ) : (
                      <button
                        id={`btn-clear-${unit.id}`}
                        onClick={() => onStatusChange(unit.id, 'AVAILABLE')}
                        className="px-2 py-1 text-[10px] font-mono font-bold bg-green-700 hover:bg-green-600 text-white rounded transition-colors flex items-center gap-1"
                      >
                        <CheckCircle className="w-3 h-3" />
                        CLEAR
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer Status Bar */}
      <div className="p-3 mt-auto border-t border-slate-700 bg-slate-900 select-none">
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 uppercase tracking-wider">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]"></div>
            API Connection: Stabilized
          </div>
          <span className="text-slate-500">SEC-NET // 112</span>
        </div>
      </div>
    </aside>
  );
};

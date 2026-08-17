import React from 'react';
import { PoliceUnit, AvailabilityStatus } from '../types/police';
import { Shield, MapPin, Radio, Phone, User, Gauge, Fuel, Battery, Navigation, CheckCircle, AlertTriangle, X, Wrench, Clock, Compass, Activity, Eye, Zap } from 'lucide-react';
import { soundFX } from '../services/audioEffects';

interface UnitDetailDrawerProps {
  unit: PoliceUnit | null;
  onClose: () => void;
  onStatusChange: (unitId: string, status: AvailabilityStatus) => void;
  onOpenDispatch: (unit: PoliceUnit) => void;
}

export const UnitDetailDrawer: React.FC<UnitDetailDrawerProps> = ({
  unit,
  onClose,
  onStatusChange,
  onOpenDispatch,
}) => {
  if (!unit) return null;

  const handleStatusClick = (status: AvailabilityStatus) => {
    soundFX.playBeep();
    onStatusChange(unit.id, status);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-[1500] w-full max-w-md bg-slate-900 border-l border-slate-700/80 shadow-2xl flex flex-col animate-slideInRight">
      {/* Drawer Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-lg">
            {unit.unitType === 'Beat Marshal (Bike)' ? '🏍️' : unit.unitType === 'QRT SWAT Unit' ? '🛡️' : '🚔'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white font-mono">{unit.callSign}</h3>
              <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">
                {unit.unitCode}
              </span>
            </div>
            <p className="text-xs text-slate-400">{unit.unitType} • {unit.zone}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Drawer Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Availability Status Controller */}
        <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] font-mono">
              Availability & Duty Status
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              unit.availability === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' :
              unit.availability === 'EN_ROUTE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/40' :
              unit.availability === 'ON_SCENE' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
              unit.availability === 'INVESTIGATING' || unit.availability === 'BUSY' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/40' :
              'bg-slate-500/20 text-slate-400 border border-slate-500/40'
            }`}>
              {unit.availability}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <button
              onClick={() => handleStatusClick('AVAILABLE')}
              className={`py-1.5 px-2 rounded font-semibold text-[10px] border transition-all ${
                unit.availability === 'AVAILABLE'
                  ? 'bg-emerald-600 text-white border-emerald-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-emerald-300'
              }`}
            >
              Available
            </button>
            <button
              onClick={() => handleStatusClick('EN_ROUTE')}
              className={`py-1.5 px-2 rounded font-semibold text-[10px] border transition-all ${
                unit.availability === 'EN_ROUTE'
                  ? 'bg-blue-600 text-white border-blue-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-blue-300'
              }`}
            >
              En Route
            </button>
            <button
              onClick={() => handleStatusClick('ON_SCENE')}
              className={`py-1.5 px-2 rounded font-semibold text-[10px] border transition-all ${
                unit.availability === 'ON_SCENE'
                  ? 'bg-amber-600 text-white border-amber-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-amber-300'
              }`}
            >
              On Scene
            </button>
            <button
              onClick={() => handleStatusClick('INVESTIGATING')}
              className={`py-1.5 px-2 rounded font-semibold text-[10px] border transition-all ${
                unit.availability === 'INVESTIGATING'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-purple-300'
              }`}
            >
              Investigating
            </button>
            <button
              onClick={() => handleStatusClick('BUSY')}
              className={`py-1.5 px-2 rounded font-semibold text-[10px] border transition-all ${
                unit.availability === 'BUSY'
                  ? 'bg-purple-600 text-white border-purple-400 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-purple-300'
              }`}
            >
              Busy
            </button>
            <button
              onClick={() => handleStatusClick('OFF_DUTY')}
              className={`py-1.5 px-2 rounded font-semibold text-[10px] border transition-all ${
                unit.availability === 'OFF_DUTY'
                  ? 'bg-slate-700 text-white border-slate-500 shadow-sm'
                  : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800 hover:text-slate-300'
              }`}
            >
              Off Duty
            </button>
          </div>
        </div>

        {/* Current Active Assignment */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-amber-400" />
              Current Assignment
            </span>
            {unit.currentAssignment && (
              <span className="text-[10px] font-mono text-cyan-400">
                ETA: ~{unit.currentAssignment.etaMinutes} mins
              </span>
            )}
          </div>

          {unit.currentAssignment ? (
            <div className="space-y-2">
              <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-700/80">
                <div className="flex items-center justify-between text-xs font-bold text-slate-100 mb-1">
                  <span>{unit.currentAssignment.assignmentTitle}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                    unit.currentAssignment.priority === 'CRITICAL' ? 'bg-rose-600/30 text-rose-300' : 'bg-blue-600/30 text-blue-300'
                  }`}>
                    {unit.currentAssignment.priority}
                  </span>
                </div>
                <p className="text-slate-300 text-[11px] leading-relaxed mb-2">
                  {unit.currentAssignment.description}
                </p>
                <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 border-t border-slate-800 pt-1.5">
                  <div>Target: <strong className="text-slate-200">{unit.currentAssignment.junctionName}</strong></div>
                  <div>Dispatched By: <span className="text-slate-300">{unit.currentAssignment.dispatchedBy}</span></div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onOpenDispatch(unit)}
                  className="flex-1 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg flex items-center justify-center gap-1 transition-colors"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  Re-route Unit
                </button>
                <button
                  onClick={() => handleStatusClick('AVAILABLE')}
                  className="py-1.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold transition-colors"
                >
                  Clear Task
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-slate-400">
              <p className="text-xs">Unit is on routine standby patrol</p>
              <button
                onClick={() => onOpenDispatch(unit)}
                className="mt-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-semibold flex items-center justify-center gap-1.5 mx-auto transition-colors"
              >
                <Navigation className="w-3.5 h-3.5" />
                Assign to Nagpur Junction
              </button>
            </div>
          )}
        </div>

        {/* Live Telemetry & GPS Coordinates */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-3">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
            Live GPS & Vehicle Telemetry
          </span>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-mono">Current Location</span>
              <span className="font-bold text-slate-100">{unit.location.nearestJunctionName}</span>
              <span className="text-[10px] font-mono text-slate-500 block truncate">
                {unit.location.latitude.toFixed(5)}, {unit.location.longitude.toFixed(5)}
              </span>
            </div>

            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-mono">Speed & Compass</span>
              <span className="font-bold text-cyan-400 text-sm flex items-center gap-1">
                <Zap className="w-3.5 h-3.5" />
                {unit.telemetry.speedKmH} km/h
              </span>
              <span className="text-[10px] font-mono text-slate-400 block">
                Heading {unit.telemetry.headingDegrees}°
              </span>
            </div>

            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-mono">Fuel / Tank Gauge</span>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex-1 bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${unit.telemetry.fuelPercentage > 40 ? 'bg-emerald-500' : 'bg-amber-500'}`}
                    style={{ width: `${unit.telemetry.fuelPercentage}%` }}
                  ></div>
                </div>
                <span className="font-mono text-slate-200 font-bold">{unit.telemetry.fuelPercentage}%</span>
              </div>
            </div>

            <div className="p-2 bg-slate-900 rounded border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-mono">Siren & Bodycam</span>
              <div className="flex items-center gap-2 mt-1 font-mono text-[11px]">
                <span className={`px-1.5 py-0.5 rounded ${unit.telemetry.isSirenActive ? 'bg-rose-500/30 text-rose-300 font-bold animate-pulse' : 'bg-slate-800 text-slate-400'}`}>
                  Siren: {unit.telemetry.isSirenActive ? 'ON' : 'OFF'}
                </span>
                <span className={`px-1.5 py-0.5 rounded ${unit.telemetry.bodycamActive ? 'bg-emerald-500/30 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>
                  Cam: {unit.telemetry.bodycamActive ? 'REC' : 'OFF'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Commander & Crew Details */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-blue-400" />
            Commander & Crew Profile
          </span>

          <div className="flex items-center justify-between p-2 rounded bg-slate-900 border border-slate-800">
            <div>
              <h5 className="font-bold text-slate-100">{unit.commanderName}</h5>
              <p className="text-[10px] font-mono text-slate-400">Badge ID: {unit.commanderBadge} • {unit.crewCount} Officers Total</p>
            </div>
            <div className="flex items-center gap-1 text-slate-300 font-mono text-xs">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span>{unit.commanderPhone}</span>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 px-1">
            <span className="flex items-center gap-1">
              <Radio className="w-3 h-3 text-cyan-400" />
              {unit.telemetry.radioChannel}
            </span>
            <span>GPS Ping: Just now</span>
          </div>
        </div>

        {/* Equipment Loadout */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2">
          <span className="font-semibold text-slate-300 uppercase tracking-wider text-[10px] font-mono flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Onboard Tactical Equipment
          </span>

          <div className="flex flex-wrap gap-1.5">
            {unit.equipment.map((item, i) => (
              <span
                key={i}
                className="px-2 py-1 bg-slate-900 text-slate-300 rounded border border-slate-800 text-[11px] flex items-center gap-1"
              >
                <CheckCircle className="w-3 h-3 text-emerald-400" />
                {item}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { PoliceUnit, UnitAssignment, PriorityLevel } from '../types/police';
import { NAGPUR_JUNCTIONS, NagpurJunction } from '../data/nagpurJunctions';
import { calculateHaversineDistanceKm, estimateEtaMinutes } from '../utils/geoUtils';
import { Navigation, AlertTriangle, Shield, Clock, MapPin, CheckCircle, X, Siren, Zap } from 'lucide-react';
import { soundFX } from '../services/audioEffects';

interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  units: PoliceUnit[];
  initialSelectedUnit: PoliceUnit | null;
  initialSelectedJunction: NagpurJunction | null;
  onConfirmDispatch: (unitId: string, assignment: Partial<UnitAssignment>) => void;
}

const INCIDENT_TYPES: Array<UnitAssignment['incidentType']> = [
  'Road Accident (112 Call)',
  'Traffic Congestion Control',
  'Hit & Run Response',
  'Nakabandi & Vehicle Check',
  'VIP Escort Route Clearing',
  'Law & Order / Public Crowd',
  'Women Safety Response',
  'Routine Area Beat Patrol'
];

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  units,
  initialSelectedUnit,
  initialSelectedJunction,
  onConfirmDispatch
}) => {
  const [selectedJunctionId, setSelectedJunctionId] = useState<number>(
    initialSelectedJunction?.id || NAGPUR_JUNCTIONS[0].id
  );
  const [selectedUnitId, setSelectedUnitId] = useState<string>(
    initialSelectedUnit?.id || (units.find((u) => u.availability === 'AVAILABLE')?.id || units[0]?.id || '')
  );
  const [incidentType, setIncidentType] = useState<UnitAssignment['incidentType']>(
    'Road Accident (112 Call)'
  );
  const [priority, setPriority] = useState<PriorityLevel>('HIGH');
  const [customTitle, setCustomTitle] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [dispatcherName, setDispatcherName] = useState<string>('Nagpur Police Control Room #01');

  // Selected target junction object
  const currentJunction = useMemo(() => {
    return NAGPUR_JUNCTIONS.find((j) => j.id === Number(selectedJunctionId)) || NAGPUR_JUNCTIONS[0];
  }, [selectedJunctionId]);

  // Rank units by distance to the selected junction
  const rankedUnits = useMemo(() => {
    return units
      .map((unit) => {
        const distanceKm = calculateHaversineDistanceKm(
          unit.location.latitude,
          unit.location.longitude,
          currentJunction.latitude,
          currentJunction.longitude
        );
        const etaMin = estimateEtaMinutes(distanceKm, unit.availability === 'AVAILABLE' ? 45 : 35);
        return {
          unit,
          distanceKm,
          etaMin
        };
      })
      .sort((a, b) => {
        // prioritize available units first, then distance
        if (a.unit.availability === 'AVAILABLE' && b.unit.availability !== 'AVAILABLE') return -1;
        if (a.unit.availability !== 'AVAILABLE' && b.unit.availability === 'AVAILABLE') return 1;
        return a.distanceKm - b.distanceKm;
      });
  }, [units, currentJunction]);

  const selectedUnitDetails = useMemo(() => {
    return units.find((u) => u.id === selectedUnitId);
  }, [units, selectedUnitId]);

  const selectedRanked = useMemo(() => {
    return rankedUnits.find((r) => r.unit.id === selectedUnitId);
  }, [rankedUnits, selectedUnitId]);

  // Pre-fill titles
  const handleIncidentTypeChange = (type: UnitAssignment['incidentType']) => {
    setIncidentType(type);
    if (!customTitle || customTitle.includes('Dispatch') || customTitle.includes('Incident')) {
      setCustomTitle(`${type} at ${currentJunction.name}`);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;

    soundFX.playDispatchChime();

    const title = customTitle.trim() || `${incidentType} at ${currentJunction.name}`;
    const desc = description.trim() || `Priority dispatch to ${currentJunction.name}. Verify intersection status and secure perimeter.`;

    onConfirmDispatch(selectedUnitId, {
      assignmentTitle: title,
      incidentType,
      priority,
      junctionId: currentJunction.id,
      junctionName: currentJunction.name,
      etaMinutes: selectedRanked?.etaMin || 3,
      description: desc,
      dispatchedBy: dispatcherName
    });

    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Siren className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white font-mono">
                Nagpur Unit Dispatch Command
              </h3>
              <p className="text-xs text-slate-400">
                Direct tactical assignment & emergency response protocol
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Target Junction Selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                Target Nagpur Junction ({NAGPUR_JUNCTIONS.length} available)
              </span>
              <span className="text-[11px] font-mono text-slate-400">
                {currentJunction.zone} • {currentJunction.type}
              </span>
            </label>
            <select
              id="select-dispatch-junction"
              value={selectedJunctionId}
              onChange={(e) => {
                setSelectedJunctionId(Number(e.target.value));
              }}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            >
              {NAGPUR_JUNCTIONS.map((junc) => (
                <option key={junc.id} value={junc.id}>
                  #{junc.id} - {junc.name} ({junc.zone.split(' - ')[0]}) • Traffic: {junc.trafficCongestion}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Recommendation Matrix based on Haversine Distance */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                Select Police Unit (Sorted by Proximity to {currentJunction.name})
              </span>
              <span className="text-[11px] font-mono text-cyan-400">
                {rankedUnits.filter((r) => r.unit.availability === 'AVAILABLE').length} Units Ready
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1 bg-slate-950/70 rounded-lg border border-slate-800">
              {rankedUnits.map(({ unit, distanceKm, etaMin }, idx) => {
                const isSelected = unit.id === selectedUnitId;
                const isAvailable = unit.availability === 'AVAILABLE';
                return (
                  <div
                    key={unit.id}
                    onClick={() => setSelectedUnitId(unit.id)}
                    className={`p-2 rounded-lg cursor-pointer transition-all border flex items-center justify-between gap-2 ${
                      isSelected
                        ? 'bg-blue-900/40 border-cyan-400 ring-1 ring-cyan-500/50 shadow-md'
                        : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-xs shrink-0">
                        {unit.unitType === 'Beat Marshal (Bike)' ? '🏍️' : unit.unitType === 'QRT SWAT Unit' ? '🛡️' : '🚔'}
                      </div>
                      <div className="truncate">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-100 truncate">{unit.callSign.split(' ')[0]}</span>
                          {idx === 0 && (
                            <span className="text-[9px] font-bold bg-emerald-500/20 text-emerald-300 px-1 rounded">
                              NEAREST
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 truncate">
                          Near: {unit.location.nearestJunctionName}
                        </p>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs font-semibold text-cyan-300">
                        {distanceKm} km
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        ETA ~{etaMin}m
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Incident Type & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Incident Category
              </label>
              <select
                id="select-incident-type"
                value={incidentType}
                onChange={(e) => handleIncidentTypeChange(e.target.value as UnitAssignment['incidentType'])}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
              >
                {INCIDENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Priority Level
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['ROUTINE', 'MEDIUM', 'HIGH', 'CRITICAL'] as PriorityLevel[]).map((p) => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`py-2 text-[10px] font-bold font-mono rounded border transition-all ${
                      priority === p
                        ? p === 'CRITICAL'
                          ? 'bg-rose-600 text-white border-rose-400'
                          : p === 'HIGH'
                          ? 'bg-amber-600 text-white border-amber-400'
                          : 'bg-blue-600 text-white border-blue-400'
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment Title & Notes */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Assignment Directive / Title
            </label>
            <input
              id="input-assignment-title"
              type="text"
              placeholder={`e.g. Emergency response to ${currentJunction.name}`}
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Tactical Instructions & Description
            </label>
            <textarea
              id="textarea-dispatch-notes"
              rows={2}
              placeholder="Enter special instructions (e.g. coordinate with traffic wardens, setup perimeter barricades, clear corridor)..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-slate-100 text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none"
            />
          </div>

          {/* Summary Preview */}
          {selectedUnitDetails && selectedRanked && (
            <div className="p-3 bg-blue-950/40 rounded-xl border border-blue-800/60 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-400" />
                <div>
                  <span className="text-slate-200 font-semibold">
                    Dispatching {selectedUnitDetails.callSign}
                  </span>
                  <p className="text-[11px] text-slate-400">
                    Commander: {selectedUnitDetails.commanderName} • {selectedRanked.distanceKm} km from {currentJunction.name}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <span className="font-mono text-cyan-300 font-bold text-sm">
                  ~{selectedRanked.etaMin} min ETA
                </span>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              id="btn-confirm-dispatch-submit"
              type="submit"
              disabled={!selectedUnitId}
              className="px-5 py-2 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 disabled:opacity-50 text-white font-bold rounded-lg shadow-lg flex items-center gap-1.5 transition-all"
            >
              <Navigation className="w-4 h-4" />
              Issue Tactical Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

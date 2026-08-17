import React, { useState, useEffect } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { NAGPUR_JUNCTIONS } from '../../data/nagpurJunctions';
import { calculateUnitRoute } from '../../services/api/routing';
import { Shield, Navigation, AlertTriangle, Clock, MapPin, X, CheckCircle2 } from 'lucide-react';

export const DispatchModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  initialUnitId?: string;
  initialJunctionId?: number;
}> = ({ isOpen, onClose, initialUnitId, initialJunctionId }) => {
  const { units, dispatchUnit } = useNagpurPulseStore();

  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || units[0]?.id || '');
  const [selectedJunctionId, setSelectedJunctionId] = useState<number>(initialJunctionId || 1);
  const [incidentType, setIncidentType] = useState<string>('Road Accident (112 Call)');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');
  
  const [calculatingRoute, setCalculatingRoute] = useState<boolean>(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(3.2);
  const [routeEtaMinutes, setRouteEtaMinutes] = useState<number>(5);

  useEffect(() => {
    if (initialUnitId) setSelectedUnitId(initialUnitId);
    if (initialJunctionId) setSelectedJunctionId(initialJunctionId);
  }, [initialUnitId, initialJunctionId]);

  // Calculate route distance & ETA whenever unit or junction selection changes
  useEffect(() => {
    if (!selectedUnitId || !selectedJunctionId) return;

    let isMounted = true;
    setCalculatingRoute(true);

    calculateUnitRoute(selectedUnitId, selectedJunctionId).then((res) => {
      if (!isMounted) return;
      setCalculatingRoute(false);
      if (res.route) {
        setRouteDistanceKm(res.route.distanceKm);
        setRouteEtaMinutes(res.route.estimatedTimeMinutes);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [selectedUnitId, selectedJunctionId]);

  if (!isOpen) return null;

  const targetJunction = NAGPUR_JUNCTIONS.find((j) => j.id === selectedJunctionId) || NAGPUR_JUNCTIONS[0];
  const selectedUnit = units.find((u) => u.id === selectedUnitId);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;

    await dispatchUnit(selectedUnitId, selectedJunctionId, targetJunction.name, incidentType, priority);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative font-sans text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Navigation className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base">Nagpur Police Smart Dispatch</h2>
            <p className="text-xs text-slate-400 font-mono">Backend Routing & Response Calculator</p>
          </div>
        </div>

        <form onSubmit={handleConfirm} className="space-y-4 text-xs font-mono">
          {/* Target Junction Selection */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Target Destination Chowk</label>
            <select
              value={selectedJunctionId}
              onChange={(e) => setSelectedJunctionId(Number(e.target.value))}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
            >
              {NAGPUR_JUNCTIONS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} ({j.zone}) — Priority: {j.priorityLevel}
                </option>
              ))}
            </select>
          </div>

          {/* Unit Roster Selection */}
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Assigned Response Unit</label>
            <select
              value={selectedUnitId}
              onChange={(e) => setSelectedUnitId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.callSign} [{u.availability}] — Near {u.location.nearestJunctionName}
                </option>
              ))}
            </select>
          </div>

          {/* Incident Type & Priority */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Incident Classification</label>
              <select
                value={incidentType}
                onChange={(e) => setIncidentType(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
              >
                <option value="Road Accident (112 Call)">Road Accident (112 Call)</option>
                <option value="Traffic Congestion Control">Traffic Congestion Control</option>
                <option value="Hit & Run Response">Hit & Run Response</option>
                <option value="VIP Escort Duty">VIP Escort Duty</option>
                <option value="Law & Order Crowd">Law & Order Crowd</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Priority Code</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
              >
                <option value="CRITICAL">CODE 3 (CRITICAL)</option>
                <option value="HIGH">CODE 2 (HIGH)</option>
                <option value="MEDIUM">CODE 1 (MEDIUM)</option>
                <option value="LOW">ROUTINE (LOW)</option>
              </select>
            </div>
          </div>

          {/* Computed Route & ETA Telemetry Box */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 flex items-center justify-between">
            <div>
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Backend Routing Telemetry</span>
              <div className="text-sm font-bold text-sky-400 mt-0.5">
                {calculatingRoute ? 'Computing API Route...' : `${routeDistanceKm} km • ETA ${routeEtaMinutes} mins`}
              </div>
            </div>
            <div className="w-9 h-9 rounded-lg bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={calculatingRoute}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30 flex items-center gap-1.5"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm Dispatch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

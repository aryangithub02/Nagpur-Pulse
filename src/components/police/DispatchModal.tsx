import React, { useState, useEffect } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { useAuth } from '../../store/authContext';
import { isJunctionInZone } from '../../utils/geoUtils';
import { NAGPUR_JUNCTIONS } from '../../data/nagpurJunctions';
import { calculateUnitRoute } from '../../services/api/routing';
import { submitDecision, submitInlineDecision } from '../../services/api/decisions';
import {
  Shield,
  Navigation,
  AlertTriangle,
  Clock,
  MapPin,
  X,
  CheckCircle2,
  XCircle,
  Edit3,
  UserCheck,
  Check,
  FileText,
  Activity,
} from 'lucide-react';

export interface DispatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialUnitId?: string;
  initialJunctionId?: number;
  recommendationId?: string;   // AI Recommendation DB ID for audit trail
  recommendationReason?: string;
  onApprove?: (dispatchDetails: any) => void;
  onReject?: (reason: string) => void;
  onModify?: (modifiedDetails: any) => void;
}

export const DispatchModal: React.FC<DispatchModalProps> = ({
  isOpen,
  onClose,
  initialUnitId,
  initialJunctionId,
  recommendationId,
  recommendationReason,
  onApprove,
  onReject,
  onModify,
}) => {
  const { units, dispatchUnit, addNotification } = useNagpurPulseStore() as any;
  const { user, activeZone } = useAuth();

  const [selectedUnitId, setSelectedUnitId] = useState<string>(initialUnitId || units[0]?.id || '');
  const [selectedJunctionId, setSelectedJunctionId] = useState<number>(initialJunctionId || 1);
  const [incidentType, setIncidentType] = useState<string>('Road Accident (112 Call)');
  const [priority, setPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'>('HIGH');

  // HITL Mode state: 'DECISION' | 'MODIFY_FORM' | 'REJECT_REASON' | 'AUDIT_CONFIRM'
  const [hitlMode, setHitlMode] = useState<'DECISION' | 'MODIFY_FORM' | 'REJECT_REASON' | 'AUDIT_CONFIRM'>('DECISION');
  const [rejectionReason, setRejectionReason] = useState<string>('LOCAL_OPERATIONAL_CONDITION');
  const [customRejectNote, setCustomRejectNote] = useState<string>('');
  const [controllerNotes, setControllerNotes] = useState<string>('');

  // Audit trail state
  const [submittingDecision, setSubmittingDecision] = useState<boolean>(false);
  const [auditRecord, setAuditRecord] = useState<any>(null);
  const [auditError, setAuditError] = useState<string | null>(null);

  const [calculatingRoute, setCalculatingRoute] = useState<boolean>(false);
  const [routeDistanceKm, setRouteDistanceKm] = useState<number>(3.2);
  const [routeEtaMinutes, setRouteEtaMinutes] = useState<number>(5);

  useEffect(() => {
    if (initialUnitId) setSelectedUnitId(initialUnitId);
    if (initialJunctionId) setSelectedJunctionId(initialJunctionId);
    setHitlMode('DECISION');
  }, [initialUnitId, initialJunctionId, isOpen]);

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

  const currentZone = user?.role === 'ZONE_ADMIN' ? user.zone : activeZone;
  const availableJunctions = NAGPUR_JUNCTIONS.filter((j) => isJunctionInZone(j.zone, currentZone));
  const targetJunction = availableJunctions.find((j) => j.id === selectedJunctionId) || availableJunctions[0] || NAGPUR_JUNCTIONS[0];
  const selectedUnit = units.find((u: any) => u.id === selectedUnitId) || units[0];

  // Helper: post decision to backend audit trail
  const postDecisionAudit = async (
    action: 'ACCEPT' | 'MODIFY' | 'REJECT',
    opts?: { selected_unit_id?: string; reason_code?: string; comment?: string }
  ) => {
    setSubmittingDecision(true);
    setAuditError(null);
    try {
      let rec;
      if (recommendationId) {
        rec = await submitDecision(recommendationId, {
          action,
          selected_unit_id: opts?.selected_unit_id,
          reason_code: opts?.reason_code,
          comment: opts?.comment,
        });
      } else {
        rec = await submitInlineDecision({
          unit_id: selectedUnitId || 'PU001',
          location_id: selectedJunctionId,
          location_name: targetJunction.name,
          reason: recommendationReason || incidentType || 'PATROL_ASSIGNMENT',
          priority,
          eta_minutes: routeEtaMinutes,
          distance_km: routeDistanceKm,
          action,
          selected_unit_id: opts?.selected_unit_id,
          reason_code: opts?.reason_code || (action === 'MODIFY' ? 'LOCAL_OPERATIONAL_CONDITION' : undefined),
          comment: opts?.comment,
        });
      }
      setAuditRecord(rec);
      return rec;
    } catch (err: any) {
      const msg = err?.message || 'Audit record could not be saved.';
      setAuditError(msg);
      console.warn('[HITL Audit] Decision record failed:', msg);
      return null;
    } finally {
      setSubmittingDecision(false);
    }
  };

  // 1. APPROVE ACTION
  const handleApprove = async () => {
    if (!selectedUnitId) return;

    await dispatchUnit(selectedUnitId, selectedJunctionId, targetJunction.name, incidentType, priority);
    const rec = await postDecisionAudit('ACCEPT', { selected_unit_id: selectedUnitId });

    const officerName = user?.username || user?.name || 'Officer';
    if (addNotification) {
      addNotification({
        title: 'Dispatch APPROVED — Decision Recorded',
        message: `Controller ${officerName} ACCEPTED dispatch of ${selectedUnit?.callSign || selectedUnitId} to ${targetJunction.name}${rec ? ` [${rec.decision_id}]` : ''}`,
        type: 'success',
      });
    }

    if (onApprove) {
      onApprove({
        unitId: selectedUnitId,
        junctionId: selectedJunctionId,
        junctionName: targetJunction.name,
        incidentType,
        priority,
        controller: officerName,
        decisionId: rec?.decision_id,
      });
    }

    // Show audit confirm screen briefly, then auto-close
    if (rec) {
      setHitlMode('AUDIT_CONFIRM');
      setTimeout(onClose, 3500);
    } else {
      onClose();
    }
  };

  // 2. REJECT ACTION
  const handleConfirmReject = async () => {
    const officerName = user?.username || user?.name || 'Officer';
    const finalComment = customRejectNote.trim() || undefined;
    const rec = await postDecisionAudit('REJECT', {
      reason_code: rejectionReason,
      comment: finalComment,
    });

    if (addNotification) {
      addNotification({
        title: 'Dispatch REJECTED — Decision Recorded',
        message: `Controller ${officerName} REJECTED dispatch of ${selectedUnit?.callSign || selectedUnitId}. Reason: ${rejectionReason}${rec ? ` [${rec.decision_id}]` : ''}`,
        type: 'warning',
      });
    }

    if (onReject) {
      onReject(rejectionReason);
    }

    if (rec) {
      setHitlMode('AUDIT_CONFIRM');
      setTimeout(onClose, 3500);
    } else {
      onClose();
    }
  };

  // 3. MODIFY & CONFIRM ACTION
  const handleConfirmModify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUnitId) return;

    await dispatchUnit(selectedUnitId, selectedJunctionId, targetJunction.name, incidentType, priority);
    const rec = await postDecisionAudit('MODIFY', {
      selected_unit_id: selectedUnitId,
      reason_code: 'LOCAL_OPERATIONAL_CONDITION',
      comment: controllerNotes.trim() || 'Controller modified dispatch parameters.',
    });

    const officerName = user?.username || user?.name || 'Officer';
    if (addNotification) {
      addNotification({
        title: 'Dispatch MODIFIED — Decision Recorded',
        message: `Controller ${officerName} MODIFIED dispatch: Unit ${selectedUnit?.callSign || selectedUnitId} → ${targetJunction.name} (${priority})${rec ? ` [${rec.decision_id}]` : ''}`,
        type: 'info',
      });
    }

    if (onModify) {
      onModify({
        unitId: selectedUnitId,
        junctionId: selectedJunctionId,
        junctionName: targetJunction.name,
        incidentType,
        priority,
        notes: controllerNotes,
        controller: officerName,
        decisionId: rec?.decision_id,
      });
    }

    if (rec) {
      setHitlMode('AUDIT_CONFIRM');
      setTimeout(onClose, 3500);
    } else {
      onClose();
    }
  };

  const currentOfficerName = user?.username || user?.name || 'Officer';
  const currentOfficerRole = user?.role || 'SYSTEM_ADMIN';

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0c0e1a] border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative font-sans text-slate-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400 shrink-0">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-slate-100">Human Controller Dispatch Review</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                HITL ACTIVE
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Controller: <strong className="text-slate-200">{currentOfficerName} ({currentOfficerRole})</strong>
            </p>
          </div>
        </div>

        {/* PROPOSED DISPATCH TELEMETRY SUMMARY BOX */}
        <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2 font-mono text-xs mb-4">
          <div className="flex items-center justify-between text-[10px] text-amber-400 font-bold uppercase tracking-wider">
            <span>Proposed Dispatch Recommendation</span>
            <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-300 rounded border border-amber-500/30">
              {priority} CODE
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1 text-slate-200">
            <div>
              <span className="text-slate-500 block text-[10px]">Proposed Unit:</span>
              <strong className="text-indigo-300 text-sm">{selectedUnit?.callSign || selectedUnitId}</strong>
            </div>
            <div>
              <span className="text-slate-500 block text-[10px]">Target Chowk:</span>
              <strong className="text-white text-sm">{targetJunction.name}</strong>
            </div>
          </div>

          {recommendationReason && (
            <div className="text-[11px] text-slate-400 border-t border-slate-900 pt-1.5 flex items-center gap-1">
              <span className="text-indigo-400 font-bold">Reason:</span>
              <span>{recommendationReason}</span>
            </div>
          )}

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400 border-t border-slate-900">
            <span className="flex items-center gap-1">
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              Distance: <strong className="text-slate-200">{routeDistanceKm} km</strong>
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              ETA: <strong className="text-emerald-300">{routeEtaMinutes} mins</strong>
            </span>
          </div>
        </div>

        {/* ----------------------------------------------------------------------- */}
        {/* MODE 1: 3-OPTION DECISION BAR (APPROVE / REJECT / MODIFY) */}
        {/* ----------------------------------------------------------------------- */}
        {hitlMode === 'DECISION' && (
          <div className="space-y-3 font-mono">
            <p className="text-xs text-slate-300 text-center font-semibold">
              Select Human Controller Decision for this Deployment:
            </p>

            <div className="grid grid-cols-3 gap-2">
              {/* Option 1: APPROVE */}
              <button
                type="button"
                onClick={handleApprove}
                disabled={calculatingRoute}
                className="py-3 px-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-lg shadow-emerald-600/20 border border-emerald-400/40"
              >
                <CheckCircle2 className="w-5 h-5" />
                <span>1. APPROVE</span>
                <span className="text-[9px] text-emerald-100 font-normal">Execute Dispatch</span>
              </button>

              {/* Option 2: REJECT */}
              <button
                type="button"
                onClick={() => setHitlMode('REJECT_REASON')}
                className="py-3 px-2 rounded-xl bg-rose-950 hover:bg-rose-900 text-rose-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-lg border border-rose-500/40"
              >
                <XCircle className="w-5 h-5 text-rose-400" />
                <span>2. REJECT</span>
                <span className="text-[9px] text-rose-300/80 font-normal">Dismiss Request</span>
              </button>

              {/* Option 3: MODIFY */}
              <button
                type="button"
                onClick={() => setHitlMode('MODIFY_FORM')}
                className="py-3 px-2 rounded-xl bg-amber-950 hover:bg-amber-900 text-amber-200 font-bold text-xs flex flex-col items-center justify-center gap-1 transition active:scale-95 shadow-lg border border-amber-500/40"
              >
                <Edit3 className="w-5 h-5 text-amber-400" />
                <span>3. MODIFY</span>
                <span className="text-[9px] text-amber-300/80 font-normal">Alter Parameters</span>
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* MODE 2: REJECT REASON SELECTOR */}
        {/* ----------------------------------------------------------------------- */}
        {hitlMode === 'REJECT_REASON' && (
          <div className="space-y-3 font-mono text-xs">
            <div className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <XCircle className="w-4 h-4 text-rose-500" />
              <span>Specify Rejection Reason</span>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Standard Rejection Category</label>
              <select
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-rose-500"
              >
                <option value="Unit assigned to higher priority event">Unit assigned to higher priority event</option>
                <option value="Local officer handling event locally">Local officer handling event locally</option>
                <option value="False alarm / Event already resolved">False alarm / Event already resolved</option>
                <option value="Heavy traffic bottleneck along response route">Heavy traffic bottleneck along response route</option>
                <option value="VIP escort / Control room priority override">VIP escort / Control room priority override</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Custom Notes (Optional)</label>
              <input
                type="text"
                placeholder="Enter additional officer notes.."
                value={customRejectNote}
                onChange={(e) => setCustomRejectNote(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-rose-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHitlMode('DECISION')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-semibold rounded-xl shadow-lg shadow-rose-600/30 flex items-center gap-1.5"
              >
                <XCircle className="w-4 h-4" />
                <span>Confirm Rejection</span>
              </button>
            </div>
          </div>
        )}

        {/* ----------------------------------------------------------------------- */}
        {/* MODE 3: INTERACTIVE MODIFY PARAMETERS FORM */}
        {/* ----------------------------------------------------------------------- */}
        {hitlMode === 'MODIFY_FORM' && (
          <form onSubmit={handleConfirmModify} className="space-y-3 text-xs font-mono">
            <div className="text-xs font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-800 pb-2">
              <Edit3 className="w-4 h-4 text-amber-500" />
              <span>Modify Dispatch Parameters</span>
            </div>

            {/* Target Junction Selection */}
            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Target Destination Chowk</label>
              <select
                value={selectedJunctionId}
                onChange={(e) => setSelectedJunctionId(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-amber-500"
              >
                {availableJunctions.map((j) => (
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
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-amber-500"
              >
                {units.map((u: any) => (
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
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-amber-500"
                >
                  <option value="Road Accident (112 Call)">Road Accident (112 Call)</option>
                  <option value="Traffic Congestion Control">Traffic Congestion Control</option>
                  <option value="Hit & Run Response">Hit & Run Response</option>
                  <option value="Waterlogging Traffic Triage">Waterlogging Traffic Triage</option>
                  <option value="VIP Escort Duty">VIP Escort Duty</option>
                  <option value="Law & Order Crowd">Law & Order Crowd</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Priority Code</label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-amber-500"
                >
                  <option value="CRITICAL">CODE 3 (CRITICAL)</option>
                  <option value="HIGH">CODE 2 (HIGH)</option>
                  <option value="MEDIUM">CODE 1 (MEDIUM)</option>
                  <option value="LOW">ROUTINE (LOW)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] mb-1">Controller Override Notes</label>
              <input
                type="text"
                placeholder="Specify reason for modifying dispatch parameters.."
                value={controllerNotes}
                onChange={(e) => setControllerNotes(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHitlMode('DECISION')}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={calculatingRoute}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 font-extrabold rounded-xl shadow-lg shadow-amber-600/30 flex items-center gap-1.5 transition"
              >
                <Check className="w-4 h-4" />
                <span>Confirm Modified Dispatch</span>
              </button>
            </div>
          </form>
        )}

        {/* ----------------------------------------------------------------- */}
        {/* MODE 4: AUDIT CONFIRMATION SCREEN                                  */}
        {/* ----------------------------------------------------------------- */}
        {hitlMode === 'AUDIT_CONFIRM' && auditRecord && (
          <div className="space-y-3 font-mono text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold border-b border-slate-800 pb-2">
              <Activity className="w-4 h-4" />
              <span>DECISION RECORDED — AUDIT EVENT EMITTED</span>
            </div>

            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Decision ID</span>
                  <span className="text-emerald-300 font-bold">{auditRecord.decision_id}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Action</span>
                  <span className={`font-extrabold ${
                    auditRecord.action === 'ACCEPT' ? 'text-emerald-400' :
                    auditRecord.action === 'MODIFY' ? 'text-amber-400' : 'text-rose-400'
                  }`}>{auditRecord.action}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Controller</span>
                  <span className="text-slate-200">{auditRecord.operator?.username}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Dispatch</span>
                  <span className={auditRecord.dispatch?.status === 'DISPATCHED' ? 'text-emerald-400' : 'text-slate-400'}>
                    {auditRecord.dispatch?.status}
                  </span>
                </div>
              </div>
              <div className="border-t border-slate-800 pt-2 text-[10px] text-slate-500">
                <span>Immutable audit trail entry created at {new Date(auditRecord.created_at).toLocaleTimeString()}</span>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 text-center flex items-center justify-center gap-1">
              <FileText className="w-3 h-3" />
              Closing in 3 seconds...
            </p>
          </div>
        )}

        {auditError && (
          <div className="mt-2 text-[11px] text-amber-400 font-mono flex items-center gap-1.5 bg-amber-950/30 border border-amber-500/20 rounded-lg px-3 py-1.5">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            Audit record failed (non-blocking): {auditError}
          </div>
        )}
      </div>
    </div>
  );
};

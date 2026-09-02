import React, { useState, useEffect } from 'react';
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  Navigation,
  Activity,
  Layers,
  FileCheck2,
  ChevronRight,
  Info,
  Check,
  X,
  Lock,
  Radio,
  Cpu,
  RefreshCw,
} from 'lucide-react';
import {
  DecisionEvidenceRecord,
  evaluateRecommendation,
  submitCommanderReviewDecision,
  AssuranceStatus,
} from '../../services/api/decisionReview';

export interface DecisionReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  recommendationId?: string;
  incidentId?: string;
  locationId?: number;
  locationName?: string;
  recommendedUnitId?: string;
  incidentSeverity?: number;
  onDecisionComplete?: (record: DecisionEvidenceRecord) => void;
}

export const DecisionReviewModal: React.FC<DecisionReviewModalProps> = ({
  isOpen,
  onClose,
  recommendationId,
  incidentId,
  locationId,
  locationName,
  recommendedUnitId,
  incidentSeverity = 82,
  onDecisionComplete,
}) => {
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [record, setRecord] = useState<DecisionEvidenceRecord | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Commander action state
  const [activeTab, setActiveTab] = useState<'REVIEW' | 'MODIFY' | 'REJECT' | 'EVIDENCE'>('REVIEW');
  const [selectedAltUnitId, setSelectedAltUnitId] = useState<string>('');
  const [reasonCode, setReasonCode] = useState<string>('LOCAL_INTELLIGENCE');
  const [commanderNotes, setCommanderNotes] = useState<string>('');

  // Initial evaluation fetch
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setLoading(true);
    setError(null);

    evaluateRecommendation({
      recommendation_id: recommendationId,
      incident_id: incidentId,
      location_id: locationId || 1,
      location_name: locationName || 'Sitabuldi Interchange',
      recommended_unit_id: recommendedUnitId || 'P17',
      incident_severity: incidentSeverity,
      incident_type: 'Severe Traffic / Accident Incident',
    })
      .then((evalData) => {
        if (isMounted) {
          if (evalData) {
            setRecord(evalData);
            if (evalData.alternatives && evalData.alternatives.length > 0) {
              setSelectedAltUnitId(evalData.alternatives[0].unit_id);
            }
          } else {
            setError('Failed to evaluate decision assurance benchmarks: No data returned.');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to evaluate decision assurance benchmarks.');
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, recommendationId, incidentId, locationId, locationName, recommendedUnitId, incidentSeverity]);

  if (!isOpen) return null;

  const handleAction = async (action: 'APPROVE' | 'MODIFY' | 'REJECT') => {
    if (!record) return;
    setSubmitting(true);
    setError(null);

    try {
      const updated = await submitCommanderReviewDecision(record.decision_id, {
        action,
        selected_unit_id: action === 'MODIFY' ? selectedAltUnitId : undefined,
        reason_code: action !== 'APPROVE' ? reasonCode : undefined,
        comment: commanderNotes || undefined,
      });
      setRecord(updated);
      setSubmitting(false);
      if (onDecisionComplete) {
        onDecisionComplete(updated);
      }
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err: any) {
      setError(err.message || 'Failed to submit commander decision.');
      setSubmitting(false);
    }
  };

  const getAssuranceBadge = (status: AssuranceStatus) => {
    switch (status) {
      case 'ASSURED':
        return {
          bg: 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
          label: 'ASSURED',
        };
      case 'REVIEW REQUIRED':
        return {
          bg: 'bg-amber-500/10 border-amber-500/40 text-amber-400',
          icon: <ShieldAlert className="w-5 h-5 text-amber-400" />,
          label: 'REVIEW REQUIRED',
        };
      case 'LOW ASSURANCE':
        return {
          bg: 'bg-orange-500/10 border-orange-500/40 text-orange-400',
          icon: <ShieldAlert className="w-5 h-5 text-orange-400" />,
          label: 'LOW ASSURANCE',
        };
      case 'BLOCKED':
      default:
        return {
          bg: 'bg-rose-500/10 border-rose-500/40 text-rose-400',
          icon: <ShieldX className="w-5 h-5 text-rose-400" />,
          label: 'BLOCKED',
        };
    }
  };

  const badge = record ? getAssuranceBadge(record.assurance_status) : getAssuranceBadge('REVIEW REQUIRED');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Top Operational Header */}
        <header className="p-4 sm:p-5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  DECISION REVIEW ENGINE
                </h2>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-950 text-blue-300 border border-blue-800">
                  HITL V3.0
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Operational Assurance & Multi-Criteria Benchmark Verification for Police Commander
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {record && (
              <div className={`px-3 py-1.5 rounded-xl border flex items-center gap-2 font-mono text-xs font-bold ${badge.bg}`}>
                {badge.icon}
                <span>{badge.label}</span>
              </div>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </header>

        {/* Loading / Error States */}
        {loading && (
          <div className="p-12 flex flex-col items-center justify-center gap-4 text-center">
            <RefreshCw className="w-8 h-8 text-blue-400 animate-spin" />
            <p className="text-sm text-slate-300 font-mono">
              Evaluating Hard Constraints, Decision Assurance Score (DAS), and What-If Consequences...
            </p>
          </div>
        )}

        {error && (
          <div className="m-4 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Main Content Body */}
        {!loading && record && (
          <div className="p-4 sm:p-6 flex-1 overflow-y-auto space-y-5">
            {/* Top Score Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Decision Assurance</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-emerald-400">{record.final_assurance_score}</span>
                  <span className="text-xs text-slate-500">/ 100</span>
                </div>
                <span className="text-[10px] text-slate-500">DAS Benchmark</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">ML Confidence</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-blue-400">{record.ml_confidence_score}%</span>
                </div>
                <span className="text-[10px] text-slate-500">Posterior Prob Margin</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Data Reliability</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-purple-400">{record.data_reliability_score}%</span>
                </div>
                <span className="text-[10px] text-slate-500">{record.api_freshness_seconds.toFixed(0)}s API Freshness</span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">What-If Penalty</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-amber-400">-{record.what_if.penalty}</span>
                  <span className="text-xs text-slate-500">pts</span>
                </div>
                <span className="text-[10px] text-slate-500">{record.what_if.coverage_impact_pct}% Sector Cov</span>
              </div>

              <div className="col-span-2 sm:col-span-1 p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-mono text-slate-400">Incident Severity</span>
                <div className="flex items-baseline gap-1 mt-1">
                  <span className="text-2xl font-black text-rose-400">{record.ml_risk_score}</span>
                  <span className="text-xs text-slate-500">{record.ml_risk_tier}</span>
                </div>
                <span className="text-[10px] text-slate-500">{record.location_name}</span>
              </div>
            </div>

            {/* Hard Constraints Checklist Bar */}
            <div className={`p-3.5 rounded-xl border flex flex-col gap-2 ${record.hard_constraints.passed ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-rose-950/20 border-rose-500/30'}`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold font-mono">
                  {record.hard_constraints.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-400" />
                  )}
                  <span className={record.hard_constraints.passed ? 'text-emerald-300' : 'text-rose-300'}>
                    HARD CONSTRAINT AUDIT: {record.hard_constraints.passed ? 'ALL PASSED (5 OF 5)' : 'CRITICAL VIOLATION DETECTED'}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono">STEP 1 ENFORCEMENT</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-[11px] font-mono text-slate-300 pt-1 border-t border-slate-800/60">
                <span className="flex items-center gap-1.5">
                  {record.hard_constraints.unit_available ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  Unit Available
                </span>
                <span className="flex items-center gap-1.5">
                  {record.hard_constraints.capability_matched ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  Capability Matched
                </span>
                <span className="flex items-center gap-1.5">
                  {record.hard_constraints.coverage_safe ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  Coverage &gt; 60%
                </span>
                <span className="flex items-center gap-1.5">
                  {record.hard_constraints.event_compliant ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  Event Compliant
                </span>
                <span className="flex items-center gap-1.5">
                  {record.hard_constraints.data_valid ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <X className="w-3.5 h-3.5 text-rose-400" />}
                  Data &lt; 300s Fresh
                </span>
              </div>

              {!record.hard_constraints.passed && record.hard_constraints.violations.length > 0 && (
                <div className="mt-1 p-2 rounded bg-rose-950/60 border border-rose-800 text-[11px] text-rose-300">
                  <strong>Violations:</strong> {record.hard_constraints.violations.join('; ')}
                </div>
              )}
            </div>

            {/* Recommended Unit & Fast Navigation Card */}
            <div className="p-4 bg-slate-950 rounded-xl border border-blue-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                <div className="w-12 h-12 rounded-xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      Recommended: {record.recommended_unit.callsign || record.recommended_unit.unit_id}
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      RANK #1
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Estimated Travel Time: <strong className="text-white font-mono">{record.recommended_unit.eta_minutes.toFixed(1)} min</strong> ({record.recommended_unit.distance_km.toFixed(1)} km)
                  </p>
                </div>
              </div>

              <div className="text-right font-mono text-xs">
                <div className="text-slate-400">Sector Coverage Impact</div>
                <div className="text-sm font-bold text-amber-400">{record.what_if.coverage_impact_pct}%</div>
              </div>
            </div>

            {/* Multi-Unit Alternative Comparative Table (Step 6) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider font-mono flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-blue-400" />
                  Alternative Response Units (Multi-Criteria Analysis)
                </h3>
                <span className="text-[10px] text-slate-500 font-mono">Ranked by Decision Score</span>
              </div>

              <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-950">
                <table className="w-full text-left text-[11px] font-mono">
                  <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5">Unit</th>
                      <th className="p-2.5">ETA</th>
                      <th className="p-2.5">Coverage</th>
                      <th className="p-2.5">DAS Score</th>
                      <th className="p-2.5">Assurance</th>
                      <th className="p-2.5">Preference Rationale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {(record.alternatives || []).map((alt) => (
                      <tr key={alt.unit_id} className="hover:bg-slate-900/40 transition">
                        <td className="p-2.5 font-bold text-white flex items-center gap-1.5">
                          <Radio className="w-3.5 h-3.5 text-blue-400" />
                          {alt.callsign}
                        </td>
                        <td className="p-2.5">{alt.eta_minutes} min</td>
                        <td className="p-2.5 text-amber-400">{alt.coverage_impact_pct}%</td>
                        <td className="p-2.5 font-bold text-emerald-400">{alt.decision_assurance_score}</td>
                        <td className="p-2.5">
                          <span className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px]">
                            {alt.assurance_status}
                          </span>
                        </td>
                        <td className="p-2.5 text-slate-400 truncate max-w-xs">{alt.preference_reason}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Known vs Unknown Operational Intelligence (Step 7) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Known Conditions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-emerald-400 font-mono flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  KNOWN &amp; VERIFIED CONDITIONS
                </span>
                <div className="space-y-1.5">
                  {(record.known_conditions || []).map((k, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[11px]">
                      <strong className="text-white">{k.label}:</strong>{' '}
                      <span className="text-slate-400">{k.detail}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Unknown Conditions */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-col gap-2">
                <span className="text-xs font-bold text-amber-400 font-mono flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  UNKNOWN &amp; UNVERIFIED FIELD UNCERTAINTIES
                </span>
                <div className="space-y-1.5">
                  {(record.unknown_conditions || []).map((u, idx) => (
                    <div key={idx} className="p-2 rounded bg-slate-900/80 border border-slate-800/80 text-[11px]">
                      <strong className="text-amber-300">{u.label}:</strong>{' '}
                      <span className="text-slate-400">{u.detail}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Commander Decision Options Panel (Step 8) */}
            <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-200 uppercase font-mono">
                  Commander Authorization &amp; Override
                </span>
                <div className="flex gap-2">
                  <button
                    onClick={() => setActiveTab('REVIEW')}
                    className={`px-3 py-1 text-xs rounded-lg font-mono transition ${activeTab === 'REVIEW' ? 'bg-blue-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    1-Click Dispatch
                  </button>
                  <button
                    onClick={() => setActiveTab('MODIFY')}
                    className={`px-3 py-1 text-xs rounded-lg font-mono transition ${activeTab === 'MODIFY' ? 'bg-amber-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    Modify Unit
                  </button>
                  <button
                    onClick={() => setActiveTab('REJECT')}
                    className={`px-3 py-1 text-xs rounded-lg font-mono transition ${activeTab === 'REJECT' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-slate-400 hover:text-white'}`}
                  >
                    Reject Rec
                  </button>
                </div>
              </div>

              {activeTab === 'MODIFY' && (
                <div className="p-3 bg-slate-900 rounded-lg border border-amber-500/30 space-y-2 text-xs">
                  <label className="text-slate-300 font-mono block">Select Alternate Dispatched Unit:</label>
                  <select
                    value={selectedAltUnitId}
                    onChange={(e) => setSelectedAltUnitId(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  >
                    {(record.alternatives || []).map((alt) => (
                      <option key={alt.unit_id} value={alt.unit_id}>
                        {alt.callsign} — ETA: {alt.eta_minutes} min (DAS: {alt.decision_assurance_score})
                      </option>
                    ))}
                  </select>

                  <label className="text-slate-300 font-mono block pt-1">Mandatory Override Reason Code:</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  >
                    <option value="LOCAL_INTELLIGENCE">LOCAL_INTELLIGENCE — Field marshals report closer access</option>
                    <option value="EVENT_SECURITY_REQUIREMENT">EVENT_SECURITY_REQUIREMENT — Designated security corridor</option>
                    <option value="UNIT_UNAVAILABLE">UNIT_UNAVAILABLE — Unit currently engaged on high priority</option>
                    <option value="BETTER_OPERATIONAL_KNOWLEDGE">BETTER_OPERATIONAL_KNOWLEDGE — Experienced station commander override</option>
                    <option value="DATA_DISCREPANCY">DATA_DISCREPANCY — Telemetry discrepancy with radio feed</option>
                    <option value="OTHER">OTHER — Specify in operational notes</option>
                  </select>
                </div>
              )}

              {activeTab === 'REJECT' && (
                <div className="p-3 bg-slate-900 rounded-lg border border-rose-500/30 space-y-2 text-xs">
                  <label className="text-slate-300 font-mono block">Mandatory Rejection Reason Code:</label>
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value)}
                    className="w-full p-2 bg-slate-950 border border-slate-700 rounded text-white font-mono"
                  >
                    <option value="NO_LONGER_REQUIRED">NO_LONGER_REQUIRED — Incident cleared / false alarm</option>
                    <option value="INCIDENT_RESOLVED">INCIDENT_RESOLVED — Resolved by on-scene beat officer</option>
                    <option value="INSUFFICIENT_INFORMATION">INSUFFICIENT_INFORMATION — Unverified location/caller</option>
                    <option value="ALTERNATIVE_RESPONSE">ALTERNATIVE_RESPONSE — Traffic wardens dispatched</option>
                    <option value="OTHER">OTHER — Specify in operational notes</option>
                  </select>
                </div>
              )}

              {(activeTab === 'MODIFY' || activeTab === 'REJECT') && (
                <textarea
                  rows={2}
                  value={commanderNotes}
                  onChange={(e) => setCommanderNotes(e.target.value)}
                  placeholder="Optional operational notes for immutable audit log..."
                  className="w-full p-2 bg-slate-900 border border-slate-700 rounded text-xs text-white placeholder-slate-500"
                />
              )}

              {/* Action Buttons Bar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  <Lock className="w-3.5 h-3.5" />
                  <span>SHA-256 Block Hash: {record.audit_chain?.sha256_hash ? record.audit_chain.sha256_hash.substring(0, 12) : '000000000000'}...</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-xs font-mono rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 transition"
                  >
                    Cancel
                  </button>

                  {activeTab === 'REVIEW' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleAction('APPROVE')}
                      className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center gap-2 shadow-lg shadow-emerald-600/30 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      APPROVE &amp; DISPATCH ({record.recommended_unit.callsign || record.recommended_unit.unit_id})
                    </button>
                  )}

                  {activeTab === 'MODIFY' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleAction('MODIFY')}
                      className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-amber-600 hover:bg-amber-500 text-white flex items-center gap-2 shadow-lg shadow-amber-600/30 transition disabled:opacity-50"
                    >
                      <Check className="w-4 h-4" />
                      CONFIRM OVERRIDE DISPATCH ({selectedAltUnitId})
                    </button>
                  )}

                  {activeTab === 'REJECT' && (
                    <button
                      disabled={submitting}
                      onClick={() => handleAction('REJECT')}
                      className="px-5 py-2 text-xs font-mono font-bold rounded-xl bg-rose-600 hover:bg-rose-500 text-white flex items-center gap-2 shadow-lg shadow-rose-600/30 transition disabled:opacity-50"
                    >
                      <X className="w-4 h-4" />
                      CONFIRM REJECTION
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

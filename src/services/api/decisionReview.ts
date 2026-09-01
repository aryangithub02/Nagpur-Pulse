/**
 * Nagpur Pulse — Decision Review Engine API Client
 * Connects frontend Police Command Center to /api/decision-review
 */

import { apiClient } from './client';

export type AssuranceStatus = 'ASSURED' | 'REVIEW REQUIRED' | 'LOW ASSURANCE' | 'BLOCKED';

export interface DASComponents {
  incident_severity: number;
  traffic_risk: number;
  crime_risk: number;
  event_risk: number;
  unit_availability: number;
  unit_capability: number;
  eta_score: number;
  coverage_safety: number;
  resource_workload: number;
  data_reliability: number;
  prediction_stability: number;
  ml_confidence: number;
}

export interface HardConstraints {
  passed: boolean;
  unit_available: boolean;
  capability_matched: boolean;
  coverage_safe: boolean;
  event_compliant: boolean;
  data_valid: boolean;
  violations: string[];
}

export interface AlternativeUnit {
  unit_id: string;
  callsign: string;
  unit_type: string;
  eta_minutes: number;
  distance_km: number;
  capability_match_pct: number;
  coverage_impact_pct: number;
  what_if_penalty: number;
  decision_assurance_score: number;
  assurance_status: AssuranceStatus;
  preference_reason: string;
}

export interface ConditionDisclosure {
  category: string;
  label: string;
  detail: string;
  verified: boolean;
  source: string;
}

export interface DecisionEvidenceRecord {
  decision_id: string;
  incident_id?: string;
  recommendation_id?: string;
  location_id?: number;
  location_name?: string;
  model_version: string;
  input_snapshot_id: string;
  api_freshness_seconds: number;
  data_reliability_score: number;
  ml_confidence_score: number;
  ml_risk_score: number;
  ml_risk_tier: string;
  recommended_unit: {
    unit_id?: string;
    callsign?: string;
    eta_minutes: number;
    distance_km: number;
  };
  hard_constraints: HardConstraints;
  das_components: DASComponents;
  raw_das_score: number;
  what_if: {
    penalty: number;
    coverage_impact_pct: number;
    details: {
      coverage_loss_pct: number;
      secondary_risk_increase: number;
      resource_impact_pct: number;
      eta_penalty_val: number;
      calculated_penalty: number;
    };
  };
  final_assurance_score: number;
  assurance_status: AssuranceStatus;
  assurance_narrative: string;
  alternatives: AlternativeUnit[];
  known_conditions: ConditionDisclosure[];
  unknown_conditions: ConditionDisclosure[];
  commander: {
    id?: number;
    username?: string;
    role?: string;
    zone?: string;
    action: string;
    override_reason?: string;
    notes?: string;
    final_dispatched_unit_id?: string;
    decision_timestamp?: string;
  };
  outcome: {
    status?: string;
    failure_classification?: string;
    actual_response_time_minutes?: number;
    post_event_evaluation?: string;
    recorded_at?: string;
  };
  audit_chain: {
    sha256_hash: string;
    previous_hash: string;
  };
  created_at?: string;
  updated_at?: string;
}

export interface EvaluateDecisionRequest {
  recommendation_id?: string;
  incident_id?: string;
  location_id?: number;
  location_name?: string;
  recommended_unit_id?: string;
  incident_severity?: number;
  incident_type?: string;
  required_capabilities?: string[];
  min_sector_coverage_pct?: number;
}

export interface CommanderDecisionPayload {
  action: 'APPROVE' | 'MODIFY' | 'REJECT';
  selected_unit_id?: string;
  reason_code?: string;
  comment?: string;
}

export interface OutcomePayload {
  outcome_status: string;
  failure_classification?: 'DATA_FAILURE' | 'MODEL_FAILURE' | 'RECOMMENDATION_FAILURE' | 'HUMAN_DECISION' | 'EXECUTION_FAILURE' | 'NONE';
  actual_response_time_minutes?: number;
  post_event_evaluation?: string;
}

export interface AuditChainVerification {
  verified: boolean;
  total_records: number;
  chain_intact: boolean;
  corrupted_count: number;
  corrupted_records: any[];
  latest_head_hash: string;
  verification_timestamp: string;
}

// ─── API Functions ──────────────────────────────────────────────────────────────

/**
 * Evaluate an AI recommendation through the 15-step Decision Review Engine.
 */
export async function evaluateRecommendation(payload: EvaluateDecisionRequest): Promise<DecisionEvidenceRecord> {
  const response = await apiClient<DecisionEvidenceRecord>('/api/decision-review/evaluate', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data as DecisionEvidenceRecord;
}

/**
 * Fetch a specific decision evidence record by ID.
 */
export async function getDecisionById(decisionId: string): Promise<DecisionEvidenceRecord> {
  const response = await apiClient<DecisionEvidenceRecord>(`/api/decision-review/${decisionId}`);
  return response.data as DecisionEvidenceRecord;
}

/**
 * Fetch recent decision evidence records.
 */
export async function getRecentDecisions(limit = 20, statusFilter?: string): Promise<DecisionEvidenceRecord[]> {
  const query = statusFilter ? `?limit=${limit}&status_filter=${statusFilter}` : `?limit=${limit}`;
  const response = await apiClient<DecisionEvidenceRecord[]>(`/api/decision-review/recent${query}`);
  return (response.data || []) as DecisionEvidenceRecord[];
}

/**
 * Submit commander decision (APPROVE / MODIFY / REJECT).
 */
export async function submitCommanderReviewDecision(
  decisionId: string,
  payload: CommanderDecisionPayload,
): Promise<DecisionEvidenceRecord> {
  const response = await apiClient<DecisionEvidenceRecord>(`/api/decision-review/${decisionId}/decision`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data as DecisionEvidenceRecord;
}

/**
 * Record actual incident outcome and failure taxonomy.
 */
export async function recordDecisionOutcome(
  decisionId: string,
  payload: OutcomePayload,
): Promise<DecisionEvidenceRecord> {
  const response = await apiClient<DecisionEvidenceRecord>(`/api/decision-review/${decisionId}/outcome`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return response.data as DecisionEvidenceRecord;
}

/**
 * Verify cryptographic integrity of the SHA-256 tamper-evident hash chain.
 */
export async function verifyAuditHashChain(): Promise<AuditChainVerification> {
  const response = await apiClient<AuditChainVerification>('/api/decision-review/audit-chain/verify');
  return response.data as AuditChainVerification;
}

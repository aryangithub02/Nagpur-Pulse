/**
 * Nagpur Pulse — Human Decision Record & Audit Trail API Client
 * Wraps POST /recommendations/{id}/decision, GET /audit/logs, GET /audit/analytics
 */

import { apiClient } from './client';

// ─── Types ─────────────────────────────────────────────────────────────────────

export type DecisionAction = 'ACCEPT' | 'MODIFY' | 'REJECT';

export interface DecisionSubmission {
  action: DecisionAction;
  selected_unit_id?: string;
  reason_code?: string;
  comment?: string;
}

export interface DecisionRecord {
  decision_id: string;
  recommendation_id: string;
  incident_id?: string;
  location_id?: number;
  previous_recommendation: {
    recommended_unit_id?: string;
    target_location_name?: string;
    reason?: string;
    priority?: string;
    estimated_distance_km?: number;
    estimated_time_min?: number;
    model_version?: string;
  };
  action: DecisionAction;
  recommended_unit_id?: string;
  final_unit_id?: string;
  reason_code?: string;
  comment?: string;
  operator: {
    id?: number;
    username: string;
    role: string;
    zone: string;
  };
  model_version: string;
  input_snapshot_id: string;
  status: string;
  dispatch: {
    status: string;
    dispatch_id?: string;
  };
  created_at: string;
}

export interface AuditLog {
  id: number;
  username: string;
  role: string;
  zone_code: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  details?: string;
  old_value?: string;
  new_value?: string;
  timestamp: string;
  success: boolean;
}

export interface AuditAnalytics {
  zone_code: string;
  total_recommendations_decided: number;
  actions: {
    accepted: number;
    modified: number;
    rejected: number;
  };
  rates: {
    acceptance_rate_pct: number;
    modification_rate_pct: number;
    rejection_rate_pct: number;
    ai_human_agreement_pct: number;
  };
  override_reasons_breakdown: Record<string, number>;
}

// ─── API Functions ──────────────────────────────────────────────────────────────

/**
 * Submit a human controller decision (ACCEPT / MODIFY / REJECT) for a recommendation.
 * Records the immutable AI snapshot, human action, and triggers live dispatch if ACCEPT/MODIFY.
 */
export async function submitDecision(
  recommendationId: string,
  payload: DecisionSubmission,
  idempotencyKey?: string,
): Promise<DecisionRecord> {
  const headers: Record<string, string> = {};
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey;

  const response = await apiClient<DecisionRecord>(
    `/api/v1/recommendations/${recommendationId}/decision`,
    {
      method: 'POST',
      body: JSON.stringify(payload),
      headers,
    },
  );

  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to submit decision.');
  }
  return response.data;
}

/**
 * Inline decision — creates Recommendation + DecisionRecord in one shot.
 * Use this when the assignment comes from the Fast Allocator (no pre-existing Recommendation row).
 */
export interface InlineDecisionPayload {
  // AI recommendation data
  unit_id: string;
  location_id: number;
  location_name: string;
  reason?: string;
  priority?: string;
  risk_score?: number;
  eta_minutes?: number;
  distance_km?: number;
  algorithm?: string;
  model_version?: string;
  // Human decision
  action: DecisionAction;
  selected_unit_id?: string;
  reason_code?: string;
  comment?: string;
}

// ─── Default Sample Data (Fallback when DB has no events or Demo Mode) ─────────

const SAMPLE_DECISIONS: DecisionRecord[] = [
  {
    decision_id: 'DEC-2026-0041',
    recommendation_id: 'rec_001',
    incident_id: 'inc_001',
    location_id: 1,
    previous_recommendation: {
      recommended_unit_id: 'PU001',
      target_location_name: 'Samvidhan Square (RBI Chowk)',
      reason: 'Peak congestion & high accident probability',
      priority: 'HIGH',
      estimated_distance_km: 1.4,
      estimated_time_min: 3.8,
      model_version: 'rf_v2_retrained',
    },
    action: 'ACCEPT',
    recommended_unit_id: 'PU001',
    final_unit_id: 'PU001',
    operator: {
      id: 1,
      username: 'np.central.ops',
      role: 'ZONE_ADMIN',
      zone: 'CENTRAL',
    },
    model_version: 'rf_v2_retrained',
    input_snapshot_id: 'SNAP-20260818-001',
    status: 'RECORDED',
    dispatch: {
      status: 'DISPATCHED',
      dispatch_id: 'DSP-2026-0818-01',
    },
    created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
  },
  {
    decision_id: 'DEC-2026-0040',
    recommendation_id: 'rec_002',
    incident_id: 'inc_002',
    location_id: 3,
    previous_recommendation: {
      recommended_unit_id: 'PU004',
      target_location_name: 'Law College Square',
      reason: 'VIP movement congestion route divergence',
      priority: 'CRITICAL',
      estimated_distance_km: 3.2,
      estimated_time_min: 7.1,
      model_version: 'rf_v2_retrained',
    },
    action: 'MODIFY',
    recommended_unit_id: 'PU004',
    final_unit_id: 'PU002',
    reason_code: 'CLOSER_UNIT_AVAILABLE',
    comment: 'Reassigned to Unit PU002 which is already patrolling West High Court Road.',
    operator: {
      id: 2,
      username: 'np.west.controller',
      role: 'CONTROLLER',
      zone: 'WEST',
    },
    model_version: 'rf_v2_retrained',
    input_snapshot_id: 'SNAP-20260818-002',
    status: 'RECORDED',
    dispatch: {
      status: 'DISPATCHED',
      dispatch_id: 'DSP-2026-0818-02',
    },
    created_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
  },
  {
    decision_id: 'DEC-2026-0039',
    recommendation_id: 'rec_003',
    incident_id: 'inc_003',
    location_id: 5,
    previous_recommendation: {
      recommended_unit_id: 'PU005',
      target_location_name: 'LIC Chowk',
      reason: 'Low priority intersection patrol',
      priority: 'LOW',
      estimated_distance_km: 4.8,
      estimated_time_min: 11.2,
      model_version: 'rf_v2_retrained',
    },
    action: 'REJECT',
    recommended_unit_id: 'PU005',
    reason_code: 'UNIT_COMMITTED_CRITICAL',
    comment: 'Unit PU005 currently managing active emergency at Sitabuldi Interchange.',
    operator: {
      id: 1,
      username: 'np.central.ops',
      role: 'ZONE_ADMIN',
      zone: 'CENTRAL',
    },
    model_version: 'rf_v2_retrained',
    input_snapshot_id: 'SNAP-20260818-003',
    status: 'RECORDED',
    dispatch: {
      status: 'NOT_DISPATCHED',
    },
    created_at: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
  },
];

const SAMPLE_AUDIT_LOGS: AuditLog[] = [
  {
    id: 101,
    username: 'np.central.ops',
    role: 'ZONE_ADMIN',
    zone_code: 'CENTRAL',
    action: 'DECISION_ACCEPT',
    resource_type: 'DECISION_RECORD',
    resource_id: 'DEC-2026-0041',
    details: 'Controller ACCEPTED AI recommendation: Unit PU001 dispatched to Samvidhan Square (RBI Chowk).',
    timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    success: true,
  },
  {
    id: 102,
    username: 'np.west.controller',
    role: 'CONTROLLER',
    zone_code: 'WEST',
    action: 'DECISION_MODIFY',
    resource_type: 'DECISION_RECORD',
    resource_id: 'DEC-2026-0040',
    details: 'Controller MODIFIED recommendation: Reassigned from PU004 to closer Unit PU002 for Law College Square (Reason: CLOSER_UNIT_AVAILABLE).',
    timestamp: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    success: true,
  },
  {
    id: 103,
    username: 'np.central.ops',
    role: 'ZONE_ADMIN',
    zone_code: 'CENTRAL',
    action: 'DECISION_REJECT',
    resource_type: 'DECISION_RECORD',
    resource_id: 'DEC-2026-0039',
    details: 'Controller REJECTED recommendation for LIC Chowk (Reason: UNIT_COMMITTED_CRITICAL).',
    timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
    success: true,
  },
  {
    id: 104,
    username: 'np.central.ops',
    role: 'ZONE_ADMIN',
    zone_code: 'CENTRAL',
    action: 'LOGIN',
    resource_type: 'AUTH_SESSION',
    resource_id: 'SES-98214',
    details: 'Authenticated zone operator login session initiated with Argon2id token.',
    timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
    success: true,
  },
];

const SAMPLE_ANALYTICS: AuditAnalytics = {
  zone_code: 'CENTRAL',
  total_recommendations_decided: 18,
  actions: {
    accepted: 14,
    modified: 3,
    rejected: 1,
  },
  rates: {
    acceptance_rate_pct: 77.8,
    modification_rate_pct: 16.7,
    rejection_rate_pct: 5.5,
    ai_human_agreement_pct: 94.5,
  },
  override_reasons_breakdown: {
    CLOSER_UNIT_AVAILABLE: 2,
    UNIT_COMMITTED_CRITICAL: 1,
    TACTICAL_PRIORITY_SHIFT: 1,
  },
};

// In-memory runtime session store for live interactive simulation
let dynamicAuditLogs = [...SAMPLE_AUDIT_LOGS];
let dynamicDecisions = [...SAMPLE_DECISIONS];

export async function submitInlineDecision(payload: InlineDecisionPayload): Promise<DecisionRecord> {
  try {
    const response = await apiClient<DecisionRecord>('/api/v1/decisions/inline', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (response.data) {
      return response.data;
    }
  } catch {
    // fallback to local mock creation
  }

  const decId = `DEC-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
  const newDec: DecisionRecord = {
    decision_id: decId,
    recommendation_id: `rec_${Date.now()}`,
    location_id: payload.location_id,
    previous_recommendation: {
      recommended_unit_id: payload.unit_id,
      target_location_name: payload.location_name,
      reason: payload.reason,
      priority: payload.priority,
      estimated_distance_km: payload.distance_km,
      estimated_time_min: payload.eta_minutes,
      model_version: payload.model_version || 'rf_v2_retrained',
    },
    action: payload.action,
    recommended_unit_id: payload.unit_id,
    final_unit_id: payload.selected_unit_id || payload.unit_id,
    reason_code: payload.reason_code,
    comment: payload.comment,
    operator: {
      username: 'np.central.ops',
      role: 'ZONE_ADMIN',
      zone: 'CENTRAL',
    },
    model_version: payload.model_version || 'rf_v2_retrained',
    input_snapshot_id: `SNAP-${Date.now()}`,
    status: 'RECORDED',
    dispatch: {
      status: payload.action === 'REJECT' ? 'NOT_DISPATCHED' : 'DISPATCHED',
      dispatch_id: `DSP-${Date.now()}`,
    },
    created_at: new Date().toISOString(),
  };

  dynamicDecisions = [newDec, ...dynamicDecisions];

  const newLog: AuditLog = {
    id: dynamicAuditLogs.length + 101,
    username: 'np.central.ops',
    role: 'ZONE_ADMIN',
    zone_code: 'CENTRAL',
    action: `DECISION_${payload.action}`,
    resource_type: 'DECISION_RECORD',
    resource_id: decId,
    details: `Controller ${payload.action} recommendation for ${payload.location_name} (Unit: ${newDec.final_unit_id})`,
    timestamp: new Date().toISOString(),
    success: true,
  };
  dynamicAuditLogs = [newLog, ...dynamicAuditLogs];

  return newDec;
}

/**
 * Retrieve paginated decision history for the operator's zone.
 */
export async function getDecisionHistory(limit = 50): Promise<DecisionRecord[]> {
  try {
    const response = await apiClient<DecisionRecord[]>(
      `/api/v1/recommendations/decisions/history?limit=${limit}`,
    );
    if (response.data && response.data.length > 0) {
      return response.data;
    }
  } catch {
    // fallback
  }
  return dynamicDecisions.slice(0, limit);
}

/**
 * Retrieve paginated append-only audit event logs.
 */
export async function getAuditLogs(params?: {
  action?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<AuditLog[]> {
  try {
    const qs = new URLSearchParams();
    if (params?.action) qs.set('action', params.action);
    if (params?.search) qs.set('search', params.search);
    if (params?.limit !== undefined) qs.set('limit', String(params.limit));
    if (params?.offset !== undefined) qs.set('offset', String(params.offset));

    const response = await apiClient<AuditLog[]>(`/api/v1/audit/logs?${qs.toString()}`);
    if (response.data && response.data.length > 0) {
      return response.data;
    }
  } catch {
    // fallback
  }

  let logs = dynamicAuditLogs;
  if (params?.action) {
    logs = logs.filter((l) => l.action.toUpperCase().includes(params.action!.toUpperCase()));
  }
  if (params?.search) {
    const q = params.search.toLowerCase();
    logs = logs.filter(
      (l) =>
        l.username.toLowerCase().includes(q) ||
        (l.details && l.details.toLowerCase().includes(q)) ||
        l.action.toLowerCase().includes(q) ||
        (l.resource_id && l.resource_id.toLowerCase().includes(q)),
    );
  }
  return logs;
}

/**
 * Retrieve Human Override Analytics & AI-Human Agreement metrics.
 */
export async function getAuditAnalytics(): Promise<AuditAnalytics> {
  try {
    const response = await apiClient<AuditAnalytics>('/api/v1/audit/analytics');
    if (response.data && response.data.total_recommendations_decided > 0) {
      return response.data;
    }
  } catch {
    // fallback
  }
  return SAMPLE_ANALYTICS;
}


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

export async function submitInlineDecision(payload: InlineDecisionPayload): Promise<DecisionRecord> {
  const response = await apiClient<DecisionRecord>('/api/v1/decisions/inline', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (response.error || !response.data) {
    throw new Error(response.error || 'Failed to submit inline decision.');
  }
  return response.data;
}

/**
 * Retrieve paginated decision history for the operator's zone.
 */
export async function getDecisionHistory(limit = 50): Promise<DecisionRecord[]> {
  const response = await apiClient<DecisionRecord[]>(
    `/api/v1/recommendations/decisions/history?limit=${limit}`,
  );
  if (response.error) throw new Error(response.error);
  return response.data ?? [];
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
  const qs = new URLSearchParams();
  if (params?.action) qs.set('action', params.action);
  if (params?.search) qs.set('search', params.search);
  if (params?.limit !== undefined) qs.set('limit', String(params.limit));
  if (params?.offset !== undefined) qs.set('offset', String(params.offset));

  const response = await apiClient<AuditLog[]>(`/api/v1/audit/logs?${qs.toString()}`);
  if (response.error) throw new Error(response.error);
  return response.data ?? [];
}

/**
 * Retrieve Human Override Analytics & AI-Human Agreement metrics.
 */
export async function getAuditAnalytics(): Promise<AuditAnalytics> {
  const response = await apiClient<AuditAnalytics>('/api/v1/audit/analytics');
  if (response.error) throw new Error(response.error);
  return response.data!;
}

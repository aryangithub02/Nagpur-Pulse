import { apiClient, ApiResponse } from './client';

export interface SimulationScenarioChange {
  type:
    | 'UNIT_STATUS'
    | 'UNIT_REMOVED'
    | 'NEW_INCIDENT'
    | 'INCIDENT_SEVERITY_CHANGE'
    | 'ROUTE_UNAVAILABLE'
    | 'JUNCTION_UNAVAILABLE'
    | 'TRAFFIC_CHANGE'
    | 'RISK_CHANGE'
    | 'UNIT_LOCATION_CHANGE';
  unit_id?: string;
  incident_id?: string;
  route_id?: string;
  junction_id?: number;
  location_name?: string;
  latitude?: number;
  longitude?: number;
  severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  incident_type?: string;
  congestion?: number;
  risk_score?: number;
  risk_class?: string;
  value?: string;
  zone_code?: string;
}

export interface SimulationRunResponse {
  simulation_id: string;
  scenario_name?: string;
  summary?: string;
  human_readable_summary?: string;
  base_snapshot_id: string;
  live_state_modified: boolean;
  zone_code: string;
  coverage_before?: number;
  coverage_after?: number;
  risk_weighted_coverage_before?: number;
  risk_weighted_coverage_after?: number;
  comparison: {
    changes_in_plan: Array<{
      unit_id: string;
      change_type: 'REASSIGNED' | 'UNCHANGED' | 'REMOVED' | 'ADDED';
      live_location_name?: string;
      simulated_location_name?: string;
      live_eta?: number;
      simulated_eta?: number;
      delta_eta_minutes?: number;
      reason?: string;
    }>;
    response_time_changes: Array<any>;
    coverage_before: number;
    coverage_after: number;
    delta_coverage_pct: number;
    reassigned_units_count: number;
    uncovered_high_risk: string[];
    human_readable_summary: string;
  };
  simulated_plan: {
    assignments: any[];
    uncovered_locations: any[];
    status: string;
    risk_weighted_coverage_pct: number;
  };
  errors?: string[];
  created_at: string;
}

export interface SimulationApplyResponse {
  success: boolean;
  status: 'APPLIED' | 'STALE' | 'FAILED';
  message: string;
  applied_assignments_count?: number;
  live_snapshot_id?: string;
}

export async function runSimulationScenario(
  scenarioName: string,
  changes: SimulationScenarioChange[],
  baseSnapshotId?: string
): Promise<ApiResponse<SimulationRunResponse>> {
  return apiClient<SimulationRunResponse>('/api/v1/simulations/deployment', {
    method: 'POST',
    body: JSON.stringify({
      scenario_name: scenarioName,
      base_snapshot_id: baseSnapshotId || 'latest',
      changes,
    }),
  });
}

export async function getSimulationRun(simulationId: string): Promise<ApiResponse<SimulationRunResponse>> {
  return apiClient<SimulationRunResponse>(`/api/v1/simulations/deployment/${simulationId}`);
}

export async function applySimulationPlan(simulationId: string): Promise<ApiResponse<SimulationApplyResponse>> {
  return apiClient<SimulationApplyResponse>(`/api/v1/simulations/deployment/${simulationId}/apply`, {
    method: 'POST',
  });
}

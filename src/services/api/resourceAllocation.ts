import { apiClient } from './client';

export interface AllocationAssignment {
  optimization_id: string;
  unit_id: string;
  location_id: number;
  location_name: string;
  risk_score: number;
  risk_class: string;
  traffic_congestion_score: number;
  incident_priority_score: number;
  coverage_gap_score: number;
  distance_km: number;
  eta_minutes: number;
  assignment_value: number;
  status: 'RECOMMENDED' | 'ACCEPTED' | 'DISPATCHED' | 'REJECTED';
  reason?: string;
}

export interface UnallocatedUnit {
  unit_id: string;
  unit_name: string;
  status: string;
  latitude: number;
  longitude: number;
  reason: string;
}

export interface UncoveredLocation {
  location_id: number;
  location_name: string;
  risk_score: number;
  risk_class: string;
  priority_score: number;
  traffic_congestion_score: number;
  incident_priority_score: number;
  desired_units: number;
  assigned_units: number;
  reason: string;
}

export interface OptimizationResult {
  optimization_id: string;
  generated_at: string;
  solver: string;
  status: 'OPTIMAL' | 'FEASIBLE' | 'INFEASIBLE' | 'UNKNOWN';
  objective_value: number;
  solver_time_seconds: number;
  available_units: number;
  allocated_units: number;
  unallocated_units_count: number;
  total_demand_locations: number;
  covered_locations: number;
  uncovered_locations_count: number;
  risk_weighted_coverage_pct: number;
  resource_utilization_pct: number;
  resource_shortage_score: number;
  assignments: AllocationAssignment[];
  unallocated_units: UnallocatedUnit[];
  uncovered_locations: UncoveredLocation[];
  configuration: Record<string, any>;
}

export interface OptimizeRequestParams {
  scope?: string;
  include_patrolling_units?: boolean;
  max_eta_minutes?: number;
  solver_time_limit?: number;
  priority_weights?: Record<string, number>;
}

export const resourceAllocationApi = {
  /**
   * Trigger Google OR-Tools CP-SAT integer optimization solver.
   */
  optimize: async (params?: OptimizeRequestParams): Promise<OptimizationResult> => {
    const response = await apiClient<{ success: boolean; data: OptimizationResult }>(
      '/api/v1/resource-allocation/optimize',
      {
        method: 'POST',
        body: JSON.stringify(params || {}),
      }
    );
    if (response.error || !response.data?.data) {
      throw new Error(response.error || 'Failed to run resource optimization.');
    }
    return response.data.data;
  },

  /**
   * Fetch latest optimization result.
   */
  getLatest: async (): Promise<OptimizationResult> => {
    const response = await apiClient<{ success: boolean; data: OptimizationResult }>(
      '/api/v1/resource-allocation/latest',
      { method: 'GET' }
    );
    if (response.error || !response.data?.data) {
      throw new Error(response.error || 'Failed to fetch latest optimization.');
    }
    return response.data.data;
  },

  /**
   * Fetch optimization run by ID.
   */
  getById: async (id: string): Promise<OptimizationResult> => {
    const response = await apiClient<{ success: boolean; data: OptimizationResult }>(
      `/api/v1/resource-allocation/${id}`,
      { method: 'GET' }
    );
    if (response.error || !response.data?.data) {
      throw new Error(response.error || `Failed to fetch optimization '${id}'.`);
    }
    return response.data.data;
  },

  /**
   * Fast Greedy + Risk-Based Priority Resource Allocation (<100ms).
   */
  fastAllocate: async (params?: { zone?: string; include_patrolling_units?: boolean; max_eta_minutes?: number }): Promise<any> => {
    const response = await apiClient<any>(
      '/api/v1/allocation/fast',
      {
        method: 'POST',
        body: JSON.stringify(params || {}),
      }
    );
    if (response.error || !response.data) {
      throw new Error(response.error || 'Failed to run fast resource allocation.');
    }
    return response.data;
  },

  /**
   * Human approval workflow: Apply recommendations to dispatch police units.
   */
  apply: async (id: string): Promise<{ optimization_id: string; applied_count: number; status: string }> => {
    const response = await apiClient<{
      success: boolean;
      data: { optimization_id: string; applied_count: number; status: string };
    }>(`/api/v1/resource-allocation/${id}/apply`, {
      method: 'POST',
    });
    if (response.error || !response.data?.data) {
      throw new Error(response.error || `Failed to apply optimization '${id}'.`);
    }
    return response.data.data;
  },
};

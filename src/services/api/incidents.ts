import { apiClient } from './client';
import { IncidentListResponse, IncidentItemBackend } from '../../types/incident';

export async function fetchIncidents(): Promise<{
  incidents: IncidentItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<IncidentListResponse>('/api/incidents');
  if (res.error || !res.data) {
    return { incidents: [], error: res.error };
  }
  return { incidents: res.data.incidents || [], error: null };
}

export async function simulateIncident(payload: {
  locationId: string;
  type?: string;
  severity?: string;
  description?: string;
}): Promise<{
  incident: IncidentItemBackend | null;
  recommendation: any | null;
  error: string | null;
}> {
  const res = await apiClient<{ incident: IncidentItemBackend; recommendation?: any }>('/api/simulation/incident', {
    method: 'POST',
    body: JSON.stringify(payload),
  });

  if (res.error || !res.data) {
    return { incident: null, recommendation: null, error: res.error };
  }

  return {
    incident: res.data.incident,
    recommendation: res.data.recommendation || null,
    error: null,
  };
}

export async function resetSimulation(): Promise<{ success: boolean; error: string | null }> {
  const res = await apiClient<any>('/api/simulation/reset', { method: 'POST' });
  if (res.error) {
    return { success: false, error: res.error };
  }
  return { success: true, error: null };
}

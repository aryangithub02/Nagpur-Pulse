import { apiClient } from './client';
import {
  PoliceUnitItemBackend,
  PoliceUnitListResponse,
  DeploymentItemBackend,
  RecommendationItemBackend,
} from '../../types/police';

export async function fetchPoliceUnits(): Promise<{
  units: PoliceUnitItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<PoliceUnitListResponse>('/api/police-units');
  if (res.error || !res.data) {
    return { units: [], error: res.error };
  }
  return { units: res.data.units || [], error: null };
}

export async function fetchAvailablePoliceUnits(): Promise<{
  units: PoliceUnitItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<PoliceUnitListResponse>('/api/police-units/available');
  if (res.error || !res.data) {
    return { units: [], error: res.error };
  }
  return { units: res.data.units || [], error: null };
}

export async function fetchPoliceUnitById(unitId: string): Promise<{
  unit: PoliceUnitItemBackend | null;
  error: string | null;
}> {
  const res = await apiClient<PoliceUnitItemBackend>(`/api/police-units/${unitId}`);
  if (res.error || !res.data) {
    return { unit: null, error: res.error };
  }
  return { unit: res.data, error: null };
}

export async function fetchDeployments(): Promise<{
  deployments: DeploymentItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<{ deployments: DeploymentItemBackend[] }>('/api/deployments');
  if (res.error || !res.data) {
    return { deployments: [], error: res.error };
  }
  return { deployments: res.data.deployments || [], error: null };
}

export async function fetchRecommendations(): Promise<{
  recommendations: RecommendationItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<{ recommendations: RecommendationItemBackend[] }>('/api/recommendations');
  if (res.error || !res.data) {
    return { recommendations: [], error: res.error };
  }
  return { recommendations: res.data.recommendations || [], error: null };
}

export async function acceptRecommendation(recId: string): Promise<{
  success: boolean;
  deployment: DeploymentItemBackend | null;
  recommendation: RecommendationItemBackend | null;
  error: string | null;
}> {
  const res = await apiClient<{
    success: boolean;
    deployment: DeploymentItemBackend;
    recommendation: RecommendationItemBackend;
  }>(`/api/recommendations/${recId}/accept`, { method: 'POST' });

  if (res.error || !res.data) {
    return { success: false, deployment: null, recommendation: null, error: res.error };
  }

  return {
    success: res.data.success,
    deployment: res.data.deployment,
    recommendation: res.data.recommendation,
    error: null,
  };
}

export async function rejectRecommendation(recId: string): Promise<{
  success: boolean;
  recommendation: RecommendationItemBackend | null;
  error: string | null;
}> {
  const res = await apiClient<{
    success: boolean;
    recommendation: RecommendationItemBackend;
  }>(`/api/recommendations/${recId}/reject`, { method: 'POST' });

  if (res.error || !res.data) {
    return { success: false, recommendation: null, error: res.error };
  }

  return {
    success: res.data.success,
    recommendation: res.data.recommendation,
    error: null,
  };
}

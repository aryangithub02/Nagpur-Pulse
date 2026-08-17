import { apiClient } from './client';
import { RiskResponseBackend, LocationRiskResponseBackend, RiskItemBackend } from '../../types/risk';

export async function fetchAllRiskPredictions(): Promise<{
  riskData: RiskItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<RiskResponseBackend>('/api/risk');
  if (res.error || !res.data) {
    return { riskData: [], error: res.error };
  }
  return { riskData: res.data.riskData || [], error: null };
}

export async function fetchLocationRisk(locationId: string): Promise<{
  risk: RiskItemBackend | null;
  error: string | null;
}> {
  const res = await apiClient<LocationRiskResponseBackend>(`/api/risk/${locationId}`);
  if (res.error || !res.data) {
    return { risk: null, error: res.error };
  }
  return { risk: res.data.risk, error: null };
}

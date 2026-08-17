import { apiClient } from './client';
import {
  RiskResponseBackend,
  LocationRiskResponseBackend,
  RiskItemBackend,
  RiskSummaryBackend,
  RiskHistoryBackend,
} from '../../types/risk';

export async function fetchAllRiskPredictions(): Promise<{
  riskData: RiskItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<RiskResponseBackend>('/api/v1/risk/junctions');
  if (res.error || !res.data) {
    // Fallback to legacy endpoint
    const fallbackRes = await apiClient<RiskResponseBackend>('/api/risk');
    if (fallbackRes.error || !fallbackRes.data) {
      return { riskData: [], error: res.error || fallbackRes.error };
    }
    return { riskData: fallbackRes.data.riskData || fallbackRes.data.junctions || [], error: null };
  }
  return { riskData: res.data.riskData || res.data.junctions || [], error: null };
}

export async function fetchLocationRisk(locationId: string): Promise<{
  risk: RiskItemBackend | null;
  error: string | null;
}> {
  const res = await apiClient<LocationRiskResponseBackend>(`/api/v1/risk/junctions/${locationId}`);
  if (res.error || !res.data) {
    const fallbackRes = await apiClient<LocationRiskResponseBackend>(`/api/risk/${locationId}`);
    if (fallbackRes.error || !fallbackRes.data) {
      return { risk: null, error: res.error || fallbackRes.error };
    }
    return { risk: fallbackRes.data.risk || fallbackRes.data.junction || null, error: null };
  }
  return { risk: res.data.risk || res.data.junction || null, error: null };
}

export async function fetchRiskSummary(): Promise<{
  summary: RiskSummaryBackend | null;
  error: string | null;
}> {
  const res = await apiClient<RiskSummaryBackend>('/api/v1/risk/summary');
  if (res.error || !res.data) {
    return { summary: null, error: res.error };
  }
  return { summary: res.data, error: null };
}

export async function fetchRiskHistory(locationId: string): Promise<{
  history: RiskHistoryBackend | null;
  error: string | null;
}> {
  const res = await apiClient<RiskHistoryBackend>(`/api/v1/risk/history/${locationId}`);
  if (res.error || !res.data) {
    return { history: null, error: res.error };
  }
  return { history: res.data, error: null };
}

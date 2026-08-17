import { apiClient } from './client';

export interface PredictionRequestPayload {
  junction_id?: number;
  features: Record<string, any>;
}

export interface PredictionResponseBackend {
  id?: number;
  junction_id?: number;
  timestamp?: string;
  success: boolean;
  prediction: string | number;
  probability?: number;
  is_mock?: boolean;
  message?: string;
}

export interface PredictionHistoryItemBackend {
  id: number;
  junction_id: number;
  timestamp: string;
  prediction: string;
  probability?: number;
  is_mock?: boolean;
  features_used?: Record<string, any>;
  created_at: string;
}

export interface PredictionHistoryResponseBackend {
  junction_id: number;
  predictions: PredictionHistoryItemBackend[];
}

export interface RecommendationItemBackend {
  id: string;
  locationId: string;
  locationName?: string;
  recommendedUnitId: string;
  unitName?: string;
  reason: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  estimatedDistance?: number;
  estimatedTime?: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
}

export interface RecommendationListResponseBackend {
  recommendations: RecommendationItemBackend[];
}

/**
 * Submit traffic feature observation to compute & record a risk prediction in database
 */
export async function requestPrediction(
  payload: PredictionRequestPayload
): Promise<{ data: PredictionResponseBackend | null; error: string | null }> {
  const res = await apiClient<PredictionResponseBackend>('/predict', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  if (res.error || !res.data) {
    return { data: null, error: res.error || 'Failed to request prediction' };
  }
  return { data: res.data, error: null };
}

/**
 * Fetch historical recorded predictions for a junction from database
 */
export async function fetchPredictionHistory(
  junctionId: number,
  limit = 20
): Promise<{ predictions: PredictionHistoryItemBackend[]; error: string | null }> {
  const res = await apiClient<PredictionHistoryResponseBackend>(`/predictions/${junctionId}?limit=${limit}`);
  if (res.error || !res.data) {
    return { predictions: [], error: res.error };
  }
  return { predictions: res.data.predictions || [], error: null };
}

/**
 * Fetch deployment recommendations from backend DB
 */
export async function fetchRecommendations(): Promise<{
  recommendations: RecommendationItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<RecommendationListResponseBackend>('/api/recommendations');
  if (res.error || !res.data) {
    return { recommendations: [], error: res.error };
  }
  return { recommendations: res.data.recommendations || [], error: null };
}

/**
 * Accept a deployment recommendation
 */
export async function acceptRecommendation(
  recId: string
): Promise<{ success: boolean; error: string | null }> {
  const res = await apiClient<{ success: boolean }>(`/api/recommendations/${recId}/accept`, {
    method: 'POST',
  });
  if (res.error || !res.data) {
    return { success: false, error: res.error };
  }
  return { success: res.data.success, error: null };
}

/**
 * Reject a deployment recommendation
 */
export async function rejectRecommendation(
  recId: string
): Promise<{ success: boolean; error: string | null }> {
  const res = await apiClient<{ success: boolean }>(`/api/recommendations/${recId}/reject`, {
    method: 'POST',
  });
  if (res.error || !res.data) {
    return { success: false, error: res.error };
  }
  return { success: res.data.success, error: null };
}

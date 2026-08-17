import { apiClient } from './client';
import { TrafficListResponse, TrafficItemBackend } from '../../types/traffic';

export async function fetchTrafficObservations(): Promise<{
  traffic: TrafficItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<TrafficListResponse>('/api/traffic');
  if (res.error || !res.data) {
    return { traffic: [], error: res.error };
  }
  return { traffic: res.data.traffic || [], error: null };
}

export async function fetchTrafficByLocation(locationId: string): Promise<{
  traffic: TrafficItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<TrafficListResponse>(`/api/traffic/${locationId}`);
  if (res.error || !res.data) {
    return { traffic: [], error: res.error };
  }
  return { traffic: res.data.traffic || [], error: null };
}

export async function fetchLocations(): Promise<{
  locations: Array<{ id: string; name: string; latitude: number; longitude: number; address?: string }>;
  error: string | null;
}> {
  const res = await apiClient<{ locations: Array<{ id: string; name: string; latitude: number; longitude: number; address?: string }> }>('/api/locations');
  if (res.error || !res.data) {
    return { locations: [], error: res.error };
  }
  return { locations: res.data.locations || [], error: null };
}

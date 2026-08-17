import { apiClient } from './client';
import { RoutingResponse } from '../../types/routing';

export async function calculateUnitRoute(
  unitId: string,
  junctionId: string | number
): Promise<{ route: RoutingResponse | null; error: string | null }> {
  const targetId = typeof junctionId === 'number' ? `loc_${junctionId}` : junctionId;
  const res = await apiClient<RoutingResponse>(`/api/routing/unit/${unitId}/to/${targetId}`);

  if (res.error || !res.data) {
    return { route: null, error: res.error };
  }

  return { route: res.data, error: null };
}

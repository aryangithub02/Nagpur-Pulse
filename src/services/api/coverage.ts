import { apiClient } from './client';
import { CoverageResponseBackend, LocationCoverageResponseBackend, CoverageItemBackend } from '../../types/coverage';

export async function fetchCoverage(): Promise<{
  overallCoveragePercentage: number;
  totalActiveUnits: number;
  locations: CoverageItemBackend[];
  error: string | null;
}> {
  const res = await apiClient<CoverageResponseBackend>('/api/coverage');
  if (res.error || !res.data) {
    return {
      overallCoveragePercentage: 0,
      totalActiveUnits: 0,
      locations: [],
      error: res.error,
    };
  }
  return {
    overallCoveragePercentage: res.data.overallCoveragePercentage,
    totalActiveUnits: res.data.totalActiveUnits,
    locations: res.data.locations || [],
    error: null,
  };
}

export async function fetchLocationCoverage(locationId: string): Promise<{
  coverage: CoverageItemBackend | null;
  error: string | null;
}> {
  const res = await apiClient<LocationCoverageResponseBackend>(`/api/coverage/${locationId}`);
  if (res.error || !res.data) {
    return { coverage: null, error: res.error };
  }
  return { coverage: res.data.coverage, error: null };
}

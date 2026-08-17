export interface CoverageItemBackend {
  locationId: string;
  locationName: string;
  activeUnitsCount: number;
  coveragePercentage: number; // 0 to 100
  status: 'ADEQUATE' | 'LOW' | 'CRITICAL';
}

export interface CoverageResponseBackend {
  overallCoveragePercentage: number;
  totalActiveUnits: number;
  locations: CoverageItemBackend[];
}

export interface LocationCoverageResponseBackend {
  coverage: CoverageItemBackend;
}

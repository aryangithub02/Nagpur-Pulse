export interface RiskItemBackend {
  locationId: string;
  locationName: string;
  riskLevel: 'LOW' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'SEVERE';
  riskScore: number; // 0.0 to 1.0
  prediction: number | string | any;
  isMock?: boolean;
  lastEvaluated: string;
}

export interface RiskResponseBackend {
  riskData: RiskItemBackend[];
}

export interface LocationRiskResponseBackend {
  risk: RiskItemBackend;
}

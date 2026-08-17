export type RiskLevel = 'LOW' | 'MEDIUM' | 'MODERATE' | 'HIGH' | 'CRITICAL' | 'SEVERE';

export interface PredictionProbabilities {
  LOW: number;
  MEDIUM: number;
  HIGH: number;
  CRITICAL: number;
}

export interface RiskItemBackend {
  locationId: string;
  canonicalJunctionId?: string;
  locationName: string;
  latitude?: number;
  longitude?: number;
  riskLevel: RiskLevel;
  riskScore: number; // 0.0 to 100.0
  prediction: number | string;
  probabilities?: PredictionProbabilities;
  modelVersion?: string;
  isMock?: boolean;
  isStale?: boolean;
  lastEvaluated: string;
}

export interface RiskResponseBackend {
  riskData: RiskItemBackend[];
  junctions?: RiskItemBackend[];
}

export interface LocationRiskResponseBackend {
  risk: RiskItemBackend;
  junction?: RiskItemBackend;
}

export interface RiskSummaryBackend {
  total_junctions: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  average_risk_score: number;
  last_updated: string;
}

export interface RiskHistoryPoint {
  timestamp: string;
  risk_score: number;
  risk_level: RiskLevel;
  probabilities?: PredictionProbabilities;
}

export interface RiskHistoryBackend {
  junction_id: string;
  canonicalJunctionId?: string;
  junction_name: string;
  history: RiskHistoryPoint[];
}

export interface RiskAlert {
  type: 'CRITICAL_RISK_ALERT' | 'HIGH_RISK_ALERT';
  junction_id: string;
  junction_name: string;
  risk_score: number;
  risk_level: RiskLevel;
  timestamp: string;
}

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export type CongestionCategory = 'fluid' | 'moderate' | 'heavy' | 'gridlock';

export interface TrafficMetrics {
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number; // in seconds
  freeFlowTravelTime: number; // in seconds
  delaySeconds: number;
  congestionLevel: CongestionCategory;
  confidenceScore: number;
  roadClosure: boolean;
  frc?: string; // Functional Road Class e.g. FRC1, FRC2
  streetName?: string;
  updatedAt: string;
}

export interface JunctionTrafficState {
  junction: NagpurJunction;
  metrics: TrafficMetrics | null;
  isLoading: boolean;
  error: string | null;
}

export interface NagpurJunction {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  zone: 'Zone 1 - Central' | 'Zone 2 - North' | 'Zone 3 - East' | 'Zone 4 - South' | 'Zone 5 - West';
  approximate: boolean;
  source: string;
  type: 'Major Chowk' | 'Square' | 'T-Point' | 'Flyover Junction' | 'Market Junction';
  trafficCongestion: 'Normal' | 'Moderate' | 'Heavy' | 'Gridlock';
  cctvCount: number;
  priorityLevel: 'High' | 'Medium' | 'Critical';
}

export interface CitySummary {
  avgSpeed: number;
  avgFreeFlowSpeed: number;
  overallCongestionScore: number; // 0-100%
  congestedCount: number;
  fluidCount: number;
  closedRoadsCount: number;
  totalTracked: number;
  highestDelayJunction: JunctionTrafficState | null;
  slowestJunction: JunctionTrafficState | null;
  fastestJunction: JunctionTrafficState | null;
  lastUpdated: number;
}

export interface TrafficItemBackend {
  id: string;
  locationId: string;
  timestamp: string;
  speed: number;
  density: number;
  congestionLevel: string;
  details: Record<string, any>;
}

export interface TrafficListResponse {
  traffic: TrafficItemBackend[];
}

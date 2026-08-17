export type Zone = 'Central' | 'North' | 'South' | 'East' | 'West';

export type CongestionLevel = 'fluid' | 'moderate' | 'heavy' | 'gridlock';

export interface Coordinate {
  latitude: number;
  longitude: number;
}

export interface Junction {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  approximate?: boolean;
  source?: string;
  zone: Zone;
  corridor?: string;
  description?: string;
}

export interface TomTomCoordinate {
  latitude: number;
  longitude: number;
}

export interface TomTomFlowSegmentData {
  frc?: string;
  currentSpeed: number;
  freeFlowSpeed: number;
  currentTravelTime: number;
  freeFlowTravelTime: number;
  confidence: number;
  roadClosure?: boolean;
  coordinates?: {
    coordinate: TomTomCoordinate[];
  };
  '@version'?: string;
}

export interface TomTomApiResponse {
  flowSegmentData: TomTomFlowSegmentData;
}

export interface TrafficMetrics {
  currentSpeed: number; // km/h
  freeFlowSpeed: number; // km/h
  speedDropPct: number; // percentage speed reduced from free flow
  currentTravelTime: number; // seconds
  freeFlowTravelTime: number; // seconds
  delaySeconds: number; // delay = max(0, current - freeFlow)
  congestionLevel: CongestionLevel;
  confidencePct: number; // 0-100%
  roadClosure: boolean;
  frc: string;
  frcDescription: string;
  coordinates: Coordinate[];
  fetchedAt: number;
}

export interface JunctionTrafficState {
  junction: Junction;
  metrics: TrafficMetrics | null;
  isLoading: boolean;
  error?: string | null;
}

export interface CitySummary {
  avgSpeed: number;
  avgFreeFlowSpeed: number;
  overallCongestionScore: number; // 0-100
  congestedCount: number;
  fluidCount: number;
  closedRoadsCount: number;
  totalTracked: number;
  highestDelayJunction: JunctionTrafficState | null;
  slowestJunction: JunctionTrafficState | null;
  fastestJunction: JunctionTrafficState | null;
  lastUpdated: number;
}

export interface RouteSegment {
  name: string;
  lat: number;
  lng: number;
  speed: number;
  freeFlowSpeed: number;
  travelTimeSec: number;
  delaySec: number;
  congestionLevel: CongestionLevel;
}

export interface RouteCalculation {
  origin: Junction;
  destination: Junction;
  totalDistanceKm: number;
  totalTravelTimeSec: number;
  freeFlowTravelTimeSec: number;
  totalDelaySec: number;
  averageSpeedKmph: number;
  congestionStatus: CongestionLevel;
  segments: RouteSegment[];
  polyline: Coordinate[];
}

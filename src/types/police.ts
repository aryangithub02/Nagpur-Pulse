export type AvailabilityStatus = 
  | 'AVAILABLE' 
  | 'EN_ROUTE' 
  | 'ON_SCENE' 
  | 'UNAVAILABLE' 
  | 'BUSY' 
  | 'OFFLINE';

export type UnitType = 
  | 'PCR Van' 
  | 'Traffic Patrol Bike' 
  | 'Interceptor Vehicle' 
  | 'Highway Patrol' 
  | 'Heavy Towing Unit';

export interface LocationCoordinates {
  latitude: number;
  longitude: number;
  nearestJunctionId: number;
  nearestJunctionName: string;
}

export interface DestinationTarget {
  latitude: number;
  longitude: number;
  junctionId: number;
  junctionName: string;
}

export interface UnitAssignment {
  incidentId?: string;
  junctionId: number;
  junctionName: string;
  incidentType: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  assignedTimestamp: string;
  etaMinutes: number;
  distanceKm: number;
  notes?: string;
}

export interface UnitTelemetry {
  speedKmH: number;
  fuelPercentage: number;
  isSirenActive: boolean;
  radioChannel: string;
  dashcamStatus: 'ONLINE' | 'OFFLINE' | 'RECORDING';
  headingDegrees: number;
}

export interface PoliceUnit {
  id: string;
  callSign: string;
  badgeNumber: string;
  unitType: UnitType;
  vehicleModel: string;
  licensePlate: string;
  officersAssigned: string[];
  stationBase: string;
  zone?: 'CENTRAL' | 'NORTH' | 'EAST' | 'WEST' | 'SOUTH' | 'ALL';
  availability: AvailabilityStatus;
  location: LocationCoordinates;
  targetDestination?: DestinationTarget;
  currentAssignment?: UnitAssignment;
  telemetry: UnitTelemetry;
  routeHistory: [number, number][];
  lastPingTimestamp: string;
}

export interface RadioTransmission {
  id: string;
  timestamp: string;
  unitId: string;
  callSign: string;
  frequency: string;
  type: 'DISPATCH' | 'STATUS_UPDATE' | 'CLEAR_SCENE' | '112_CALL' | 'EMERGENCY_SOS';
  message: string;
  junctionName?: string;
}

export interface PoliceUnitItemBackend {
  id: string;
  name: string;
  badgeNumber?: string;
  unitType: string;
  status: string;
  zone?: string;
  zone_code?: string;
  latitude: number;
  longitude: number;
  updatedAt: string;
}

export interface PoliceUnitListResponse {
  units: PoliceUnitItemBackend[];
}

export interface DeploymentItemBackend {
  id: string;
  unitId: string;
  unitName?: string;
  locationId: string;
  locationName?: string;
  recommendationId?: string;
  status: string;
  deployedAt: string;
}

export interface RecommendationItemBackend {
  id: string;
  locationId: string;
  locationName?: string;
  recommendedUnitId?: string;
  unitName?: string;
  reason: string;
  priority: string;
  estimatedDistance?: number;
  estimatedTime?: number;
  status: string;
  timestamp: string;
}

export interface ApiSyncState {
  isLiveApiConnected: boolean;
  apiEndpoint: string;
  lastSuccessfulSync: string | null;
  errorMessage: string | null;
  pingLatencyMs: number | null;
}

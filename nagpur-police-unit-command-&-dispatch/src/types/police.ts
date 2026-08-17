export type UnitType = 
  | 'PCR Van'
  | 'Traffic Interceptor'
  | 'Beat Marshal (Bike)'
  | 'QRT SWAT Unit'
  | 'Damini Squad (Women Safety)'
  | 'Highway Patrol';

export type AvailabilityStatus = 
  | 'AVAILABLE' 
  | 'EN_ROUTE' 
  | 'ON_SCENE' 
  | 'INVESTIGATING' 
  | 'BUSY' 
  | 'OFF_DUTY';

export type PriorityLevel = 'ROUTINE' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface UnitAssignment {
  id: string;
  assignmentTitle: string;
  incidentType: 
    | 'Traffic Congestion Control'
    | 'Road Accident (112 Call)'
    | 'Hit & Run Response'
    | 'Nakabandi & Vehicle Check'
    | 'VIP Escort Route Clearing'
    | 'Law & Order / Public Crowd'
    | 'Women Safety Response'
    | 'Routine Area Beat Patrol';
  priority: PriorityLevel;
  junctionId: number;
  junctionName: string;
  assignedAt: string; // ISO timestamp
  etaMinutes: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'RESOLVED' | 'STANDBY';
  description: string;
  dispatchedBy: string;
}

export interface UnitTelemetry {
  fuelPercentage: number;
  speedKmH: number;
  headingDegrees: number; // 0 - 360
  gpsAccuracyMeters: number;
  isSirenActive: boolean;
  bodycamActive: boolean;
  radioChannel: string;
  batteryHealthPct: number;
}

export interface UnitLocation {
  latitude: number;
  longitude: number;
  nearestJunctionId: number;
  nearestJunctionName: string;
  landmark: string;
  altitudeMeters: number;
}

export interface PoliceUnit {
  id: string;
  unitCode: string; // e.g. "MH-31-PCR-101"
  callSign: string; // e.g. "Tiger-1", "Hawk-4"
  unitType: UnitType;
  commanderName: string;
  commanderBadge: string;
  commanderPhone: string;
  crewCount: number;
  zone: string;
  location: UnitLocation;
  availability: AvailabilityStatus;
  currentAssignment: UnitAssignment | null;
  telemetry: UnitTelemetry;
  routeHistory: [number, number][]; // coordinates for breadcrumb trail
  targetDestination?: {
    junctionId: number;
    junctionName: string;
    latitude: number;
    longitude: number;
  } | null;
  lastPingTimestamp: string;
  equipment: string[];
}

export interface EmergencyIncident {
  id: string;
  code: string;
  title: string;
  category: 
    | 'Accident' 
    | 'Traffic Jam' 
    | 'Emergency 112' 
    | 'Suspicious Activity' 
    | 'Nakabandi'
    | 'VIP Escort';
  priority: PriorityLevel;
  junctionId: number;
  junctionName: string;
  reportedTime: string;
  status: 'UNASSIGNED' | 'ASSIGNED' | 'EN_ROUTE' | 'ON_SCENE' | 'RESOLVED';
  assignedUnitId?: string | null;
  assignedUnitCallSign?: string | null;
  description: string;
  reporterContact?: string;
}

export interface RadioTransmission {
  id: string;
  timestamp: string;
  unitId: string;
  callSign: string;
  frequency: string;
  type: 'DISPATCH' | 'STATUS_UPDATE' | 'SOS_ALERT' | 'CLEAR_SCENE' | '112_CALL';
  message: string;
  junctionName?: string;
}

export interface ApiSyncState {
  endpoint: string;
  status: 'connected' | 'syncing' | 'offline_fallback' | 'error';
  lastSyncTime: string | null;
  totalPings: number;
  statusCode?: number;
  errorMessage?: string;
  mode: 'LIVE_API' | 'LOCAL_TACTICAL_SIM';
}

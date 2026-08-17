import { NagpurJunction } from './traffic';

export type SeverityLevel = 'Low' | 'Moderate' | 'Heavy' | 'Critical';
export type IncidentCategory = 
  | 'Accident' 
  | 'Jam' 
  | 'Road Closed' 
  | 'Hazard' 
  | 'Roadworks' 
  | 'Vehicle Breakdown' 
  | 'Weather Alert';

export interface IncidentItem {
  id: string;
  category: IncidentCategory;
  severity: SeverityLevel;
  severityScore: number; // 1 to 4
  roadName: string;
  from?: string;
  to?: string;
  description: string;
  location: [number, number]; // [lat, lng]
  nearestJunction?: {
    id: number;
    name: string;
    distanceMeters: number;
    distanceFormatted: string;
  };
  delaySeconds: number;
  delayMinutes: number;
  lengthMeters: number;
  startTime: string;
  timeAgo: string;
  source: 'TomTom Live API' | 'Nagpur Police Control' | 'OpenStreetMap' | '112 Helpline';
  assignedUnitId?: string;
  assignedUnitName?: string;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'RESOLVED';
  isSimulated?: boolean;
}

export interface IncidentStats {
  total: number;
  accidents: number;
  jams: number;
  roadClosures: number;
  hazards: number;
  criticalSeverity: number;
  heavySeverity: number;
  moderateSeverity: number;
  lowSeverity: number;
  totalDelayMinutes: number;
}

export interface FilterOptions {
  searchQuery: string;
  category: IncidentCategory | 'ALL';
  severity: SeverityLevel | 'ALL';
  selectedJunctionId: number | null;
  sortBy: 'severity' | 'delay' | 'time';
  onlyAccidents: boolean;
}

export interface IncidentItemBackend {
  id: string;
  locationId: string;
  locationName?: string;
  timestamp: string;
  type: string;
  severity: string;
  status: string;
  description?: string;
  isSimulated: boolean;
}

export interface IncidentListResponse {
  incidents: IncidentItemBackend[];
}

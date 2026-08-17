export interface NagpurJunction {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  approximate: boolean;
  source: string;
  zone?: 'Central' | 'West' | 'East' | 'North' | 'South' | 'Outer';
}

export type IncidentCategory = 
  | 'Accident' 
  | 'Congestion' 
  | 'Road Works' 
  | 'Road Closed' 
  | 'Lane Closed' 
  | 'Hazard' 
  | 'Weather' 
  | 'Vehicle Breakdown' 
  | 'Other';

export type SeverityLevel = 'Critical' | 'Major' | 'Moderate' | 'Minor' | 'Low';

export interface IncidentItem {
  id: string;
  type: string;
  category: IncidentCategory;
  severity: SeverityLevel;
  severityScore: number; // 1 to 4
  description: string;
  location: [number, number]; // [lat, lng]
  polyline?: [number, number][]; // optional road geometry
  roadName: string;
  from?: string;
  to?: string;
  delaySeconds: number;
  delayMinutes: number;
  lengthMeters: number;
  startTime: string;
  endTime?: string;
  timeAgo: string;
  iconCategory: number;
  nearestJunction?: {
    name: string;
    distanceMeters: number;
    distanceFormatted: string;
  };
  roadNumbers?: string[];
  isAccident: boolean;
  source: 'TomTom Live API' | 'Verified Live Feed' | 'Simulated Test Stream';
}

export interface IncidentStats {
  total: number;
  accidents: number;
  critical: number;
  major: number;
  moderate: number;
  minor: number;
  totalDelayMinutes: number;
  totalLengthKm: number;
  roadClosures: number;
  lastUpdated: string;
}

export interface FilterOptions {
  searchQuery: string;
  category: 'ALL' | IncidentCategory;
  severity: 'ALL' | SeverityLevel;
  selectedJunctionId: number | null;
  sortBy: 'time' | 'severity' | 'delay' | 'distance';
  onlyAccidents: boolean;
}

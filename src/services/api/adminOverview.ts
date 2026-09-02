import { apiClient } from './client';

export interface ZoneFleetUnit {
  id: string;
  name: string;
  status: string;
  badge?: string;
}

export interface ZoneOverviewItem {
  zone_code: 'CENTRAL' | 'NORTH' | 'EAST' | 'WEST' | 'SOUTH';
  zone_name: string;
  hq: string;
  admin_username: string;
  admin_name: string;
  color: string;
  status: 'NORMAL' | 'ELEVATED' | 'HIGH_ALERT' | 'CRITICAL';
  avg_speed_kmh: number;
  congestion_level: 'LOW' | 'MODERATE' | 'HIGH' | 'SEVERE';
  weather_level: 'LOW' | 'MODERATE' | 'ELEVATED' | 'HIGH' | 'SEVERE';
  weather_temp_c: number;
  junctions_count: number;
  junctions: string[];
  key_corridors: string[];
  fleet: {
    total: number;
    available: number;
    deployed: number;
    units: ZoneFleetUnit[];
  };
  audit_logs_count: number;
  last_audit_action: string;
  last_audit_timestamp: string | null;
  active_alerts_count: number;
}

export interface ZonesOverviewResponse {
  timestamp: string;
  summary: {
    total_zones: number;
    total_junctions: number;
    total_police_units: number;
    available_units: number;
    deployed_units: number;
    total_audit_records: number;
    system_health: string;
    active_user_role?: string;
    active_user_zone?: string;
  };
  zones: ZoneOverviewItem[];
}

export const FALLBACK_ZONES_OVERVIEW: ZonesOverviewResponse = {
  timestamp: new Date().toISOString(),
  summary: {
    total_zones: 5,
    total_junctions: 44,
    total_police_units: 20,
    available_units: 18,
    deployed_units: 2,
    total_audit_records: 18,
    system_health: 'OPTIMAL',
    active_user_role: 'SYSTEM_ADMIN',
    active_user_zone: 'ALL',
  },
  zones: [
    {
      zone_code: 'CENTRAL',
      zone_name: 'Central Zone (Zone 1)',
      hq: 'Central HQ Sadar & Sitabuldi Traffic Command',
      admin_username: 'np.central.ops',
      admin_name: 'Insp. Rajesh Sharma',
      color: 'cyan',
      status: 'NORMAL',
      avg_speed_kmh: 28.5,
      congestion_level: 'MODERATE',
      weather_level: 'MODERATE',
      weather_temp_c: 31.2,
      junctions_count: 8,
      junctions: ['LIC Chowk', 'Lokmat Chowk', 'Cotton Market Chowk', 'Samvidhan Square', 'Sitabuldi', 'Variety Square', 'Jhansi Rani Square', 'Zero Mile'],
      key_corridors: ['Wardha Road North', 'Central Avenue Inner', 'Amravati Road Entry'],
      fleet: {
        total: 4,
        available: 3,
        deployed: 1,
        units: [
          { id: 'PU001', name: 'Unit PU001 - LIC Chowk', status: 'AVAILABLE', badge: 'NTP-PU001' },
          { id: 'PU002', name: 'Unit PU002 - Lokmat Chowk', status: 'AVAILABLE', badge: 'NTP-PU002' },
          { id: 'PU013', name: 'Unit PU013 - Cotton Market Chowk', status: 'EN_ROUTE', badge: 'NTP-PU013' },
          { id: 'PU019', name: 'Unit PU019 - Variety Square', status: 'AVAILABLE', badge: 'NTP-PU019' },
        ],
      },
      audit_logs_count: 5,
      last_audit_action: 'DISPATCH_APPROVED',
      last_audit_timestamp: new Date(Date.now() - 10 * 60000).toISOString(),
      active_alerts_count: 0,
    },
    {
      zone_code: 'NORTH',
      zone_name: 'North Zone (Zone 2)',
      hq: 'North Zone Interceptor HQ Mankapur',
      admin_username: 'np.north.ops',
      admin_name: 'Insp. Vikram Singh',
      color: 'amber',
      status: 'ELEVATED',
      avg_speed_kmh: 34.0,
      congestion_level: 'LOW',
      weather_level: 'LOW',
      weather_temp_c: 32.0,
      junctions_count: 6,
      junctions: ['Gaddi Godam', 'Kadbi Chowk', 'Indora Chowk', 'Mental Hospital Chowk', 'Automotive Square', 'Kamptee Chowk'],
      key_corridors: ['NH-44 North Corridor', 'Kamptee Highway Arterial', 'Mankapur Ring Road'],
      fleet: {
        total: 5,
        available: 5,
        deployed: 0,
        units: [
          { id: 'PU003', name: 'Unit PU003 - Gaddi Godam Chowk', status: 'AVAILABLE', badge: 'NTP-PU003' },
          { id: 'PU004', name: 'Unit PU004 - Indora Chowk', status: 'AVAILABLE', badge: 'NTP-PU004' },
          { id: 'PU005', name: 'Unit PU005 - Mental Hospital Chowk', status: 'AVAILABLE', badge: 'NTP-PU005' },
          { id: 'PU007', name: 'Unit PU007 - Automotive Square', status: 'AVAILABLE', badge: 'NTP-PU007' },
          { id: 'PU015', name: 'Unit PU015 - Kamptee Chowk', status: 'AVAILABLE', badge: 'NTP-PU015' },
        ],
      },
      audit_logs_count: 4,
      last_audit_action: 'CORRIDOR_OPTIMIZED',
      last_audit_timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      active_alerts_count: 1,
    },
    {
      zone_code: 'EAST',
      zone_name: 'East Zone (Zone 3)',
      hq: 'East Division HQ Lakadganj',
      admin_username: 'np.east.ops',
      admin_name: 'Insp. Prakash Kadam',
      color: 'emerald',
      status: 'NORMAL',
      avg_speed_kmh: 26.2,
      congestion_level: 'HIGH',
      weather_level: 'ELEVATED',
      weather_temp_c: 30.5,
      junctions_count: 6,
      junctions: ['Golibar Chowk', 'Vaishnodevi Chowk', 'Itwari', 'Kalamna Chowk', 'Pardi Chowk', 'Lakadganj'],
      key_corridors: ['Bhandara Road Freight Corridor', 'Central Avenue East', 'Kalamna Market Bypass'],
      fleet: {
        total: 3,
        available: 3,
        deployed: 0,
        units: [
          { id: 'PU006', name: 'Unit PU006 - Vaishnodevi Chowk', status: 'AVAILABLE', badge: 'NTP-PU006' },
          { id: 'PU011', name: 'Unit PU011 - Itwari', status: 'AVAILABLE', badge: 'NTP-PU011' },
          { id: 'PU020', name: 'Unit PU020 - Kalamna Chowk', status: 'AVAILABLE', badge: 'NTP-PU020' },
        ],
      },
      audit_logs_count: 3,
      last_audit_action: 'LOGIN_SUCCESS',
      last_audit_timestamp: new Date(Date.now() - 40 * 60000).toISOString(),
      active_alerts_count: 0,
    },
    {
      zone_code: 'WEST',
      zone_name: 'West Zone (Zone 4)',
      hq: 'Dharampeth Division HQ',
      admin_username: 'np.west.ops',
      admin_name: 'Insp. Neha Joshi',
      color: 'purple',
      status: 'NORMAL',
      avg_speed_kmh: 36.8,
      congestion_level: 'LOW',
      weather_level: 'LOW',
      weather_temp_c: 31.8,
      junctions_count: 7,
      junctions: ['Laxmi Nagar Square', 'Shankar Nagar Square', 'Ajit Bakery Square', 'Mate Chowk', 'Law College Chowk', 'Dharampeth', 'Ambazari'],
      key_corridors: ['Amravati Road Arterial', 'West High Court Road', 'Ambazari Ring Road'],
      fleet: {
        total: 4,
        available: 4,
        deployed: 0,
        units: [
          { id: 'PU008', name: 'Unit PU008 - Laxmi Nagar Square', status: 'AVAILABLE', badge: 'NTP-PU008' },
          { id: 'PU009', name: 'Unit PU009 - Shankar Nagar Square', status: 'AVAILABLE', badge: 'NTP-PU009' },
          { id: 'PU010', name: 'Unit PU010 - Ajit Bakery Square', status: 'AVAILABLE', badge: 'NTP-PU010' },
          { id: 'PU014', name: 'Unit PU014 - Mate Chowk', status: 'AVAILABLE', badge: 'NTP-PU014' },
        ],
      },
      audit_logs_count: 3,
      last_audit_action: 'THRESHOLD_UPDATED',
      last_audit_timestamp: new Date(Date.now() - 50 * 60000).toISOString(),
      active_alerts_count: 0,
    },
    {
      zone_code: 'SOUTH',
      zone_name: 'South Zone (Zone 5)',
      hq: 'Wardha Road Highway HQ Ajni',
      admin_username: 'np.south.ops',
      admin_name: 'Insp. Rakesh Bagde',
      color: 'rose',
      status: 'HIGH_ALERT',
      avg_speed_kmh: 24.1,
      congestion_level: 'HIGH',
      weather_level: 'HIGH',
      weather_temp_c: 29.8,
      junctions_count: 7,
      junctions: ['Medical Chowk', 'Manewada Chowk', 'Ajni Chowk', 'Chatrapati Chowk', 'Khamla Square', 'Somalwada', 'Trimurti Nagar'],
      key_corridors: ['Wardha Road Express Corridor', 'Ring Road South Section', 'Manewada Arterial'],
      fleet: {
        total: 4,
        available: 4,
        deployed: 0,
        units: [
          { id: 'PU012', name: 'Unit PU012 - Medical Chowk', status: 'AVAILABLE', badge: 'NTP-PU012' },
          { id: 'PU016', name: 'Unit PU016 - Manewada Chowk', status: 'AVAILABLE', badge: 'NTP-PU016' },
          { id: 'PU017', name: 'Unit PU017 - Ajni Chowk', status: 'AVAILABLE', badge: 'NTP-PU017' },
          { id: 'PU018', name: 'Unit PU018 - Chatrapati Chowk', status: 'AVAILABLE', badge: 'NTP-PU018' },
        ],
      },
      audit_logs_count: 3,
      last_audit_action: 'DISPATCH_APPROVED',
      last_audit_timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      active_alerts_count: 1,
    },
  ],
};

export async function fetchZonesOverview(): Promise<ZonesOverviewResponse> {
  const res = await apiClient<ZonesOverviewResponse>('/api/v1/admin/zones/overview');
  if (res.data && res.data.zones && res.data.zones.length > 0) {
    return res.data;
  }
  return FALLBACK_ZONES_OVERVIEW;
}

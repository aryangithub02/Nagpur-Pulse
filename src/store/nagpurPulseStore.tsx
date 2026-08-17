import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { PoliceUnit, AvailabilityStatus, UnitAssignment, RadioTransmission, ApiSyncState } from '../types/police';
import { IncidentItem, FilterOptions } from '../types/incident';
import { JunctionTrafficState, CitySummary, TrafficMetrics } from '../types/traffic';
import { NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';
import { fetchPoliceUnits } from '../services/api/police';
import { fetchIncidents, simulateIncident as apiSimulateIncident } from '../services/api/incidents';
import { fetchTrafficObservations, fetchLocations } from '../services/api/traffic';
import { fetchAllRiskPredictions } from '../services/api/risk';
import { fetchCoverage } from '../services/api/coverage';
import { calculateUnitRoute } from '../services/api/routing';
import { moveTowardsTarget, findNearestJunction, calculateBearingDegrees } from '../utils/geoUtils';
import { soundFX } from '../utils/audioEffects';
import { batchFetchJunctionTraffic, fetchTomTomIncidents, calculateTomTomRoute } from '../services/tomtomService';
import { requestPrediction, fetchRecommendations, acceptRecommendation, rejectRecommendation, RecommendationItemBackend } from '../services/api/predict';

// Initial realistic Nagpur Police Fleet
// Initial realistic Nagpur Police Fleet (20 Monitored Response Units)
const INITIAL_FLEET: PoliceUnit[] = [
  {
    id: 'PU001',
    callSign: 'Unit PU001 - LIC Chowk',
    badgeNumber: 'NTP-PU001',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Scorpio Patrol',
    licensePlate: 'MH-31-P-001',
    officersAssigned: ['Insp. Rajesh Sharma'],
    stationBase: 'Central HQ Sadar',
    availability: 'AVAILABLE',
    location: { latitude: 21.1556187, longitude: 79.0817574, nearestJunctionId: 1, nearestJunctionName: 'LIC Chowk' },
    telemetry: { speedKmH: 25, fuelPercentage: 90, isSirenActive: false, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 180 },
    routeHistory: [[21.1556187, 79.0817574]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU002',
    callSign: 'Unit PU002 - Lokmat Chowk',
    badgeNumber: 'NTP-PU002',
    unitType: 'Interceptor Vehicle',
    vehicleModel: 'Tata Safari Interceptor',
    licensePlate: 'MH-31-P-002',
    officersAssigned: ['Sub-Insp. Aniket Deshmukh'],
    stationBase: 'Sitabuldi Traffic Post',
    availability: 'AVAILABLE',
    location: { latitude: 21.1354806, longitude: 79.0780286, nearestJunctionId: 2, nearestJunctionName: 'Lokmat Chowk' },
    telemetry: { speedKmH: 18, fuelPercentage: 85, isSirenActive: false, radioChannel: '156.450 MHz', dashcamStatus: 'ONLINE', headingDegrees: 90 },
    routeHistory: [[21.1354806, 79.0780286]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU003',
    callSign: 'Unit PU003 - Gaddi Godam Chowk',
    badgeNumber: 'NTP-PU003',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Bolero Patrol',
    licensePlate: 'MH-31-P-003',
    officersAssigned: ['Const. Sunil Patil'],
    stationBase: 'Gaddi Godam Outpost',
    availability: 'AVAILABLE',
    location: { latitude: 21.1616305, longitude: 79.083725, nearestJunctionId: 3, nearestJunctionName: 'Gaddi Godam Chowk' },
    telemetry: { speedKmH: 30, fuelPercentage: 88, isSirenActive: false, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 0 },
    routeHistory: [[21.1616305, 79.083725]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU004',
    callSign: 'Unit PU004 - Indora Chowk',
    badgeNumber: 'NTP-PU004',
    unitType: 'Highway Patrol',
    vehicleModel: 'Toyota Innova Crysta',
    licensePlate: 'MH-31-P-004',
    officersAssigned: ['Insp. Vikram Singh'],
    stationBase: 'North Zone Interceptor HQ',
    availability: 'AVAILABLE',
    location: { latitude: 21.1736873, longitude: 79.1007283, nearestJunctionId: 6, nearestJunctionName: 'Indora Chowk' },
    telemetry: { speedKmH: 40, fuelPercentage: 92, isSirenActive: false, radioChannel: '156.600 MHz', dashcamStatus: 'RECORDING', headingDegrees: 45 },
    routeHistory: [[21.1736873, 79.1007283]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU005',
    callSign: 'Unit PU005 - Mental Hospital Chowk',
    badgeNumber: 'NTP-PU005',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Scorpio',
    licensePlate: 'MH-31-P-005',
    officersAssigned: ['Sub-Insp. Priya Kulkarni'],
    stationBase: 'Mankapur Division',
    availability: 'AVAILABLE',
    location: { latitude: 21.175596, longitude: 79.0785247, nearestJunctionId: 7, nearestJunctionName: 'Mental Hospital Chowk' },
    telemetry: { speedKmH: 0, fuelPercentage: 80, isSirenActive: false, radioChannel: '156.950 MHz', dashcamStatus: 'ONLINE', headingDegrees: 270 },
    routeHistory: [[21.175596, 79.0785247]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU006',
    callSign: 'Unit PU006 - Vaishnodevi Chowk',
    badgeNumber: 'NTP-PU006',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Bolero Neo',
    licensePlate: 'MH-31-P-006',
    officersAssigned: ['Const. Rahul Gawande'],
    stationBase: 'East Division HQ',
    availability: 'AVAILABLE',
    location: { latitude: 21.1480272, longitude: 79.1364057, nearestJunctionId: 8, nearestJunctionName: 'Vaishnodevi Chowk' },
    telemetry: { speedKmH: 15, fuelPercentage: 78, isSirenActive: false, radioChannel: '156.950 MHz', dashcamStatus: 'ONLINE', headingDegrees: 90 },
    routeHistory: [[21.1480272, 79.1364057]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU007',
    callSign: 'Unit PU007 - Automotive Square',
    badgeNumber: 'NTP-PU007',
    unitType: 'Highway Patrol',
    vehicleModel: 'Toyota Innova',
    licensePlate: 'MH-31-P-007',
    officersAssigned: ['Insp. Suresh Pawar'],
    stationBase: 'Automotive Square Outpost',
    availability: 'AVAILABLE',
    location: { latitude: 21.1857923, longitude: 79.1195065, nearestJunctionId: 12, nearestJunctionName: 'Automotive Square' },
    telemetry: { speedKmH: 35, fuelPercentage: 89, isSirenActive: false, radioChannel: '156.600 MHz', dashcamStatus: 'ONLINE', headingDegrees: 0 },
    routeHistory: [[21.1857923, 79.1195065]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU008',
    callSign: 'Unit PU008 - Laxmi Nagar Square',
    badgeNumber: 'NTP-PU008',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Scorpio',
    licensePlate: 'MH-31-P-008',
    officersAssigned: ['Sub-Insp. Amit Kale'],
    stationBase: 'Bajaj Nagar Station',
    availability: 'AVAILABLE',
    location: { latitude: 21.1254686, longitude: 79.0639778, nearestJunctionId: 13, nearestJunctionName: 'Laxmi Nagar Square' },
    telemetry: { speedKmH: 20, fuelPercentage: 82, isSirenActive: false, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 180 },
    routeHistory: [[21.1254686, 79.0639778]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU009',
    callSign: 'Unit PU009 - Shankar Nagar Square',
    badgeNumber: 'NTP-PU009',
    unitType: 'Interceptor Vehicle',
    vehicleModel: 'Tata Safari',
    licensePlate: 'MH-31-P-009',
    officersAssigned: ['Insp. Neha Joshi'],
    stationBase: 'Dharampeth Division',
    availability: 'AVAILABLE',
    location: { latitude: 21.1362125, longitude: 79.0616442, nearestJunctionId: 15, nearestJunctionName: 'Shankar Nagar Square' },
    telemetry: { speedKmH: 22, fuelPercentage: 87, isSirenActive: false, radioChannel: '156.450 MHz', dashcamStatus: 'ONLINE', headingDegrees: 270 },
    routeHistory: [[21.1362125, 79.0616442]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU010',
    callSign: 'Unit PU010 - Ajit Bakery Square',
    badgeNumber: 'NTP-PU010',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Bolero',
    licensePlate: 'MH-31-P-010',
    officersAssigned: ['Const. Vinod Raut'],
    stationBase: 'Dharampeth Outpost',
    availability: 'AVAILABLE',
    location: { latitude: 21.129, longitude: 79.064, nearestJunctionId: 16, nearestJunctionName: 'Ajit Bakery Square' },
    telemetry: { speedKmH: 10, fuelPercentage: 76, isSirenActive: false, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 90 },
    routeHistory: [[21.129, 79.064]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU011',
    callSign: 'Unit PU011 - Itwari',
    badgeNumber: 'NTP-PU011',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Scorpio-N',
    licensePlate: 'MH-31-P-011',
    officersAssigned: ['Insp. Prakash Kadam'],
    stationBase: 'Itwari Central Post',
    availability: 'AVAILABLE',
    location: { latitude: 21.1569338, longitude: 79.1102582, nearestJunctionId: 21, nearestJunctionName: 'Itwari' },
    telemetry: { speedKmH: 0, fuelPercentage: 91, isSirenActive: false, radioChannel: '156.950 MHz', dashcamStatus: 'ONLINE', headingDegrees: 0 },
    routeHistory: [[21.1569338, 79.1102582]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU012',
    callSign: 'Unit PU012 - Medical Chowk',
    badgeNumber: 'NTP-PU012',
    unitType: 'Highway Patrol',
    vehicleModel: 'Toyota Innova Crysta',
    licensePlate: 'MH-31-P-012',
    officersAssigned: ['Sub-Insp. Rakesh Bagde'],
    stationBase: 'Medical Square Post',
    availability: 'AVAILABLE',
    location: { latitude: 21.1314524, longitude: 79.0977219, nearestJunctionId: 24, nearestJunctionName: 'Medical Chowk' },
    telemetry: { speedKmH: 28, fuelPercentage: 84, isSirenActive: false, radioChannel: '156.600 MHz', dashcamStatus: 'RECORDING', headingDegrees: 180 },
    routeHistory: [[21.1314524, 79.0977219]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU013',
    callSign: 'Unit PU013 - Cotton Market Chowk',
    badgeNumber: 'NTP-PU013',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Bolero',
    licensePlate: 'MH-31-P-013',
    officersAssigned: ['Const. Deepak Shinde'],
    stationBase: 'Ganeshpeth Station',
    availability: 'EN_ROUTE',
    location: { latitude: 21.1459896, longitude: 79.0897729, nearestJunctionId: 25, nearestJunctionName: 'Cotton Market Chowk' },
    telemetry: { speedKmH: 32, fuelPercentage: 70, isSirenActive: true, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 90 },
    routeHistory: [[21.1459896, 79.0897729]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU014',
    callSign: 'Unit PU014 - Mate Chowk',
    badgeNumber: 'NTP-PU014',
    unitType: 'Interceptor Vehicle',
    vehicleModel: 'Tata Safari',
    licensePlate: 'MH-31-P-014',
    officersAssigned: ['Insp. Smita Patil'],
    stationBase: 'Pratap Nagar Post',
    availability: 'EN_ROUTE',
    location: { latitude: 21.1216256, longitude: 79.0564783, nearestJunctionId: 28, nearestJunctionName: 'Mate Chowk' },
    telemetry: { speedKmH: 38, fuelPercentage: 75, isSirenActive: true, radioChannel: '156.450 MHz', dashcamStatus: 'ONLINE', headingDegrees: 270 },
    routeHistory: [[21.1216256, 79.0564783]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU015',
    callSign: 'Unit PU015 - Kamptee Chowk',
    badgeNumber: 'NTP-PU015',
    unitType: 'Highway Patrol',
    vehicleModel: 'Toyota Innova',
    licensePlate: 'MH-31-P-015',
    officersAssigned: ['Sub-Insp. Sanjay Wankhede'],
    stationBase: 'Kamptee Highway Outpost',
    availability: 'EN_ROUTE',
    location: { latitude: 21.1888687, longitude: 79.1238271, nearestJunctionId: 30, nearestJunctionName: 'Kamptee Chowk' },
    telemetry: { speedKmH: 45, fuelPercentage: 81, isSirenActive: true, radioChannel: '156.600 MHz', dashcamStatus: 'RECORDING', headingDegrees: 0 },
    routeHistory: [[21.1888687, 79.1238271]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU016',
    callSign: 'Unit PU016 - Manewada Chowk',
    badgeNumber: 'NTP-PU016',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Scorpio',
    licensePlate: 'MH-31-P-016',
    officersAssigned: ['Const. Manoj Tiwari'],
    stationBase: 'Manewada Division',
    availability: 'EN_ROUTE',
    location: { latitude: 21.1051881, longitude: 79.1024825, nearestJunctionId: 32, nearestJunctionName: 'Manewada Chowk' },
    telemetry: { speedKmH: 25, fuelPercentage: 68, isSirenActive: false, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 180 },
    routeHistory: [[21.1051881, 79.1024825]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU017',
    callSign: 'Unit PU017 - Ajni Chowk',
    badgeNumber: 'NTP-PU017',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Bolero',
    licensePlate: 'MH-31-P-017',
    officersAssigned: ['Insp. Arvind Gokhale'],
    stationBase: 'Ajni Police Station',
    availability: 'EN_ROUTE',
    location: { latitude: 21.1182122, longitude: 79.0721071, nearestJunctionId: 34, nearestJunctionName: 'Ajni Chowk' },
    telemetry: { speedKmH: 30, fuelPercentage: 73, isSirenActive: true, radioChannel: '156.800 MHz', dashcamStatus: 'ONLINE', headingDegrees: 90 },
    routeHistory: [[21.1182122, 79.0721071]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU018',
    callSign: 'Unit PU018 - Chatrapati Chowk',
    badgeNumber: 'NTP-PU018',
    unitType: 'Highway Patrol',
    vehicleModel: 'Toyota Innova Crysta',
    licensePlate: 'MH-31-P-018',
    officersAssigned: ['Sub-Insp. Kiran Mahajan'],
    stationBase: 'Wardha Road Highway HQ',
    availability: 'OFFLINE',
    location: { latitude: 21.109139, longitude: 79.0696114, nearestJunctionId: 35, nearestJunctionName: 'Chatrapati Chowk' },
    telemetry: { speedKmH: 0, fuelPercentage: 60, isSirenActive: false, radioChannel: '156.600 MHz', dashcamStatus: 'OFFLINE', headingDegrees: 0 },
    routeHistory: [[21.109139, 79.0696114]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU019',
    callSign: 'Unit PU019 - Variety Square',
    badgeNumber: 'NTP-PU019',
    unitType: 'PCR Van',
    vehicleModel: 'Mahindra Scorpio',
    licensePlate: 'MH-31-P-019',
    officersAssigned: ['Const. Gopal Meshram'],
    stationBase: 'Sitabuldi Market Outpost',
    availability: 'OFFLINE',
    location: { latitude: 21.1434953, longitude: 79.0809881, nearestJunctionId: 37, nearestJunctionName: 'Variety Square' },
    telemetry: { speedKmH: 0, fuelPercentage: 55, isSirenActive: false, radioChannel: '156.800 MHz', dashcamStatus: 'OFFLINE', headingDegrees: 270 },
    routeHistory: [[21.1434953, 79.0809881]],
    lastPingTimestamp: new Date().toISOString(),
  },
  {
    id: 'PU020',
    callSign: 'Unit PU020 - Jhansi Rani Square',
    badgeNumber: 'NTP-PU020',
    unitType: 'Interceptor Vehicle',
    vehicleModel: 'Tata Safari Interceptor',
    licensePlate: 'MH-31-P-020',
    officersAssigned: ['Insp. Sunita Rao'],
    stationBase: 'Sitabuldi Zone HQ',
    availability: 'OFFLINE',
    location: { latitude: 21.1411618, longitude: 79.0801886, nearestJunctionId: 38, nearestJunctionName: 'Jhansi Rani Square' },
    telemetry: { speedKmH: 0, fuelPercentage: 50, isSirenActive: false, radioChannel: '156.450 MHz', dashcamStatus: 'OFFLINE', headingDegrees: 180 },
    routeHistory: [[21.1411618, 79.0801886]],
    lastPingTimestamp: new Date().toISOString(),
  },
];

// Initial Incident list
const INITIAL_INCIDENTS: IncidentItem[] = [
  {
    id: 'inc-101',
    category: 'Accident',
    severity: 'Critical',
    severityScore: 4,
    roadName: 'Wardha Road (Chatrapati Flyover)',
    from: 'Somalwada',
    to: 'Ajni Square',
    description: 'Multi-vehicle collision involving two cars and a container truck. Blocked left lane.',
    location: [21.109139, 79.0696114],
    nearestJunction: {
      id: 35,
      name: 'Chatrapati Chowk',
      distanceMeters: 120,
      distanceFormatted: '120m away',
    },
    delaySeconds: 1240,
    delayMinutes: 20,
    lengthMeters: 1800,
    startTime: new Date(Date.now() - 15 * 60000).toISOString(),
    timeAgo: '15 mins ago',
    source: '112 Helpline',
    status: 'ACTIVE',
  },
  {
    id: 'inc-102',
    category: 'Jam',
    severity: 'Heavy',
    severityScore: 3,
    roadName: 'Sitabuldi Main Road',
    from: 'Variety Square',
    to: 'Cotton Market Chowk',
    description: 'Heavy bottleneck around metro construction and evening retail footfall.',
    location: [21.1415725, 79.0828592],
    nearestJunction: {
      id: 22,
      name: 'Sitabuldi Chowk',
      distanceMeters: 50,
      distanceFormatted: '50m away',
    },
    delaySeconds: 900,
    delayMinutes: 15,
    lengthMeters: 1200,
    startTime: new Date(Date.now() - 30 * 60000).toISOString(),
    timeAgo: '30 mins ago',
    source: 'TomTom Live API',
    status: 'IN_PROGRESS',
    assignedUnitId: 'unit-pcr-101',
    assignedUnitName: 'Tiger-1 (Central)',
  },
  {
    id: 'inc-103',
    category: 'Hazard',
    severity: 'Moderate',
    severityScore: 2,
    roadName: 'Kamptee Road',
    from: 'Kadbi Chowk',
    to: 'Indora Chowk',
    description: 'Stalled heavy commercial vehicle causing slow moving queue.',
    location: [21.1736873, 79.1007283],
    nearestJunction: {
      id: 6,
      name: 'Indora Chowk',
      distanceMeters: 80,
      distanceFormatted: '80m away',
    },
    delaySeconds: 420,
    delayMinutes: 7,
    lengthMeters: 650,
    startTime: new Date(Date.now() - 45 * 60000).toISOString(),
    timeAgo: '45 mins ago',
    source: 'Nagpur Police Control',
    status: 'ACTIVE',
  },
];

interface NagpurPulseStoreContextType {
  // Police Units
  units: PoliceUnit[];
  selectedUnit: PoliceUnit | null;
  setSelectedUnit: (unit: PoliceUnit | null) => void;
  dispatchUnit: (unitId: string, junctionId: number, junctionName: string, incidentType: string, priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL') => Promise<void>;
  updateUnitStatus: (unitId: string, status: AvailabilityStatus) => void;
  
  // Incidents
  incidents: IncidentItem[];
  selectedIncident: IncidentItem | null;
  setSelectedIncident: (inc: IncidentItem | null) => void;
  triggerEmergencyIncident: () => void;
  simulateIncidentOnBackend: (junctionId: number) => Promise<void>;

  // Traffic
  junctionStates: JunctionTrafficState[];
  citySummary: CitySummary | null;
  selectedJunction: any | null;
  setSelectedJunction: (j: any | null) => void;
  refreshTraffic: () => Promise<void>;

  // Risk & Coverage
  riskData: any[];
  coverageData: any | null;

  // Radio & Logs
  radioLogs: RadioTransmission[];

  // API Sync State
  apiSyncState: ApiSyncState;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;

  // Active Route Polyline
  activeRoutePolyline: [number, number][];
  activeRouteDetails: { distanceKm: number; etaMinutes: number } | null;

  // Predictions & Recommendations
  recommendations: RecommendationItemBackend[];
  requestPredictionForJunction: (junctionId: number, speed?: number, density?: number) => Promise<any>;
  acceptRec: (recId: string) => Promise<void>;
  rejectRec: (recId: string) => Promise<void>;
}

const NagpurPulseStoreContext = createContext<NagpurPulseStoreContextType | undefined>(undefined);

export const NagpurPulseStoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [units, setUnits] = useState<PoliceUnit[]>(INITIAL_FLEET);
  const [selectedUnit, setSelectedUnit] = useState<PoliceUnit | null>(null);

  const [incidents, setIncidents] = useState<IncidentItem[]>(INITIAL_INCIDENTS);
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);

  const [junctionStates, setJunctionStates] = useState<JunctionTrafficState[]>(() =>
    NAGPUR_JUNCTIONS.map((j) => ({
      junction: j,
      metrics: {
        currentSpeed: Math.floor(Math.random() * 25) + 15,
        freeFlowSpeed: 50,
        currentTravelTime: 180,
        freeFlowTravelTime: 60,
        delaySeconds: Math.floor(Math.random() * 300) + 30,
        congestionLevel: j.trafficCongestion === 'Gridlock' ? 'gridlock' : j.trafficCongestion === 'Heavy' ? 'heavy' : j.trafficCongestion === 'Moderate' ? 'moderate' : 'fluid',
        confidenceScore: 0.92,
        roadClosure: false,
        frc: 'FRC2',
        streetName: j.name,
        updatedAt: new Date().toISOString(),
      },
      isLoading: false,
      error: null,
    }))
  );

  const [selectedJunction, setSelectedJunction] = useState<any | null>(NAGPUR_JUNCTIONS[0]);
  const [riskData, setRiskData] = useState<any[]>([]);
  const [coverageData, setCoverageData] = useState<any | null>(null);
  const [recommendations, setRecommendations] = useState<RecommendationItemBackend[]>([]);
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  const [activeRoutePolyline, setActiveRoutePolyline] = useState<[number, number][]>([]);
  const [activeRouteDetails, setActiveRouteDetails] = useState<{ distanceKm: number; etaMinutes: number } | null>(null);

  const [apiSyncState, setApiSyncState] = useState<ApiSyncState>({
    isLiveApiConnected: true,
    apiEndpoint: 'http://localhost:8000/api',
    lastSuccessfulSync: new Date().toISOString(),
    errorMessage: null,
    pingLatencyMs: 14,
  });

  const [radioLogs, setRadioLogs] = useState<RadioTransmission[]>([
    {
      id: 'tx-101',
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      unitId: 'unit-highway-301',
      callSign: 'Eagle-1 (Highway Patrol)',
      frequency: '156.600 MHz',
      type: 'DISPATCH',
      message: 'Responding Code-3 to Chatrapati Chowk multi-vehicle collision. Sirens and flashers active.',
      junctionName: 'Chatrapati Chowk',
    },
    {
      id: 'tx-102',
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      unitId: 'unit-pcr-101',
      callSign: 'Tiger-1 (Central)',
      frequency: '156.800 MHz',
      type: 'STATUS_UPDATE',
      message: 'On-scene Sitabuldi Chowk. Commencing foot-beat traffic decongestion at Metro Gate 2.',
      junctionName: 'Sitabuldi Chowk',
    },
  ]);

  // Load backend datasets & TomTom Live API
  const loadBackendData = useCallback(async () => {
    // 0. Locations Ingest from Database
    const locRes = await fetchLocations();
    if (!locRes.error && locRes.locations.length > 0) {
      setJunctionStates((prev) =>
        prev.map((item) => {
          const dbLoc = locRes.locations.find((l) => String(l.id) === String(item.junction.id));
          if (dbLoc) {
            return {
              ...item,
              junction: {
                ...item.junction,
                name: dbLoc.name,
                latitude: dbLoc.latitude,
                longitude: dbLoc.longitude,
              },
            };
          }
          return item;
        })
      );
    }

    // 1. Police Units Ingest from Database
    const pRes = await fetchPoliceUnits();
    if (!pRes.error && pRes.units.length > 0) {
      const dbFleet: PoliceUnit[] = pRes.units.map((u) => ({
        id: u.id,
        callSign: u.name,
        badgeNumber: u.badgeNumber || 'NGP-P-101',
        unitType: (u.unitType as any) || 'PCR Van',
        vehicleModel: 'Mahindra Scorpio-N Patrol',
        licensePlate: 'MH-31-P-9900',
        officersAssigned: ['Inspector V. Sharma'],
        stationBase: 'Sitabuldi Station',
        availability: (u.status as any) || 'AVAILABLE',
        location: {
          latitude: u.latitude,
          longitude: u.longitude,
          nearestJunctionId: 1,
          nearestJunctionName: 'Sitabuldi Chowk',
        },
        telemetry: {
          speedKmH: 35,
          fuelPercentage: 88,
          isSirenActive: false,
          radioChannel: 'CH-1 Control',
          dashcamStatus: 'ONLINE',
          headingDegrees: 90,
        },
        routeHistory: [],
        lastPingTimestamp: u.updatedAt || new Date().toISOString(),
      }));
      setUnits(dbFleet);
      setApiSyncState((prev) => ({
        ...prev,
        isLiveApiConnected: true,
        lastSuccessfulSync: new Date().toISOString(),
        errorMessage: null,
      }));
    }

    // 2. TomTom Live Traffic Flow for Junctions
    try {
      const tomTomMetricsMap = await batchFetchJunctionTraffic(NAGPUR_JUNCTIONS);
      if (tomTomMetricsMap.size > 0) {
        setJunctionStates((prev) =>
          prev.map((item) => {
            const liveMetrics = tomTomMetricsMap.get(item.junction.id);
            if (liveMetrics) {
              return {
                ...item,
                metrics: liveMetrics,
                isLoading: false,
                error: null,
              };
            }
            return item;
          })
        );
      }
    } catch (err) {
      console.warn('TomTom batch traffic fetch fallback:', err);
    }

    // 3. Incidents (Backend + Live TomTom Incidents)
    const [iRes, tomTomIncidents] = await Promise.all([
      fetchIncidents(),
      fetchTomTomIncidents(),
    ]);

    let parsedIncidents: IncidentItem[] = [];
    if (!iRes.error && iRes.incidents.length > 0) {
      parsedIncidents = iRes.incidents.map((b) => {
        const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === b.locationId) || NAGPUR_JUNCTIONS[0];
        return {
          id: b.id,
          category: b.type === 'ACCIDENT' ? 'Accident' : b.type === 'CONGESTION' ? 'Jam' : 'Hazard',
          severity: b.severity === 'CRITICAL' ? 'Critical' : b.severity === 'HIGH' ? 'Heavy' : 'Moderate',
          severityScore: b.severity === 'CRITICAL' ? 4 : b.severity === 'HIGH' ? 3 : 2,
          roadName: j.name,
          description: b.description || `${b.type} incident active at ${j.name}`,
          location: [j.latitude, j.longitude],
          nearestJunction: {
            id: j.id,
            name: j.name,
            distanceMeters: 60,
            distanceFormatted: '60m away',
          },
          delaySeconds: 600,
          delayMinutes: 10,
          lengthMeters: 800,
          startTime: b.timestamp,
          timeAgo: 'Just now',
          source: b.isSimulated ? '112 Helpline' : 'Nagpur Police Control',
          status: b.status as any,
          isSimulated: b.isSimulated,
        };
      });
    }

    const combinedIncidents = [...parsedIncidents, ...tomTomIncidents];
    if (combinedIncidents.length > 0) {
      setIncidents(combinedIncidents);
    }

    // 4. Fallback Traffic Observations from Backend if TomTom metric is missing
    const tRes = await fetchTrafficObservations();
    if (!tRes.error && tRes.traffic.length > 0) {
      setJunctionStates((prev) =>
        prev.map((item) => {
          if (!item.metrics) {
            const matched = tRes.traffic.find((tr) => tr.locationId === String(item.junction.id));
            if (matched) {
              return {
                ...item,
                metrics: {
                  currentSpeed: matched.speed || 35,
                  freeFlowSpeed: 50,
                  currentTravelTime: 200,
                  freeFlowTravelTime: 100,
                  delaySeconds: Math.max(0, 200 - 100),
                  congestionLevel: matched.congestionLevel.toLowerCase() as any,
                  confidenceScore: 0.95,
                  roadClosure: false,
                  frc: 'FRC2',
                  streetName: item.junction.name,
                  updatedAt: matched.timestamp,
                },
              };
            }
          }
          return item;
        })
      );
    }

    // 5. Risk Predictions
    const rRes = await fetchAllRiskPredictions();
    if (!rRes.error) {
      setRiskData(rRes.riskData);
    }

    // 6. Coverage
    const cRes = await fetchCoverage();
    if (!cRes.error) {
      setCoverageData(cRes);
    }

    // 7. Deployment Recommendations
    const recRes = await fetchRecommendations();
    if (!recRes.error) {
      setRecommendations(recRes.recommendations);
    }
  }, []);

  const requestPredictionForJunction = useCallback(
    async (junctionId: number, speed?: number, density = 80) => {
      const j = NAGPUR_JUNCTIONS.find((loc) => loc.id === junctionId) || NAGPUR_JUNCTIONS[0];
      const stateItem = junctionStates.find((js) => js.junction.id === junctionId);
      const liveSpeed = speed ?? (stateItem?.metrics?.currentSpeed || 35);
      const liveCongestion = stateItem?.metrics?.delaySeconds
        ? Math.min(95, Math.max(15, Math.round((stateItem.metrics.delaySeconds / 300) * 100)))
        : (stateItem?.metrics?.congestionLevel === 'gridlock' ? 90 : stateItem?.metrics?.congestionLevel === 'heavy' ? 70 : 35);

      const incidentCount = incidents.filter((inc) => inc.nearestJunction?.id === junctionId || inc.roadName.includes(j.name)).length;

      const payload = {
        junction_id: junctionId,
        features: {
          speed: liveSpeed,
          density,
          congestion: liveCongestion,
          accidents_7d: incidentCount,
          accidents_lag_1: incidentCount,
          latitude: j.latitude,
          longitude: j.longitude,
          road_name: j.name,
        },
      };
      const res = await requestPrediction(payload);
      if (res.data) {
        // Refresh risk data from backend DB
        const rRes = await fetchAllRiskPredictions();
        if (!rRes.error) {
          setRiskData(rRes.riskData);
        }
      }
      return res.data;
    },
    [junctionStates, incidents]
  );

  const acceptRec = useCallback(async (recId: string) => {
    const res = await acceptRecommendation(recId);
    if (res.success) {
      const recRes = await fetchRecommendations();
      if (!recRes.error) {
        setRecommendations(recRes.recommendations);
      }
    }
  }, []);

  const rejectRec = useCallback(async (recId: string) => {
    const res = await rejectRecommendation(recId);
    if (res.success) {
      const recRes = await fetchRecommendations();
      if (!recRes.error) {
        setRecommendations(recRes.recommendations);
      }
    }
  }, []);

  useEffect(() => {
    loadBackendData();
    const interval = setInterval(loadBackendData, 20000);
    return () => clearInterval(interval);
  }, [loadBackendData]);

  // Movement loop for police units
  useEffect(() => {
    if (simSpeed === 0) return;
    const intervalTime = 1000 / simSpeed;

    const timer = setInterval(() => {
      setUnits((prevUnits) =>
        prevUnits.map((unit) => {
          if (unit.availability === 'EN_ROUTE' && unit.targetDestination) {
            const step = moveTowardsTarget(
              unit.location.latitude,
              unit.location.longitude,
              unit.targetDestination.latitude,
              unit.targetDestination.longitude,
              0.05 * simSpeed
            );

            const newBearing = calculateBearingDegrees(
              unit.location.latitude,
              unit.location.longitude,
              step.lat,
              step.lng
            );

            const nearest = findNearestJunction(step.lat, step.lng);

            if (step.reached) {
              const arrivedName = unit.targetDestination.junctionName;
              setRadioLogs((prev) => [
                {
                  id: `tx-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  unitId: unit.id,
                  callSign: unit.callSign,
                  frequency: unit.telemetry.radioChannel.split(' - ')[1] || '156.800 MHz',
                  type: 'STATUS_UPDATE',
                  message: `Unit 10-23 (Arrived On Scene) at ${arrivedName}. Initiating tactical response.`,
                  junctionName: arrivedName,
                },
                ...prev.slice(0, 49),
              ]);

              return {
                ...unit,
                availability: 'ON_SCENE' as AvailabilityStatus,
                location: {
                  ...unit.location,
                  latitude: step.lat,
                  longitude: step.lng,
                  nearestJunctionId: nearest.junction.id,
                  nearestJunctionName: nearest.junction.name,
                },
                telemetry: {
                  ...unit.telemetry,
                  speedKmH: 0,
                  isSirenActive: true,
                  headingDegrees: newBearing,
                },
                routeHistory: [...unit.routeHistory.slice(-15), [step.lat, step.lng]],
                lastPingTimestamp: new Date().toISOString(),
              };
            }

            return {
              ...unit,
              location: {
                ...unit.location,
                latitude: step.lat,
                longitude: step.lng,
                nearestJunctionId: nearest.junction.id,
                nearestJunctionName: nearest.junction.name,
              },
              telemetry: {
                ...unit.telemetry,
                speedKmH: Math.floor(Math.random() * 15) + 48,
                isSirenActive: true,
                headingDegrees: Math.round(newBearing),
              },
              routeHistory: [...unit.routeHistory.slice(-15), [step.lat, step.lng]],
              lastPingTimestamp: new Date().toISOString(),
            };
          }
          return unit;
        })
      );
    }, intervalTime);

    return () => clearInterval(timer);
  }, [simSpeed]);

  // Dispatch Action
  const dispatchUnit = async (
    unitId: string,
    junctionId: number,
    junctionName: string,
    incidentType: string,
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  ) => {
    const targetJunction = NAGPUR_JUNCTIONS.find((j) => j.id === junctionId) || NAGPUR_JUNCTIONS[0];
    
    // Call backend routing service
    const routeRes = await calculateUnitRoute(unitId, junctionId);
    let coords: [number, number][] = [
      [targetJunction.latitude, targetJunction.longitude]
    ];
    let distanceKm = 3.2;
    let etaMinutes = 5;

    if (routeRes.route) {
      distanceKm = routeRes.route.distanceKm;
      etaMinutes = routeRes.route.estimatedTimeMinutes;
      if (routeRes.route.routeGeometry && routeRes.route.routeGeometry.coordinates) {
        coords = routeRes.route.routeGeometry.coordinates.map((pair) => [pair[1], pair[0]]);
      }
    }

    setActiveRoutePolyline(coords);
    setActiveRouteDetails({ distanceKm, etaMinutes });

    if (soundEnabled) soundFX.playDispatchChime();

    setUnits((prev) =>
      prev.map((u) => {
        if (u.id === unitId) {
          const updated: PoliceUnit = {
            ...u,
            availability: 'EN_ROUTE',
            targetDestination: {
              latitude: targetJunction.latitude,
              longitude: targetJunction.longitude,
              junctionId,
              junctionName,
            },
            currentAssignment: {
              junctionId,
              junctionName,
              incidentType,
              priority,
              assignedTimestamp: new Date().toISOString(),
              etaMinutes,
              distanceKm,
            },
          };
          if (selectedUnit?.id === unitId) setSelectedUnit(updated);
          return updated;
        }
        return u;
      })
    );

    setRadioLogs((prev) => [
      {
        id: `tx-${Date.now()}`,
        timestamp: new Date().toISOString(),
        unitId,
        callSign: units.find((u) => u.id === unitId)?.callSign || 'Police Dispatch',
        frequency: '156.800 MHz',
        type: 'DISPATCH',
        message: `DISPATCH ALERT: En-route to ${junctionName} for ${incidentType}. Priority ${priority}. Distance: ${distanceKm} km, ETA: ${etaMinutes} mins.`,
        junctionName,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const updateUnitStatus = (unitId: string, status: AvailabilityStatus) => {
    setUnits((prev) =>
      prev.map((u) => {
        if (u.id === unitId) {
          const updated = { ...u, availability: status };
          if (selectedUnit?.id === unitId) setSelectedUnit(updated);
          return updated;
        }
        return u;
      })
    );
  };

  const triggerEmergencyIncident = () => {
    if (soundEnabled) soundFX.playEmergencyAlert();

    const randomJunction = NAGPUR_JUNCTIONS[Math.floor(Math.random() * NAGPUR_JUNCTIONS.length)];
    const newInc: IncidentItem = {
      id: `inc-112-${Date.now()}`,
      category: 'Accident',
      severity: 'Critical',
      severityScore: 4,
      roadName: `${randomJunction.name} Flyover`,
      description: `CITIZEN EMERGENCY 112 CALL: Severe accident reported at ${randomJunction.name}. Police & Ambulance required immediately.`,
      location: [randomJunction.latitude, randomJunction.longitude],
      nearestJunction: {
        id: randomJunction.id,
        name: randomJunction.name,
        distanceMeters: 20,
        distanceFormatted: '20m away',
      },
      delaySeconds: 1200,
      delayMinutes: 20,
      lengthMeters: 1500,
      startTime: new Date().toISOString(),
      timeAgo: 'Just now',
      source: '112 Helpline',
      status: 'ACTIVE',
      isSimulated: true,
    };

    setIncidents((prev) => [newInc, ...prev]);
    setSelectedIncident(newInc);

    setRadioLogs((prev) => [
      {
        id: `tx-112-${Date.now()}`,
        timestamp: new Date().toISOString(),
        unitId: 'DIAL-112-HQ',
        callSign: '112 Nagpur Dispatch',
        frequency: '156.800 MHz',
        type: '112_CALL',
        message: `EMERGENCY 112 ALERT: High-priority accident at ${randomJunction.name}! All nearby units respond.`,
        junctionName: randomJunction.name,
      },
      ...prev.slice(0, 49),
    ]);
  };

  const simulateIncidentOnBackend = async (junctionId: number) => {
    const res = await apiSimulateIncident({
      locationId: String(junctionId),
      type: 'ACCIDENT',
      severity: 'CRITICAL',
      description: 'Simulated high-priority multi-vehicle collision',
    });

    if (res.incident) {
      loadBackendData();
    }
  };

  const refreshTraffic = async () => {
    await loadBackendData();
  };

  // City Summary Calculation
  const citySummary: CitySummary | null = React.useMemo(() => {
    const loaded = junctionStates.filter((j) => j.metrics !== null);
    if (loaded.length === 0) return null;

    let totalSpeed = 0;
    let totalFreeFlow = 0;
    let fluidCount = 0;
    let congestedCount = 0;
    let closedCount = 0;

    let highestDelayJunction: JunctionTrafficState | null = null;
    let slowestJunction: JunctionTrafficState | null = null;
    let fastestJunction: JunctionTrafficState | null = null;

    loaded.forEach((j) => {
      const m = j.metrics!;
      totalSpeed += m.currentSpeed;
      totalFreeFlow += m.freeFlowSpeed;

      if (m.congestionLevel === 'fluid') fluidCount++;
      if (m.congestionLevel === 'heavy' || m.congestionLevel === 'gridlock') congestedCount++;
      if (m.roadClosure) closedCount++;

      if (!highestDelayJunction || m.delaySeconds > (highestDelayJunction.metrics?.delaySeconds || 0)) {
        highestDelayJunction = j;
      }
      if (!slowestJunction || m.currentSpeed < (slowestJunction.metrics?.currentSpeed ?? 999)) {
        slowestJunction = j;
      }
      if (!fastestJunction || m.currentSpeed > (fastestJunction.metrics?.currentSpeed ?? 0)) {
        fastestJunction = j;
      }
    });

    const avgSpeed = Math.round(totalSpeed / loaded.length);
    const avgFreeFlowSpeed = Math.round(totalFreeFlow / loaded.length);
    const speedRatio = avgFreeFlowSpeed > 0 ? avgSpeed / avgFreeFlowSpeed : 1;
    const overallCongestionScore = Math.max(0, Math.min(100, Math.round((1 - speedRatio) * 100)));

    return {
      avgSpeed,
      avgFreeFlowSpeed,
      overallCongestionScore,
      congestedCount,
      fluidCount,
      closedRoadsCount: closedCount,
      totalTracked: loaded.length,
      highestDelayJunction,
      slowestJunction,
      fastestJunction,
      lastUpdated: Date.now(),
    };
  }, [junctionStates]);

  return (
    <NagpurPulseStoreContext.Provider
      value={{
        units,
        selectedUnit,
        setSelectedUnit,
        dispatchUnit,
        updateUnitStatus,
        incidents,
        selectedIncident,
        setSelectedIncident,
        triggerEmergencyIncident,
        simulateIncidentOnBackend,
        junctionStates,
        citySummary,
        selectedJunction,
        setSelectedJunction,
        refreshTraffic,
        riskData,
        coverageData,
        radioLogs,
        apiSyncState,
        simSpeed,
        setSimSpeed,
        soundEnabled,
        setSoundEnabled,
        activeRoutePolyline,
        activeRouteDetails,
        recommendations,
        requestPredictionForJunction,
        acceptRec,
        rejectRec,
      }}
    >
      {children}
    </NagpurPulseStoreContext.Provider>
  );
};

export function useNagpurPulseStore() {
  const context = useContext(NagpurPulseStoreContext);
  if (!context) {
    throw new Error('useNagpurPulseStore must be used within a NagpurPulseStoreProvider');
  }
  return context;
}

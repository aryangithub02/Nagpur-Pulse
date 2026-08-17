import { NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';
import { PoliceUnit, AvailabilityStatus, UnitType, PriorityLevel, UnitAssignment, ApiSyncState } from '../types/police';
import { findNearestJunction } from '../utils/geoUtils';

const BEECEPTOR_API_URL = 'https://accident-api.free.beeceptor.com/api/police-units';

// Initial realistic seed fleet distributed across Nagpur police jurisdictions
export const INITIAL_NAGPUR_POLICE_FLEET: PoliceUnit[] = [
  {
    id: 'unit-pcr-101',
    unitCode: 'MH-31-PCR-101',
    callSign: 'Tiger-1 (Central)',
    unitType: 'PCR Van',
    commanderName: 'Insp. Rajesh Sharma',
    commanderBadge: 'NPD-4829',
    commanderPhone: '+91 98230 44101',
    crewCount: 4,
    zone: 'Zone 1 - Central',
    location: {
      latitude: 21.1415725,
      longitude: 79.0828592,
      nearestJunctionId: 22,
      nearestJunctionName: 'Sitabuldi Chowk',
      landmark: 'Near Sitabuldi Metro Interchange',
      altitudeMeters: 310
    },
    availability: 'ON_SCENE',
    currentAssignment: {
      id: 'asg-8801',
      assignmentTitle: 'Peak Hour Traffic & Crowd Decongestion',
      incidentType: 'Traffic Congestion Control',
      priority: 'HIGH',
      junctionId: 22,
      junctionName: 'Sitabuldi Chowk',
      assignedAt: new Date(Date.now() - 18 * 60000).toISOString(),
      etaMinutes: 0,
      status: 'IN_PROGRESS',
      description: 'Regulating pedestrian surge from metro gate 2 and managing four-arm vehicle flow.',
      dispatchedBy: 'Nagpur Central Control Room (Duty Officer Patil)'
    },
    telemetry: {
      fuelPercentage: 88,
      speedKmH: 0,
      headingDegrees: 90,
      gpsAccuracyMeters: 2.1,
      isSirenActive: true,
      bodycamActive: true,
      radioChannel: 'Nagpur Central - 156.800 MHz',
      batteryHealthPct: 96
    },
    routeHistory: [
      [21.1526445, 79.0809738],
      [21.1466000, 79.0855000],
      [21.1415725, 79.0828592]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Breathalyzer', 'Heavy Barrier Cones', 'First Aid Trauma Kit', 'Strobe Siren Bar', 'Handheld VHF Transceiver']
  },
  {
    id: 'unit-traffic-204',
    unitCode: 'MH-31-TRF-204',
    callSign: 'Falcon-4 (Interceptor)',
    unitType: 'Traffic Interceptor',
    commanderName: 'Sub-Insp. Aniket Deshmukh',
    commanderBadge: 'NPD-5102',
    commanderPhone: '+91 98230 44204',
    crewCount: 3,
    zone: 'Zone 1 - Central',
    location: {
      latitude: 21.1556187,
      longitude: 79.0817574,
      nearestJunctionId: 1,
      nearestJunctionName: 'LIC Chowk',
      landmark: 'Opposite LIC Divisional HQ',
      altitudeMeters: 312
    },
    availability: 'AVAILABLE',
    currentAssignment: {
      id: 'asg-8802',
      assignmentTitle: 'Speed Radar & Lane Discipline Radar',
      incidentType: 'Routine Area Beat Patrol',
      priority: 'ROUTINE',
      junctionId: 1,
      junctionName: 'LIC Chowk',
      assignedAt: new Date(Date.now() - 40 * 60000).toISOString(),
      etaMinutes: 0,
      status: 'STANDBY',
      description: 'Automated ANPR camera monitoring and wrong-side driving deterrence.',
      dispatchedBy: 'Traffic HQ Sadar'
    },
    telemetry: {
      fuelPercentage: 74,
      speedKmH: 14,
      headingDegrees: 180,
      gpsAccuracyMeters: 1.8,
      isSirenActive: false,
      bodycamActive: true,
      radioChannel: 'Nagpur Traffic Control - 156.450 MHz',
      batteryHealthPct: 92
    },
    routeHistory: [
      [21.1616305, 79.0837250],
      [21.1556187, 79.0817574]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Laser Speed Gun', 'Automated E-Challan Terminal', 'Tire Deflators', 'Spike Strip']
  },
  {
    id: 'unit-beat-08',
    unitCode: 'MH-31-BM-08',
    callSign: 'Hawk-8 (Beat Marshal)',
    unitType: 'Beat Marshal (Bike)',
    commanderName: 'Head Constable Vijay Wankhede',
    commanderBadge: 'NPD-6391',
    commanderPhone: '+91 98230 44008',
    crewCount: 2,
    zone: 'Zone 5 - West',
    location: {
      latitude: 21.1362125,
      longitude: 79.0616442,
      nearestJunctionId: 15,
      nearestJunctionName: 'Shankar Nagar Square',
      landmark: 'Near VNIT Approach Road',
      altitudeMeters: 318
    },
    availability: 'AVAILABLE',
    currentAssignment: null,
    telemetry: {
      fuelPercentage: 62,
      speedKmH: 28,
      headingDegrees: 240,
      gpsAccuracyMeters: 1.5,
      isSirenActive: false,
      bodycamActive: true,
      radioChannel: 'West Zone Beat - 157.100 MHz',
      batteryHealthPct: 89
    },
    routeHistory: [
      [21.1254686, 79.0639778],
      [21.1270000, 79.0610000],
      [21.1362125, 79.0616442]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Baton', 'Bodycam', 'Wireless Radio', 'Torch & Pepper Spray']
  },
  {
    id: 'unit-qrt-alpha',
    unitCode: 'MH-31-QRT-01',
    callSign: 'Cobra QRT (Tactical Alpha)',
    unitType: 'QRT SWAT Unit',
    commanderName: 'Commandant Amit Kulkarni',
    commanderBadge: 'QRT-9901',
    commanderPhone: '+91 98230 44901',
    crewCount: 6,
    zone: 'Zone 1 - Central',
    location: {
      latitude: 21.1550000,
      longitude: 79.0813900,
      nearestJunctionId: 10,
      nearestJunctionName: 'Kasturchand Park Square',
      landmark: 'Police Commissionerate Complex',
      altitudeMeters: 314
    },
    availability: 'AVAILABLE',
    currentAssignment: null,
    telemetry: {
      fuelPercentage: 95,
      speedKmH: 0,
      headingDegrees: 0,
      gpsAccuracyMeters: 1.2,
      isSirenActive: false,
      bodycamActive: false,
      radioChannel: 'Tactical Command Secure - 162.225 MHz',
      batteryHealthPct: 98
    },
    routeHistory: [
      [21.1526445, 79.0809738],
      [21.1550000, 79.0813900]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Tactical Shields', 'Ballistic Helmets', 'Gas Canisters', 'Breaching Tools', 'Advanced Trauma Kit']
  },
  {
    id: 'unit-pcr-105',
    unitCode: 'MH-31-PCR-105',
    callSign: 'Tiger-5 (East Command)',
    unitType: 'PCR Van',
    commanderName: 'Insp. Sunil Raut',
    commanderBadge: 'NPD-4412',
    commanderPhone: '+91 98230 44105',
    crewCount: 4,
    zone: 'Zone 3 - East',
    location: {
      latitude: 21.1569338,
      longitude: 79.1102582,
      nearestJunctionId: 21,
      nearestJunctionName: 'Itwari',
      landmark: 'Main Sarafa Bazaar Junction',
      altitudeMeters: 308
    },
    availability: 'INVESTIGATING',
    currentAssignment: {
      id: 'asg-8803',
      assignmentTitle: 'Nakabandi & Suspicious Vehicle Check',
      incidentType: 'Nakabandi & Vehicle Check',
      priority: 'HIGH',
      junctionId: 21,
      junctionName: 'Itwari',
      assignedAt: new Date(Date.now() - 32 * 60000).toISOString(),
      etaMinutes: 0,
      status: 'IN_PROGRESS',
      description: 'Active vehicle stop-and-search protocol at commercial hub choke points.',
      dispatchedBy: 'East Division ACP'
    },
    telemetry: {
      fuelPercentage: 81,
      speedKmH: 0,
      headingDegrees: 135,
      gpsAccuracyMeters: 2.4,
      isSirenActive: true,
      bodycamActive: true,
      radioChannel: 'East Zone Ops - 156.950 MHz',
      batteryHealthPct: 91
    },
    routeHistory: [
      [21.1614000, 79.1059000],
      [21.1569338, 79.1102582]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Metal Detectors', 'Spike Barriers', 'Megaphone PA System', 'Breathalyzer']
  },
  {
    id: 'unit-damini-02',
    unitCode: 'MH-31-DAM-02',
    callSign: 'Damini-2 (Women Safety)',
    unitType: 'Damini Squad (Women Safety)',
    commanderName: 'Sub-Insp. Priya Borkar',
    commanderBadge: 'NPD-7120',
    commanderPhone: '+91 98230 44702',
    crewCount: 3,
    zone: 'Zone 5 - West',
    location: {
      latitude: 21.1310000,
      longitude: 79.0515000,
      nearestJunctionId: 19,
      nearestJunctionName: 'LAD Square',
      landmark: 'Near LAD College Campus gate',
      altitudeMeters: 316
    },
    availability: 'AVAILABLE',
    currentAssignment: {
      id: 'asg-8804',
      assignmentTitle: 'Educational & Public Area Safety Beat',
      incidentType: 'Women Safety Response',
      priority: 'ROUTINE',
      junctionId: 19,
      junctionName: 'LAD Square',
      assignedAt: new Date(Date.now() - 50 * 60000).toISOString(),
      etaMinutes: 0,
      status: 'STANDBY',
      description: 'Active patrol near college zones, bus stops, and market squares.',
      dispatchedBy: 'Women Helpline 1091 Desk'
    },
    telemetry: {
      fuelPercentage: 79,
      speedKmH: 18,
      headingDegrees: 280,
      gpsAccuracyMeters: 1.6,
      isSirenActive: false,
      bodycamActive: true,
      radioChannel: 'City Special Squads - 157.300 MHz',
      batteryHealthPct: 94
    },
    routeHistory: [
      [21.1285000, 79.0565000],
      [21.1310000, 79.0515000]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['SOS Dispatch Tablet', 'Dashcam', 'Body Worn Cameras', 'First Aid Kit']
  },
  {
    id: 'unit-highway-301',
    unitCode: 'MH-31-HWY-301',
    callSign: 'Eagle-1 (Highway Patrol)',
    unitType: 'Highway Patrol',
    commanderName: 'Insp. Ganesh Thool',
    commanderBadge: 'NPD-4099',
    commanderPhone: '+91 98230 44301',
    crewCount: 3,
    zone: 'Zone 4 - South',
    location: {
      latitude: 21.1030000,
      longitude: 79.0840000,
      nearestJunctionId: 11,
      nearestJunctionName: 'Airport T-Point',
      landmark: 'Wardha Road Highway Corridor',
      altitudeMeters: 320
    },
    availability: 'EN_ROUTE',
    currentAssignment: {
      id: 'asg-8805',
      assignmentTitle: 'Emergency 112 Multi-Vehicle Collision Response',
      incidentType: 'Road Accident (112 Call)',
      priority: 'CRITICAL',
      junctionId: 35,
      junctionName: 'Chatrapati Chowk',
      assignedAt: new Date(Date.now() - 4 * 60000).toISOString(),
      etaMinutes: 2,
      status: 'IN_PROGRESS',
      description: 'Two-car side impact blocking Wardha road flyover ramp. Ambulance also en route.',
      dispatchedBy: 'Emergency 112 Control Center'
    },
    telemetry: {
      fuelPercentage: 68,
      speedKmH: 64,
      headingDegrees: 345,
      gpsAccuracyMeters: 1.9,
      isSirenActive: true,
      bodycamActive: true,
      radioChannel: 'Nagpur Highway Corridor - 156.600 MHz',
      batteryHealthPct: 90
    },
    routeHistory: [
      [21.0849744, 79.0955504],
      [21.1030000, 79.0840000]
    ],
    targetDestination: {
      junctionId: 35,
      junctionName: 'Chatrapati Chowk',
      latitude: 21.1091390,
      longitude: 79.0696114
    },
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Hydraulic Spreader', 'High-Intensity Flares', 'Heavy Tow Cables', 'Automated External Defibrillator (AED)']
  },
  {
    id: 'unit-pcr-109',
    unitCode: 'MH-31-PCR-109',
    callSign: 'Tiger-9 (South Division)',
    unitType: 'PCR Van',
    commanderName: 'Sub-Insp. Nitin Gaikwad',
    commanderBadge: 'NPD-4721',
    commanderPhone: '+91 98230 44109',
    crewCount: 4,
    zone: 'Zone 4 - South',
    location: {
      latitude: 21.1314524,
      longitude: 79.0977219,
      nearestJunctionId: 24,
      nearestJunctionName: 'Medical Chowk',
      landmark: 'Government Medical College Gate 1',
      altitudeMeters: 312
    },
    availability: 'AVAILABLE',
    currentAssignment: null,
    telemetry: {
      fuelPercentage: 72,
      speedKmH: 0,
      headingDegrees: 110,
      gpsAccuracyMeters: 2.0,
      isSirenActive: false,
      bodycamActive: true,
      radioChannel: 'South Zone Ops - 156.875 MHz',
      batteryHealthPct: 93
    },
    routeHistory: [
      [21.1182122, 79.0721071],
      [21.1314524, 79.0977219]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Traffic Cones', 'First Aid Kit', 'Handcuffs & Restraints', 'VHF Radio']
  },
  {
    id: 'unit-traffic-208',
    unitCode: 'MH-31-TRF-208',
    callSign: 'Falcon-8 (North Corridor)',
    unitType: 'Traffic Interceptor',
    commanderName: 'Asst. Sub-Insp. Devidas Meshram',
    commanderBadge: 'NPD-5388',
    commanderPhone: '+91 98230 44208',
    crewCount: 3,
    zone: 'Zone 2 - North',
    location: {
      latitude: 21.1857923,
      longitude: 79.1195065,
      nearestJunctionId: 12,
      nearestJunctionName: 'Automotive Square',
      landmark: 'Kamptee Road Flyover Junction',
      altitudeMeters: 315
    },
    availability: 'BUSY',
    currentAssignment: {
      id: 'asg-8806',
      assignmentTitle: 'Heavy Commercial Vehicle Diversion & Clearance',
      incidentType: 'Traffic Congestion Control',
      priority: 'MEDIUM',
      junctionId: 12,
      junctionName: 'Automotive Square',
      assignedAt: new Date(Date.now() - 25 * 60000).toISOString(),
      etaMinutes: 0,
      status: 'IN_PROGRESS',
      description: 'Enforcing no-entry hours for heavy trucks on ring road transition.',
      dispatchedBy: 'Traffic North Sector'
    },
    telemetry: {
      fuelPercentage: 83,
      speedKmH: 8,
      headingDegrees: 45,
      gpsAccuracyMeters: 2.2,
      isSirenActive: false,
      bodycamActive: true,
      radioChannel: 'Nagpur Traffic Control - 156.450 MHz',
      batteryHealthPct: 95
    },
    routeHistory: [
      [21.1736873, 79.1007283],
      [21.1857923, 79.1195065]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['ANPR Scanner', 'Breathalyzers', 'Barricades', 'E-Challan Handhelds']
  },
  {
    id: 'unit-beat-14',
    unitCode: 'MH-31-BM-14',
    callSign: 'Hawk-14 (Sadar Beat)',
    unitType: 'Beat Marshal (Bike)',
    commanderName: 'Constable Sanjay Mohod',
    commanderBadge: 'NPD-6480',
    commanderPhone: '+91 98230 44014',
    crewCount: 2,
    zone: 'Zone 1 - Central',
    location: {
      latitude: 21.1526445,
      longitude: 79.0809738,
      nearestJunctionId: 23,
      nearestJunctionName: 'RBI Chowk',
      landmark: 'Near Vidhan Bhavan & RBI',
      altitudeMeters: 314
    },
    availability: 'AVAILABLE',
    currentAssignment: null,
    telemetry: {
      fuelPercentage: 54,
      speedKmH: 22,
      headingDegrees: 180,
      gpsAccuracyMeters: 1.4,
      isSirenActive: false,
      bodycamActive: true,
      radioChannel: 'Nagpur Central - 156.800 MHz',
      batteryHealthPct: 88
    },
    routeHistory: [
      [21.1459896, 79.0897729],
      [21.1526445, 79.0809738]
    ],
    targetDestination: null,
    lastPingTimestamp: new Date().toISOString(),
    equipment: ['Bodycam', 'Wireless Radio', 'Traffic Baton', 'First Aid Pouch']
  }
];

export class PoliceApiService {
  private static instance: PoliceApiService;
  private currentUnits: PoliceUnit[] = [...INITIAL_NAGPUR_POLICE_FLEET];
  private syncState: ApiSyncState = {
    endpoint: BEECEPTOR_API_URL,
    status: 'connected',
    lastSyncTime: null,
    totalPings: 0,
    mode: 'LOCAL_TACTICAL_SIM'
  };

  public static getInstance(): PoliceApiService {
    if (!PoliceApiService.instance) {
      PoliceApiService.instance = new PoliceApiService();
    }
    return PoliceApiService.instance;
  }

  public getSyncState(): ApiSyncState {
    return { ...this.syncState };
  }

  /**
   * Fetches latest police unit data from Beeceptor API
   * Falls back gracefully to the local rich tactical fleet if offline or mocked
   */
  public async fetchPoliceUnits(): Promise<{ units: PoliceUnit[]; state: ApiSyncState }> {
    this.syncState.totalPings += 1;
    this.syncState.status = 'syncing';

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const response = await fetch(BEECEPTOR_API_URL, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      this.syncState.statusCode = response.status;
      this.syncState.lastSyncTime = new Date().toISOString();

      if (response.ok) {
        const rawData = await response.json();
        this.syncState.status = 'connected';
        this.syncState.mode = 'LIVE_API';

        if (Array.isArray(rawData) && rawData.length > 0) {
          // Merge incoming API payload with our Nagpur schema
          this.currentUnits = this.normalizeApiUnits(rawData);
        }
      } else {
        // Fallback to local tactical simulator
        this.syncState.status = 'offline_fallback';
        this.syncState.errorMessage = `HTTP ${response.status} from Beeceptor`;
      }
    } catch (err: unknown) {
      this.syncState.status = 'offline_fallback';
      this.syncState.lastSyncTime = new Date().toISOString();
      this.syncState.errorMessage = err instanceof Error ? err.message : 'Network Timeout / CORS fallback';
    }

    return {
      units: [...this.currentUnits],
      state: { ...this.syncState }
    };
  }

  /**
   * Dispatches or updates an assignment for a police unit and attempts to sync with API
   */
  public async dispatchUnit(
    unitId: string,
    assignmentData: Partial<UnitAssignment>
  ): Promise<{ success: boolean; unit: PoliceUnit | null }> {
    const unitIndex = this.currentUnits.findIndex((u) => u.id === unitId);
    if (unitIndex === -1) return { success: false, unit: null };

    const targetJunction = NAGPUR_JUNCTIONS.find((j) => j.id === assignmentData.junctionId) || NAGPUR_JUNCTIONS[0];
    
    const fullAssignment: UnitAssignment = {
      id: `asg-${Date.now().toString().slice(-5)}`,
      assignmentTitle: assignmentData.assignmentTitle || `Dispatch to ${targetJunction.name}`,
      incidentType: assignmentData.incidentType || 'Traffic Congestion Control',
      priority: assignmentData.priority || 'HIGH',
      junctionId: targetJunction.id,
      junctionName: targetJunction.name,
      assignedAt: new Date().toISOString(),
      etaMinutes: assignmentData.etaMinutes || 3,
      status: 'IN_PROGRESS',
      description: assignmentData.description || `Immediate response to ${targetJunction.name}. Clear route and assess situation.`,
      dispatchedBy: assignmentData.dispatchedBy || 'Nagpur Central Dispatcher'
    };

    const updatedUnit: PoliceUnit = {
      ...this.currentUnits[unitIndex],
      availability: 'EN_ROUTE',
      currentAssignment: fullAssignment,
      targetDestination: {
        junctionId: targetJunction.id,
        junctionName: targetJunction.name,
        latitude: targetJunction.latitude,
        longitude: targetJunction.longitude
      },
      telemetry: {
        ...this.currentUnits[unitIndex].telemetry,
        isSirenActive: true,
        speedKmH: Math.floor(Math.random() * 25) + 40
      },
      lastPingTimestamp: new Date().toISOString()
    };

    this.currentUnits[unitIndex] = updatedUnit;

    // Send asynchronous update to Beeceptor if possible
    try {
      fetch(BEECEPTOR_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'DISPATCH_UNIT',
          unitId: updatedUnit.id,
          callSign: updatedUnit.callSign,
          assignment: fullAssignment,
          timestamp: new Date().toISOString()
        })
      }).catch(() => {
        // silent fail on mockup endpoint
      });
    } catch {
      // ignore
    }

    return { success: true, unit: updatedUnit };
  }

  /**
   * Updates unit availability status directly
   */
  public updateUnitStatus(unitId: string, newStatus: AvailabilityStatus): PoliceUnit | null {
    const unitIndex = this.currentUnits.findIndex((u) => u.id === unitId);
    if (unitIndex === -1) return null;

    const unit = this.currentUnits[unitIndex];
    const isNowAvailable = newStatus === 'AVAILABLE' || newStatus === 'OFF_DUTY';

    const updated: PoliceUnit = {
      ...unit,
      availability: newStatus,
      currentAssignment: isNowAvailable ? null : unit.currentAssignment,
      targetDestination: isNowAvailable ? null : unit.targetDestination,
      telemetry: {
        ...unit.telemetry,
        isSirenActive: newStatus === 'EN_ROUTE' ? true : false,
        speedKmH: newStatus === 'ON_SCENE' ? 0 : newStatus === 'OFF_DUTY' ? 0 : unit.telemetry.speedKmH
      },
      lastPingTimestamp: new Date().toISOString()
    };

    this.currentUnits[unitIndex] = updated;
    return updated;
  }

  /**
   * Normalizes incoming raw API data to match Nagpur layout
   */
  private normalizeApiUnits(rawItems: Record<string, unknown>[]): PoliceUnit[] {
    return rawItems.map((item, index) => {
      const fallback = INITIAL_NAGPUR_POLICE_FLEET[index % INITIAL_NAGPUR_POLICE_FLEET.length];
      const lat = typeof item.latitude === 'number' ? item.latitude : fallback.location.latitude;
      const lng = typeof item.longitude === 'number' ? item.longitude : fallback.location.longitude;
      const nearest = findNearestJunction(lat, lng);

      const availability: AvailabilityStatus = 
        item.availability === 'AVAILABLE' || item.availability === 'EN_ROUTE' || 
        item.availability === 'ON_SCENE' || item.availability === 'INVESTIGATING' || 
        item.availability === 'BUSY' || item.availability === 'OFF_DUTY'
          ? (item.availability as AvailabilityStatus)
          : fallback.availability;

      return {
        id: String(item.id || fallback.id),
        unitCode: String(item.unitCode || item.unit_code || item.vehicleNumber || fallback.unitCode),
        callSign: String(item.callSign || item.call_sign || item.name || fallback.callSign),
        unitType: (item.unitType || item.type || fallback.unitType) as UnitType,
        commanderName: String(item.commanderName || item.officerInCharge || fallback.commanderName),
        commanderBadge: String(item.commanderBadge || fallback.commanderBadge),
        commanderPhone: String(item.commanderPhone || fallback.commanderPhone),
        crewCount: Number(item.crewCount || fallback.crewCount),
        zone: String(item.zone || nearest.junction.zone),
        location: {
          latitude: lat,
          longitude: lng,
          nearestJunctionId: nearest.junction.id,
          nearestJunctionName: nearest.junction.name,
          landmark: String(item.landmark || nearest.junction.name),
          altitudeMeters: fallback.location.altitudeMeters
        },
        availability,
        currentAssignment: (item.currentAssignment as UnitAssignment) || fallback.currentAssignment,
        telemetry: {
          fuelPercentage: Number((item.telemetry as Record<string, unknown>)?.fuelPercentage ?? fallback.telemetry.fuelPercentage),
          speedKmH: Number((item.telemetry as Record<string, unknown>)?.speedKmH ?? fallback.telemetry.speedKmH),
          headingDegrees: Number((item.telemetry as Record<string, unknown>)?.headingDegrees ?? fallback.telemetry.headingDegrees),
          gpsAccuracyMeters: Number((item.telemetry as Record<string, unknown>)?.gpsAccuracyMeters ?? fallback.telemetry.gpsAccuracyMeters),
          isSirenActive: Boolean((item.telemetry as Record<string, unknown>)?.isSirenActive ?? fallback.telemetry.isSirenActive),
          bodycamActive: Boolean((item.telemetry as Record<string, unknown>)?.bodycamActive ?? fallback.telemetry.bodycamActive),
          radioChannel: String((item.telemetry as Record<string, unknown>)?.radioChannel ?? fallback.telemetry.radioChannel),
          batteryHealthPct: Number((item.telemetry as Record<string, unknown>)?.batteryHealthPct ?? fallback.telemetry.batteryHealthPct)
        },
        routeHistory: fallback.routeHistory,
        targetDestination: fallback.targetDestination,
        lastPingTimestamp: new Date().toISOString(),
        equipment: fallback.equipment
      };
    });
  }
}

export const policeApiService = PoliceApiService.getInstance();

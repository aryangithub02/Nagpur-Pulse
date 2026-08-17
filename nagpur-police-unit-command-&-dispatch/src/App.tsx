import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { PoliceUnit, AvailabilityStatus, UnitAssignment, ApiSyncState, RadioTransmission, UnitType } from './types/police';
import { NAGPUR_JUNCTIONS, NagpurJunction } from './data/nagpurJunctions';
import { policeApiService, INITIAL_NAGPUR_POLICE_FLEET } from './services/policeApiService';
import { soundFX } from './services/audioEffects';
import { moveTowardsTarget, findNearestJunction, calculateBearingDegrees } from './utils/geoUtils';
import { Navbar } from './components/Navbar';
import { TacticalMap } from './components/TacticalMap';
import { UnitListPanel } from './components/UnitListPanel';
import { DispatchModal } from './components/DispatchModal';
import { UnitDetailDrawer } from './components/UnitDetailDrawer';
import { JunctionsOverview } from './components/JunctionsOverview';
import { LiveRadioFeed } from './components/LiveRadioFeed';
import { ApiDebugPanel } from './components/ApiDebugPanel';
import { Shield, Activity, Clock, AlertTriangle, Radio, Navigation, CheckCircle2, ChevronRight } from 'lucide-react';

export default function App() {
  const [units, setUnits] = useState<PoliceUnit[]>(INITIAL_NAGPUR_POLICE_FLEET);
  const [selectedUnit, setSelectedUnit] = useState<PoliceUnit | null>(null);
  const [activeTab, setActiveTab] = useState<'map' | 'junctions' | 'radio' | 'api'>('map');
  const [apiSyncState, setApiSyncState] = useState<ApiSyncState>(policeApiService.getSyncState());
  const [simSpeed, setSimSpeed] = useState<number>(1);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [radarSweepActive, setRadarSweepActive] = useState<boolean>(true);

  // Filters
  const [filterAvailability, setFilterAvailability] = useState<string>('ALL');
  const [filterUnitType, setFilterUnitType] = useState<string>('ALL');
  const [filterZone, setFilterZone] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Dispatch Modal State
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [dispatchTargetUnit, setDispatchTargetUnit] = useState<PoliceUnit | null>(null);
  const [dispatchTargetJunction, setDispatchTargetJunction] = useState<NagpurJunction | null>(null);

  // Radio Transmissions Log
  const [radioLogs, setRadioLogs] = useState<RadioTransmission[]>([
    {
      id: 'tx-101',
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      unitId: 'unit-highway-301',
      callSign: 'Eagle-1 (Highway Patrol)',
      frequency: '156.600 MHz',
      type: 'DISPATCH',
      message: 'Responding Code-3 to Chatrapati Chowk multi-vehicle collision. Sirens and flashers active.',
      junctionName: 'Chatrapati Chowk'
    },
    {
      id: 'tx-102',
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      unitId: 'unit-pcr-101',
      callSign: 'Tiger-1 (Central)',
      frequency: '156.800 MHz',
      type: 'STATUS_UPDATE',
      message: 'On-scene Sitabuldi Chowk. Commencing foot-beat traffic decongestion at Metro Gate 2.',
      junctionName: 'Sitabuldi Chowk'
    },
    {
      id: 'tx-103',
      timestamp: new Date(Date.now() - 25 * 60000).toISOString(),
      unitId: 'unit-pcr-105',
      callSign: 'Tiger-5 (East Command)',
      frequency: '156.950 MHz',
      type: 'STATUS_UPDATE',
      message: 'Nakabandi checkpoint operational at Itwari Sarafa Bazaar choke point.',
      junctionName: 'Itwari'
    }
  ]);

  // Initial Fetch & periodic API poll
  const loadUnitsFromApi = useCallback(async () => {
    const res = await policeApiService.fetchPoliceUnits();
    setApiSyncState(res.state);
    if (res.units && res.units.length > 0) {
      setUnits((prev) => {
        // preserve moving dynamic coordinates while updating assignment state
        return res.units.map((apiUnit) => {
          const existing = prev.find((p) => p.id === apiUnit.id);
          if (existing && existing.availability === 'EN_ROUTE' && existing.targetDestination) {
            return {
              ...apiUnit,
              location: existing.location,
              routeHistory: existing.routeHistory,
              targetDestination: existing.targetDestination,
              telemetry: existing.telemetry
            };
          }
          return apiUnit;
        });
      });
    }
  }, []);

  useEffect(() => {
    loadUnitsFromApi();
    const interval = setInterval(() => {
      loadUnitsFromApi();
    }, 15000);
    return () => clearInterval(interval);
  }, [loadUnitsFromApi]);

  // Live Unit Movement & Simulation Engine Loop
  useEffect(() => {
    if (simSpeed === 0) return;

    const tickInterval = 1000 / simSpeed;

    const timer = setInterval(() => {
      setUnits((prevUnits) => {
        return prevUnits.map((unit) => {
          // If unit is EN_ROUTE to a target destination
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
              // Unit arrived on scene
              const arrivedJunctionName = unit.targetDestination.junctionName;
              
              // Add radio log
              setRadioLogs((prevLogs) => [
                {
                  id: `tx-${Date.now()}`,
                  timestamp: new Date().toISOString(),
                  unitId: unit.id,
                  callSign: unit.callSign,
                  frequency: unit.telemetry.radioChannel.split(' - ')[1] || '156.800 MHz',
                  type: 'STATUS_UPDATE',
                  message: `Unit 10-23 (Arrived On Scene) at ${arrivedJunctionName}. Commencing operational response.`,
                  junctionName: arrivedJunctionName
                },
                ...prevLogs.slice(0, 49)
              ]);

              return {
                ...unit,
                availability: 'ON_SCENE' as AvailabilityStatus,
                location: {
                  ...unit.location,
                  latitude: step.lat,
                  longitude: step.lng,
                  nearestJunctionId: nearest.junction.id,
                  nearestJunctionName: nearest.junction.name
                },
                telemetry: {
                  ...unit.telemetry,
                  speedKmH: 0,
                  isSirenActive: true,
                  headingDegrees: newBearing
                },
                routeHistory: [...unit.routeHistory.slice(-15), [step.lat, step.lng]],
                lastPingTimestamp: new Date().toISOString()
              };
            }

            // Still moving
            return {
              ...unit,
              location: {
                ...unit.location,
                latitude: step.lat,
                longitude: step.lng,
                nearestJunctionId: nearest.junction.id,
                nearestJunctionName: nearest.junction.name
              },
              telemetry: {
                ...unit.telemetry,
                speedKmH: Math.floor(Math.random() * 15) + 48,
                isSirenActive: true,
                headingDegrees: Math.round(newBearing)
              },
              routeHistory: [...unit.routeHistory.slice(-15), [step.lat, step.lng]],
              lastPingTimestamp: new Date().toISOString()
            };
          }

          // If unit is AVAILABLE and on routine patrol, small gentle drift around nearest junction
          if (unit.availability === 'AVAILABLE') {
            const jitterLat = (Math.random() - 0.5) * 0.00015;
            const jitterLng = (Math.random() - 0.5) * 0.00015;
            const newLat = unit.location.latitude + jitterLat;
            const newLng = unit.location.longitude + jitterLng;
            const nearest = findNearestJunction(newLat, newLng);

            return {
              ...unit,
              location: {
                ...unit.location,
                latitude: newLat,
                longitude: newLng,
                nearestJunctionId: nearest.junction.id,
                nearestJunctionName: nearest.junction.name
              },
              telemetry: {
                ...unit.telemetry,
                speedKmH: Math.random() > 0.4 ? Math.floor(Math.random() * 20) + 10 : 0
              },
              lastPingTimestamp: new Date().toISOString()
            };
          }

          return unit;
        });
      });
    }, tickInterval);

    return () => clearInterval(timer);
  }, [simSpeed]);

  // Keep selectedUnit synchronized with units array
  useEffect(() => {
    if (selectedUnit) {
      const fresh = units.find((u) => u.id === selectedUnit.id);
      if (fresh) setSelectedUnit(fresh);
    }
  }, [units]);

  // Dispatch Unit Action
  const handleConfirmDispatch = async (unitId: string, assignment: Partial<UnitAssignment>) => {
    const res = await policeApiService.dispatchUnit(unitId, assignment);
    if (res.success && res.unit) {
      setUnits((prev) => prev.map((u) => (u.id === unitId ? res.unit! : u)));
      if (selectedUnit?.id === unitId) {
        setSelectedUnit(res.unit);
      }

      // Add log
      setRadioLogs((prevLogs) => [
        {
          id: `tx-${Date.now()}`,
          timestamp: new Date().toISOString(),
          unitId: res.unit!.id,
          callSign: res.unit!.callSign,
          frequency: res.unit!.telemetry.radioChannel.split(' - ')[1] || '156.800 MHz',
          type: 'DISPATCH',
          message: `Control to ${res.unit!.callSign}: Dispatched to ${assignment.junctionName} for ${assignment.incidentType}. Priority ${assignment.priority}.`,
          junctionName: assignment.junctionName
        },
        ...prevLogs.slice(0, 49)
      ]);
    }
  };

  // Status Change Action
  const handleStatusChange = (unitId: string, newStatus: AvailabilityStatus) => {
    const updated = policeApiService.updateUnitStatus(unitId, newStatus);
    if (updated) {
      setUnits((prev) => prev.map((u) => (u.id === unitId ? updated : u)));
      if (selectedUnit?.id === unitId) {
        setSelectedUnit(updated);
      }

      setRadioLogs((prevLogs) => [
        {
          id: `tx-${Date.now()}`,
          timestamp: new Date().toISOString(),
          unitId: updated.id,
          callSign: updated.callSign,
          frequency: updated.telemetry.radioChannel.split(' - ')[1] || '156.800 MHz',
          type: newStatus === 'AVAILABLE' ? 'CLEAR_SCENE' : 'STATUS_UPDATE',
          message: `Status update: ${updated.callSign} transitioned to ${newStatus}. Location: ${updated.location.nearestJunctionName}.`,
          junctionName: updated.location.nearestJunctionName
        },
        ...prevLogs.slice(0, 49)
      ]);
    }
  };

  // 1-Click Dispatch to Junction handler
  const handleDispatchToJunction = (junction: NagpurJunction) => {
    setDispatchTargetJunction(junction);
    setDispatchTargetUnit(null);
    setIsDispatchModalOpen(true);
  };

  // Open Dispatch Modal for specific Unit
  const handleOpenDispatchForUnit = (unit: PoliceUnit) => {
    setDispatchTargetUnit(unit);
    setDispatchTargetJunction(null);
    setIsDispatchModalOpen(true);
  };

  // Emergency 112 Simulator Trigger
  const handleTriggerEmergencyIncident = () => {
    soundFX.playEmergencyAlert();

    const randomJunction = NAGPUR_JUNCTIONS[Math.floor(Math.random() * NAGPUR_JUNCTIONS.length)];
    const incidents: Array<UnitAssignment['incidentType']> = [
      'Road Accident (112 Call)',
      'Hit & Run Response',
      'Traffic Congestion Control',
      'Law & Order / Public Crowd'
    ];
    const randomType = incidents[Math.floor(Math.random() * incidents.length)];

    setRadioLogs((prevLogs) => [
      {
        id: `tx-112-${Date.now()}`,
        timestamp: new Date().toISOString(),
        unitId: 'DIAL-112-HQ',
        callSign: '112 Nagpur Emergency Dispatch',
        frequency: '156.800 MHz (Priority Channel)',
        type: '112_CALL',
        message: `EMERGENCY 112 ALERT: Citizen reported ${randomType} at ${randomJunction.name} (${randomJunction.zone}). Nearest units please respond!`,
        junctionName: randomJunction.name
      },
      ...prevLogs.slice(0, 49)
    ]);

    setDispatchTargetJunction(randomJunction);
    setDispatchTargetUnit(null);
    setIsDispatchModalOpen(true);
  };

  // Telemetry Calculations
  const availableCount = units.filter((u) => u.availability === 'AVAILABLE').length;
  const fleetReadinessPct = Math.round((availableCount / (units.length || 1)) * 100);
  const activeDispatches = units.filter((u) => u.availability === 'EN_ROUTE' || u.availability === 'ON_SCENE');
  const p1DispatchesCount = units.filter(
    (u) => u.currentAssignment && (u.currentAssignment.priority === 'CRITICAL' || u.currentAssignment.priority === 'HIGH')
  ).length;

  const avgEta = useMemo(() => {
    const etas = units
      .filter((u) => u.currentAssignment?.etaMinutes)
      .map((u) => u.currentAssignment!.etaMinutes);
    if (etas.length === 0) return '3.2m';
    const sum = etas.reduce((acc, val) => acc + val, 0);
    return `${(sum / etas.length).toFixed(1)}m`;
  }, [units]);

  return (
    <div className="min-h-screen bg-slate-900 tactical-grid-bg text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Navigation */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        units={units}
        apiSyncState={apiSyncState}
        onRefreshApi={loadUnitsFromApi}
        simSpeed={simSpeed}
        setSimSpeed={setSimSpeed}
        onTriggerEmergencyIncident={handleTriggerEmergencyIncident}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full max-w-7xl mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {activeTab === 'map' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 flex-1 min-h-[580px]">
            {/* Tactical Map (7 cols on lg, 8 on xl) */}
            <div className="lg:col-span-7 xl:col-span-8 h-[480px] lg:h-full flex flex-col">
              <TacticalMap
                units={units}
                selectedUnit={selectedUnit}
                onSelectUnit={(unit) => setSelectedUnit(unit)}
                onDispatchToJunction={handleDispatchToJunction}
                filterAvailability={filterAvailability}
                filterUnitType={filterUnitType}
                filterZone={filterZone}
                searchQuery={searchQuery}
                radarSweepActive={radarSweepActive}
              />
            </div>

            {/* Units Roster Panel (5 cols on lg, 4 on xl) */}
            <div className="lg:col-span-5 xl:col-span-4 h-[550px] lg:h-full flex flex-col">
              <UnitListPanel
                units={units}
                selectedUnit={selectedUnit}
                onSelectUnit={(unit) => setSelectedUnit(unit)}
                onOpenDispatchModal={handleOpenDispatchForUnit}
                onStatusChange={handleStatusChange}
                filterAvailability={filterAvailability}
                setFilterAvailability={setFilterAvailability}
                filterUnitType={filterUnitType}
                setFilterUnitType={setFilterUnitType}
                filterZone={filterZone}
                setFilterZone={setFilterZone}
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
              />
            </div>
          </div>
        )}

        {activeTab === 'junctions' && (
          <div className="flex-1 min-h-[620px]">
            <JunctionsOverview
              units={units}
              onDispatchToJunction={handleDispatchToJunction}
            />
          </div>
        )}

        {activeTab === 'radio' && (
          <div className="flex-1 min-h-[620px]">
            <LiveRadioFeed logs={radioLogs} />
          </div>
        )}

        {activeTab === 'api' && (
          <div className="flex-1 min-h-[620px]">
            <ApiDebugPanel
              apiSyncState={apiSyncState}
              units={units}
              onRefreshApi={loadUnitsFromApi}
            />
          </div>
        )}

        {/* Bottom Tactical Stats / Resource Telemetry Bar */}
        <section className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-800/80 backdrop-blur-md p-3.5 rounded-xl border border-slate-700 shadow-xl">
          {/* Stat 1: Fleet Readiness */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Fleet Readiness</p>
              <p className="text-xl font-bold font-mono text-blue-400 mt-0.5">{fleetReadinessPct}%</p>
              <span className="text-[10px] text-slate-500 font-mono">{availableCount} of {units.length} Units Available</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-blue-600/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
              <Shield className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 2: Avg. Dispatch ETA */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Avg. Dispatch ETA</p>
              <p className="text-xl font-bold font-mono text-yellow-400 mt-0.5">{avgEta}</p>
              <span className="text-[10px] text-slate-500 font-mono">Based on live GPS routes</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-yellow-600/10 border border-yellow-500/20 flex items-center justify-center text-yellow-400">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 3: Priority 1 Dispatches */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Priority 1 Dispatches</p>
              <p className="text-xl font-bold font-mono text-red-400 mt-0.5">{p1DispatchesCount < 10 ? `0${p1DispatchesCount}` : p1DispatchesCount}</p>
              <span className="text-[10px] text-slate-500 font-mono">{activeDispatches.length} Units Currently Active</span>
            </div>
            <div className="w-10 h-10 rounded-lg bg-red-600/10 border border-red-500/20 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>

          {/* Stat 4 / Quick Unit Detail Focus */}
          <div className="p-3 bg-slate-900/90 rounded-lg border border-slate-700/80 flex flex-col justify-between">
            {selectedUnit ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Selected Unit Focus</p>
                  <p className="text-sm font-bold text-slate-100 font-mono truncate">{selectedUnit.callSign}</p>
                  <span className="text-[10px] text-emerald-400 font-mono">{selectedUnit.location.nearestJunctionName}</span>
                </div>
                <button
                  onClick={() => handleOpenDispatchForUnit(selectedUnit)}
                  className="px-2.5 py-1 text-xs font-mono font-bold bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors"
                >
                  Dispatch
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between h-full">
                <div>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-wider">Radio Network</p>
                  <p className="text-xs font-bold text-cyan-400 font-mono">156.800 MHz Control</p>
                  <span className="text-[10px] text-slate-500 font-mono">Nagpur Police Trunking</span>
                </div>
                <button
                  onClick={() => setActiveTab('radio')}
                  className="p-2 text-slate-400 hover:text-slate-200 bg-slate-800 rounded transition-colors"
                  title="View radio feed"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </section>
      </main>

      {/* Terminal Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-800 px-4 sm:px-6 py-2.5 text-[10px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span>SOURCE:</span>
          <span className="text-slate-400">https://accident-api.free.beeceptor.com/api/police-units</span>
        </div>
        <div>
          <span>CONFIDENTIAL // NAGPUR POLICE DEPARTMENT USE ONLY • V2.4.0-STABLE</span>
        </div>
      </footer>

      {/* Slide-in Unit Detail Drawer */}
      <UnitDetailDrawer
        unit={selectedUnit}
        onClose={() => setSelectedUnit(null)}
        onStatusChange={handleStatusChange}
        onOpenDispatch={handleOpenDispatchForUnit}
      />

      {/* Smart Dispatch Modal */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        units={units}
        initialSelectedUnit={dispatchTargetUnit}
        initialSelectedJunction={dispatchTargetJunction}
        onConfirmDispatch={handleConfirmDispatch}
      />
    </div>
  );
}

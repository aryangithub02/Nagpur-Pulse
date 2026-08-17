import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NAGPUR_JUNCTIONS } from './data/nagpurJunctions';
import {
  CitySummary,
  Coordinate,
  Junction,
  JunctionTrafficState,
  RouteCalculation,
  TrafficMetrics,
} from './types';
import {
  batchFetchJunctionTraffic,
  fetchTrafficFlowForPoint,
  getTomTomApiKey,
} from './services/tomtomService';
import { Header } from './components/Header';
import { MetricCards } from './components/MetricCards';
import { TrafficMap } from './components/TrafficMap';
import { JunctionDetailCard } from './components/JunctionDetailCard';
import { CorridorsList } from './components/CorridorsList';
import { RoutePlanner } from './components/RoutePlanner';
import { CustomPointInspector } from './components/CustomPointInspector';
import { TrafficAnalyticsChart } from './components/TrafficAnalyticsChart';
import { ApiKeyModal } from './components/ApiKeyModal';
import { AlertTriangle, MapPin, Zap, RefreshCw, Maximize2, Minimize2, Radio } from 'lucide-react';

export default function App() {
  // Navigation & View tab
  const [activeTab, setActiveTab] = useState<'map' | 'corridors' | 'route' | 'inspector' | 'analytics'>('map');

  // Traffic State across 40 Nagpur Junctions
  const [junctionStates, setJunctionStates] = useState<JunctionTrafficState[]>(() =>
    NAGPUR_JUNCTIONS.map(j => ({
      junction: j,
      metrics: null,
      isLoading: true,
      error: null,
    }))
  );

  const [selectedJunction, setSelectedJunction] = useState<Junction | null>(() => NAGPUR_JUNCTIONS[0]); // Default LIC Chowk
  const [isDetailLoading, setIsDetailLoading] = useState<boolean>(false);
  const [activeRoute, setActiveRoute] = useState<RouteCalculation | null>(null);
  const [routeOrigin, setRouteOrigin] = useState<Junction | null>(null);
  const [routeDestination, setRouteDestination] = useState<Junction | null>(null);
  const [customCoord, setCustomCoord] = useState<Coordinate | null>(null);
  const [isMapFullScreen, setIsMapFullScreen] = useState<boolean>(false);

  // Auto-refresh & modal controls
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(60); // 60s default
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<number>(Date.now());

  // Metrics Map for quick O(1) lookup
  const metricsMap = useMemo(() => {
    const map = new Map<number, TrafficMetrics>();
    junctionStates.forEach(j => {
      if (j.metrics) map.set(j.junction.id, j.metrics);
    });
    return map;
  }, [junctionStates]);

  // City Summary computation
  const citySummary = useMemo<CitySummary | null>(() => {
    const loaded = junctionStates.filter(j => j.metrics !== null);
    if (loaded.length === 0) return null;

    let totalSpeed = 0;
    let totalFreeFlow = 0;
    let fluidCount = 0;
    let congestedCount = 0;
    let closedCount = 0;

    let highestDelayJunction: JunctionTrafficState | null = null;
    let slowestJunction: JunctionTrafficState | null = null;
    let fastestJunction: JunctionTrafficState | null = null;

    loaded.forEach(j => {
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
      lastUpdated: lastSyncTime,
    };
  }, [junctionStates, lastSyncTime]);

  // Fetch all traffic metrics
  const fetchAllTraffic = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const apiKey = getTomTomApiKey();
      const results = await batchFetchJunctionTraffic(NAGPUR_JUNCTIONS, apiKey);

      setJunctionStates(prev =>
        prev.map(item => ({
          ...item,
          metrics: results.get(item.junction.id) || item.metrics,
          isLoading: false,
        }))
      );
      setLastSyncTime(Date.now());
    } catch (err) {
      console.error('Failed to sync traffic batch:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial fetch
  useEffect(() => {
    fetchAllTraffic();
  }, [fetchAllTraffic]);

  // Periodic Auto-refresh
  useEffect(() => {
    if (refreshInterval <= 0) return;
    const interval = setInterval(() => {
      fetchAllTraffic();
    }, refreshInterval * 1000);
    return () => clearInterval(interval);
  }, [refreshInterval, fetchAllTraffic]);

  // When a junction is clicked
  const handleSelectJunction = useCallback(
    async (junction: Junction) => {
      setSelectedJunction(junction);
      const existing = junctionStates.find(j => j.junction.id === junction.id)?.metrics;
      if (!existing) {
        setIsDetailLoading(true);
        try {
          const fresh = await fetchTrafficFlowForPoint(junction.latitude, junction.longitude);
          setJunctionStates(prev =>
            prev.map(item =>
              item.junction.id === junction.id ? { ...item, metrics: fresh, isLoading: false } : item
            )
          );
        } catch (e) {
          console.error(e);
        } finally {
          setIsDetailLoading(false);
        }
      }
    },
    [junctionStates]
  );

  // Map Click point to inspect custom location
  const handleMapClickPoint = useCallback((coord: Coordinate) => {
    setCustomCoord(coord);
    setActiveTab('inspector');
  }, []);

  // Selected junction metrics
  const selectedMetrics = selectedJunction
    ? junctionStates.find(j => j.junction.id === selectedJunction.id)?.metrics || null
    : null;

  return (
    <div className="min-h-screen bg-[#0d0e12] text-slate-100 flex flex-col font-sans selection:bg-pink-500/30 selection:text-pink-200">
      {/* Top Navigation & App Header */}
      <Header
        summary={citySummary}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        isRefreshing={isRefreshing}
        onRefresh={fetchAllTraffic}
        onOpenApiKeyModal={() => setIsApiKeyModalOpen(true)}
        refreshInterval={refreshInterval}
        setRefreshInterval={setRefreshInterval}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 flex flex-col gap-4">
        {/* City-Wide KPI Metric Cards */}
        {!isMapFullScreen && (
          <MetricCards summary={citySummary} onSelectJunction={handleSelectJunction} />
        )}

        {/* View Layouts */}
        {activeTab === 'map' && (
          <div className={isMapFullScreen ? 'fixed inset-0 z-50 bg-[#0d0e12] p-2 flex flex-col' : 'grid grid-cols-1 lg:grid-cols-12 gap-4 items-start'}>
            {/* Map Canvas */}
            <div className={isMapFullScreen ? 'w-full h-full flex-1' : 'lg:col-span-8 h-[560px] lg:h-[680px]'}>
              <TrafficMap
                junctionStates={junctionStates}
                selectedJunction={selectedJunction}
                onSelectJunction={handleSelectJunction}
                onCloseSelectedJunction={() => setSelectedJunction(null)}
                onSetRouteOrigin={j => {
                  setRouteOrigin(j);
                  setActiveTab('route');
                }}
                onSetRouteDestination={j => {
                  setRouteDestination(j);
                  setActiveTab('route');
                }}
                activeRoute={activeRoute}
                onMapClickPoint={handleMapClickPoint}
                isFullScreen={isMapFullScreen}
                onToggleFullScreen={() => setIsMapFullScreen(prev => !prev)}
              />
            </div>

            {/* Selected Junction Details Sidebar (4 Columns on desktop) */}
            {!isMapFullScreen && (
              <div className="lg:col-span-4 flex flex-col gap-4">
                {selectedJunction ? (
                  <JunctionDetailCard
                    junction={selectedJunction}
                    metrics={selectedMetrics}
                    isLoading={isDetailLoading}
                    onClose={() => setSelectedJunction(null)}
                    onSetRouteOrigin={j => {
                      setRouteOrigin(j);
                      setActiveTab('route');
                    }}
                    onSetRouteDestination={j => {
                      setRouteDestination(j);
                      setActiveTab('route');
                    }}
                  />
                ) : (
                  <div className="bg-[#151720]/80 border border-slate-800 rounded-2xl p-6 text-center text-slate-400 text-xs flex flex-col items-center justify-center gap-2 min-h-[280px]">
                    <MapPin className="w-8 h-8 text-[#ff2a85] opacity-80 animate-bounce" />
                    <p className="font-semibold text-slate-200 text-sm">No Junction Selected</p>
                    <p className="text-slate-500 max-w-xs text-xs">
                      Click any spot pin on the map or corridor card to inspect live speed, travel time and road coordinates.
                    </p>
                  </div>
                )}

                {/* Quick Top Congested List on Sidebar */}
                <div className="bg-[#151720]/80 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Zap className="w-3.5 h-3.5 text-[#ff2a85]" />
                      Slowest Chowks Right Now
                    </span>
                    <button
                      onClick={() => setActiveTab('corridors')}
                      className="text-[11px] text-pink-400 hover:text-pink-300 font-semibold transition"
                    >
                      View All 40 →
                    </button>
                  </div>

                  <div className="space-y-2">
                    {[...junctionStates]
                      .filter(j => j.metrics !== null)
                      .sort((a, b) => (a.metrics?.currentSpeed ?? 999) - (b.metrics?.currentSpeed ?? 999))
                      .slice(0, 4)
                      .map(({ junction, metrics }) => (
                        <div
                          key={junction.id}
                          onClick={() => handleSelectJunction(junction)}
                          className={`p-2.5 rounded-xl border flex items-center justify-between text-xs cursor-pointer transition ${
                            selectedJunction?.id === junction.id
                              ? 'bg-slate-800/90 border-pink-500/60 text-pink-200'
                              : 'bg-[#181a24]/70 border-slate-800/80 hover:border-pink-500/40 text-slate-300'
                          }`}
                        >
                          <div>
                            <div className="font-bold text-white truncate max-w-[150px]">
                              {junction.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {junction.zone} • {metrics?.frc || 'FRC2'}
                            </div>
                          </div>

                          <div className="text-right font-mono">
                            <div className="font-bold text-pink-400">{metrics?.currentSpeed} km/h</div>
                            <div className="text-[10px] text-orange-400">+{metrics?.delaySeconds}s delay</div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'corridors' && (
          <CorridorsList
            junctionStates={junctionStates}
            selectedJunction={selectedJunction}
            onSelectJunction={j => {
              handleSelectJunction(j);
              setActiveTab('map');
            }}
            onSwitchToMap={() => setActiveTab('map')}
          />
        )}

        {activeTab === 'route' && (
          <RoutePlanner
            allJunctions={NAGPUR_JUNCTIONS}
            metricsMap={metricsMap}
            activeRoute={activeRoute}
            setActiveRoute={setActiveRoute}
            onSwitchToMap={() => setActiveTab('map')}
            defaultOrigin={routeOrigin}
            defaultDestination={routeDestination}
          />
        )}

        {activeTab === 'inspector' && (
          <CustomPointInspector initialCoord={customCoord} />
        )}

        {activeTab === 'analytics' && (
          <TrafficAnalyticsChart junctionStates={junctionStates} />
        )}
      </main>

      {/* Footer */}
      {!isMapFullScreen && (
        <footer className="border-t border-slate-800/80 bg-[#0c0d12] py-4 px-6 mt-auto text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl w-full mx-auto">
          <div className="flex items-center gap-2">
            <span>Nagpur Traffic Flow & Speed Monitor</span>
            <span>•</span>
            <span>OpenStreetMap & TomTom API</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsApiKeyModalOpen(true)}
              className="hover:text-pink-400 transition"
            >
              API Key Settings
            </button>
            <span className="font-mono text-[11px] text-slate-400">
              Last Synced: {new Date(lastSyncTime).toLocaleTimeString('en-IN')}
            </span>
          </div>
        </footer>
      )}

      {/* TomTom API Key Settings Modal */}
      <ApiKeyModal
        isOpen={isApiKeyModalOpen}
        onClose={() => setIsApiKeyModalOpen(false)}
        onKeyUpdated={fetchAllTraffic}
      />
    </div>
  );
}

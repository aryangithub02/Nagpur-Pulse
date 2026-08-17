import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  IncidentItem, 
  FilterOptions, 
  IncidentStats, 
  IncidentCategory, 
  SeverityLevel 
} from './types';
import { 
  fetchLiveNagpurIncidents, 
  calculateIncidentStats 
} from './services/incidentService';
import { NAGPUR_JUNCTIONS } from './data/nagpurJunctions';
import { Navbar } from './components/Navbar';
import { MetricsCards } from './components/MetricsCards';
import { IncidentFilterBar } from './components/IncidentFilterBar';
import { NagpurMap } from './components/NagpurMap';
import { IncidentList } from './components/IncidentList';
import { SeverityBentoTile } from './components/SeverityBentoTile';
import { HazardIndexBentoTile } from './components/HazardIndexBentoTile';
import { JunctionHotspots } from './components/JunctionHotspots';
import { EmergencyQuickDial } from './components/EmergencyQuickDial';
import { IncidentDetailModal } from './components/IncidentDetailModal';

const REFRESH_INTERVAL_SECONDS = 45;

export default function App() {
  const [incidents, setIncidents] = useState<IncidentItem[]>([]);
  const [isLive, setIsLive] = useState<boolean>(true);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string>('');
  const [refreshCountdown, setRefreshCountdown] = useState<number>(REFRESH_INTERVAL_SECONDS);
  const [dataSource, setDataSource] = useState<'live' | 'mock'>('live');

  // Interactive UI State
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null);
  const [modalIncident, setModalIncident] = useState<IncidentItem | null>(null);
  const [showJunctions, setShowJunctions] = useState<boolean>(true);
  const [selectedJunctionId, setSelectedJunctionId] = useState<number | null>(null);

  // Filters
  const [filters, setFilters] = useState<FilterOptions>({
    searchQuery: '',
    category: 'ALL',
    severity: 'ALL',
    selectedJunctionId: null,
    sortBy: 'severity',
    onlyAccidents: false,
  });

  // Load Incident Data
  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await fetchLiveNagpurIncidents();
      setIncidents(result.incidents);
      setIsLive(result.isLive);
      setLastUpdated(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }));
      setRefreshCountdown(REFRESH_INTERVAL_SECONDS);
    } catch (err) {
      console.error('Failed to load Nagpur traffic data:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial load
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Auto-refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setRefreshCountdown((prev) => {
        if (prev <= 1) {
          loadData();
          return REFRESH_INTERVAL_SECONDS;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [loadData]);

  // Handle Junction Selection from Map or Hotspots
  const handleSelectJunction = (id: number | null) => {
    setSelectedJunctionId(id);
    setFilters((prev) => ({ ...prev, selectedJunctionId: id }));
  };

  // Handle Corridor Focus from Hazard Index Bento Tile
  const handleFocusCorridor = (corridorQuery: string) => {
    setFilters((prev) => ({ ...prev, searchQuery: corridorQuery }));
  };

  // Filter and Sort Incidents
  const filteredIncidents = useMemo(() => {
    let result = [...incidents];

    // Search query
    if (filters.searchQuery.trim()) {
      const query = filters.searchQuery.toLowerCase();
      result = result.filter(
        (i) =>
          i.roadName.toLowerCase().includes(query) ||
          i.description.toLowerCase().includes(query) ||
          i.category.toLowerCase().includes(query) ||
          (i.nearestJunction && i.nearestJunction.name.toLowerCase().includes(query)) ||
          (i.from && i.from.toLowerCase().includes(query)) ||
          (i.to && i.to.toLowerCase().includes(query))
      );
    }

    // Category filter
    if (filters.category !== 'ALL') {
      result = result.filter((i) => i.category === filters.category);
    }

    // Severity filter
    if (filters.severity !== 'ALL') {
      result = result.filter((i) => i.severity === filters.severity);
    }

    // Selected Chowk filter
    if (filters.selectedJunctionId !== null) {
      const junction = NAGPUR_JUNCTIONS.find((j) => j.id === filters.selectedJunctionId);
      if (junction) {
        result = result.filter(
          (i) =>
            i.nearestJunction?.name === junction.name ||
            (i.roadName && i.roadName.toLowerCase().includes(junction.name.toLowerCase()))
        );
      }
    }

    // Sorting
    result.sort((a, b) => {
      if (filters.sortBy === 'severity') {
        return b.severityScore - a.severityScore || b.delaySeconds - a.delaySeconds;
      }
      if (filters.sortBy === 'delay') {
        return b.delaySeconds - a.delaySeconds;
      }
      if (filters.sortBy === 'time') {
        return new Date(b.startTime).getTime() - new Date(a.startTime).getTime();
      }
      return 0;
    });

    return result;
  }, [incidents, filters]);

  // Summary stats
  const stats = useMemo(() => calculateIncidentStats(incidents), [incidents]);

  // Export Data functionality
  const handleExportData = (format: 'json' | 'csv') => {
    const dataToExport = filteredIncidents.map((i) => ({
      id: i.id,
      category: i.category,
      severity: i.severity,
      roadName: i.roadName,
      description: i.description,
      latitude: i.location[0],
      longitude: i.location[1],
      nearestJunction: i.nearestJunction?.name || 'Nagpur Metro',
      nearestJunctionDistance: i.nearestJunction?.distanceFormatted || '',
      delayMinutes: i.delayMinutes,
      corridorLengthMeters: i.lengthMeters,
      startTime: i.startTime,
      timeAgo: i.timeAgo,
      source: i.source,
    }));

    if (format === 'json') {
      const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nagpur_Traffic_Incidents_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // CSV
      const headers = Object.keys(dataToExport[0] || {}).join(',');
      const rows = dataToExport.map((row) =>
        Object.values(row)
          .map((val) => `"${String(val).replace(/"/g, '""')}"`)
          .join(',')
      );
      const csvContent = [headers, ...rows].join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Nagpur_Traffic_Incidents_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 bento-pattern flex flex-col selection:bg-rose-500 selection:text-white">
      {/* Top Navbar */}
      <Navbar
        isLive={isLive}
        isLoading={isLoading}
        lastUpdated={lastUpdated}
        refreshCountdown={refreshCountdown}
        onManualRefresh={loadData}
        dataSource={dataSource}
        onToggleDataSource={() => setDataSource(dataSource === 'live' ? 'mock' : 'live')}
        totalIncidents={stats.total}
        accidentCount={stats.accidents}
      />

      {/* Main Bento Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex flex-col gap-6">
        {/* Bento Row 1: Key Metrics Grid */}
        <MetricsCards
          stats={stats}
          onFilterAccidents={() =>
            setFilters((prev) => ({
              ...prev,
              category: prev.category === 'Accident' ? 'ALL' : 'Accident',
            }))
          }
          onFilterCritical={() =>
            setFilters((prev) => ({
              ...prev,
              severity: prev.severity === 'Critical' ? 'ALL' : 'Critical',
            }))
          }
          onFilterClosures={() =>
            setFilters((prev) => ({
              ...prev,
              category: prev.category === 'Road Closed' ? 'ALL' : 'Road Closed',
            }))
          }
          onResetFilters={() =>
            setFilters({
              searchQuery: '',
              category: 'ALL',
              severity: 'ALL',
              selectedJunctionId: null,
              sortBy: 'severity',
              onlyAccidents: false,
            })
          }
          currentFilterCategory={filters.category}
          currentFilterSeverity={filters.severity}
        />

        {/* Bento Row 2: Search, Chowk & Category Filters */}
        <IncidentFilterBar
          filters={filters}
          onFilterChange={setFilters}
          onExportData={handleExportData}
          totalFilteredCount={filteredIncidents.length}
        />

        {/* Bento Row 3: Geospatial Map & Live Telemetry Stream */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[580px]">
          {/* Map Bento Tile (7 cols) */}
          <div className="lg:col-span-7 h-[480px] lg:h-auto min-h-[480px]">
            <NagpurMap
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => {
                setSelectedIncident(inc);
                if (inc) {
                  const el = document.getElementById(`incident-item-${inc.id}`);
                  el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }
              }}
              showJunctions={showJunctions}
              onToggleJunctions={() => setShowJunctions(!showJunctions)}
              selectedJunctionId={selectedJunctionId}
              onSelectJunction={handleSelectJunction}
            />
          </div>

          {/* Incident Stream Bento Tile (5 cols) */}
          <div className="lg:col-span-5 h-[480px] lg:h-auto min-h-[480px]">
            <IncidentList
              incidents={filteredIncidents}
              selectedIncident={selectedIncident}
              onSelectIncident={(inc) => setSelectedIncident(inc)}
              onOpenDetailModal={(inc) => setModalIncident(inc)}
            />
          </div>
        </div>

        {/* Bento Row 4: Analytics Sub-Tiles (Severity Breakdown & Nagpur Hazard Index) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Severity Breakdown Bento Tile */}
          <SeverityBentoTile
            stats={stats}
            incidents={incidents}
            onSelectSeverity={(sev) =>
              setFilters((prev) => ({
                ...prev,
                severity: prev.severity === sev ? 'ALL' : (sev as SeverityLevel),
              }))
            }
            currentSeverity={filters.severity}
          />

          {/* Nagpur Hazard Index & Key Arterial Corridors Bento Tile */}
          <HazardIndexBentoTile
            stats={stats}
            incidents={incidents}
            onFocusCorridor={handleFocusCorridor}
          />
        </div>

        {/* Bento Row 5: Junction Hotspot Vulnerability */}
        <JunctionHotspots
          incidents={incidents}
          selectedJunctionId={selectedJunctionId}
          onSelectJunction={handleSelectJunction}
        />

        {/* Bento Row 6: Emergency Quick Dial & Contact Helplines */}
        <EmergencyQuickDial />
      </main>

      {/* Detail Modal */}
      <IncidentDetailModal
        incident={modalIncident}
        onClose={() => setModalIncident(null)}
        onFocusMap={(inc) => {
          setSelectedIncident(inc);
        }}
      />

      {/* Bento Footer */}
      <footer className="w-full border-t border-slate-800/80 bg-slate-950/80 backdrop-blur-md py-4 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Nagpur Traffic & Accident Live Monitor • Powered by TomTom Traffic API & OSM Data
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            Nagpur Bounding Box: [78.90, 20.99, 79.20, 21.25]
          </span>
        </div>
      </footer>
    </div>
  );
}

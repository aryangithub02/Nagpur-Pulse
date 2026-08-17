import React, { useEffect, useRef, useState } from 'react';
import * as L from 'leaflet';
import { PoliceUnit, AvailabilityStatus, UnitType } from '../types/police';
import { NAGPUR_JUNCTIONS, NagpurJunction, NAGPUR_CENTER_COORDINATES } from '../data/nagpurJunctions';
import { calculateHaversineDistanceKm } from '../utils/geoUtils';
import { MapPin, Navigation, Eye, Radio, Shield, Zap, CheckCircle2, Siren, Crosshair, Layers } from 'lucide-react';

interface TacticalMapProps {
  units: PoliceUnit[];
  selectedUnit: PoliceUnit | null;
  onSelectUnit: (unit: PoliceUnit) => void;
  onDispatchToJunction: (junction: NagpurJunction) => void;
  filterAvailability: string;
  filterUnitType: string;
  filterZone: string;
  searchQuery: string;
  radarSweepActive: boolean;
}

export const TacticalMap: React.FC<TacticalMapProps> = ({
  units,
  selectedUnit,
  onSelectUnit,
  onDispatchToJunction,
  filterAvailability,
  filterUnitType,
  filterZone,
  searchQuery,
  radarSweepActive,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const unitMarkersRef = useRef<Map<string, L.Marker>>(new Map());
  const junctionMarkersRef = useRef<Map<number, L.Marker>>(new Map());
  const routePolylinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const dispatchLinesRef = useRef<Map<string, L.Polyline>>(new Map());
  const [showJunctions, setShowJunctions] = useState<boolean>(true);
  const [showBreadcrumbs, setShowBreadcrumbs] = useState<boolean>(true);
  const [mapLayerType, setMapLayerType] = useState<'dark' | 'standard' | 'satellite'>('dark');
  const [activeJunctionHover, setActiveJunctionHover] = useState<NagpurJunction | null>(null);

  // Initialize Leaflet Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: [NAGPUR_CENTER_COORDINATES.latitude, NAGPUR_CENTER_COORDINATES.longitude],
        zoom: NAGPUR_CENTER_COORDINATES.defaultZoom,
        zoomControl: false,
        attributionControl: false
      });

      // Add Zoom Control to bottom-right
      L.control.zoom({ position: 'bottomright' }).addTo(map);

      // Attribution
      L.control.attribution({
        position: 'bottomleft',
        prefix: '<span class="text-[10px] text-slate-500 font-mono">Nagpur Police GIS • Leaflet</span>'
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      // Keep instance or cleanup on unmount
    };
  }, []);

  // Update Base Tile Layer
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    map.eachLayer((layer) => {
      if (layer instanceof L.TileLayer) {
        map.removeLayer(layer);
      }
    });

    let tileUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let maxZoom = 19;

    if (mapLayerType === 'standard') {
      tileUrl = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
      maxZoom = 19;
    } else if (mapLayerType === 'satellite') {
      tileUrl = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      maxZoom = 18;
    }

    L.tileLayer(tileUrl, {
      maxZoom,
      subdomains: 'abcd',
    }).addTo(map);
  }, [mapLayerType]);

  // Color helper for Unit availability
  const getStatusColor = (status: AvailabilityStatus) => {
    switch (status) {
      case 'AVAILABLE':
        return '#22c55e'; // green-500
      case 'EN_ROUTE':
        return '#3b82f6'; // blue-500
      case 'ON_SCENE':
        return '#eab308'; // yellow-500
      case 'INVESTIGATING':
      case 'BUSY':
        return '#a855f7'; // purple-500
      case 'OFF_DUTY':
      default:
        return '#64748b'; // slate-500
    }
  };

  // Helper icon generator for Unit marker
  const createUnitIcon = (unit: PoliceUnit, isSelected: boolean) => {
    const statusColor = getStatusColor(unit.availability);
    const isSiren = unit.telemetry.isSirenActive;

    let glyph = '🚔';
    if (unit.unitType === 'Beat Marshal (Bike)') glyph = '🏍️';
    if (unit.unitType === 'Traffic Interceptor') glyph = '🚨';
    if (unit.unitType === 'QRT SWAT Unit') glyph = '🛡️';
    if (unit.unitType === 'Damini Squad (Women Safety)') glyph = '⭐';
    if (unit.unitType === 'Highway Patrol') glyph = '⚡';

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
        ${isSiren ? `<div class="absolute -inset-3 rounded-full animate-ping opacity-75" style="background-color: ${statusColor}40;"></div>` : ''}
        ${isSelected ? `<div class="absolute -inset-4 rounded-full border-2 border-blue-400 animate-pulse"></div>` : ''}
        <div class="w-9 h-9 rounded-full flex items-center justify-center text-sm shadow-xl transition-transform duration-300 group-hover:scale-125 border-2 ${isSelected ? 'border-blue-400 shadow-blue-500/50 scale-115' : 'border-slate-700'}" 
             style="background: radial-gradient(circle, #1e293b 0%, #0f172a 100%); box-shadow: 0 0 14px ${statusColor}80;">
          <span class="text-base">${glyph}</span>
          <span class="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center" 
                style="background-color: ${statusColor};">
          </span>
        </div>
        <div class="absolute -bottom-6 px-1.5 py-0.5 rounded bg-slate-900/90 border border-slate-700 text-[10px] font-mono font-semibold text-slate-200 whitespace-nowrap backdrop-blur-xs pointer-events-none shadow-md">
          ${unit.callSign.split(' ')[0]}
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-police-marker',
      iconSize: [36, 36],
      iconAnchor: [18, 18]
    });
  };

  // Helper icon for Nagpur Junction
  const createJunctionIcon = (junction: NagpurJunction) => {
    let congestionColor = '#3b82f6';
    if (junction.trafficCongestion === 'Moderate') congestionColor = '#eab308';
    if (junction.trafficCongestion === 'Heavy') congestionColor = '#f97316';
    if (junction.trafficCongestion === 'Gridlock') congestionColor = '#ef4444';

    const isCritical = junction.priorityLevel === 'Critical';

    const html = `
      <div class="relative flex items-center justify-center cursor-pointer group" style="transform: translate(-50%, -50%);">
        ${isCritical ? `<div class="absolute -inset-2 rounded-full animate-ping opacity-30 bg-amber-500"></div>` : ''}
        <div class="w-5 h-5 rounded-full bg-slate-900 border-2 flex items-center justify-center shadow-lg transition-transform duration-200 group-hover:scale-130" 
             style="border-color: ${congestionColor};">
          <div class="w-2 h-2 rounded-full" style="background-color: ${congestionColor};"></div>
        </div>
      </div>
    `;

    return L.divIcon({
      html,
      className: 'custom-junction-marker',
      iconSize: [20, 20],
      iconAnchor: [10, 10]
    });
  };

  // Render/Update Junction Markers
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (!showJunctions) {
      junctionMarkersRef.current.forEach((marker) => map.removeLayer(marker));
      junctionMarkersRef.current.clear();
      return;
    }

    NAGPUR_JUNCTIONS.forEach((junction) => {
      let marker = junctionMarkersRef.current.get(junction.id);
      if (!marker) {
        marker = L.marker([junction.latitude, junction.longitude], {
          icon: createJunctionIcon(junction),
          zIndexOffset: 100
        });

        // Popup with rich tactical info and 1-Click Dispatch
        const popupContent = document.createElement('div');
        popupContent.className = 'p-3.5 text-slate-100 bg-slate-900 rounded-xl border border-slate-700 font-sans min-w-[250px] shadow-2xl';
        popupContent.innerHTML = `
          <div class="flex items-center justify-between gap-2 border-b border-slate-700 pb-2 mb-2">
            <div>
              <span class="text-[10px] font-mono uppercase tracking-wider text-slate-400">Junction #${junction.id} • ${junction.zone.split(' - ')[0]}</span>
              <h4 class="text-sm font-bold text-white flex items-center gap-1.5">${junction.name}</h4>
            </div>
            <span class="px-2 py-0.5 text-[10px] font-mono font-semibold rounded bg-slate-800 text-slate-300 border border-slate-700">${junction.type}</span>
          </div>
          
          <div class="grid grid-cols-2 gap-2 text-xs mb-3">
            <div class="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 block font-mono">Congestion</span>
              <span class="font-semibold ${junction.trafficCongestion === 'Gridlock' ? 'text-red-400' : junction.trafficCongestion === 'Heavy' ? 'text-amber-400' : 'text-green-400'}">${junction.trafficCongestion}</span>
            </div>
            <div class="bg-slate-950/80 p-1.5 rounded-lg border border-slate-800">
              <span class="text-[10px] text-slate-400 block font-mono">CCTV Feeds</span>
              <span class="font-semibold text-cyan-400 font-mono">${junction.cctvCount} Active Cams</span>
            </div>
          </div>

          <div class="text-[11px] text-slate-400 mb-3 flex items-center justify-between">
            <span>Priority: <strong class="${junction.priorityLevel === 'Critical' ? 'text-red-400' : 'text-slate-300'}">${junction.priorityLevel}</strong></span>
            <span class="font-mono text-[10px] text-slate-500">${junction.latitude.toFixed(4)}, ${junction.longitude.toFixed(4)}</span>
          </div>

          <button id="btn-dispatch-junc-${junction.id}" class="w-full py-1.5 px-3 bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-md">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
            Dispatch Unit to Junction
          </button>
        `;

        marker.bindPopup(popupContent, {
          className: 'tactical-dark-popup',
          maxWidth: 320,
          closeButton: true
        });

        marker.on('popupopen', () => {
          const btn = document.getElementById(`btn-dispatch-junc-${junction.id}`);
          if (btn) {
            btn.onclick = () => {
              onDispatchToJunction(junction);
              map.closePopup();
            };
          }
        });

        marker.on('mouseover', () => setActiveJunctionHover(junction));
        marker.on('mouseout', () => setActiveJunctionHover(null));

        marker.addTo(map);
        junctionMarkersRef.current.set(junction.id, marker);
      } else {
        marker.setIcon(createJunctionIcon(junction));
      }
    });
  }, [showJunctions, onDispatchToJunction]);

  // Render/Update Police Unit Markers and Routes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Filter units
    const filteredUnits = units.filter((u) => {
      if (filterAvailability !== 'ALL' && u.availability !== filterAvailability) return false;
      if (filterUnitType !== 'ALL' && u.unitType !== filterUnitType) return false;
      if (filterZone !== 'ALL' && u.zone !== filterZone) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = u.callSign.toLowerCase().includes(q);
        const matchCode = u.unitCode.toLowerCase().includes(q);
        const matchOfficer = u.commanderName.toLowerCase().includes(q);
        const matchJunction = u.location.nearestJunctionName.toLowerCase().includes(q);
        const matchAsg = u.currentAssignment?.assignmentTitle.toLowerCase().includes(q) || false;
        if (!matchName && !matchCode && !matchOfficer && !matchJunction && !matchAsg) return false;
      }
      return true;
    });

    const activeUnitIds = new Set(filteredUnits.map((u) => u.id));

    // Remove obsolete unit markers
    unitMarkersRef.current.forEach((marker, id) => {
      if (!activeUnitIds.has(id)) {
        map.removeLayer(marker);
        unitMarkersRef.current.delete(id);
      }
    });

    // Remove obsolete breadcrumbs & target lines
    routePolylinesRef.current.forEach((poly, id) => {
      if (!activeUnitIds.has(id) || !showBreadcrumbs) {
        map.removeLayer(poly);
        routePolylinesRef.current.delete(id);
      }
    });

    dispatchLinesRef.current.forEach((poly, id) => {
      if (!activeUnitIds.has(id)) {
        map.removeLayer(poly);
        dispatchLinesRef.current.delete(id);
      }
    });

    // Add or update active markers
    filteredUnits.forEach((unit) => {
      const isSelected = selectedUnit?.id === unit.id;
      const statusColor = getStatusColor(unit.availability);

      let marker = unitMarkersRef.current.get(unit.id);
      if (!marker) {
        marker = L.marker([unit.location.latitude, unit.location.longitude], {
          icon: createUnitIcon(unit, isSelected),
          zIndexOffset: isSelected ? 1000 : 500
        });

        marker.on('click', () => {
          onSelectUnit(unit);
        });

        marker.addTo(map);
        unitMarkersRef.current.set(unit.id, marker);
      } else {
        marker.setLatLng([unit.location.latitude, unit.location.longitude]);
        marker.setIcon(createUnitIcon(unit, isSelected));
        marker.setZIndexOffset(isSelected ? 1000 : 500);
      }

      // Breadcrumb history trail
      if (showBreadcrumbs && unit.routeHistory.length > 1) {
        const fullTrail: [number, number][] = [
          ...unit.routeHistory,
          [unit.location.latitude, unit.location.longitude]
        ];

        let poly = routePolylinesRef.current.get(unit.id);
        if (!poly) {
          poly = L.polyline(fullTrail, {
            color: statusColor,
            weight: 2.5,
            opacity: 0.55,
            dashArray: '4, 6'
          }).addTo(map);
          routePolylinesRef.current.set(unit.id, poly);
        } else {
          poly.setLatLngs(fullTrail);
          poly.setStyle({ color: statusColor });
        }
      }

      // Target Destination Polyline if unit is en route
      if (unit.targetDestination && (unit.availability === 'EN_ROUTE' || unit.availability === 'DISPATCHED')) {
        const vectorCoords: [number, number][] = [
          [unit.location.latitude, unit.location.longitude],
          [unit.targetDestination.latitude, unit.targetDestination.longitude]
        ];

        let line = dispatchLinesRef.current.get(unit.id);
        if (!line) {
          line = L.polyline(vectorCoords, {
            color: '#38bdf8',
            weight: 3,
            opacity: 0.85,
            dashArray: '8, 8'
          }).addTo(map);
          dispatchLinesRef.current.set(unit.id, line);
        } else {
          line.setLatLngs(vectorCoords);
        }
      } else {
        const existingLine = dispatchLinesRef.current.get(unit.id);
        if (existingLine) {
          map.removeLayer(existingLine);
          dispatchLinesRef.current.delete(unit.id);
        }
      }
    });

  }, [units, selectedUnit, filterAvailability, filterUnitType, filterZone, searchQuery, showBreadcrumbs]);

  // Center on selected unit when selected
  useEffect(() => {
    if (selectedUnit && mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [selectedUnit.location.latitude, selectedUnit.location.longitude],
        15,
        { duration: 1.2 }
      );
    }
  }, [selectedUnit]);

  // Recenter to Nagpur City
  const handleRecenterNagpur = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(
        [NAGPUR_CENTER_COORDINATES.latitude, NAGPUR_CENTER_COORDINATES.longitude],
        NAGPUR_CENTER_COORDINATES.defaultZoom,
        { duration: 1 }
      );
    }
  };

  return (
    <div className="relative w-full h-full min-h-[480px] bg-slate-950 rounded-xl overflow-hidden border border-slate-700 shadow-2xl flex flex-col">
      {/* Terminal Viewport Top Bar */}
      <div className="h-8 bg-slate-800 border-b border-slate-700 px-3 flex items-center justify-between z-10 select-none">
        <span className="text-[10px] font-mono text-slate-400 tracking-wider">
          MAP_VIEW_PORT // LIVE_TELEMETRY // NAGPUR_GRID
        </span>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"></div>
          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
          <div className="w-2 h-2 rounded-full bg-slate-600"></div>
        </div>
      </div>

      {/* Map Header Floating Overlay */}
      <div className="absolute top-11 left-3 z-[1000] flex flex-wrap items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-2 rounded-lg border border-slate-700 shadow-xl max-w-[calc(100%-24px)]">
        <div className="flex items-center gap-2 pr-3 border-r border-slate-700">
          <div className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.7)] animate-pulse"></div>
          <span className="text-xs font-mono font-bold text-slate-200 uppercase tracking-wider">Nagpur GIS</span>
        </div>

        {/* Map Layers */}
        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded border border-slate-800 text-xs font-mono">
          <button
            id="btn-map-dark"
            onClick={() => setMapLayerType('dark')}
            className={`px-2 py-1 rounded transition-colors ${mapLayerType === 'dark' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Tactical Dark
          </button>
          <button
            id="btn-map-standard"
            onClick={() => setMapLayerType('standard')}
            className={`px-2 py-1 rounded transition-colors ${mapLayerType === 'standard' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Roads
          </button>
          <button
            id="btn-map-sat"
            onClick={() => setMapLayerType('satellite')}
            className={`px-2 py-1 rounded transition-colors ${mapLayerType === 'satellite' ? 'bg-blue-600 text-white font-bold shadow-xs' : 'text-slate-400 hover:text-slate-200'}`}
          >
            Satellite
          </button>
        </div>

        {/* Toggle Junctions */}
        <button
          id="btn-toggle-junctions"
          onClick={() => setShowJunctions(!showJunctions)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border font-mono transition-colors ${
            showJunctions ? 'bg-indigo-950/60 text-indigo-300 border-indigo-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}
          title="Toggle 40 Nagpur Junction markers"
        >
          <MapPin className="w-3.5 h-3.5 text-indigo-400" />
          <span className="hidden sm:inline">40 Junctions</span>
        </button>

        {/* Toggle Breadcrumb Routes */}
        <button
          id="btn-toggle-trails"
          onClick={() => setShowBreadcrumbs(!showBreadcrumbs)}
          className={`flex items-center gap-1 px-2.5 py-1 text-xs rounded border font-mono transition-colors ${
            showBreadcrumbs ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/50' : 'bg-slate-950 text-slate-400 border-slate-800'
          }`}
          title="Toggle Unit GPS Breadcrumb trails"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span className="hidden sm:inline">GPS Trails</span>
        </button>

        {/* Recenter Map */}
        <button
          id="btn-recenter-nagpur"
          onClick={handleRecenterNagpur}
          className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-950 hover:bg-slate-800 text-slate-300 rounded border border-slate-700 transition-colors font-mono"
          title="Recenter to Zero Mile Nagpur"
        >
          <Crosshair className="w-3.5 h-3.5 text-slate-400" />
          <span>Recenter</span>
        </button>
      </div>

      {/* Radar Sweep Animation (Tactical effect) */}
      {radarSweepActive && (
        <div className="absolute inset-0 pointer-events-none z-[900] overflow-hidden">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] rounded-full border border-cyan-500/20">
            <div className="w-full h-full rounded-full border border-cyan-500/10">
              <div className="w-full h-full rounded-full animate-spin duration-[6000ms] opacity-25" 
                   style={{ background: 'conic-gradient(from 0deg, rgba(6,182,212,0.4) 0deg, transparent 60deg, transparent 360deg)' }}></div>
            </div>
          </div>
        </div>
      )}

      {/* Map Element */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[460px] flex-1 z-0"></div>

      {/* Junction Quick Hover Card */}
      {activeJunctionHover && (
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/95 backdrop-blur-md px-3.5 py-2.5 rounded-lg border border-slate-700 shadow-2xl max-w-sm pointer-events-none animate-fadeIn">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-red-400 shrink-0" />
            <div>
              <h5 className="text-xs font-bold text-white">{activeJunctionHover.name}</h5>
              <p className="text-[11px] text-slate-400 font-mono">
                {activeJunctionHover.zone} • {activeJunctionHover.trafficCongestion} Traffic
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Map Legend Overlay */}
      <div className="absolute bottom-3 left-3 hidden md:flex items-center gap-3 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 font-mono z-[1000]">
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-green-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]"></span>
          <span>Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
          <span>En Route</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
          <span>On Scene</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
          <span>Investigating</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
          <span>Off Duty</span>
        </div>
      </div>
    </div>
  );
};

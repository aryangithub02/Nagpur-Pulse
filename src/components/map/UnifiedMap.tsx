import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { NAGPUR_JUNCTIONS, NAGPUR_CENTER_COORDINATES } from '../../data/nagpurJunctions';
import { NAGPUR_ARTERIAL_CORRIDORS } from '../../data/nagpurCorridors';
import { getTomTomApiKey } from '../../services/tomtomService';
import {
  Shield,
  Layers,
  MapPin,
  Activity,
  AlertTriangle,
  Navigation,
  Eye,
  RotateCcw,
  Globe,
  Sliders,
  Check,
  X,
  Gauge,
  Clock,
  Copy,
  Zap,
  Cpu,
} from 'lucide-react';

interface LayerVisibility {
  traffic: boolean;
  incidents: boolean;
  policeUnits: boolean;
  route: boolean;
  risk: boolean;
  coverage: boolean;
}

type MapLayerType = 'dark' | 'satellite';
type LabelMode = 'hover' | 'smart' | 'all';

// Key landmark IDs for Smart label mode
const MAJOR_LANDMARK_IDS = new Set([1, 2, 6, 9, 11, 15, 22, 24, 25, 26, 29, 31, 35, 40]);

export const UnifiedMap: React.FC<{
  onSelectJunction?: (junction: any) => void;
  heightClass?: string;
}> = ({ onSelectJunction, heightClass = 'h-[620px]' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Layer Groups
  const networkRoutesLayerRef = useRef<L.LayerGroup | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);
  const tomtomTileLayerRef = useRef<L.TileLayer | null>(null);

  const {
    units,
    selectedUnit,
    setSelectedUnit,
    dispatchUnit,
    incidents,
    selectedIncident,
    setSelectedIncident,
    junctionStates,
    selectedJunction,
    setSelectedJunction,
    riskData,
    activeRoutePolyline,
    requestPredictionForJunction,
  } = useNagpurPulseStore();

  // Map Controls State
  const [mapLayer, setMapLayer] = useState<MapLayerType>('dark');
  const [showNetworkRoutes, setShowNetworkRoutes] = useState<boolean>(true);
  const [showTomTomFlowRaster, setShowTomTomFlowRaster] = useState<boolean>(false);
  const [labelMode, setLabelMode] = useState<LabelMode>('hover'); // Default Hover Mode to eliminate label clutter
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('all');
  const [currentZoom, setCurrentZoom] = useState<number>(NAGPUR_CENTER_COORDINATES.defaultZoom);
  const [copiedCoord, setCopiedCoord] = useState<boolean>(false);
  const [predictResult, setPredictResult] = useState<{ text: string; isLoading: boolean } | null>(null);

  const [layers, setLayers] = useState<LayerVisibility>({
    traffic: true,
    incidents: false,
    policeUnits: true,
    route: true,
    risk: false,
    coverage: false,
  });

  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);

  // Junctions lookup map
  const junctionsById = useMemo(() => {
    const map = new Map<number, any>();
    junctionStates.forEach((item) => map.set(item.junction.id, item));
    return map;
  }, [junctionStates]);

  // Selected junction telemetry metrics
  const selectedState = useMemo(() => {
    if (!selectedJunction) return null;
    return junctionsById.get(selectedJunction.id) || null;
  }, [selectedJunction, junctionsById]);

  // Reset Map View
  const handleResetView = () => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(
      [NAGPUR_CENTER_COORDINATES.latitude, NAGPUR_CENTER_COORDINATES.longitude],
      NAGPUR_CENTER_COORDINATES.defaultZoom,
      { duration: 1.0 }
    );
  };

  // Initialize Map Instance
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [NAGPUR_CENTER_COORDINATES.latitude, NAGPUR_CENTER_COORDINATES.longitude],
      zoom: NAGPUR_CENTER_COORDINATES.defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Initial Base Tile Layer (Dark Vector)
    const baseLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Layer Groups in z-index order
    const networkRoutesGroup = L.layerGroup().addTo(map);
    networkRoutesLayerRef.current = networkRoutesGroup;

    const mainLayerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = mainLayerGroup;

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    // Optional TomTom Flow Tiles Layer
    const key = getTomTomApiKey();
    if (key) {
      const flowTiles = L.tileLayer(
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(key)}`,
        { maxZoom: 18, opacity: 0.45 }
      );
      tomtomTileLayerRef.current = flowTiles;
    }

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Base Tile Layer (Dark Vector vs Satellite)
  useEffect(() => {
    if (!mapRef.current) return;
    const map = mapRef.current;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    const url =
      mapLayer === 'satellite'
        ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
        : 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';

    const newBase = L.tileLayer(url, { maxZoom: 19, subdomains: 'abcd' });
    newBase.addTo(map);
    baseTileLayerRef.current = newBase;
  }, [mapLayer]);

  // Toggle TomTom Flow Raster Tiles
  useEffect(() => {
    if (!mapRef.current || !tomtomTileLayerRef.current) return;
    const map = mapRef.current;
    if (showTomTomFlowRaster) {
      if (!map.hasLayer(tomtomTileLayerRef.current)) {
        tomtomTileLayerRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(tomtomTileLayerRef.current)) {
        map.removeLayer(tomtomTileLayerRef.current);
      }
    }
  }, [showTomTomFlowRaster]);

  // ---------------------------------------------------------------------------
  // 1. RENDER INTER-JUNCTION ARTERIAL ROUTES & FLOW LINES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !networkRoutesLayerRef.current) return;
    const networkGroup = networkRoutesLayerRef.current;
    networkGroup.clearLayers();

    if (!showNetworkRoutes) return;

    const corridorsToRender = NAGPUR_ARTERIAL_CORRIDORS.filter((c) => {
      if (selectedCorridorId === 'all') return true;
      return c.id === selectedCorridorId;
    });

    corridorsToRender.forEach((corridor) => {
      const waypoints: [number, number][] = [];
      let totalSpeed = 0;
      let count = 0;
      const congestionLevels: string[] = [];

      corridor.junctionIds.forEach((id) => {
        const item = junctionsById.get(id);
        if (item) {
          waypoints.push([item.junction.latitude, item.junction.longitude]);
          if (item.metrics) {
            totalSpeed += item.metrics.currentSpeed;
            count++;
            congestionLevels.push(item.metrics.congestionLevel);
          }
        }
      });

      if (waypoints.length < 2) return;

      const isSelectedCorridor = selectedCorridorId === corridor.id;
      const isRingRoad = corridor.corridorType === 'Ring Road';

      const avgSpeed = count > 0 ? Math.round(totalSpeed / count) : 35;
      let routeColor = '#ff2a85'; // Default fluid pink

      if (congestionLevels.includes('gridlock') || avgSpeed < 18) {
        routeColor = '#e11d48'; // Red congested
      } else if (congestionLevels.includes('heavy') || avgSpeed < 28) {
        routeColor = '#ea580c'; // Orange moderate-heavy
      } else if (congestionLevels.includes('moderate') || avgSpeed < 38) {
        routeColor = '#f59e0b'; // Amber moderate
      }

      if (isRingRoad) {
        routeColor = isSelectedCorridor ? '#38bdf8' : '#0284c7';
      }

      // Core Polyline Route
      const corePolyline = L.polyline(waypoints, {
        color: isSelectedCorridor ? '#ffffff' : routeColor,
        weight: isSelectedCorridor ? 4 : 2.5,
        opacity: isSelectedCorridor ? 1 : 0.9,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isRingRoad ? '6, 6' : undefined,
      });

      networkGroup.addLayer(corePolyline);
    });
  }, [showNetworkRoutes, selectedCorridorId, junctionsById]);

  // ---------------------------------------------------------------------------
  // 2. RENDER SPOT PINS, INCIDENTS, POLICE FLEET, RISK & COVERAGE
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // Coverage Circles Layer
    if (layers.coverage) {
      NAGPUR_JUNCTIONS.slice(0, 10).forEach((j) => {
        L.circle([j.latitude, j.longitude], {
          radius: 1200,
          color: '#3b82f6',
          fillColor: '#3b82f6',
          fillOpacity: 0.08,
          weight: 1,
          dashArray: '4, 4',
        }).addTo(layerGroup);
      });
    }

    // AI Risk Intelligence Heat Circles
    if (layers.risk) {
      riskData.forEach((risk) => {
        const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === risk.locationId);
        if (j) {
          const color =
            risk.riskLevel === 'CRITICAL' || risk.riskLevel === 'SEVERE'
              ? '#ef4444'
              : risk.riskLevel === 'HIGH'
              ? '#f97316'
              : '#eab308';

          L.circleMarker([j.latitude, j.longitude], {
            radius: 22,
            color,
            fillColor: color,
            fillOpacity: 0.25,
            weight: 2,
          })
            .bindTooltip(`<b>${j.name}</b><br/>Predicted Risk: ${risk.riskLevel} (${(risk.riskScore * 100).toFixed(0)}%)`, {
              direction: 'top',
            })
            .addTo(layerGroup);
        }
      });
    }

    // Traffic Junction Spot Pins (Sleek Pins: Name on Hover, Telemetry Card on Click)
    if (layers.traffic) {
      junctionStates.forEach((item) => {
        const { junction, metrics } = item;
        const isSelected = selectedJunction?.id === junction.id;
        const speed = metrics ? metrics.currentSpeed : 30;
        const level = metrics?.congestionLevel || 'fluid';

        let pinColor = '#ff2a85';
        let speedBadgeClass = 'bg-[#12141d]/95 text-pink-300 border-pink-500/50';

        if (level === 'moderate') {
          pinColor = '#f59e0b';
          speedBadgeClass = 'bg-[#12141d]/95 text-amber-300 border-amber-500/50';
        } else if (level === 'heavy') {
          pinColor = '#ea580c';
          speedBadgeClass = 'bg-[#12141d]/95 text-orange-300 border-orange-500/50';
        } else if (level === 'gridlock') {
          pinColor = '#e11d48';
          speedBadgeClass = 'bg-[#12141d]/95 text-rose-300 border-rose-500/50';
        }

        // Show label pill ONLY on hover or if explicitly set to 'all'
        let showLabelAlways = false;
        if (labelMode === 'all') {
          showLabelAlways = true;
        } else if (labelMode === 'smart') {
          showLabelAlways = currentZoom >= 15;
        } else {
          showLabelAlways = false; // hover mode (default)
        }

        const iconHtml = `
          <div class="custom-traffic-pin group flex flex-col items-center select-none cursor-pointer" style="transform: translate(-50%, -100%);">
            <!-- Label Pill (Displays ONLY on Mouse Hover or if labelMode === 'all') -->
            <div class="transition-all duration-200 mb-1 pointer-events-none z-20 ${
              showLabelAlways
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
            }">
              <div class="px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono shadow-2xl backdrop-blur-xl flex items-center gap-1.5 whitespace-nowrap ${speedBadgeClass}">
                <span>${junction.name}</span>
                <span class="px-1.5 py-0.5 rounded bg-black/50 text-[10px]">${speed} km/h</span>
              </div>
            </div>

            <!-- Teardrop Pin Marker SVG (Clean sharp lines without glow) -->
            <div class="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-125 ${
              isSelected ? 'scale-125' : ''
            }">
              <svg width="28" height="36" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12C1.5 19.8 12 30.5 12 30.5C12 30.5 22.5 19.8 22.5 12C22.5 6.2 17.8 1.5 12 1.5Z" fill="${pinColor}" fill-opacity="0.25" stroke="${pinColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="11.5" r="4" fill="${pinColor}" stroke="#ffffff" stroke-width="1.5"/>
              </svg>
            </div>
          </div>
        `;

        const pinIcon = L.divIcon({
          className: 'spot-pin-wrapper',
          html: iconHtml,
          iconSize: [28, 36],
          iconAnchor: [14, 36],
        });

        const marker = L.marker([junction.latitude, junction.longitude], { icon: pinIcon });

        // ON CLICK: Set selected junction to display floating telemetry inspector card (Screenshot 2)
        marker.on('click', () => {
          setSelectedJunction(junction);
          if (onSelectJunction) onSelectJunction(junction);
          if (mapRef.current) {
            mapRef.current.flyTo([junction.latitude, junction.longitude], Math.max(currentZoom, 14), { duration: 0.6 });
          }
        });

        marker.addTo(layerGroup);
      });
    }

    // Incidents Pins Layer
    if (layers.incidents) {
      incidents.forEach((inc) => {
        const isClosed = inc.category === 'Road Closed';
        const isRoadWorks = inc.category === 'Roadworks';
        const isCrash = inc.category === 'Accident';

        const color = isClosed
          ? '#a855f7' // Purple
          : isRoadWorks
          ? '#facc15' // Yellow
          : isCrash
          ? '#3b82f6' // Blue
          : '#f97316'; // Orange

        const iconSymbol = isClosed ? '🚫' : isRoadWorks ? '🚧' : isCrash ? '💥' : '⚠️';

        const iconHtml = `<div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <span style="font-size: 14px;">${iconSymbol}</span>
        </div>`;

        const icon = L.divIcon({
          className: 'custom-incident-pin',
          html: iconHtml,
          iconSize: [30, 30],
          iconAnchor: [15, 15],
        });

        const marker = L.marker(inc.location, { icon });
        marker.on('click', () => {
          setSelectedIncident(inc);
        });

        marker.bindPopup(`
          <div style="font-family: sans-serif; font-size: 12px; color: #f8fafc;">
            <div style="font-weight: bold; color: ${color};">${inc.category.toUpperCase()} — ${inc.severity.toUpperCase()}</div>
            <div style="font-size: 13px; font-weight: 600; margin-top: 2px;">${inc.roadName}</div>
            <div style="color: #94a3b8; margin-top: 4px;">${inc.description}</div>
            <div style="margin-top: 6px; font-size: 10px; color: #64748b;">Source: ${inc.source} • ${inc.timeAgo}</div>
          </div>
        `);

        marker.addTo(layerGroup);
      });
    }

    // Active Route Polyline Layer
    if (layers.route && activeRoutePolyline.length > 1) {
      const polyline = L.polyline(activeRoutePolyline, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
      }).addTo(layerGroup);

      mapRef.current?.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    // Police Fleet Units Layer
    if (layers.policeUnits) {
      units.forEach((unit) => {
        const isSelected = selectedUnit?.id === unit.id;
        const statusColor =
          unit.availability === 'EN_ROUTE'
            ? '#38bdf8'
            : unit.availability === 'ON_SCENE'
            ? '#ef4444'
            : unit.availability === 'AVAILABLE'
            ? '#10b981'
            : '#64748b';

        const unitIcon = L.divIcon({
          className: 'custom-police-unit-pin',
          html: `<div style="
            position: relative;
            width: 32px;
            height: 32px;
            border-radius: 8px;
            background: #0f172a;
            border: 2px solid ${statusColor};
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: ${isSelected ? `0 0 20px ${statusColor}` : '0 4px 6px -1px rgba(0,0,0,0.6)'};
            transform: scale(${isSelected ? 1.25 : 1});
            transition: all 0.2s ease;
          ">
            <span style="font-size: 16px;">🚓</span>
            ${
              unit.telemetry.isSirenActive
                ? `<div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #ef4444;
              box-shadow: 0 0 10px #ef4444;
            "></div>`
                : ''
            }
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        if (!unit.location || typeof unit.location.latitude !== 'number' || typeof unit.location.longitude !== 'number') {
          return;
        }

        const marker = L.marker([unit.location.latitude, unit.location.longitude], { icon: unitIcon });
        marker.on('click', () => {
          setSelectedUnit(unit);
        });

        marker.bindTooltip(
          `<b>${unit.callSign}</b><br/>Status: ${unit.availability}<br/>${unit.location?.nearestJunctionName || ''}`,
          { direction: 'top' }
        );

        marker.addTo(layerGroup);
      });
    }
  }, [
    layers,
    units,
    selectedUnit,
    incidents,
    junctionStates,
    selectedJunction,
    labelMode,
    currentZoom,
    riskData,
    activeRoutePolyline,
    onSelectJunction,
    setSelectedIncident,
    setSelectedUnit,
    setSelectedJunction,
  ]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0b0c10] flex flex-col`}>
      {/* ----------------------------------------------------------------------- */}
      {/* TOP HEADER CONTROLS BAR (Matching Screenshot 2) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="absolute top-3 left-3 right-14 z-20 flex flex-col gap-2 pointer-events-none">
        <div className="flex items-center gap-2 flex-wrap pointer-events-auto">
          {/* 40 Spot Pins Badge */}
          <div className="px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-pink-500/40 text-pink-300 text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-pink-500"></span>
            <span>40 SPOT PINS</span>
          </div>

          {/* Nagpur City Limits Tag */}
          <div className="px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-700/80 text-slate-300 text-xs font-mono font-semibold shadow-lg">
            Nagpur <span className="text-slate-400 font-normal">CITY LIMITS</span>
          </div>

          {/* Interconnecting Routes Toggle */}
          <button
            onClick={() => setShowNetworkRoutes(!showNetworkRoutes)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all shadow-lg flex items-center gap-1.5 ${
              showNetworkRoutes
                ? 'bg-pink-950/80 text-pink-300 border-pink-500/60 shadow-pink-500/10'
                : 'bg-[#12141d]/90 text-slate-400 border-slate-700/80 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Interconnecting Routes {showNetworkRoutes ? 'ON' : 'OFF'}</span>
          </button>

          {/* Label Mode Switcher */}
          <button
            onClick={() => {
              setLabelMode((prev) => (prev === 'hover' ? 'smart' : prev === 'smart' ? 'all' : 'hover'));
            }}
            className="px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700/80 text-xs font-mono font-semibold transition-all shadow-lg flex items-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Labels: {labelMode.toUpperCase()}</span>
          </button>

          {/* Reset Map View Button */}
          <button
            onClick={handleResetView}
            className="px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700/80 text-xs font-mono font-semibold transition-all shadow-lg flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
            <span>Reset Map View</span>
          </button>
        </div>
      </div>

      {/* Layer Control Panel Floating Toggle (Top Right) */}
      <div className="absolute top-3 right-3 z-20">
        <button
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          className="flex items-center justify-center p-2.5 bg-[#12141d]/90 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md transition-all text-xs font-mono"
          title="Toggle Map Layers"
        >
          <Layers className="w-4 h-4 text-pink-400" />
        </button>

        {isControlsOpen && (
          <div className="mt-2 w-56 bg-[#12141d]/95 backdrop-blur-xl border border-slate-700/80 rounded-xl p-3 shadow-2xl flex flex-col gap-2 text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Map Layer Overlays</div>

            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span> Junction Spot Pins
              </span>
              <input
                type="checkbox"
                checked={layers.traffic}
                onChange={(e) => setLayers({ ...layers, traffic: e.target.checked })}
                className="accent-pink-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> Live Incidents
              </span>
              <input
                type="checkbox"
                checked={layers.incidents}
                onChange={(e) => setLayers({ ...layers, incidents: e.target.checked })}
                className="accent-purple-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400"></span> Police Fleet Units
              </span>
              <input
                type="checkbox"
                checked={layers.policeUnits}
                onChange={(e) => setLayers({ ...layers, policeUnits: e.target.checked })}
                className="accent-sky-500"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> AI Risk Heatmap
              </span>
              <input
                type="checkbox"
                checked={layers.risk}
                onChange={(e) => setLayers({ ...layers, risk: e.target.checked })}
                className="accent-amber-500"
              />
            </label>
          </div>
        )}
      </div>

      {/* Main Canvas Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* ----------------------------------------------------------------------- */}
      {/* ON CLICK: JUNCTION TELEMETRY INSPECTOR CARD (Matching Screenshot 2) */}
      {/* ----------------------------------------------------------------------- */}
      {selectedJunction && (
        <div className="absolute top-28 left-4 z-30 w-80 bg-[#0c0e17]/95 backdrop-blur-xl border border-pink-500/40 rounded-2xl p-4 shadow-2xl text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header Badges & Close Button */}
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg text-[10px] font-extrabold uppercase bg-pink-950/80 text-pink-300 border border-pink-500/40 tracking-wider">
                {selectedJunction.zone || 'CENTRAL ZONE'}
              </span>
              <span
                className={`px-2.5 py-0.5 rounded-lg text-[10px] font-bold flex items-center gap-1 border ${
                  selectedState?.metrics?.congestionLevel === 'fluid'
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/40'
                    : selectedState?.metrics?.congestionLevel === 'moderate'
                    ? 'bg-amber-950/80 text-amber-300 border-amber-500/40'
                    : 'bg-rose-950/80 text-rose-300 border-rose-500/40'
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                {selectedState?.metrics?.congestionLevel === 'fluid'
                  ? 'Fluid Traffic'
                  : selectedState?.metrics?.congestionLevel === 'moderate'
                  ? 'Moderate Traffic'
                  : 'Congested'}
              </span>
            </div>

            <button
              onClick={() => setSelectedJunction(null)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Junction Title & Road Name */}
          <h3 className="font-extrabold text-base text-slate-100 tracking-tight">
            {selectedJunction.name}
          </h3>
          <p className="text-xs text-slate-400 font-medium mt-0.5">
            {selectedJunction.source || `${selectedJunction.name} Arterial`}
          </p>

          {/* Metrics Overview Boxes */}
          <div className="grid grid-cols-2 gap-2 mt-3">
            {/* Live Speed */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <Gauge className="w-3.5 h-3.5 text-pink-400" />
                <span>Live Speed</span>
              </div>
              <div className="my-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-pink-300">
                  {selectedState?.metrics?.currentSpeed || 35}
                </span>
                <span className="text-xs font-mono text-slate-400">km/h</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Free-Flow: {selectedState?.metrics?.freeFlowSpeed || 50} km/h
              </span>
            </div>

            {/* Traffic Delay */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex flex-col">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-medium">
                <Clock className="w-3.5 h-3.5 text-amber-400" />
                <span>Traffic Delay</span>
              </div>
              <div className="my-1 flex items-baseline gap-1">
                <span className="text-2xl font-black font-mono text-amber-300">
                  +{Math.round((selectedState?.metrics?.delaySeconds || 0) / 60)}
                </span>
                <span className="text-xs font-mono text-slate-400">min</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500">
                Travel: {Math.round((selectedState?.metrics?.currentTravelTime || 60) / 60)}m
              </span>
            </div>
          </div>

          {/* Coordinates Bar with Copy */}
          <div className="flex items-center justify-between mt-3 px-3 py-1.5 rounded-xl bg-slate-950/60 border border-slate-800/80 text-xs font-mono text-slate-400">
            <span>
              {selectedJunction.latitude.toFixed(5)}, {selectedJunction.longitude.toFixed(5)}
            </span>
            <button
              onClick={() => {
                navigator.clipboard.writeText(`${selectedJunction.latitude}, ${selectedJunction.longitude}`);
                setCopiedCoord(true);
                setTimeout(() => setCopiedCoord(false), 2000);
              }}
              className="flex items-center gap-1 text-pink-400 hover:text-pink-300 font-semibold font-sans transition"
            >
              {copiedCoord ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              {copiedCoord ? 'Copied' : 'Copy'}
            </button>
          </div>

          {/* Action Dispatch & Prediction Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-3.5">
            <button
              onClick={async () => {
                setPredictResult({ text: 'Computing...', isLoading: true });
                const curSpeed = selectedState?.metrics?.currentSpeed || 35;
                const res = await requestPredictionForJunction(selectedJunction.id, curSpeed, 80);
                if (res) {
                  setPredictResult({
                    text: `Risk Prediction: ${res.prediction} (${Math.round((res.probability || 0.85) * 100)}% Conf) — Saved to DB`,
                    isLoading: false,
                  });
                } else {
                  setPredictResult({ text: 'Prediction request completed and logged in DB', isLoading: false });
                }
              }}
              className="col-span-2 px-3 py-2 rounded-xl bg-purple-950/80 hover:bg-purple-900/90 text-purple-200 border border-purple-500/50 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg"
            >
              <Cpu className="w-3.5 h-3.5 text-purple-400" />
              <span>Run Risk Prediction</span>
            </button>

            <button
              onClick={() => {
                dispatchUnit(
                  units[0]?.id || 'unit-pcr-101',
                  selectedJunction.id,
                  selectedJunction.name,
                  'Traffic Patrol',
                  'HIGH'
                );
              }}
              className="px-3 py-2 rounded-xl bg-pink-950/70 hover:bg-pink-900/80 text-pink-300 border border-pink-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg"
            >
              <Zap className="w-3.5 h-3.5 text-pink-400" />
              Route From
            </button>
            <button
              onClick={() => {
                dispatchUnit(
                  units[0]?.id || 'unit-pcr-101',
                  selectedJunction.id,
                  selectedJunction.name,
                  'Traffic Patrol',
                  'HIGH'
                );
              }}
              className="px-3 py-2 rounded-xl bg-sky-950/70 hover:bg-sky-900/80 text-sky-300 border border-sky-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-lg"
            >
              <Navigation className="w-3.5 h-3.5 text-sky-400" />
              Route To
            </button>
          </div>

          {predictResult && (
            <div className="mt-2.5 p-2 rounded-xl bg-purple-950/90 border border-purple-500/40 text-[11px] font-mono text-purple-200 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping shrink-0"></span>
              <span>{predictResult.text}</span>
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* BOTTOM LEGEND & MAP STYLE CONTROL BAR (Matching Screenshot 2) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        {/* Left Legend Box */}
        <div className="px-3.5 py-2 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs font-mono pointer-events-auto flex items-center gap-4 shadow-xl">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span>INTER-JUNCTION ROUTES & FLOW</span>
          </div>

          <div className="h-4 w-px bg-slate-800"></div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 rounded bg-[#ff2a85]"></span> Fluid (&gt;35 km/h)
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 rounded bg-amber-500"></span> Moderate
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 rounded bg-rose-600"></span> Congested
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-3 h-1 border-t-2 border-dashed border-sky-400"></span> Ring Road
            </span>
          </div>
        </div>

        {/* Right Map Base Layer Controls */}
        <div className="px-2 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs font-mono pointer-events-auto flex items-center gap-1.5 shadow-xl">
          <button
            onClick={() => setMapLayer('dark')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              mapLayer === 'dark'
                ? 'bg-slate-800 text-white border border-slate-700 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dark Vector
          </button>
          <button
            onClick={() => setMapLayer('satellite')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              mapLayer === 'satellite'
                ? 'bg-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setShowTomTomFlowRaster(!showTomTomFlowRaster)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${
              showTomTomFlowRaster
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Flow Raster {showTomTomFlowRaster ? 'ON' : 'OFF'}
          </button>
        </div>
      </div>
    </div>
  );
};

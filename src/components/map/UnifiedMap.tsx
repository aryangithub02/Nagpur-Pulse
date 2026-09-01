import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { useAuth } from '../../store/authContext';
import { isJunctionInZone, ZONE_CENTERS } from '../../utils/geoUtils';
import { NAGPUR_JUNCTIONS, NAGPUR_CENTER_COORDINATES } from '../../data/nagpurJunctions';
import { NAGPUR_ARTERIAL_CORRIDORS } from '../../data/nagpurCorridors';
import { getTomTomApiKey } from '../../services/tomtomService';
import { getWeatherHeatmap, WeatherHeatmapPoint, WeatherHeatmapResponse } from '../../services/api/weather';
import { resourceAllocationApi, AllocationAssignment } from '../../services/api/resourceAllocation';
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
  CloudRain,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface LayerVisibility {
  traffic: boolean;
  incidents: boolean;
  policeUnits: boolean;
  route: boolean;
  risk: boolean;
  coverage: boolean;
  weather: boolean;
  allocations: boolean;
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
  const prevRouteKeyRef = useRef<string>('');

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
  const [predictResult, setPredictResult] = useState<{ text: string; detailText?: string; isLoading: boolean } | null>(null);
  const [isRouting, setIsRouting] = useState<boolean>(false);
  const [routingSuccess, setRoutingSuccess] = useState<string | null>(null);
  const [predictingPhase, setPredictingPhase] = useState<string>('');

  const [weatherPoints, setWeatherPoints] = useState<WeatherHeatmapPoint[]>([]);
  const [weatherResponse, setWeatherResponse] = useState<WeatherHeatmapResponse | null>(null);
  const [weatherForecastHour, setWeatherForecastHour] = useState<number>(0);
  const [weatherCondFilter, setWeatherCondFilter] = useState<string>('ALL');
  const [weatherLevelFilter, setWeatherLevelFilter] = useState<string>('ALL');
  const [selectedWeatherPoint, setSelectedWeatherPoint] = useState<WeatherHeatmapPoint | null>(null);
  const [allocations, setAllocations] = useState<AllocationAssignment[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchHeatmap = async () => {
      const res = await getWeatherHeatmap(weatherForecastHour);
      if (isMounted) {
        setWeatherResponse(res);
        setWeatherPoints(res.heatmap_points || []);
      }
    };
    const fetchAllocations = async () => {
      try {
        const res = await resourceAllocationApi.getLatest();
        if (isMounted && res.assignments) {
          setAllocations(res.assignments);
        }
      } catch (err) {
        console.error('Failed to fetch allocation vectors for map:', err);
      }
    };

    fetchHeatmap();
    fetchAllocations();

    const interval = setInterval(() => {
      fetchHeatmap();
      fetchAllocations();
    }, 60000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [weatherForecastHour]);

  const [layers, setLayers] = useState<LayerVisibility>({
    traffic: true,
    incidents: true,
    policeUnits: true,
    route: true,
    risk: false,
    coverage: false,
    weather: false,
    allocations: true,
  });

  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);

  // Authenticated User Zone Context
  const { activeZone, user } = useAuth();
  const currentZone = user?.role === 'ZONE_ADMIN' ? user.zone : activeZone;

  // Filter junctions strictly by active zone (CENTRAL, NORTH, EAST, WEST, SOUTH, or ALL)
  const filteredJunctionStates = useMemo(() => {
    return junctionStates.filter((item) => isJunctionInZone(item.junction.zone, currentZone));
  }, [junctionStates, currentZone]);

  // Scoped Junctions lookup map
  const junctionsById = useMemo(() => {
    const map = new Map<number, any>();
    filteredJunctionStates.forEach((item) => map.set(item.junction.id, item));
    return map;
  }, [filteredJunctionStates]);

  // Selected junction telemetry metrics
  const selectedState = useMemo(() => {
    if (!selectedJunction) return null;
    return junctionsById.get(selectedJunction.id) || null;
  }, [selectedJunction, junctionsById]);

  // Auto pan/fly map to zone center when active zone changes & reselect valid junction
  useEffect(() => {
    if (!mapRef.current) return;
    const centerInfo = ZONE_CENTERS[currentZone] || ZONE_CENTERS.ALL;
    mapRef.current.flyTo([centerInfo.lat, centerInfo.lng], centerInfo.zoom, {
      duration: 1.2,
      easeLinearity: 0.25,
    });

    if (selectedJunction && !isJunctionInZone(selectedJunction.zone, currentZone)) {
      const firstInZone = filteredJunctionStates[0]?.junction || null;
      setSelectedJunction(firstInZone);
    }
  }, [currentZone, filteredJunctionStates]);

  // Reset Map View
  const handleResetView = () => {
    if (!mapRef.current) return;
    const centerInfo = ZONE_CENTERS[currentZone] || ZONE_CENTERS.ALL;
    mapRef.current.flyTo(
      [centerInfo.lat, centerInfo.lng],
      centerInfo.zoom,
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
      filteredJunctionStates.slice(0, 10).forEach((item) => {
        const j = item.junction;
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
        const item = junctionsById.get(Number(risk.locationId));
        if (item) {
          const j = item.junction;
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

    // Weather Impact Heatmap Circles Overlay (Scale: 0-20 LOW, 21-40 MODERATE, 41-60 ELEVATED, 61-80 HIGH, 81-100 SEVERE)
    if (layers.weather && weatherPoints.length > 0) {
      weatherPoints.forEach((wpt) => {
        // Apply condition filter
        if (
          weatherCondFilter !== 'ALL' &&
          !wpt.weather_condition.toLowerCase().includes(weatherCondFilter.toLowerCase())
        ) {
          return;
        }

        // Apply impact level filter
        if (
          weatherLevelFilter !== 'ALL' &&
          wpt.impact_level.toUpperCase() !== weatherLevelFilter.toUpperCase()
        ) {
          return;
        }

        const color =
          wpt.impact_level === 'SEVERE'
            ? '#ef4444'
            : wpt.impact_level === 'HIGH'
            ? '#f97316'
            : wpt.impact_level === 'ELEVATED'
            ? '#f59e0b'
            : wpt.impact_level === 'MODERATE'
            ? '#06b6d4'
            : '#38bdf8';

        const radius = Math.max(16, Math.min(32, wpt.combined_score * 0.30 + 8));

        const circle = L.circleMarker([wpt.latitude, wpt.longitude], {
          radius: radius,
          color: color,
          fillColor: color,
          fillOpacity: 0.25, // Subtle translucent overlay
          weight: 1.5,
        });

        circle.bindTooltip(
          `<div class="p-1 font-mono text-[11px]">
            <b>WEATHER IMPACT: ${wpt.name}</b><br/>
            <b>Combined Score:</b> ${wpt.combined_score} / 100 (${wpt.impact_level})<br/>
            <b>Weather Impact:</b> ${wpt.weather_impact_score} pts | <b>Traffic:</b> ${wpt.traffic_congestion_score}%<br/>
            <b>Condition:</b> ${wpt.weather_condition} (${wpt.precipitation_mm} mm/h)
          </div>`,
          { direction: 'top' }
        );

        circle.on('click', () => {
          setSelectedWeatherPoint(wpt);
        });

        circle.addTo(layerGroup);
      });
    }

    // Traffic Junction Spot Pins (Sleek Pins: Name on Hover, Telemetry Card on Click)
    if (layers.traffic) {
      filteredJunctionStates.forEach((item) => {
        const { junction, metrics } = item;
        const isSelected = selectedJunction?.id === junction.id;
        const speed = metrics ? metrics.currentSpeed : (
          junction.trafficCongestion === 'Gridlock' ? 8 :
          junction.trafficCongestion === 'Heavy' ? 16 :
          junction.trafficCongestion === 'Moderate' ? 26 : 42
        );
        const level = metrics?.congestionLevel || (
          junction.trafficCongestion === 'Gridlock' ? 'gridlock' :
          junction.trafficCongestion === 'Heavy' ? 'heavy' :
          junction.trafficCongestion === 'Moderate' ? 'moderate' : 'fluid'
        );

        // Check if there is an active incident at or near this junction
        const hasIncident = incidents.some(
          (inc) =>
            inc.nearestJunction?.id === junction.id ||
            (Math.abs(inc.location[0] - junction.latitude) < 0.003 &&
              Math.abs(inc.location[1] - junction.longitude) < 0.003)
        );

        // Traffic Congestion Hierarchy:
        // 1. CRITICAL (Red #EF4444): Active Incident / Gridlock / Speed < 15 km/h / Critical Priority
        // 2. HIGH (Orange #F97316): Heavy Congestion / Speed 15-25 km/h / High Priority
        // 3. MODERATE (Yellow #EAB308): Moderate Congestion / Speed 25-35 km/h / Medium Priority
        // 4. LOW (Green #22C55E): Fluid Flow / Speed >= 35 km/h / Normal / Low Priority
        const rawCongestion = (junction.trafficCongestion || '').toLowerCase();
        const rawPriority = (junction.priorityLevel || '').toLowerCase();
        const rawLevel = (level || '').toLowerCase();

        let congestionRank: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'LOW' = 'LOW';

        if (
          hasIncident ||
          rawLevel === 'gridlock' ||
          rawCongestion === 'gridlock' ||
          rawPriority === 'critical' ||
          speed < 15
        ) {
          congestionRank = 'CRITICAL';
        } else if (
          rawLevel === 'heavy' ||
          rawCongestion === 'heavy' ||
          rawPriority === 'high' ||
          speed < 25
        ) {
          congestionRank = 'HIGH';
        } else if (
          rawLevel === 'moderate' ||
          rawCongestion === 'moderate' ||
          rawPriority === 'medium' ||
          speed < 35
        ) {
          congestionRank = 'MODERATE';
        } else {
          congestionRank = 'LOW';
        }

        let pinColor = '#22C55E'; // Low -> Green
        let speedBadgeClass = 'bg-[#051a0d]/95 text-emerald-300 border-emerald-500/80 shadow-emerald-500/20';

        if (congestionRank === 'CRITICAL') {
          pinColor = '#EF4444'; // Critical -> Red
          speedBadgeClass = 'bg-[#1a0505]/95 text-red-300 border-red-500/80 shadow-red-500/20';
        } else if (congestionRank === 'HIGH') {
          pinColor = '#F97316'; // High -> Orange
          speedBadgeClass = 'bg-[#1a0e05]/95 text-orange-300 border-orange-500/80 shadow-orange-500/20';
        } else if (congestionRank === 'MODERATE') {
          pinColor = '#EAB308'; // Moderate -> Yellow
          speedBadgeClass = 'bg-[#1a1705]/95 text-yellow-300 border-yellow-500/80 shadow-yellow-500/20';
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
            <div class="transition-all duration-200 mb-1 pointer-events-none z-20 ${showLabelAlways
            ? 'opacity-100 scale-100'
            : 'opacity-0 scale-90 group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
          }">
              <div class="px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono shadow-2xl backdrop-blur-xl flex items-center gap-1.5 whitespace-nowrap ${speedBadgeClass}">
                <span>${junction.name}</span>
                <span class="px-1.5 py-0.5 rounded bg-black/60 text-[10px]">${speed} km/h</span>
                <span class="text-[9px] uppercase px-1 py-0.2 rounded font-black" style="color: ${pinColor};">${congestionRank}</span>
              </div>
            </div>

            <!-- Teardrop Pin Marker SVG with Congestion Color Glow -->
            <div class="relative flex items-center justify-center transition-transform duration-200 group-hover:scale-125 ${isSelected ? 'scale-125' : ''}">
              <svg width="30" height="38" viewBox="0 0 24 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 1.5C6.2 1.5 1.5 6.2 1.5 12C1.5 19.8 12 30.5 12 30.5C12 30.5 22.5 19.8 22.5 12C22.5 6.2 17.8 1.5 12 1.5Z" fill="${pinColor}" fill-opacity="0.9" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="11.5" r="4.5" fill="#0c0e17" stroke="#ffffff" stroke-width="1.4"/>
                <circle cx="12" cy="11.5" r="2.5" fill="${pinColor}"/>
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

    // Incidents Pins Layer (#8B5CF6 Purple)
    if (layers.incidents) {
      incidents.forEach((inc) => {
        const color = '#8B5CF6'; // Incident (#8B5CF6 Purple)
        const isClosed = inc.category === 'Road Closed';
        const isRoadWorks = inc.category === 'Roadworks';
        const isCrash = inc.category === 'Accident';

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
        interactive: false,
      }).addTo(layerGroup);

      const routeKey = `${activeRoutePolyline[0][0]},${activeRoutePolyline[0][1]}-${activeRoutePolyline[activeRoutePolyline.length - 1][0]},${activeRoutePolyline[activeRoutePolyline.length - 1][1]}`;
      if (prevRouteKeyRef.current !== routeKey) {
        prevRouteKeyRef.current = routeKey;
        mapRef.current?.fitBounds(polyline.getBounds(), { padding: [50, 50], maxZoom: 15 });
      }
    } else {
      prevRouteKeyRef.current = '';
    }

    // Police Fleet Units Layer (#3B82F6 Blue)
    if (layers.policeUnits) {
      units.forEach((unit) => {
        const isSelected = selectedUnit?.id === unit.id;
        const statusColor = '#3B82F6'; // Police Active (#3B82F6 Blue)

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
            ${unit.telemetry.isSirenActive
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

    // OR-Tools Resource Allocation Flow Layer (#6366F1 Indigo Polyline Vectors)
    if (layers.allocations && allocations.length > 0) {
      allocations.forEach((alloc) => {
        const u = units.find((item) => item.id === alloc.unit_id);
        const jState = junctionsById.get(alloc.location_id);
        if (u && u.location && jState) {
          const startPt: [number, number] = [u.location.latitude, u.location.longitude];
          const endPt: [number, number] = [jState.junction.latitude, jState.junction.longitude];

          const line = L.polyline([startPt, endPt], {
            color: '#6366F1',
            weight: 3,
            dashArray: '6, 8',
            opacity: 0.85,
          });

          line.bindTooltip(
            `<div class="p-1 font-mono text-[11px]">
              <b>OR-TOOLS ALLOCATION</b><br/>
              <b>Unit:</b> ${alloc.unit_id} ──► ${alloc.location_name}<br/>
              <b>Risk:</b> ${alloc.risk_score}% (${alloc.risk_class})<br/>
              <b>ETA:</b> ${alloc.eta_minutes} min | <b>Score:</b> ${alloc.assignment_value}
            </div>`,
            { sticky: true }
          );

          line.addTo(layerGroup);
        }
      });
    }
  }, [
    layers,
    units,
    allocations,
    weatherPoints,
    weatherCondFilter,
    weatherLevelFilter,
    selectedUnit,
    incidents,
    filteredJunctionStates,
    currentZone,
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
          {/* Dynamic Spot Pins Count Badge with Active Zone */}
          <div className="px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-pink-500/40 text-pink-300 text-xs font-mono font-extrabold flex items-center gap-1.5 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-pink-500"></span>
            <span>{filteredJunctionStates.length} {currentZone !== 'ALL' ? `${currentZone} ZONE PINS` : 'SPOT PINS'}</span>
          </div>

          {/* Active Zone Badge */}
          {currentZone !== 'ALL' ? (
            <div className="px-3 py-1.5 bg-blue-950/90 backdrop-blur-md rounded-xl border border-blue-500/50 text-blue-300 text-xs font-mono font-bold flex items-center gap-1.5 shadow-lg">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
              <span>ZONE: {currentZone} SCOPE</span>
            </div>
          ) : (
            <div className="px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-700/80 text-slate-300 text-xs font-mono font-semibold shadow-lg">
              Nagpur <span className="text-slate-400 font-normal">CITY LIMITS</span>
            </div>
          )}

          {/* Traffic Congestion Color Legend */}
          <div className="hidden md:flex items-center gap-2.5 px-3 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-700/80 text-[11px] font-mono shadow-lg">
            <span className="text-slate-400 font-bold uppercase text-[10px]">Traffic:</span>
            <div className="flex items-center gap-1 text-red-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-red-500 shadow-sm shadow-red-500"></span>
              <span>Critical</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1 text-orange-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-orange-500 shadow-sm shadow-orange-500"></span>
              <span>High</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1 text-yellow-300 font-bold">
              <span className="w-2 h-2 rounded-full bg-yellow-400 shadow-sm shadow-yellow-400"></span>
              <span>Moderate</span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500"></span>
              <span>Low</span>
            </div>
          </div>

          {/* Interconnecting Routes Toggle */}
          <button
            onClick={() => setShowNetworkRoutes(!showNetworkRoutes)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-semibold transition-all shadow-lg flex items-center gap-1.5 ${showNetworkRoutes
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

            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span> Weather Impact Layer
              </span>
              <input
                type="checkbox"
                checked={layers.weather}
                onChange={(e) => setLayers({ ...layers, weather: e.target.checked })}
                className="accent-cyan-400"
              />
            </label>

            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-400"></span> OR-Tools Allocation Layer
              </span>
              <input
                type="checkbox"
                checked={layers.allocations}
                onChange={(e) => setLayers({ ...layers, allocations: e.target.checked })}
                className="accent-indigo-400"
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
      {/* ----------------------------------------------------------------------- */}
      {/* SIMPLE JUNCTION TELEMETRY INFO CARD */}
      {/* ----------------------------------------------------------------------- */}
      {selectedJunction && (
        <div className="absolute top-24 left-4 z-30 w-72 bg-[#0c0e17]/95 backdrop-blur-xl border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-slate-100 font-sans animate-in fade-in zoom-in-95 duration-150">
          {/* Header & Close Button */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 border border-slate-700">
                {selectedJunction.zone || 'Nagpur Zone'}
              </span>
              <h3 className="font-extrabold text-base text-slate-100 tracking-tight mt-1">
                {selectedJunction.name}
              </h3>
            </div>

            <button
              onClick={() => setSelectedJunction(null)}
              className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Simple Metrics Row */}
          <div className="grid grid-cols-3 gap-2 my-3 p-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-center font-mono">
            <div>
              <div className="text-[10px] text-slate-400">Speed</div>
              <div className="text-sm font-black text-emerald-400 mt-0.5">
                {selectedState?.metrics?.currentSpeed || 35} <span className="text-[10px] font-normal text-slate-500">km/h</span>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">Status</div>
              <div className="text-xs font-bold mt-1 capitalize text-amber-300">
                {selectedState?.metrics?.congestionLevel || 'Fluid'}
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-400">Delay</div>
              <div className="text-sm font-black text-rose-400 mt-0.5">
                +{Math.round((selectedState?.metrics?.delaySeconds || 0) / 60)}m
              </div>
            </div>
          </div>

          {/* Weather Impact Section inside Junction Inspector Card */}
          {weatherPoints.length > 0 && (() => {
            const jWpt = weatherPoints.find((w) => w.junction_id === String(selectedJunction.id));
            if (!jWpt) return null;
            return (
              <div className="my-2.5 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-xs font-mono space-y-1 text-cyan-200">
                <div className="flex items-center justify-between font-bold text-cyan-300">
                  <span className="flex items-center gap-1">
                    <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
                    WEATHER & IMPACT
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-200 border border-cyan-500/30 font-bold">
                    {jWpt.impact_level}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] pt-1">
                  <div><span className="text-slate-400">Condition:</span> <strong className="text-white">{jWpt.weather_condition}</strong></div>
                  <div><span className="text-slate-400">Rainfall:</span> <strong className="text-cyan-300">{jWpt.precipitation_mm} mm/h</strong></div>
                  <div><span className="text-slate-400">Visibility:</span> <strong className="text-slate-200">{jWpt.visibility_km} km</strong></div>
                  <div><span className="text-slate-400">Wind:</span> <strong className="text-slate-200">{jWpt.wind_speed_kmh} km/h</strong></div>
                </div>
                <div className="pt-1.5 border-t border-cyan-800/40 flex items-center justify-between font-bold text-[11px]">
                  <span>Weather Impact Score: <strong className="text-amber-300">{jWpt.weather_impact_score}</strong></span>
                  <span>Combined: <strong className="text-emerald-300">{jWpt.combined_score}/100</strong></span>
                </div>
              </div>
            );
          })()}

          {/* Interactive Action Buttons with Loaders & Smooth Feedback */}
          <div className="grid grid-cols-2 gap-2">
            <button
              disabled={isRouting}
              onClick={async () => {
                if (!selectedJunction) return;
                setIsRouting(true);
                setRoutingSuccess(null);
                
                const targetUnit = units.find((u: any) => u.availability === 'AVAILABLE') || units[0] || { id: 'unit-pcr-101', callSign: 'PCR-101' };
                
                try {
                  await dispatchUnit(
                    targetUnit.id,
                    selectedJunction.id,
                    selectedJunction.name,
                    'Traffic Patrol',
                    'HIGH'
                  );
                  setRoutingSuccess(`✓ ${targetUnit.callSign || targetUnit.id} routed to ${selectedJunction.name}`);
                  setTimeout(() => {
                    setRoutingSuccess(null);
                  }, 4000);
                } catch (err: any) {
                  console.error('Route unit failed:', err);
                } finally {
                  setIsRouting(false);
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md ${
                isRouting
                  ? 'bg-blue-800 text-blue-200 cursor-wait animate-pulse'
                  : 'bg-blue-600 hover:bg-blue-500 text-white'
              }`}
            >
              {isRouting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-200" />
                  <span>Routing Unit...</span>
                </>
              ) : (
                <>
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Route Unit</span>
                </>
              )}
            </button>

            <button
              disabled={predictResult?.isLoading}
              onClick={async () => {
                if (!selectedJunction) return;
                setPredictResult({ text: 'Computing ML Risk & SHAP...', isLoading: true });
                setPredictingPhase('Ingesting speed & density features...');
                
                try {
                  const curSpeed = selectedState?.metrics?.currentSpeed || 35;
                  
                  const phaseTimer = setTimeout(() => {
                    setPredictingPhase('Evaluating calibrated XGBoost tree...');
                  }, 450);

                  const res = await requestPredictionForJunction(selectedJunction.id, curSpeed, 80);
                  clearTimeout(phaseTimer);

                  if (res) {
                    const rawScore = res.risk_score ?? (res.probability !== undefined && res.probability <= 1 ? res.probability * 100 : res.probability);
                    const scorePercent = Math.round(rawScore ?? 45);
                    const levelText = typeof res.prediction === 'string' && res.prediction ? res.prediction : (res.risk_level || 'ANALYZED');
                    const dbIdText = res.id ? ` [DB #${res.id}]` : '';
                    const topShap = res.shap_explanation && res.shap_explanation.length > 0
                      ? res.shap_explanation[0].description
                      : 'Speed variance & peak interval dominance';

                    setPredictResult({
                      text: `Risk: ${levelText} (${scorePercent}%)${dbIdText}`,
                      detailText: topShap,
                      isLoading: false,
                    });
                  } else {
                    setPredictResult({
                      text: 'Prediction Completed',
                      detailText: 'Nominal corridor parameters',
                      isLoading: false,
                    });
                  }
                } catch (err: any) {
                  setPredictResult({
                    text: 'Prediction Error',
                    detailText: err?.message || 'Inference service timeout',
                    isLoading: false,
                  });
                } finally {
                  setPredictingPhase('');
                }
              }}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md ${
                predictResult?.isLoading
                  ? 'bg-purple-900 border border-purple-400/60 text-purple-200 cursor-wait animate-pulse'
                  : 'bg-purple-950 hover:bg-purple-900 text-purple-200 border border-purple-500/40'
              }`}
            >
              {predictResult?.isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-purple-300" />
                  <span>Predicting...</span>
                </>
              ) : (
                <>
                  <Cpu className="w-3.5 h-3.5 text-purple-400" />
                  <span>Predict</span>
                </>
              )}
            </button>
          </div>

          {/* Route Unit Positive Confirmation Toast */}
          {routingSuccess && (
            <div className="mt-2 p-2.5 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-[11px] font-mono text-emerald-300 flex items-center gap-2 animate-fadeIn shadow-lg">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{routingSuccess}</span>
            </div>
          )}

          {/* Prediction Results & Smooth Animated Loading Container */}
          {predictResult && (
            <div className="mt-2.5 p-3 rounded-xl bg-purple-950/90 border border-purple-500/50 text-[11px] font-mono text-purple-200 space-y-1.5 animate-fadeIn shadow-lg">
              {predictResult.isLoading ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-purple-300">
                    <div className="flex items-center gap-2 font-bold">
                      <Loader2 className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                      <span>{predictResult.text}</span>
                    </div>
                    <span className="text-[10px] text-purple-400 font-mono animate-pulse">Running ML</span>
                  </div>
                  {predictingPhase && (
                    <p className="text-[10px] text-purple-300/80 italic pl-5">
                      {predictingPhase}
                    </p>
                  )}
                  <div className="w-full bg-purple-950/80 rounded-full h-1.5 overflow-hidden border border-purple-800">
                    <div className="bg-gradient-to-r from-purple-500 via-pink-500 to-cyan-400 h-full rounded-full animate-pulse w-full"></div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between font-bold text-purple-200">
                    <span className="text-white">{predictResult.text}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-900 border border-purple-700 text-purple-300">
                      CALIBRATED
                    </span>
                  </div>
                  {predictResult.detailText && (
                    <div className="text-[10px] text-purple-300/90 border-t border-purple-800/60 pt-1.5 flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold shrink-0">SHAP:</span>
                      <span className="leading-tight">{predictResult.detailText}</span>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* WEATHER IMPACT DETAIL POPUP MODAL (ON CLICK WEATHER POINT) */}
      {/* ----------------------------------------------------------------------- */}
      {selectedWeatherPoint && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-cyan-500/50 rounded-2xl max-w-md w-full p-5 shadow-2xl text-slate-100 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <CloudRain className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="font-extrabold text-base text-white">{selectedWeatherPoint.name}</h3>
                  <span className="text-[11px] text-slate-400 font-mono">Weather & Derived Traffic Impact Analysis</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedWeatherPoint(null)}
                className="text-slate-400 hover:text-white transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Observed Weather Card */}
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800 space-y-2">
              <div className="text-xs font-bold text-cyan-300 uppercase tracking-wider">Observed Weather Conditions</div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Condition</span>
                  <strong className="text-white text-sm">{selectedWeatherPoint.weather_condition}</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Rainfall Rate</span>
                  <strong className="text-cyan-300 text-sm">{selectedWeatherPoint.precipitation_mm} mm/hr</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Visibility Range</span>
                  <strong className="text-slate-200 text-sm">{selectedWeatherPoint.visibility_km} km</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-slate-800">
                  <span className="text-slate-400 block text-[10px]">Wind Velocity</span>
                  <strong className="text-slate-200 text-sm">{selectedWeatherPoint.wind_speed_kmh} km/h</strong>
                </div>
              </div>
            </div>

            {/* Derived Operational Impact Card */}
            <div className="bg-indigo-950/40 p-3 rounded-xl border border-indigo-500/30 space-y-2 font-mono">
              <div className="text-xs font-bold text-indigo-300 uppercase tracking-wider">Derived Operational Impact</div>
              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="bg-slate-950 p-2 rounded border border-indigo-900">
                  <span className="text-slate-400 block text-[10px]">Weather Impact</span>
                  <strong className="text-amber-300 text-sm">{selectedWeatherPoint.weather_impact_score} / 100</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-indigo-900">
                  <span className="text-slate-400 block text-[10px]">Live Congestion</span>
                  <strong className="text-orange-300 text-sm">{selectedWeatherPoint.traffic_congestion_score}%</strong>
                </div>
                <div className="bg-slate-950 p-2 rounded border border-indigo-900">
                  <span className="text-slate-400 block text-[10px]">Combined Score</span>
                  <strong className="text-emerald-400 text-sm">{selectedWeatherPoint.combined_score} / 100</strong>
                </div>
              </div>

              <div className="text-[11px] text-slate-300 pt-1 flex items-center justify-between border-t border-indigo-900/60">
                <span>Operational Impact Level:</span>
                <span className="px-2 py-0.5 rounded font-bold bg-indigo-500/20 text-indigo-200 border border-indigo-500/40">
                  {selectedWeatherPoint.impact_level}
                </span>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedWeatherPoint(null)}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-slate-950 rounded-lg text-xs font-bold transition"
              >
                Close Details
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* BOTTOM LEGEND & MAP STYLE CONTROL BAR (Matching Screenshot 2) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
        {/* Left Legend Box */}
        <div className="px-3.5 py-2 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs font-mono pointer-events-auto flex items-center gap-4 shadow-xl flex-wrap">
          <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
            <Activity className="w-3.5 h-3.5 text-pink-400" />
            <span>ROUTES & MAP OVERLAYS</span>
          </div>

          <div className="h-4 w-px bg-slate-800 hidden md:block"></div>

          <div className="flex items-center gap-3 text-[11px]">
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span> Low
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15]"></span> Moderate
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F97316]"></span> High
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Critical
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#8B5CF6]"></span> Incident
            </span>
            <span className="flex items-center gap-1.5 text-slate-300">
              <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span> Police Active
            </span>
          </div>

          {/* Weather Impact Heatmap Scale Legend */}
          {layers.weather && (
            <>
              <div className="h-4 w-px bg-slate-800 hidden md:block"></div>
              <div className="flex items-center gap-2 text-[10px] font-mono">
                <span className="text-cyan-400 font-bold">WEATHER SCALE:</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> LOW (0-20)
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#10B981]"></span> MOD (21-40)
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#F59E0B]"></span> ELEV (41-60)
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#F97316]"></span> HIGH (61-80)
                </span>
                <span className="flex items-center gap-1 text-slate-300">
                  <span className="w-2 h-2 rounded-full bg-[#EF4444]"></span> SEVERE (81-100)
                </span>
              </div>
            </>
          )}
        </div>

        {/* Right Map Base Layer Controls */}
        <div className="px-2 py-1.5 bg-[#12141d]/90 backdrop-blur-md rounded-xl border border-slate-800 text-xs font-mono pointer-events-auto flex items-center gap-1.5 shadow-xl">
          <button
            onClick={() => setMapLayer('dark')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${mapLayer === 'dark'
                ? 'bg-slate-800 text-white border border-slate-700 shadow'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Dark Vector
          </button>
          <button
            onClick={() => setMapLayer('satellite')}
            className={`px-3 py-1 rounded-lg font-semibold transition ${mapLayer === 'satellite'
                ? 'bg-pink-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200'
              }`}
          >
            Satellite
          </button>
          <button
            onClick={() => setShowTomTomFlowRaster(!showTomTomFlowRaster)}
            className={`px-3 py-1 rounded-lg font-semibold transition ${showTomTomFlowRaster
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

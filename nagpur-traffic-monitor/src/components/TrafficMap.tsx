import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import {
  MapPin,
  ZoomIn,
  ZoomOut,
  Eye,
  EyeOff,
  Maximize2,
  Minimize2,
  Route,
  Activity,
  GitBranch,
  Gauge,
  Clock,
  Navigation,
  Copy,
  Check,
  X,
  Zap,
  ArrowRight,
  TrendingDown,
  Layers,
} from 'lucide-react';
import {
  CongestionLevel,
  Coordinate,
  Junction,
  JunctionTrafficState,
  RouteCalculation,
  TrafficMetrics,
} from '../types';
import { NAGPUR_CENTER } from '../data/nagpurJunctions';
import { NAGPUR_ARTERIAL_CORRIDORS } from '../data/nagpurCorridors';
import { getTomTomApiKey } from '../services/tomtomService';

interface TrafficMapProps {
  junctionStates: JunctionTrafficState[];
  selectedJunction: Junction | null;
  onSelectJunction: (junction: Junction) => void;
  onCloseSelectedJunction?: () => void;
  onSetRouteOrigin?: (junction: Junction) => void;
  onSetRouteDestination?: (junction: Junction) => void;
  activeRoute: RouteCalculation | null;
  onMapClickPoint?: (coord: Coordinate) => void;
  isFullScreen?: boolean;
  onToggleFullScreen?: () => void;
}

type MapLayerType = 'dark' | 'satellite' | 'streets';
type LabelMode = 'smart' | 'all' | 'hover';

// Major prominent landmarks to display when in 'smart' label mode at normal zoom
const MAJOR_LANDMARK_IDS = new Set([9, 2, 11, 6, 29, 31, 1, 26, 15, 24, 22, 40]);

export const TrafficMap: React.FC<TrafficMapProps> = ({
  junctionStates,
  selectedJunction,
  onSelectJunction,
  onCloseSelectedJunction,
  onSetRouteOrigin,
  onSetRouteDestination,
  activeRoute,
  onMapClickPoint,
  isFullScreen = false,
  onToggleFullScreen,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const networkRoutesLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const routeLayerRef = useRef<L.LayerGroup | null>(null);
  const tomtomTileLayerRef = useRef<L.TileLayer | null>(null);
  const baseTileLayerRef = useRef<L.TileLayer | null>(null);

  // View & Filter States
  const [mapLayer, setMapLayer] = useState<MapLayerType>('dark');
  const [showNetworkRoutes, setShowNetworkRoutes] = useState<boolean>(true);
  const [showTomTomTrafficTiles, setShowTomTomTrafficTiles] = useState<boolean>(false);
  const [labelMode, setLabelMode] = useState<LabelMode>('smart');
  const [selectedCorridorId, setSelectedCorridorId] = useState<string>('all');
  const [currentZoom, setCurrentZoom] = useState<number>(NAGPUR_CENTER.zoom);
  const [copiedCoord, setCopiedCoord] = useState<boolean>(false);

  // Quick lookup dictionary for junctions by ID
  const junctionsById = useMemo(() => {
    const map = new Map<number, JunctionTrafficState>();
    junctionStates.forEach(j => map.set(j.junction.id, j));
    return map;
  }, [junctionStates]);

  // Selected junction metrics
  const selectedState = useMemo(() => {
    if (!selectedJunction) return null;
    return junctionsById.get(selectedJunction.id) || null;
  }, [selectedJunction, junctionsById]);

  // Reset Map View to default center & zoom
  const handleResetMapView = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.flyTo(
      [NAGPUR_CENTER.lat, NAGPUR_CENTER.lng],
      NAGPUR_CENTER.zoom,
      {
        duration: 1.0,
        easeLinearity: 0.25,
      }
    );
  };

  // Zoom helpers
  const handleZoomIn = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomIn();
  };

  const handleZoomOut = () => {
    if (mapInstanceRef.current) mapInstanceRef.current.zoomOut();
  };

  // Center on Selected Junction
  const handleZoomToJunction = (j: Junction) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo([j.latitude, j.longitude], 15, {
        duration: 0.8,
      });
    }
  };

  // Copy coordinates
  const handleCopyCoord = (j: Junction) => {
    navigator.clipboard.writeText(`${j.latitude}, ${j.longitude}`);
    setCopiedCoord(true);
    setTimeout(() => setCopiedCoord(false), 2000);
  };

  // Initialize map instance once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [NAGPUR_CENTER.lat, NAGPUR_CENTER.lng],
      zoom: NAGPUR_CENTER.zoom,
      zoomControl: false,
      attributionControl: false,
    });

    const baseLayer = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
        className: 'dark-matter-tiles',
      }
    );
    baseLayer.addTo(map);
    baseTileLayerRef.current = baseLayer;

    // Layer groups in exact z-order
    const networkRoutesGroup = L.layerGroup().addTo(map);
    networkRoutesLayerRef.current = networkRoutesGroup;

    const polylinesGroup = L.layerGroup().addTo(map);
    polylinesLayerRef.current = polylinesGroup;

    const routeGroup = L.layerGroup().addTo(map);
    routeLayerRef.current = routeGroup;

    const markersGroup = L.layerGroup().addTo(map);
    markersLayerRef.current = markersGroup;

    map.on('zoomend', () => {
      setCurrentZoom(map.getZoom());
    });

    const apiKey = getTomTomApiKey();
    if (apiKey) {
      const tomtomTiles = L.tileLayer(
        `https://api.tomtom.com/traffic/map/4/tile/flow/relative0/{z}/{x}/{y}.png?key=${encodeURIComponent(apiKey)}`,
        {
          maxZoom: 18,
          opacity: 0.45,
        }
      );
      tomtomTileLayerRef.current = tomtomTiles;
      if (showTomTomTrafficTiles) {
        tomtomTiles.addTo(map);
      }
    }

    map.on('click', (e: L.LeafletMouseEvent) => {
      const target = e.originalEvent.target as HTMLElement;
      if (!target.closest('.custom-traffic-pin') && !target.closest('.on-map-info-card')) {
        if (onMapClickPoint) {
          onMapClickPoint({
            latitude: Number(e.latlng.lat.toFixed(6)),
            longitude: Number(e.latlng.lng.toFixed(6)),
          });
        }
      }
    });

    mapInstanceRef.current = map;

    setTimeout(() => {
      map.invalidateSize();
    }, 150);

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update base tile layer on layer switch
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (baseTileLayerRef.current) {
      map.removeLayer(baseTileLayerRef.current);
    }

    let url = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    let className = 'dark-matter-tiles';

    if (mapLayer === 'satellite') {
      url = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
      className = '';
    } else if (mapLayer === 'streets') {
      url = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
      className = '';
    }

    const newBase = L.tileLayer(url, {
      maxZoom: 19,
      subdomains: 'abcd',
      className,
    });
    newBase.addTo(map);
    baseTileLayerRef.current = newBase;
  }, [mapLayer]);

  // Toggle TomTom Traffic Overlay Layer
  useEffect(() => {
    if (!mapInstanceRef.current || !tomtomTileLayerRef.current) return;
    const map = mapInstanceRef.current;
    if (showTomTomTrafficTiles) {
      if (!map.hasLayer(tomtomTileLayerRef.current)) {
        tomtomTileLayerRef.current.addTo(map);
      }
    } else {
      if (map.hasLayer(tomtomTileLayerRef.current)) {
        map.removeLayer(tomtomTileLayerRef.current);
      }
    }
  }, [showTomTomTrafficTiles]);

  // Handle map size change
  useEffect(() => {
    if (mapInstanceRef.current) {
      setTimeout(() => {
        mapInstanceRef.current?.invalidateSize();
      }, 200);
    }
  }, [isFullScreen]);

  // ---------------------------------------------------------------------------
  // RENDER INTER-JUNCTION ARTERIAL ROUTES
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !networkRoutesLayerRef.current) return;
    const networkGroup = networkRoutesLayerRef.current;
    networkGroup.clearLayers();

    if (!showNetworkRoutes) return;

    const corridorsToRender = NAGPUR_ARTERIAL_CORRIDORS.filter(c => {
      if (selectedCorridorId === 'all') return true;
      return c.id === selectedCorridorId;
    });

    corridorsToRender.forEach(corridor => {
      const waypoints: [number, number][] = [];
      let totalSpeed = 0;
      let count = 0;
      const congestionList: CongestionLevel[] = [];

      corridor.junctionIds.forEach(id => {
        const state = junctionsById.get(id);
        if (state) {
          waypoints.push([state.junction.latitude, state.junction.longitude]);
          if (state.metrics) {
            totalSpeed += state.metrics.currentSpeed;
            count++;
            congestionList.push(state.metrics.congestionLevel);
          }
        }
      });

      if (waypoints.length < 2) return;

      const isSingleSelected = selectedCorridorId === corridor.id;
      const isRingRoad = corridor.corridorType === 'Ring Road';

      let routeColor = '#ff2a85';
      let glowColor = 'rgba(255, 42, 133, 0.4)';
      const avgSpeed = count > 0 ? Math.round(totalSpeed / count) : 38;

      if (congestionList.includes('gridlock')) {
        routeColor = '#e11d48';
        glowColor = 'rgba(225, 29, 72, 0.5)';
      } else if (congestionList.includes('heavy')) {
        routeColor = '#ea580c';
        glowColor = 'rgba(234, 88, 12, 0.45)';
      } else if (congestionList.includes('moderate')) {
        routeColor = '#f59e0b';
        glowColor = 'rgba(245, 158, 11, 0.4)';
      }

      if (isRingRoad) {
        routeColor = isSingleSelected ? '#38bdf8' : '#0284c7';
        glowColor = 'rgba(14, 165, 233, 0.35)';
      }

      const glowPolyline = L.polyline(waypoints, {
        color: routeColor,
        weight: isSingleSelected ? 7 : 4,
        opacity: isSingleSelected ? 0.75 : 0.35,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const corePolyline = L.polyline(waypoints, {
        color: isSingleSelected ? '#ffffff' : routeColor,
        weight: isSingleSelected ? 3 : 1.8,
        opacity: isSingleSelected ? 1 : 0.85,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: isRingRoad ? '5, 5' : undefined,
      });

      networkGroup.addLayer(glowPolyline);
      networkGroup.addLayer(corePolyline);
    });
  }, [showNetworkRoutes, selectedCorridorId, junctionsById]);

  // ---------------------------------------------------------------------------
  // RENDER SPOT PINS & CLICK HANDLER
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!mapInstanceRef.current || !markersLayerRef.current) return;
    const markersGroup = markersLayerRef.current;
    markersGroup.clearLayers();

    junctionStates.forEach(item => {
      const { junction, metrics } = item;
      const isSelected = selectedJunction?.id === junction.id;

      const speed = metrics ? metrics.currentSpeed : '--';
      const level = metrics?.congestionLevel ?? 'fluid';

      let pinColor = '#ff2a85';
      let pinGradientStop = '#ff75ab';
      let speedBadgeColor = 'text-pink-300 bg-pink-950/70 border-pink-500/30';

      if (level === 'moderate') {
        pinColor = '#f59e0b';
        pinGradientStop = '#fcd34d';
        speedBadgeColor = 'text-amber-300 bg-amber-950/70 border-amber-500/30';
      } else if (level === 'heavy') {
        pinColor = '#ea580c';
        pinGradientStop = '#fdba74';
        speedBadgeColor = 'text-orange-300 bg-orange-950/70 border-orange-500/30';
      } else if (level === 'gridlock') {
        pinColor = '#e11d48';
        pinGradientStop = '#fda4af';
        speedBadgeColor = 'text-rose-300 bg-rose-950/70 border-rose-500/40';
      }

      let showLabel = false;
      if (isSelected) {
        showLabel = true;
      } else if (labelMode === 'all') {
        showLabel = true;
      } else if (labelMode === 'smart') {
        showLabel = currentZoom >= 14 || MAJOR_LANDMARK_IDS.has(junction.id);
      } else {
        showLabel = false;
      }

      const iconHtml = `
        <div class="custom-traffic-pin group flex flex-col items-center select-none cursor-pointer" style="transform: translate(-50%, -100%);">
          <!-- Sleek Floating Label Pill -->
          <div
            class="transition-all duration-150 mb-1 pointer-events-auto z-20 ${
              showLabel
                ? 'opacity-100 scale-100'
                : 'opacity-0 scale-95 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto'
            }"
          >
            <div
              class="px-2 py-0.5 rounded-md text-[10px] font-semibold whitespace-nowrap shadow-xl flex items-center gap-1.5 transition-all border ${
                isSelected
                  ? 'bg-slate-950 text-white border-pink-500 shadow-pink-500/50 ring-2 ring-pink-500/60 scale-105'
                  : 'bg-[#14161f]/95 text-slate-100 border-white/20 hover:border-pink-400 hover:bg-[#1a1d28]'
              } backdrop-blur-md"
            >
              <span class="max-w-[130px] truncate text-slate-100 font-medium">${junction.name}</span>
              ${
                metrics
                  ? `<span class="font-mono text-[9px] px-1 py-0.1 rounded border ${speedBadgeColor}">${speed} km/h</span>`
                  : ''
              }
            </div>
          </div>

          <!-- Luminous Glowing Teardrop Pin -->
          <div class="relative flex items-center justify-center">
            <!-- Pulsing target ring if selected -->
            ${
              isSelected
                ? `<div class="absolute w-10 h-10 rounded-full border-2 border-pink-400 animate-ping opacity-75 pointer-events-none"></div>
                   <div class="absolute w-12 h-12 rounded-full border border-pink-500/50 pointer-events-none"></div>`
                : ''
            }

            <!-- Subtle glow aura -->
            <div
              class="absolute rounded-full pointer-events-none transition-all duration-300 ${
                isSelected ? 'w-10 h-10 opacity-90' : 'w-6 h-6 opacity-60'
              }"
              style="background: radial-gradient(circle, ${pinColor} 0%, transparent 70%); filter: blur(2px);"
            ></div>

            <div
              class="relative z-10 transition-transform duration-150 transform ${
                isSelected ? 'scale-130' : 'hover:scale-115'
              }"
              style="filter: drop-shadow(0 0 6px ${pinColor});"
            >
              <svg width="22" height="28" viewBox="0 0 22 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="M11 0C4.92487 0 0 4.92487 0 11C0 19.25 11 28 11 28C11 28 22 19.25 22 11C22 4.92487 17.0751 0 11 0Z"
                  fill="url(#grad-${junction.id})"
                />
                <path
                  d="M11 0.75C5.34009 0.75 0.75 5.34009 0.75 11C0.75 18.7 10.55 26.8 11 27.2C11.45 26.8 21.25 18.7 21.25 11C21.25 5.34009 16.6599 0.75 11 0.75Z"
                  stroke="${isSelected ? '#ffffff' : 'rgba(255,255,255,0.7)'}"
                  stroke-width="${isSelected ? '1.2' : '0.8'}"
                />
                <circle cx="11" cy="11" r="4" fill="${isSelected ? '#ff2a85' : '#ffffff'}" />
                <circle cx="11" cy="11" r="2.2" fill="${isSelected ? '#ffffff' : '#181a20'}" />
                <defs>
                  <linearGradient id="grad-${junction.id}" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stop-color="${pinColor}" />
                    <stop offset="100%" stop-color="${pinGradientStop}" />
                  </linearGradient>
                </defs>
              </svg>
            </div>
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        html: iconHtml,
        className: 'traffic-spot-pin-icon',
        iconSize: [160, 60],
        iconAnchor: [80, 58],
      });

      const marker = L.marker([junction.latitude, junction.longitude], {
        icon: customIcon,
        zIndexOffset: isSelected ? 3000 : 200,
      });

      marker.on('click', (e) => {
        L.DomEvent.stopPropagation(e);
        onSelectJunction(junction);

        if (mapInstanceRef.current) {
          mapInstanceRef.current.panTo([junction.latitude, junction.longitude], {
            animate: true,
            duration: 0.5,
          });
        }
      });

      markersGroup.addLayer(marker);
    });
  }, [junctionStates, selectedJunction, labelMode, currentZoom, onSelectJunction]);

  // Render Polylines for Selected Junction road coordinates
  useEffect(() => {
    if (!mapInstanceRef.current || !polylinesLayerRef.current) return;
    const polylinesGroup = polylinesLayerRef.current;
    polylinesGroup.clearLayers();

    if (selectedJunction) {
      const match = junctionStates.find(j => j.junction.id === selectedJunction.id);
      if (match?.metrics?.coordinates && match.metrics.coordinates.length > 1) {
        const latLngs = match.metrics.coordinates.map(c => [c.latitude, c.longitude] as [number, number]);

        let strokeColor = '#ff2a85';
        if (match.metrics.congestionLevel === 'moderate') strokeColor = '#f59e0b';
        if (match.metrics.congestionLevel === 'heavy') strokeColor = '#ea580c';
        if (match.metrics.congestionLevel === 'gridlock') strokeColor = '#e11d48';

        const glowLine = L.polyline(latLngs, {
          color: strokeColor,
          weight: 8,
          opacity: 0.5,
          lineCap: 'round',
          lineJoin: 'round',
        });

        const coreLine = L.polyline(latLngs, {
          color: '#ffffff',
          weight: 3,
          opacity: 0.95,
          lineCap: 'round',
          lineJoin: 'round',
        });

        polylinesGroup.addLayer(glowLine);
        polylinesGroup.addLayer(coreLine);
      }
    }
  }, [selectedJunction, junctionStates]);

  // Render Planned Route Polyline if active
  useEffect(() => {
    if (!mapInstanceRef.current || !routeLayerRef.current) return;
    const routeGroup = routeLayerRef.current;
    routeGroup.clearLayers();

    if (activeRoute && activeRoute.pathCoordinates && activeRoute.pathCoordinates.length > 1) {
      const latLngs = activeRoute.pathCoordinates.map(c => [c.latitude, c.longitude] as [number, number]);

      const routeGlow = L.polyline(latLngs, {
        color: '#ff2a85',
        weight: 10,
        opacity: 0.55,
        lineCap: 'round',
        lineJoin: 'round',
      });

      const routeCore = L.polyline(latLngs, {
        color: '#38bdf8',
        weight: 3.5,
        opacity: 0.95,
        lineCap: 'round',
        lineJoin: 'round',
        dashArray: '6, 6',
      });

      routeGroup.addLayer(routeGlow);
      routeGroup.addLayer(routeCore);

      const bounds = L.latLngBounds(latLngs);
      mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    }
  }, [activeRoute]);

  // Helper for Congestion styling
  const getCongestionBadge = (level: string) => {
    switch (level) {
      case 'fluid':
        return {
          label: 'Fluid Traffic',
          bg: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
          dot: 'bg-emerald-400',
        };
      case 'moderate':
        return {
          label: 'Moderate Delay',
          bg: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
          dot: 'bg-amber-400',
        };
      case 'heavy':
        return {
          label: 'Heavy Congestion',
          bg: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
          dot: 'bg-orange-400',
        };
      case 'gridlock':
      default:
        return {
          label: 'Severe Gridlock',
          bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
          dot: 'bg-rose-400',
        };
    }
  };

  return (
    <div className="relative w-full h-full rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl bg-[#0f1015] flex flex-col">
      {/* 
        ========================================================================
        CLEAN UNIFIED TOP PILL BAR (Single non-intrusive strip)
        ========================================================================
      */}
      <div className="absolute top-3 inset-x-3 z-[1000] flex items-center justify-between gap-2 pointer-events-none">
        {/* Left Pills */}
        <div className="flex items-center gap-2 pointer-events-auto flex-wrap">
          {/* Spot Pins Count Badge */}
          <div className="bg-[#161822]/95 hover:bg-[#1e202d] text-slate-200 border border-pink-500/40 rounded-full px-3 py-1 text-xs font-semibold tracking-wider flex items-center gap-1.5 shadow-lg backdrop-blur-md transition">
            <span className="text-[#ff2a85] font-extrabold text-xs">{junctionStates.length}</span>
            <span className="text-slate-300 uppercase text-[10px] font-bold tracking-wider">SPOT PINS</span>
          </div>

          {/* City Limits Badge */}
          <div className="hidden sm:flex bg-[#161822]/95 text-slate-200 border border-slate-700/80 rounded-full px-3 py-1 text-xs font-medium items-center gap-1.5 shadow-lg backdrop-blur-md">
            <span className="text-[#ff2a85] font-bold">Nagpur</span>
            <span className="text-slate-400 uppercase text-[10px] font-semibold tracking-wider">CITY LIMITS</span>
          </div>

          {/* Corridors Selector Dropdown / Toggle */}
          <div className="relative flex items-center bg-[#161822]/95 border border-slate-700/80 rounded-full px-2 py-0.5 text-xs shadow-lg backdrop-blur-md">
            <GitBranch className="w-3.5 h-3.5 text-[#ff2a85] mr-1.5 ml-1" />
            <select
              value={showNetworkRoutes ? selectedCorridorId : 'off'}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'off') {
                  setShowNetworkRoutes(false);
                } else {
                  setShowNetworkRoutes(true);
                  setSelectedCorridorId(val);
                }
              }}
              className="bg-transparent text-slate-200 text-[11px] font-semibold outline-none cursor-pointer pr-2 py-0.5"
            >
              <option value="all" className="bg-slate-900 text-slate-200">
                All Corridors (Network)
              </option>
              {NAGPUR_ARTERIAL_CORRIDORS.map(c => (
                <option key={c.id} value={c.id} className="bg-slate-900 text-slate-200">
                  {c.shortName} ({c.code})
                </option>
              ))}
              <option value="off" className="bg-slate-900 text-slate-400">
                Routes: OFF (Pins Only)
              </option>
            </select>
          </div>

          {/* Label Mode Switcher */}
          <button
            onClick={() => {
              if (labelMode === 'smart') setLabelMode('all');
              else if (labelMode === 'all') setLabelMode('hover');
              else setLabelMode('smart');
            }}
            title="Switch Label Density"
            className="bg-[#161822]/95 hover:bg-[#1e202d] text-slate-200 border border-slate-700 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition"
          >
            {labelMode === 'hover' ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-pink-400" />
            )}
            <span className="text-[11px]">
              Labels: <span className="text-pink-400 capitalize">{labelMode}</span>
            </span>
          </button>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 pointer-events-auto ml-auto">
          {/* Reset Map View Button */}
          <button
            onClick={handleResetMapView}
            className="bg-[#161822]/95 hover:bg-[#202330] text-slate-100 border border-pink-500/40 hover:border-pink-400 rounded-full px-3 py-1 text-xs font-semibold flex items-center gap-1.5 shadow-lg backdrop-blur-md transition active:scale-95"
          >
            <MapPin className="w-3.5 h-3.5 text-[#ff2a85]" />
            <span className="text-[11px]">Reset View</span>
          </button>

          {/* Fullscreen Toggle */}
          {onToggleFullScreen && (
            <button
              onClick={onToggleFullScreen}
              title={isFullScreen ? 'Exit Full Screen' : 'Full Screen Map'}
              className="p-1.5 bg-[#161822]/95 hover:bg-[#202330] text-slate-300 hover:text-white border border-slate-700 rounded-full shadow-lg backdrop-blur-md transition"
            >
              {isFullScreen ? <Minimize2 className="w-3.5 h-3.5 text-pink-400" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Leaflet Map Canvas Container */}
      <div ref={mapContainerRef} className="w-full h-full flex-1 z-0" />

      {/* 
        ========================================================================
        FLOATING ON-MAP JUNCTION INFO CARD (TRIGGERED WHEN JUNCTION CLICKED)
        ========================================================================
      */}
      {selectedJunction && (
        <div className="on-map-info-card absolute top-14 left-3 z-[1001] w-[310px] sm:w-[340px] max-w-[calc(100vw-24px)] bg-[#12141c]/95 border border-pink-500/50 rounded-2xl p-4 shadow-2xl backdrop-blur-xl animate-in fade-in slide-in-from-top-3 duration-200 pointer-events-auto text-slate-100">
          {/* Card Header */}
          <div className="flex items-start justify-between gap-2 border-b border-slate-800/80 pb-2.5">
            <div>
              <div className="flex items-center gap-1.5">
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-pink-500/15 text-pink-300 border border-pink-500/30 uppercase tracking-wider">
                  {selectedJunction.zone} Zone
                </span>
                {selectedState?.metrics && (
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border flex items-center gap-1 ${
                      getCongestionBadge(selectedState.metrics.congestionLevel).bg
                    }`}
                  >
                    <span
                      className={`w-1.5 h-1.5 rounded-full ${
                        getCongestionBadge(selectedState.metrics.congestionLevel).dot
                      }`}
                    />
                    {getCongestionBadge(selectedState.metrics.congestionLevel).label}
                  </span>
                )}
              </div>
              <h4 className="text-base font-bold text-white mt-1 leading-snug">
                {selectedJunction.name}
              </h4>
              <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                {selectedJunction.corridor || selectedJunction.description}
              </p>
            </div>

            <button
              onClick={() => {
                if (onCloseSelectedJunction) onCloseSelectedJunction();
              }}
              className="p-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
              title="Close junction info"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Metrics Overview */}
          {selectedState?.metrics ? (
            <div className="mt-3 flex flex-col gap-2.5">
              <div className="grid grid-cols-2 gap-2">
                {/* Speed Box */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Gauge className="w-3 h-3 text-pink-400" />
                    Live Speed
                  </span>
                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-pink-300">
                      {selectedState.metrics.currentSpeed}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">km/h</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Free-Flow: {selectedState.metrics.freeFlowSpeed} km/h
                  </span>
                </div>

                {/* Delay Box */}
                <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-2.5 flex flex-col">
                  <span className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                    <Clock className="w-3 h-3 text-amber-400" />
                    Traffic Delay
                  </span>
                  <div className="my-1 flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-amber-300">
                      {selectedState.metrics.delaySeconds > 0
                        ? `+${Math.round(selectedState.metrics.delaySeconds / 60)}`
                        : '0'}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">min</span>
                  </div>
                  <span className="text-[9px] text-slate-500 font-mono">
                    Travel: {Math.round(selectedState.metrics.currentTravelTime / 60)}m
                  </span>
                </div>
              </div>

              {/* Coordinates row */}
              <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 bg-slate-950/40 px-2.5 py-1.5 rounded-lg border border-slate-800/60">
                <span className="truncate mr-2">
                  {selectedJunction.latitude.toFixed(5)}, {selectedJunction.longitude.toFixed(5)}
                </span>
                <button
                  onClick={() => handleCopyCoord(selectedJunction)}
                  className="text-pink-400 hover:text-pink-300 font-sans flex items-center gap-1 text-[10px] font-semibold"
                >
                  {copiedCoord ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  {copiedCoord ? 'Copied' : 'Copy'}
                </button>
              </div>

              {/* Action Buttons: Route & Zoom */}
              <div className="grid grid-cols-2 gap-1.5 pt-1">
                <button
                  onClick={() => {
                    if (onSetRouteOrigin) onSetRouteOrigin(selectedJunction);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-pink-600/20 hover:bg-pink-600/30 text-pink-300 border border-pink-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Zap className="w-3 h-3 text-pink-400" />
                  Route From
                </button>
                <button
                  onClick={() => {
                    if (onSetRouteDestination) onSetRouteDestination(selectedJunction);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-[11px] font-semibold flex items-center justify-center gap-1.5 transition active:scale-95"
                >
                  <Navigation className="w-3 h-3 text-sky-400" />
                  Route To
                </button>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-xs text-slate-400 font-mono animate-pulse">
              Loading live metrics...
            </div>
          )}
        </div>
      )}

      {/* 
        ========================================================================
        BOTTOM DOCKED LEGEND & BASEMAP CONTROLS
        ========================================================================
      */}
      {/* Bottom Left Legend */}
      <div className="absolute bottom-3 left-3 z-[1000] bg-[#14161f]/95 border border-slate-800 rounded-xl px-3 py-2 shadow-2xl backdrop-blur-md flex items-center gap-3 pointer-events-auto">
        <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-400 border-r border-slate-800 pr-2.5">
          <Activity className="w-3 h-3 text-pink-400" />
          <span>Flow</span>
        </div>
        <div className="flex items-center gap-2.5 text-[10px] font-medium text-slate-300">
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-[#ff2a85] shadow-[0_0_6px_#ff2a85]"></span>
            <span>Fluid</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_6px_#fbbf24]"></span>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-600 shadow-[0_0_6px_#e11d48]"></span>
            <span>Congested</span>
          </div>
        </div>
      </div>

      {/* Bottom Right Floating Zoom & Basemap Tools */}
      <div className="absolute bottom-3 right-3 z-[1000] flex items-center gap-2 pointer-events-auto">
        {/* Layer Selector */}
        <div className="bg-[#14161f]/95 border border-slate-800 rounded-xl p-1 shadow-2xl backdrop-blur-md flex items-center gap-1">
          <button
            onClick={() => setMapLayer('dark')}
            title="Dark Carto Theme"
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
              mapLayer === 'dark'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dark Vector
          </button>
          <button
            onClick={() => setMapLayer('streets')}
            title="Streets"
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
              mapLayer === 'streets'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Streets
          </button>
          <button
            onClick={() => setMapLayer('satellite')}
            title="Satellite Imagery"
            className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold transition ${
              mapLayer === 'satellite'
                ? 'bg-pink-600/30 text-pink-300 border border-pink-500/40'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Zoom In / Zoom Out */}
        <div className="bg-[#14161f]/95 border border-slate-800 rounded-xl p-0.5 shadow-2xl backdrop-blur-md flex flex-col gap-0.5">
          <button
            onClick={handleZoomIn}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

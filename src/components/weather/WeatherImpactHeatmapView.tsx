import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  CloudRain,
  Sun,
  Wind,
  Eye,
  Thermometer,
  ArrowUpDown,
  Cloud,
  Play,
  Pause,
  ChevronLeft,
  ChevronRight,
  Maximize2,
  Minimize2,
  Search,
  Compass,
  MapPin,
  Flame,
  Layers,
  Filter,
  Check,
  Zap,
  Target,
  Navigation,
  Activity,
  ShieldAlert,
} from 'lucide-react';
import { getCurrentWeather, getWeatherHeatmap, buildFallbackHeatmapPoints, CurrentWeatherResponse, WeatherHeatmapPoint } from '../../services/api/weather';
import { NAGPUR_JUNCTIONS, NAGPUR_CENTER_COORDINATES } from '../../data/nagpurJunctions';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';

// Weather & Heatmap Overlay Types
type WeatherLayerMode = 'precipitation_new' | 'temp_new' | 'wind_new' | 'pressure_new' | 'clouds_new';
type HeatmapMetricMode = 'combined' | 'weather' | 'traffic';

export const WeatherImpactHeatmapView: React.FC = () => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const openWeatherTileRef = useRef<L.TileLayer | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);
  const selectedPulseCircleRef = useRef<L.CircleMarker | null>(null);

  const initialPoints = buildFallbackHeatmapPoints();

  const [activeMode, setActiveMode] = useState<WeatherLayerMode>('precipitation_new');
  const [metricMode, setMetricMode] = useState<HeatmapMetricMode>('combined');
  const [selectedZone, setSelectedZone] = useState<string>('ALL');

  const [weatherData, setWeatherData] = useState<CurrentWeatherResponse | null>(null);
  const [heatmapPoints, setHeatmapPoints] = useState<WeatherHeatmapPoint[]>(initialPoints);
  const [selectedJunction, setSelectedJunctionState] = useState<WeatherHeatmapPoint | null>(initialPoints[0] || null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'combined' | 'weather' | 'traffic'>('combined');

  // Timeline scrubber state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [selectedHourIndex, setSelectedHourIndex] = useState<number>(0);
  const [horizonMode, setHorizonMode] = useState<'24h' | '5day' | '7day_hist'>('24h');
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [showLabels, setShowLabels] = useState<boolean>(true);

  const { setSelectedJunction } = useNagpurPulseStore();
  const openWeatherApiKey = import.meta.env.VITE_OPENWEATHER_API_KEY || '';

  const timeTicks = [
    '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
    '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
    '21:00', '21:30', '22:00', '22:30', '23:00',
  ];

  // Fetch telemetry
  const fetchTelemetry = async () => {
    try {
      const [wRes, hRes] = await Promise.all([
        getCurrentWeather(),
        getWeatherHeatmap(),
      ]);
      setWeatherData(wRes);
      if (hRes && hRes.heatmap_points) {
        setHeatmapPoints(hRes.heatmap_points);
        if (!selectedJunction && hRes.heatmap_points.length > 0) {
          setSelectedJunctionState(hRes.heatmap_points[0]);
        }
      }
    } catch (err) {
      console.warn('Weather telemetry fetch error:', err);
    }
  };

  useEffect(() => {
    fetchTelemetry();
    const interval = setInterval(fetchTelemetry, 60000);
    return () => clearInterval(interval);
  }, []);

  // Timeline autoplay ticker
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (isPlaying) {
      timer = setInterval(() => {
        setSelectedHourIndex((prev) => (prev + 1) % timeTicks.length);
      }, 1500);
    }
    return () => clearInterval(timer);
  }, [isPlaying, timeTicks.length]);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [NAGPUR_CENTER_COORDINATES.latitude, NAGPUR_CENTER_COORDINATES.longitude],
      zoom: NAGPUR_CENTER_COORDINATES.defaultZoom,
      zoomControl: false,
      attributionControl: false,
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd',
    }).addTo(map);

    markersLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Update OpenWeather Tile Layer
  useEffect(() => {
    if (!mapRef.current) return;

    if (openWeatherTileRef.current) {
      mapRef.current.removeLayer(openWeatherTileRef.current);
    }

    const tileUrl = `https://tile.openweathermap.org/map/${activeMode}/{z}/{x}/{y}.png?appid=${openWeatherApiKey}`;
    const weatherTiles = L.tileLayer(tileUrl, {
      maxZoom: 18,
      opacity: 0.60,
    });

    weatherTiles.addTo(mapRef.current);
    openWeatherTileRef.current = weatherTiles;
  }, [activeMode]);

  // Handle Junction Selection & Fly To Camera
  const handleSelectJunctionPoint = (pt: WeatherHeatmapPoint) => {
    setSelectedJunctionState(pt);
    const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === pt.junction_id);
    if (j) setSelectedJunction(j);

    if (mapRef.current) {
      mapRef.current.flyTo([pt.latitude, pt.longitude], 15, {
        duration: 1.2,
      });
    }
  };

  // Render Junction-Wise Heatmap Markers & Yellow Badges
  useEffect(() => {
    if (!markersLayerRef.current || !mapRef.current) return;

    const layerGroup = markersLayerRef.current;
    layerGroup.clearLayers();

    // Filter points by search query and zone
    let filteredPoints = heatmapPoints.filter((pt) =>
      pt.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (selectedZone !== 'ALL') {
      filteredPoints = filteredPoints.filter((pt) => {
        const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === pt.junction_id);
        return j?.zone?.toLowerCase().includes(selectedZone.toLowerCase());
      });
    }

    filteredPoints.forEach((pt) => {
      const isSelected = selectedJunction?.junction_id === pt.junction_id;

      // Color calculation based on metric mode or active OpenWeather mode
      let targetScore = pt.combined_score;
      if (metricMode === 'weather') targetScore = pt.weather_impact_score;
      else if (metricMode === 'traffic') targetScore = pt.traffic_congestion_score;

      let circleColor = '#10b981'; // LOW / MODERATE
      if (targetScore > 80.0) circleColor = '#ef4444'; // SEVERE (Red)
      else if (targetScore > 60.0) circleColor = '#f97316'; // HIGH (Orange)
      else if (targetScore > 40.0) circleColor = '#f59e0b'; // ELEVATED (Amber)
      else if (targetScore > 20.0) circleColor = '#10b981'; // MODERATE (Emerald)
      else circleColor = '#3b82f6'; // LOW (Blue)

      const radius = Math.max(26, Math.min(56, targetScore * 0.40 + 18));

      // Outer Radar Soft Glow Circle
      const outerGlow = L.circleMarker([pt.latitude, pt.longitude], {
        radius: radius * 1.4,
        color: circleColor,
        fillColor: circleColor,
        fillOpacity: 0.15,
        stroke: false,
      });
      outerGlow.addTo(layerGroup);

      // Inner Core Heatmap Circle Marker
      const circle = L.circleMarker([pt.latitude, pt.longitude], {
        radius: isSelected ? radius + 8 : radius,
        color: isSelected ? '#ffffff' : circleColor,
        fillColor: circleColor,
        fillOpacity: isSelected ? 0.75 : 0.50,
        weight: isSelected ? 3.5 : 1.5,
      });

      circle.bindTooltip(
        `<div class="p-1.5 font-mono text-[11px] space-y-0.5">
          <b class="text-amber-300 text-xs">${pt.name}</b><br/>
          <b>Combined Risk:</b> ${pt.combined_score} / 100 (${pt.impact_level})<br/>
          <b>Weather Impact:</b> ${pt.weather_impact_score} pts (${pt.weather_condition})<br/>
          <b>Traffic Congestion:</b> ${pt.traffic_congestion_score}%
        </div>`,
        { direction: 'top' }
      );

      circle.on('click', () => {
        handleSelectJunctionPoint(pt);
      });

      circle.addTo(layerGroup);

      // Yellow Location Badge (Matching Reference Image)
      if (showLabels) {
        let badgeVal = `${pt.combined_score}pts`;
        if (metricMode === 'weather') badgeVal = `${pt.weather_impact_score}pts`;
        else if (metricMode === 'traffic') badgeVal = `${pt.traffic_congestion_score}%`;
        else if (activeMode === 'temp_new') badgeVal = `${weatherData?.weather.temperature_c || 26}°`;

        const yellowBadgeIcon = L.divIcon({
          className: 'custom-yellow-badge',
          html: `<div class="bg-amber-400 text-slate-950 px-1.5 py-0.5 rounded font-mono text-[10px] font-extrabold shadow-md border ${isSelected ? 'border-white scale-110' : 'border-amber-300'} flex items-center gap-1 cursor-pointer transition hover:scale-105">
                   <span class="bg-slate-950 text-amber-300 px-1 rounded text-[9px] font-black">${badgeVal}</span>
                   <span class="truncate max-w-[95px]">${pt.name}</span>
                 </div>`,
          iconAnchor: [35, 10],
        });

        const badgeMarker = L.marker([pt.latitude, pt.longitude], { icon: yellowBadgeIcon });
        badgeMarker.on('click', () => {
          handleSelectJunctionPoint(pt);
        });

        badgeMarker.addTo(layerGroup);
      }
    });
  }, [heatmapPoints, activeMode, metricMode, selectedZone, showLabels, searchQuery, selectedJunction, weatherData]);

  // Sorted Roster Points
  const sortedPoints = [...heatmapPoints]
    .filter((pt) => pt.name.toLowerCase().includes(searchQuery.toLowerCase()))
    .filter((pt) => {
      if (selectedZone === 'ALL') return true;
      const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === pt.junction_id);
      return j?.zone?.toLowerCase().includes(selectedZone.toLowerCase());
    })
    .sort((a, b) => {
      if (sortBy === 'weather') return b.weather_impact_score - a.weather_impact_score;
      if (sortBy === 'traffic') return b.traffic_congestion_score - a.traffic_congestion_score;
      return b.combined_score - a.combined_score;
    });

  const weather = weatherData?.weather;
  const trafficImpact = weatherData?.traffic_impact;

  return (
    <div className={`relative w-full ${isFullscreen ? 'fixed inset-0 z-50 bg-[#07090e]' : 'min-h-[720px] rounded-3xl overflow-hidden border border-slate-800 shadow-2xl bg-[#07090e]'} flex flex-col font-sans text-slate-100`}>
      {/* ----------------------------------------------------------------------- */}
      {/* 1. TOP JUNCTION-WISE CONTROL RIBBON & WEATHER LAYER PILLS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="absolute top-4 left-4 right-4 z-20 flex items-center justify-between pointer-events-none gap-2 flex-wrap">
        {/* Left: Weather Layer Mode Pills (Reference Image) */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl pointer-events-auto font-mono text-xs">
          <button
            onClick={() => setActiveMode('precipitation_new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMode === 'precipitation_new'
                ? 'bg-amber-900/80 text-amber-200 shadow-lg border border-amber-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CloudRain className="w-3.5 h-3.5 text-cyan-400" />
            <span>Precipitation</span>
          </button>

          <button
            onClick={() => setActiveMode('temp_new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMode === 'temp_new'
                ? 'bg-amber-600/90 text-white shadow-lg border border-amber-400/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Thermometer className="w-3.5 h-3.5 text-amber-400" />
            <span>Temperature</span>
          </button>

          <button
            onClick={() => setActiveMode('wind_new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMode === 'wind_new'
                ? 'bg-blue-900/80 text-blue-200 shadow-lg border border-blue-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Wind className="w-3.5 h-3.5 text-blue-400" />
            <span>Wind speed</span>
          </button>

          <button
            onClick={() => setActiveMode('pressure_new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMode === 'pressure_new'
                ? 'bg-indigo-900/80 text-indigo-200 shadow-lg border border-indigo-500/50'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <ArrowUpDown className="w-3.5 h-3.5 text-indigo-400" />
            <span>Pressure</span>
          </button>

          <button
            onClick={() => setActiveMode('clouds_new')}
            className={`px-3 py-1.5 rounded-xl font-bold transition flex items-center gap-1.5 ${
              activeMode === 'clouds_new'
                ? 'bg-slate-800 text-white shadow-lg border border-slate-600'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Cloud className="w-3.5 h-3.5 text-slate-300" />
            <span>Clouds</span>
          </button>
        </div>

        {/* Center-Right: Junction Selector Dropdown & Zone Filters */}
        <div className="flex items-center gap-2 pointer-events-auto bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-800 shadow-2xl font-mono text-xs">
          {/* Junction Selector Dropdown */}
          <select
            value={selectedJunction?.junction_id || ''}
            onChange={(e) => {
              const pt = heatmapPoints.find((p) => p.junction_id === e.target.value);
              if (pt) handleSelectJunctionPoint(pt);
            }}
            className="bg-slate-950 border border-slate-700 text-slate-100 rounded-xl px-2.5 py-1 text-xs focus:ring-amber-500 font-extrabold max-w-[170px] truncate"
          >
            <option value="" disabled>Select Chowk..</option>
            {heatmapPoints.map((pt) => (
              <option key={pt.junction_id} value={pt.junction_id}>
                {pt.name} ({pt.combined_score} pts)
              </option>
            ))}
          </select>

          {/* Zone Filter */}
          <select
            value={selectedZone}
            onChange={(e) => setSelectedZone(e.target.value)}
            className="bg-slate-950 border border-slate-700 text-slate-200 rounded-xl px-2 py-1 text-xs focus:ring-amber-500 font-bold"
          >
            <option value="ALL">Zone: ALL</option>
            <option value="Zone 1">Zone 1 - Central</option>
            <option value="Zone 2">Zone 2 - North</option>
            <option value="Zone 3">Zone 3 - South</option>
            <option value="Zone 4">Zone 4 - East</option>
            <option value="Zone 5">Zone 5 - West</option>
          </select>

          {/* Metric Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-950 px-1.5 py-0.5 rounded-xl border border-slate-800">
            <button
              onClick={() => setMetricMode('combined')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${metricMode === 'combined' ? 'bg-emerald-500 text-slate-950' : 'text-slate-400'}`}
            >
              Combined
            </button>
            <button
              onClick={() => setMetricMode('weather')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${metricMode === 'weather' ? 'bg-cyan-500 text-slate-950' : 'text-slate-400'}`}
            >
              Weather
            </button>
            <button
              onClick={() => setMetricMode('traffic')}
              className={`px-2 py-0.5 rounded text-[10px] font-bold ${metricMode === 'traffic' ? 'bg-amber-500 text-slate-950' : 'text-slate-400'}`}
            >
              Traffic
            </button>
          </div>
        </div>

        {/* Rightmost Controls */}
        <div className="flex items-center gap-2 pointer-events-auto">
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`p-2 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 transition ${showLabels ? 'text-amber-400' : 'text-slate-500'}`}
            title="Toggle Location Badges"
          >
            <Eye className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-2 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 text-slate-300 hover:text-white transition"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 2. MAIN MAP CANVAS */}
      {/* ----------------------------------------------------------------------- */}
      <div ref={containerRef} className="w-full h-[540px] z-0 bg-[#05070a]" />

      {/* Map Zoom Controls */}
      <div className="absolute left-4 top-24 z-20 flex flex-col gap-1.5 pointer-events-auto">
        <button
          onClick={() => mapRef.current?.zoomIn()}
          className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 text-white hover:bg-slate-800 flex items-center justify-center font-bold text-sm shadow-xl transition"
        >
          +
        </button>
        <button
          onClick={() => mapRef.current?.zoomOut()}
          className="w-8 h-8 rounded-xl bg-slate-900/90 backdrop-blur-xl border border-slate-800 text-white hover:bg-slate-800 flex items-center justify-center font-bold text-sm shadow-xl transition"
        >
          −
        </button>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 3. RIGHT JUNCTION TELEMETRY CARD (Exact Replica of Reference) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="absolute top-20 right-4 z-20 w-72 bg-[#0d111d]/95 backdrop-blur-2xl border border-slate-800/90 rounded-2xl p-4 shadow-2xl text-slate-100 font-mono text-xs pointer-events-auto space-y-3">
        {/* Large Temperature Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
          <div>
            <div className="text-3xl font-extrabold text-white tracking-tight flex items-baseline gap-1">
              <span>{weather?.temperature_c || 26.0}</span>
              <span className="text-lg text-amber-400 font-bold">°C</span>
            </div>
            <div className="text-[11px] text-slate-400 capitalize mt-0.5">
              {weather?.weather_condition || 'Light Rain'}
            </div>
          </div>

          <div className="w-9 h-9 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-cyan-400">
            <CloudRain className="w-5 h-5" />
          </div>
        </div>

        {/* Selected Junction Details */}
        {selectedJunction ? (
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1">
              <span className="text-[10px] text-amber-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Target className="w-3.5 h-3.5" />
                Inspected Chowk
              </span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                {selectedJunction.impact_level}
              </span>
            </div>

            <h3 className="font-extrabold text-base text-white tracking-tight leading-snug">
              {selectedJunction.name}
            </h3>

            <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px]">
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Combined Risk</span>
                <strong className="text-emerald-400 text-sm">{selectedJunction.combined_score} / 100</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Weather Impact</span>
                <strong className="text-cyan-300 text-sm">{selectedJunction.weather_impact_score} pts</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Precipitation</span>
                <strong className="text-white text-xs">{selectedJunction.precipitation_mm} mm/h</strong>
              </div>
              <div className="bg-slate-950 p-2 rounded border border-slate-800">
                <span className="text-slate-400 block text-[10px]">Live Congestion</span>
                <strong className="text-orange-300 text-xs">{selectedJunction.traffic_congestion_score}%</strong>
              </div>
            </div>

            <button
              onClick={() => handleSelectJunctionPoint(selectedJunction)}
              className="w-full py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md mt-1"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Focus Chowk Camera</span>
            </button>
          </div>
        ) : null}

        {/* Telemetry Detail Grid */}
        <div className="space-y-1 text-[11px] pt-1 border-t border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-slate-400">Feels like</span>
            <span className="font-bold text-slate-200">{weather?.feels_like_c || 26.0} °C</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Precipitation</span>
            <span className="font-bold text-cyan-300">{weather?.precipitation_mm || 0.29} mm</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Wind speed</span>
            <span className="font-bold text-slate-200">{weather?.wind_speed_kmh || 3.7} km/h</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Wind Direction</span>
            <span className="font-bold text-slate-200">{weather?.wind_direction_deg || 200} °</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Humidity</span>
            <span className="font-bold text-slate-200">{weather?.humidity_pct || 89} %</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400">Pressure</span>
            <span className="font-bold text-slate-200">{weather?.pressure_hpa || 1008} hPa</span>
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 4. BOTTOM LEFT CONTINUOUS COLOR SCALE BAR */}
      {/* ----------------------------------------------------------------------- */}
      <div className="absolute top-[480px] left-4 z-20 bg-[#0d111d]/90 backdrop-blur-xl border border-slate-800/90 rounded-2xl p-3 shadow-2xl pointer-events-auto font-mono text-xs space-y-1.5 w-64">
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold">
          <span>0  20  40  60  80  100</span>
          <span className="text-amber-400 font-bold">Combined Risk (pts)</span>
        </div>

        {/* Gradient Color Bar */}
        <div className="h-3 w-full rounded-full bg-gradient-to-r from-blue-500 via-emerald-500 via-yellow-400 via-orange-500 to-rose-500 border border-slate-700/60 shadow-inner" />
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 5. BOTTOM JUNCTION-WISE HEATMAP COMPARISON ROSTER GRID */}
      {/* ----------------------------------------------------------------------- */}
      <div className="bg-[#0b0e1a] border-t border-slate-800 p-4 font-mono space-y-3 z-10">
        <div className="flex items-center justify-between flex-wrap gap-2 text-xs border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-amber-400" />
            <h3 className="font-extrabold text-slate-100 uppercase tracking-wider">
              Junction-Wise Heatmap Telemetry Grid ({sortedPoints.length} Chowks)
            </h3>
          </div>

          <div className="flex items-center gap-3">
            {/* Chowk Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
              <input
                type="text"
                placeholder="Search chowk.."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg pl-7 pr-2.5 py-1 text-xs text-slate-200 focus:outline-none focus:border-amber-500 w-36 placeholder:text-slate-500"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortBy}
              onChange={(e: any) => setSortBy(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-300 rounded-lg px-2 py-1 text-xs focus:ring-amber-500 font-bold"
            >
              <option value="combined">Sort: Combined Risk</option>
              <option value="weather">Sort: Weather Impact</option>
              <option value="traffic">Sort: Live Traffic</option>
            </select>
          </div>
        </div>

        {/* Junction Heatmap Grid Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 max-h-[220px] overflow-y-auto pr-1">
          {sortedPoints.map((pt) => {
            const isSelected = selectedJunction?.junction_id === pt.junction_id;
            return (
              <div
                key={pt.junction_id}
                onClick={() => handleSelectJunctionPoint(pt)}
                className={`p-3 rounded-2xl border transition cursor-pointer space-y-2 ${
                  isSelected
                    ? 'bg-amber-950/40 border-amber-500/60 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-200 text-xs truncate max-w-[130px]">
                    {pt.name}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      pt.impact_level === 'SEVERE'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                        : pt.impact_level === 'HIGH'
                        ? 'bg-orange-500/20 text-orange-300 border-orange-500/30'
                        : pt.impact_level === 'ELEVATED'
                        ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    }`}
                  >
                    {pt.impact_level}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-1 text-center text-[10px] pt-1 border-t border-slate-800/80">
                  <div className="bg-slate-950 p-1 rounded border border-slate-800">
                    <span className="text-slate-400 block">Weather</span>
                    <strong className="text-cyan-300">{pt.weather_impact_score}</strong>
                  </div>
                  <div className="bg-slate-950 p-1 rounded border border-slate-800">
                    <span className="text-slate-400 block">Traffic</span>
                    <strong className="text-orange-300">{pt.traffic_congestion_score}%</strong>
                  </div>
                  <div className="bg-slate-950 p-1 rounded border border-slate-800">
                    <span className="text-slate-400 block">Combined</span>
                    <strong className="text-emerald-400">{pt.combined_score}</strong>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

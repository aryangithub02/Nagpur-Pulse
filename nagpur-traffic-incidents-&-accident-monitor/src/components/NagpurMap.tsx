import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { IncidentItem } from '../types';
import { NAGPUR_JUNCTIONS, NAGPUR_CENTER } from '../data/nagpurJunctions';
import { 
  AlertTriangle, 
  Car, 
  Clock, 
  Construction, 
  MapPin, 
  Navigation, 
  ShieldAlert, 
  Compass, 
  Layers, 
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';

interface NagpurMapProps {
  incidents: IncidentItem[];
  selectedIncident: IncidentItem | null;
  onSelectIncident: (incident: IncidentItem | null) => void;
  showJunctions: boolean;
  onToggleJunctions: () => void;
  selectedJunctionId: number | null;
  onSelectJunction: (id: number | null) => void;
}

export const NagpurMap: React.FC<NagpurMapProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  showJunctions,
  onToggleJunctions,
  selectedJunctionId,
  onSelectJunction
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const incidentMarkersLayerRef = useRef<L.LayerGroup | null>(null);
  const polylinesLayerRef = useRef<L.LayerGroup | null>(null);
  const junctionsLayerRef = useRef<L.LayerGroup | null>(null);
  const radiusLayerRef = useRef<L.LayerGroup | null>(null);

  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [showRadius, setShowRadius] = useState<boolean>(true);
  const [mapStyle, setMapStyle] = useState<'dark' | 'standard'>('dark');
  const tileLayerRef = useRef<L.TileLayer | null>(null);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: NAGPUR_CENTER,
      zoom: 13,
      minZoom: 10,
      maxZoom: 18,
      zoomControl: false,
    });

    // Zoom control at bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark Matter CartoDB tiles for high contrast telemetry
    const darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19
    });

    darkTiles.addTo(map);
    tileLayerRef.current = darkTiles;

    // Layer groups
    const incidentGroup = L.layerGroup().addTo(map);
    const polylineGroup = L.layerGroup().addTo(map);
    const junctionGroup = L.layerGroup().addTo(map);
    const radiusGroup = L.layerGroup().addTo(map);

    incidentMarkersLayerRef.current = incidentGroup;
    polylinesLayerRef.current = polylineGroup;
    junctionsLayerRef.current = junctionGroup;
    radiusLayerRef.current = radiusGroup;

    mapInstanceRef.current = map;

    return () => {
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // Update Tile Style
  useEffect(() => {
    if (!mapInstanceRef.current || !tileLayerRef.current) return;
    mapInstanceRef.current.removeLayer(tileLayerRef.current);

    let newUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    if (mapStyle === 'dark') {
      newUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
    }

    const newTile = L.tileLayer(newUrl, {
      attribution: '&copy; OpenStreetMap &copy; CARTO &copy; TomTom',
      maxZoom: 19,
      subdomains: 'abcd'
    });
    newTile.addTo(mapInstanceRef.current);
    tileLayerRef.current = newTile;
  }, [mapStyle]);

  // Render Nagpur Junctions Layer
  useEffect(() => {
    if (!junctionsLayerRef.current) return;
    junctionsLayerRef.current.clearLayers();

    if (!showJunctions) return;

    NAGPUR_JUNCTIONS.forEach(j => {
      const isSelected = selectedJunctionId === j.id;

      const junctionIcon = L.divIcon({
        className: 'custom-junction-marker',
        html: `
          <div class="relative group cursor-pointer">
            <div class="w-3.5 h-3.5 rounded-full ${
              isSelected ? 'bg-amber-400 ring-4 ring-amber-400/40 scale-125' : 'bg-slate-400/80 ring-2 ring-slate-900'
            } transition-all duration-200"></div>
          </div>
        `,
        iconSize: [14, 14],
        iconAnchor: [7, 7]
      });

      const marker = L.marker([j.latitude, j.longitude], { icon: junctionIcon });
      
      marker.bindTooltip(`
        <div class="px-2 py-1 bg-slate-900/95 text-slate-100 text-xs rounded border border-slate-700 shadow-md font-sans">
          <div class="font-bold text-amber-400">${j.name}</div>
          <div class="text-[10px] text-slate-400">${j.zone || 'Nagpur'} Zone • ${j.approximate ? 'Approx.' : 'OSM Verified'}</div>
        </div>
      `, {
        direction: 'top',
        offset: [0, -8],
        permanent: false,
        className: 'junction-tooltip'
      });

      marker.on('click', () => {
        onSelectJunction(j.id);
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([j.latitude, j.longitude], 15, { animate: true });
        }
      });

      junctionsLayerRef.current?.addLayer(marker);
    });
  }, [showJunctions, selectedJunctionId, onSelectJunction]);

  // Render Incidents and Affected Corridors
  useEffect(() => {
    if (!incidentMarkersLayerRef.current || !polylinesLayerRef.current || !radiusLayerRef.current) return;

    incidentMarkersLayerRef.current.clearLayers();
    polylinesLayerRef.current.clearLayers();
    radiusLayerRef.current.clearLayers();

    incidents.forEach(incident => {
      const [lat, lng] = incident.location;
      const isSelected = selectedIncident?.id === incident.id;

      // Color assignment based on category and severity
      let colorClass = 'bg-rose-500 border-rose-400 text-white';
      let ringColor = 'rgba(244, 63, 94, 0.4)';
      let hexColor = '#f43f5e';
      let badgeLabel = 'Accident';

      if (incident.category === 'Accident' || incident.severity === 'Critical') {
        colorClass = 'bg-rose-600 border-rose-300 text-white';
        ringColor = 'rgba(225, 29, 72, 0.5)';
        hexColor = '#e11d48';
        badgeLabel = incident.isAccident ? 'Accident' : 'Critical Hazard';
      } else if (incident.category === 'Road Closed') {
        colorClass = 'bg-purple-600 border-purple-300 text-white';
        ringColor = 'rgba(147, 51, 234, 0.4)';
        hexColor = '#9333ea';
        badgeLabel = 'Road Closed';
      } else if (incident.category === 'Road Works' || incident.category === 'Lane Closed') {
        colorClass = 'bg-amber-500 border-amber-300 text-slate-950';
        ringColor = 'rgba(245, 158, 11, 0.4)';
        hexColor = '#f59e0b';
        badgeLabel = 'Road Works';
      } else if (incident.category === 'Congestion') {
        colorClass = 'bg-orange-500 border-orange-300 text-white';
        ringColor = 'rgba(249, 115, 22, 0.4)';
        hexColor = '#f97316';
        badgeLabel = 'Congestion';
      } else {
        colorClass = 'bg-cyan-500 border-cyan-300 text-slate-950';
        ringColor = 'rgba(6, 182, 212, 0.4)';
        hexColor = '#06b6d4';
        badgeLabel = incident.category;
      }

      // Draw Radius Impact Circle
      if (showRadius) {
        const radiusMeters = Math.max(incident.lengthMeters / 2, incident.isAccident ? 300 : 200);
        const circle = L.circle([lat, lng], {
          radius: radiusMeters,
          color: hexColor,
          weight: 1,
          opacity: 0.6,
          fillColor: hexColor,
          fillOpacity: 0.08,
          dashArray: incident.isAccident ? undefined : '4, 4'
        });
        radiusLayerRef.current?.addLayer(circle);
      }

      // Draw Polyline Corridor if present
      if (incident.polyline && incident.polyline.length > 1) {
        const line = L.polyline(incident.polyline, {
          color: hexColor,
          weight: isSelected ? 6 : 4,
          opacity: isSelected ? 0.95 : 0.75,
          lineCap: 'round',
          lineJoin: 'round'
        });
        
        line.on('click', () => {
          onSelectIncident(incident);
        });

        polylinesLayerRef.current?.addLayer(line);
      }

      // Create Custom HTML Marker with Pulsing Ring for high-severity
      const isPulse = incident.severity === 'Critical' || incident.isAccident;
      const markerHtml = `
        <div class="relative flex items-center justify-center cursor-pointer transition-transform duration-200 ${isSelected ? 'scale-125 z-50' : 'hover:scale-110'}">
          ${isPulse ? `<div class="absolute w-10 h-10 rounded-full ${incident.severity === 'Critical' ? 'bg-rose-500/40 pulse-marker-critical' : 'bg-orange-500/30 pulse-marker-warning'}"></div>` : ''}
          <div class="relative flex items-center justify-center w-8 h-8 rounded-full border-2 ${colorClass} shadow-xl ring-2 ${isSelected ? 'ring-white' : 'ring-slate-900/60'}">
            ${incident.isAccident 
              ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`
              : incident.category === 'Road Works'
              ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="6" width="20" height="8" rx="1"/><path d="M17 14v7"/><path d="M7 14v7"/><path d="M17 3v3"/><path d="M7 3v3"/></svg>`
              : incident.category === 'Road Closed'
              ? `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>`
              : `<svg class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/><circle cx="7" cy="17" r="2"/><path d="M9 17h6"/><circle cx="17" cy="17" r="2"/></svg>`
            }
          </div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'custom-incident-marker',
        html: markerHtml,
        iconSize: [32, 32],
        iconAnchor: [16, 16]
      });

      const marker = L.marker([lat, lng], { icon: customIcon });

      // Click listener
      marker.on('click', () => {
        onSelectIncident(incident);
      });

      // Bind custom popup
      const popupContent = document.createElement('div');
      popupContent.className = 'p-3.5 max-w-[290px] font-sans text-slate-100';
      popupContent.innerHTML = `
        <div class="flex items-center justify-between gap-2 pb-2 border-b border-slate-700/80">
          <div class="flex items-center gap-1.5">
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold ${
              incident.isAccident ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              incident.severity === 'Critical' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' :
              incident.severity === 'Major' ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40' :
              'bg-amber-500/20 text-amber-300 border border-amber-500/40'
            }">
              ${badgeLabel}
            </span>
            <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
              ${incident.severity}
            </span>
          </div>
          <span class="text-[11px] text-slate-400 font-mono">${incident.timeAgo}</span>
        </div>

        <div class="mt-2.5">
          <h4 class="text-sm font-bold text-white tracking-tight leading-tight">${incident.roadName}</h4>
          <p class="text-xs text-slate-300 mt-1.5 leading-relaxed">${incident.description}</p>
        </div>

        <div class="mt-3 pt-2.5 border-t border-slate-800 grid grid-cols-2 gap-2 text-[11px]">
          <div class="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div class="text-slate-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span>Delay</div>
            <div class="font-bold text-white font-mono mt-0.5">${incident.delayMinutes > 0 ? `+${incident.delayMinutes} mins` : 'Minor'}</div>
          </div>
          <div class="bg-slate-900/80 p-2 rounded border border-slate-800">
            <div class="text-slate-400 flex items-center gap-1"><span class="w-1.5 h-1.5 rounded-full bg-cyan-400"></span>Corridor</div>
            <div class="font-bold text-white font-mono mt-0.5">${incident.lengthMeters > 0 ? `${incident.lengthMeters}m` : 'Point Event'}</div>
          </div>
        </div>

        ${incident.nearestJunction ? `
          <div class="mt-2 text-[11px] bg-slate-900/90 p-2 rounded border border-slate-800 flex items-center justify-between text-slate-300">
            <span class="text-slate-400">Nearest Junction:</span>
            <span class="font-semibold text-amber-300">${incident.nearestJunction.name} (${incident.nearestJunction.distanceFormatted})</span>
          </div>
        ` : ''}

        <div class="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
          <span>Coords: ${lat.toFixed(4)}, ${lng.toFixed(4)}</span>
          <span class="text-emerald-400 font-mono">Live TomTom</span>
        </div>
      `;

      marker.bindPopup(popupContent);
      incidentMarkersLayerRef.current?.addLayer(marker);
    });
  }, [incidents, selectedIncident, showRadius, onSelectIncident]);

  // Pan to Selected Incident
  useEffect(() => {
    if (!selectedIncident || !mapInstanceRef.current) return;
    mapInstanceRef.current.setView(selectedIncident.location, 16, {
      animate: true,
      duration: 0.8
    });
  }, [selectedIncident]);

  // Handler to recenter Nagpur Zero Mile
  const handleRecenterNagpur = () => {
    if (!mapInstanceRef.current) return;
    mapInstanceRef.current.setView(NAGPUR_CENTER, 13, { animate: true });
    onSelectIncident(null);
    onSelectJunction(null);
  };

  // Handler to fit all incidents
  const handleFitAllIncidents = () => {
    if (!mapInstanceRef.current || incidents.length === 0) return;
    const bounds = L.latLngBounds(incidents.map(i => i.location));
    mapInstanceRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  };

  const copyCoords = (lat: number, lng: number, id: string) => {
    navigator.clipboard.writeText(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="bento-card relative w-full h-full min-h-[460px] overflow-hidden group">
      {/* Map Target */}
      <div id="nagpur-live-map" ref={mapContainerRef} className="w-full h-full min-h-[460px]" />

      {/* Floating Map Overlay Controls */}
      <div className="absolute top-3 left-3 z-[400] flex flex-col gap-2">
        {/* Map Mode & Layers Controller */}
        <div className="bg-slate-900/85 backdrop-blur-md p-1.5 rounded-2xl border border-slate-800/90 shadow-xl flex items-center gap-1 text-xs">
          <button
            id="map-style-dark-btn"
            onClick={() => setMapStyle(mapStyle === 'dark' ? 'standard' : 'dark')}
            className="px-2.5 py-1.5 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-1.5 transition-colors"
            title="Toggle Map Style"
          >
            <Layers className="w-3.5 h-3.5 text-rose-400" />
            <span className="font-medium capitalize">{mapStyle} Map</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800"></div>

          <button
            id="toggle-junctions-btn"
            onClick={onToggleJunctions}
            className={`px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors ${
              showJunctions 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Toggle Nagpur 40 Major Chowks / Junctions"
          >
            <MapPin className="w-3.5 h-3.5 text-amber-400" />
            <span>40 Chowks</span>
          </button>

          <div className="w-[1px] h-4 bg-slate-800"></div>

          <button
            id="toggle-radius-btn"
            onClick={() => setShowRadius(!showRadius)}
            className={`px-2.5 py-1.5 rounded-xl font-medium flex items-center gap-1.5 transition-colors ${
              showRadius 
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm' 
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/80'
            }`}
            title="Toggle Impact Radius"
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
            <span>Impact Zones</span>
          </button>
        </div>
      </div>

      {/* Navigation Quick Actions (Top Right) */}
      <div className="absolute top-3 right-3 z-[400] flex items-center gap-2">
        <button
          id="recenter-nagpur-btn"
          onClick={handleRecenterNagpur}
          className="bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md text-slate-200 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800/90 shadow-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Compass className="w-3.5 h-3.5 text-rose-400" />
          <span>Zero Mile</span>
        </button>

        <button
          id="fit-bounds-btn"
          onClick={handleFitAllIncidents}
          className="bg-slate-900/85 hover:bg-slate-800 backdrop-blur-md text-slate-200 hover:text-white px-3 py-1.5 rounded-xl border border-slate-800/90 shadow-xl text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95"
        >
          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
          <span>Fit Bounds ({incidents.length})</span>
        </button>
      </div>

      {/* Map Legend (Bottom Left) */}
      <div className="absolute bottom-3 left-3 z-[400] bg-slate-950/90 backdrop-blur-md p-3 rounded-2xl border border-slate-800/90 shadow-2xl text-[11px]">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-400 mb-1.5 flex items-center justify-between">
          <span>Live GIS Layer</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-3 gap-y-1.5 text-slate-300">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-500/40"></span>
            <span>Accident / Crash</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
            <span>Jam / Congestion</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span>
            <span>Road Closure</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
            <span>Road Works</span>
          </div>
        </div>
      </div>
    </div>
  );
};

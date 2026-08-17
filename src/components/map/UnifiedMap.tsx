import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { NAGPUR_JUNCTIONS, NAGPUR_CENTER_COORDINATES } from '../../data/nagpurJunctions';
import { Shield, Layers, MapPin, Activity, AlertTriangle, Navigation, Eye } from 'lucide-react';

interface LayerVisibility {
  traffic: boolean;
  incidents: boolean;
  policeUnits: boolean;
  route: boolean;
  risk: boolean;
  coverage: boolean;
}

export const UnifiedMap: React.FC<{
  onSelectJunction?: (junction: any) => void;
  heightClass?: string;
}> = ({ onSelectJunction, heightClass = 'h-[580px]' }) => {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const layerGroupRef = useRef<L.LayerGroup | null>(null);

  const {
    units,
    selectedUnit,
    setSelectedUnit,
    incidents,
    selectedIncident,
    setSelectedIncident,
    junctionStates,
    selectedJunction,
    setSelectedJunction,
    riskData,
    activeRoutePolyline,
  } = useNagpurPulseStore();

  const [layers, setLayers] = useState<LayerVisibility>({
    traffic: true,
    incidents: true,
    policeUnits: true,
    route: true,
    risk: true,
    coverage: false,
  });

  const [isControlsOpen, setIsControlsOpen] = useState<boolean>(false);

  // Initialize Map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = L.map(containerRef.current, {
      center: [NAGPUR_CENTER_COORDINATES.latitude, NAGPUR_CENTER_COORDINATES.longitude],
      zoom: NAGPUR_CENTER_COORDINATES.defaultZoom,
      zoomControl: false,
    });

    L.control.zoom({ position: 'bottomright' }).addTo(map);

    // Dark Map Tile Layer (CartoDB Dark Matter)
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap &copy; CARTO &copy; Nagpur Pulse Intelligence',
    }).addTo(map);

    const layerGroup = L.layerGroup().addTo(map);
    layerGroupRef.current = layerGroup;
    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update Layers & Markers
  useEffect(() => {
    if (!mapRef.current || !layerGroupRef.current) return;
    const layerGroup = layerGroupRef.current;
    layerGroup.clearLayers();

    // 1. Coverage Layer
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

    // 2. Risk Intelligence Layer
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

    // 3. Traffic Layer (Hot Pink Spot Pins matching Screenshot 1)
    if (layers.traffic) {
      junctionStates.forEach(({ junction, metrics }) => {
        const speed = metrics?.currentSpeed || 27;
        const shortName = junction.name;

        const customIcon = L.divIcon({
          className: 'custom-traffic-pin',
          html: `<div style="
            background: #ff2a85;
            color: #ffffff;
            font-size: 10px;
            font-weight: 700;
            font-family: monospace;
            padding: 2px 7px;
            border-radius: 9999px;
            border: 1.5px solid #0d0e12;
            box-shadow: 0 0 10px rgba(255, 42, 133, 0.7);
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 4px;
          ">
            <span>${shortName}</span>
            <span style="background: rgba(0,0,0,0.3); padding: 1px 4px; border-radius: 4px; color: #ffe4e6;">${speed} km/h</span>
          </div>`,
          iconSize: [120, 24],
          iconAnchor: [60, 12],
        });

        const marker = L.marker([junction.latitude, junction.longitude], { icon: customIcon });
        marker.on('click', () => {
          setSelectedJunction(junction);
          if (onSelectJunction) onSelectJunction(junction);
        });
        marker.addTo(layerGroup);
      });
    }

    // 4. Incident Markers Layer (Matching Screenshot 2 Icons & Colors)
    if (layers.incidents) {
      incidents.forEach((inc) => {
        const isClosed = inc.category === 'Road Closed' || inc.category === 'Road Closure';
        const isRoadWorks = inc.category === 'Road Works' || inc.category === 'Roadwork';
        const isCrash = inc.category === 'Accident' || inc.category === 'Crash';

        const color = isClosed
          ? '#a855f7' // Purple
          : isRoadWorks
          ? '#facc15' // Yellow
          : isCrash
          ? '#3b82f6' // Blue
          : '#f97316'; // Orange Jam

        const iconSymbol = isClosed ? '🚫' : isRoadWorks ? '🚧' : isCrash ? '🚗' : '⚠️';

        const iconHtml = `<div style="
          width: 30px;
          height: 30px;
          border-radius: 50%;
          background: ${color};
          border: 2px solid #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 16px ${color};
          animation: pulse 1.5s infinite;
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

    // 5. Active Dispatched Route Polyline Layer
    if (layers.route && activeRoutePolyline.length > 1) {
      const polyline = L.polyline(activeRoutePolyline, {
        color: '#38bdf8',
        weight: 5,
        opacity: 0.9,
        dashArray: '8, 8',
      }).addTo(layerGroup);

      mapRef.current.fitBounds(polyline.getBounds(), { padding: [50, 50] });
    }

    // 6. Police Units Layer
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
            ${unit.telemetry.isSirenActive ? `<div style="
              position: absolute;
              top: -4px;
              right: -4px;
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: #ef4444;
              box-shadow: 0 0 10px #ef4444;
            "></div>` : ''}
          </div>`,
          iconSize: [32, 32],
          iconAnchor: [16, 16],
        });

        const marker = L.marker([unit.location.latitude, unit.location.longitude], { icon: unitIcon });
        marker.on('click', () => {
          setSelectedUnit(unit);
        });

        marker.bindTooltip(`<b>${unit.callSign}</b><br/>Status: ${unit.availability}<br/>${unit.location.nearestJunctionName}`, {
          direction: 'top',
        });

        marker.addTo(layerGroup);
      });
    }
  }, [layers, units, selectedUnit, incidents, junctionStates, riskData, activeRoutePolyline]);

  return (
    <div className={`relative w-full ${heightClass} rounded-2xl overflow-hidden border border-slate-800 shadow-2xl bg-[#0b0c10]`}>
      {/* Canvas Container */}
      <div ref={containerRef} className="w-full h-full z-0" />

      {/* Layer Control Panel Floating Toggle */}
      <div className="absolute top-4 right-4 z-20">
        <button
          onClick={() => setIsControlsOpen(!isControlsOpen)}
          className="flex items-center gap-2 px-3 py-2 bg-[#12141d]/90 hover:bg-slate-800 text-slate-200 rounded-xl border border-slate-700/80 shadow-lg backdrop-blur-md transition-all text-xs font-mono font-medium"
        >
          <Layers className="w-4 h-4 text-pink-400" />
          <span>Layers ({Object.values(layers).filter(Boolean).length})</span>
        </button>

        {isControlsOpen && (
          <div className="mt-2 w-56 bg-[#12141d]/95 backdrop-blur-xl border border-slate-700/80 rounded-xl p-3 shadow-2xl flex flex-col gap-2 text-xs font-mono">
            <div className="text-[10px] text-slate-400 uppercase tracking-wider font-bold mb-1">Toggle Map Overlays</div>
            
            <label className="flex items-center justify-between p-1.5 hover:bg-slate-800/60 rounded cursor-pointer">
              <span className="flex items-center gap-2 text-slate-200">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500"></span> Live Spot Pins
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
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500"></span> GIS Incident Layers
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
    </div>
  );
};

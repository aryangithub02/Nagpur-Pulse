import React, { useState } from 'react';
import { IncidentItem } from '../types';
import { 
  X, 
  MapPin, 
  Clock, 
  AlertTriangle, 
  Flame, 
  ShieldAlert, 
  Navigation, 
  ExternalLink, 
  Copy, 
  Check, 
  Phone, 
  Car, 
  Layers, 
  Calendar,
  Share2
} from 'lucide-react';

interface IncidentDetailModalProps {
  incident: IncidentItem | null;
  onClose: () => void;
  onFocusMap: (incident: IncidentItem) => void;
}

export const IncidentDetailModal: React.FC<IncidentDetailModalProps> = ({
  incident,
  onClose,
  onFocusMap,
}) => {
  const [copied, setCopied] = useState(false);

  if (!incident) return null;

  const [lat, lng] = incident.location;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;

  const copyDetails = () => {
    const text = `🚨 NAGPUR TRAFFIC INCIDENT ALERT
Type: ${incident.category} (${incident.severity})
Road: ${incident.roadName}
Nearest Chowk: ${incident.nearestJunction?.name || 'Nagpur Metro'} (${incident.nearestJunction?.distanceFormatted || ''})
Delay: +${incident.delayMinutes} mins
Reported: ${incident.timeAgo} (${new Date(incident.startTime).toLocaleString('en-IN')})
GPS Coordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}
Details: ${incident.description}`;

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className={`p-4 sm:p-5 flex items-start justify-between border-b ${
          incident.isAccident || incident.severity === 'Critical'
            ? 'bg-rose-950/70 border-rose-800/80'
            : incident.severity === 'Major'
            ? 'bg-orange-950/70 border-orange-800/80'
            : 'bg-slate-800/80 border-slate-700'
        }`}>
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${
              incident.isAccident ? 'bg-rose-600 text-white' : 'bg-slate-800 text-amber-400'
            }`}>
              {incident.isAccident ? <Flame className="w-6 h-6" /> : <AlertTriangle className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase font-extrabold px-2 py-0.5 rounded bg-slate-900/80 text-white border border-slate-700 font-mono">
                  {incident.category}
                </span>
                <span className={`text-xs uppercase font-extrabold px-2 py-0.5 rounded ${
                  incident.severity === 'Critical' ? 'bg-rose-600 text-white' : 'bg-amber-500 text-slate-950'
                }`}>
                  {incident.severity} Severity
                </span>
              </div>
              <h3 className="text-base sm:text-lg font-bold text-white mt-1">
                {incident.roadName}
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* Description */}
          <div className="bg-slate-950/70 p-3.5 rounded-xl border border-slate-800">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
              Incident Overview
            </div>
            <p className="text-sm text-slate-200 leading-relaxed">
              {incident.description}
            </p>
          </div>

          {/* Grid Attributes */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-xs">
            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Traffic Delay</span>
              <div className="text-sm font-bold text-amber-300 font-mono mt-1">
                {incident.delayMinutes > 0 ? `+${incident.delayMinutes} mins` : 'Normal Flow'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">({incident.delaySeconds}s total)</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
              <span className="text-slate-400">Corridor Length</span>
              <div className="text-sm font-bold text-cyan-300 font-mono mt-1">
                {incident.lengthMeters > 0 ? `${incident.lengthMeters} meters` : 'Point Location'}
              </div>
              <div className="text-[10px] text-slate-500 mt-0.5">Affected stretch</div>
            </div>

            <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 col-span-2 sm:col-span-1">
              <span className="text-slate-400">Reported Timestamp</span>
              <div className="text-sm font-bold text-white font-mono mt-1">
                {incident.timeAgo}
              </div>
              <div className="text-[10px] text-slate-400 mt-0.5">
                {new Date(incident.startTime).toLocaleTimeString('en-IN')}
              </div>
            </div>
          </div>

          {/* Nearest Nagpur Chowk & Location details */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800 space-y-2.5">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Nagpur Geographic Reference
            </div>
            
            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-amber-400" /> Nearest Chowk
              </span>
              <span className="font-bold text-amber-300">
                {incident.nearestJunction?.name} ({incident.nearestJunction?.distanceFormatted})
              </span>
            </div>

            <div className="flex items-center justify-between text-xs border-b border-slate-800/80 pb-2">
              <span className="text-slate-400">GPS Coordinates</span>
              <span className="font-mono text-slate-200">
                {lat.toFixed(6)}, {lng.toFixed(6)}
              </span>
            </div>

            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">TomTom Telemetry ID</span>
              <span className="font-mono text-[11px] text-slate-400">
                {incident.id}
              </span>
            </div>
          </div>

          {/* Emergency Helpline for Nagpur City */}
          <div className="bg-rose-950/30 border border-rose-900/50 p-3 rounded-xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-rose-400 shrink-0" />
              <div>
                <div className="font-bold text-rose-300">Nagpur Emergency Dispatch</div>
                <div className="text-[11px] text-slate-400">Traffic Police: 0712-2561100 | Ambulance: 108</div>
              </div>
            </div>
            <a
              href="tel:112"
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs"
            >
              Call 112
            </a>
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2">
          <button
            onClick={copyDetails}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition active:scale-95"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied to Clipboard' : 'Copy Incident Intel'}</span>
          </button>

          <div className="flex items-center gap-2">
            <a
              href={googleMapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition"
            >
              <ExternalLink className="w-3.5 h-3.5 text-cyan-400" />
              <span>Open in Google Maps</span>
            </a>

            <button
              onClick={() => {
                onFocusMap(incident);
                onClose();
              }}
              className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-rose-950 transition active:scale-95"
            >
              <Navigation className="w-3.5 h-3.5" />
              <span>Center on Map</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

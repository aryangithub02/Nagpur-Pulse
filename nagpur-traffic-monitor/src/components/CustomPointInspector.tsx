import React, { useState } from 'react';
import { Crosshair, Search, Zap, Code, Clock, Gauge, ShieldCheck, MapPin, Copy, Check } from 'lucide-react';
import { Coordinate, TrafficMetrics } from '../types';
import { fetchTrafficFlowForPoint, formatTravelTime, getTomTomApiKey } from '../services/tomtomService';

interface CustomPointInspectorProps {
  initialCoord?: Coordinate | null;
  onPointInspected?: (metrics: TrafficMetrics) => void;
}

export const CustomPointInspector: React.FC<CustomPointInspectorProps> = ({
  initialCoord,
  onPointInspected,
}) => {
  const [lat, setLat] = useState<string>(initialCoord ? initialCoord.latitude.toString() : '21.14580');
  const [lng, setLng] = useState<string>(initialCoord ? initialCoord.longitude.toString() : '79.08820');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [metrics, setMetrics] = useState<TrafficMetrics | null>(null);
  const [rawJson, setRawJson] = useState<any | null>(null);
  const [copied, setCopied] = useState(false);

  const presets = [
    { name: 'Zero Mile Stone (Nagpur Geographic Center)', lat: 21.1498, lng: 79.0806 },
    { name: 'Futala Lake Boulevard', lat: 21.1554, lng: 79.0435 },
    { name: 'Ram Jhula (Railway Station Overbridge)', lat: 21.1512, lng: 79.0915 },
    { name: 'MIHAN Multi-Modal Cargo Hub', lat: 21.0425, lng: 79.0520 },
    { name: 'Ambazari Lake Road', lat: 21.1302, lng: 79.0485 },
    { name: 'Sadar Residency Road', lat: 21.1620, lng: 79.0825 },
  ];

  const handleInspect = async (queryLat = parseFloat(lat), queryLng = parseFloat(lng)) => {
    if (isNaN(queryLat) || isNaN(queryLng)) return;
    setIsLoading(true);

    try {
      const apiKey = getTomTomApiKey();
      const directUrl = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/15/json?key=${encodeURIComponent(
        apiKey
      )}&point=${queryLat},${queryLng}&unit=kmph`;

      // Try fetching raw JSON for the inspector tab
      try {
        const rawRes = await fetch(directUrl);
        if (rawRes.ok) {
          const json = await rawRes.json();
          setRawJson(json);
        } else {
          setRawJson({ error: `TomTom API HTTP ${rawRes.status}`, endpoint: directUrl });
        }
      } catch (err) {
        setRawJson({ error: 'Network fetch error', details: String(err) });
      }

      const result = await fetchTrafficFlowForPoint(queryLat, queryLng, apiKey, true);
      setMetrics(result);
      if (onPointInspected) onPointInspected(result);
    } catch (err) {
      console.error('Inspection failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyEndpoint = () => {
    const apiKey = getTomTomApiKey();
    const endpoint = `https://api.tomtom.com/traffic/services/4/flowSegmentData/absolute/15/json?key=${apiKey}&point=${lat},${lng}&unit=kmph`;
    navigator.clipboard.writeText(endpoint);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="flex flex-col gap-5">
      {/* Search and Coordinates Input */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Crosshair className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              TomTom FlowSegmentData Live Inspector
            </h2>
          </div>
          <span className="text-xs text-slate-400 font-mono hidden sm:inline">
            Unit: km/h • Absolute Mode
          </span>
        </div>

        {/* Input Fields */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 items-end">
          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Latitude (Nagpur: 21.0 to 21.25)
            </label>
            <input
              type="number"
              step="0.0001"
              value={lat}
              onChange={e => setLat(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              placeholder="e.g. 21.1458"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-300 block mb-1">
              Longitude (Nagpur: 79.0 to 79.2)
            </label>
            <input
              type="number"
              step="0.0001"
              value={lng}
              onChange={e => setLng(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none"
              placeholder="e.g. 79.0882"
            />
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleInspect()}
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 active:scale-95 transition"
            >
              <Zap className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>{isLoading ? 'Querying API...' : 'Fetch Live Flow'}</span>
            </button>
          </div>
        </div>

        {/* Presets */}
        <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-800">
          <span className="text-[11px] font-semibold text-slate-400 mr-1">Nagpur Hotspots:</span>
          {presets.map((p, idx) => (
            <button
              key={idx}
              onClick={() => {
                setLat(p.lat.toString());
                setLng(p.lng.toString());
                handleInspect(p.lat, p.lng);
              }}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
            >
              {p.name}
            </button>
          ))}
        </div>
      </div>

      {/* Results View */}
      {metrics && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Visual Traffic Breakdown */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Gauge className="w-4 h-4 text-cyan-400" />
                Live Segment Metrics
              </h3>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono border ${
                  metrics.congestionLevel === 'fluid'
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
                    : metrics.congestionLevel === 'moderate'
                    ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
                    : 'bg-rose-500/10 text-rose-300 border-rose-500/20'
                }`}
              >
                {metrics.congestionLevel}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Current Traffic Speed</span>
                <span className="text-3xl font-black font-mono text-cyan-300 mt-1 block">
                  {metrics.currentSpeed} <span className="text-xs text-slate-400 font-normal">km/h</span>
                </span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Ideal: {metrics.freeFlowSpeed} km/h
                </span>
              </div>

              <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 block">Travel Duration</span>
                <span className="text-3xl font-black font-mono text-white mt-1 block">
                  {formatTravelTime(metrics.currentTravelTime)}
                </span>
                <span className="text-[10px] text-orange-400 font-mono">
                  {metrics.delaySeconds > 0 ? `+${metrics.delaySeconds}s delay` : 'Zero delay'}
                </span>
              </div>
            </div>

            <div className="bg-slate-950/40 p-3 rounded-xl border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">Road Class (FRC):</span>
                <span className="font-semibold text-slate-200">{metrics.frcDescription} ({metrics.frc})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TomTom Confidence:</span>
                <span className="font-mono text-emerald-400 font-bold">{metrics.confidencePct}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Road Closure:</span>
                <span className={metrics.roadClosure ? 'text-rose-400 font-bold' : 'text-emerald-400'}>
                  {metrics.roadClosure ? 'CLOSED' : 'Open'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Polyline Coordinates:</span>
                <span className="font-mono text-cyan-400 font-semibold">{metrics.coordinates.length} waypoints</span>
              </div>
            </div>

            <button
              onClick={handleCopyEndpoint}
              className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold active:scale-95 transition"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>Copy TomTom Flow URL</span>
            </button>
          </div>

          {/* Raw JSON Inspector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col gap-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                <Code className="w-3.5 h-3.5 text-cyan-400" />
                Raw TomTom API Response
              </h3>
              <span className="text-[10px] text-slate-500 font-mono">JSON</span>
            </div>

            <pre className="w-full bg-slate-950 p-3 rounded-xl border border-slate-800/80 text-[11px] font-mono text-cyan-300 overflow-x-auto max-h-[300px] leading-relaxed select-all">
              {rawJson ? JSON.stringify(rawJson, null, 2) : '// Click "Fetch Live Flow" to see raw JSON'}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { CloudRain, Sun, Wind, Eye, Thermometer, ShieldAlert, CloudLightning, MapPin, ExternalLink, ChevronRight } from 'lucide-react';
import { getCurrentWeather, getWeatherHeatmap, CurrentWeatherResponse, WeatherHeatmapPoint } from '../../services/api/weather';

export const WeatherWidget: React.FC<{ onViewOnMap?: () => void }> = ({ onViewOnMap }) => {
  const [weatherData, setWeatherData] = useState<CurrentWeatherResponse | null>(null);
  const [affectedJunctions, setAffectedJunctions] = useState<WeatherHeatmapPoint[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      try {
        const data = await getCurrentWeather();
        if (isMounted) {
          setWeatherData(data);
          setLoading(false);
        }
        
        const heatmap = await getWeatherHeatmap();
        if (isMounted && heatmap) {
          const pts = heatmap.heatmap_points || heatmap.data || [];
          if (pts.length > 0) {
            const sorted = [...pts].sort((a, b) => b.combined_score - a.combined_score);
            setAffectedJunctions(sorted.slice(0, 5));
          }
        }
      } catch (err) {
        console.warn('WeatherWidget fetch error:', err);
        if (isMounted) setLoading(false);
      }
    };

    fetchWeather();
    const interval = setInterval(fetchWeather, 60000); // Refresh every 1 min
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading || !weatherData) {
    return (
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 text-slate-400 text-xs flex items-center gap-2 backdrop-blur-md">
        <Thermometer className="w-4 h-4 animate-spin text-cyan-400" />
        <span>Syncing Nagpur Weather Intelligence...</span>
      </div>
    );
  }

  const { weather, traffic_impact } = weatherData;
  const isRain = weather.precipitation_mm > 0 || weather.weather_condition.toLowerCase().includes('rain');
  const isStorm = weather.storm_flag;

  const getImpactBadgeClass = (level: string) => {
    switch (level) {
      case 'SEVERE':
        return 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse';
      case 'HIGH':
        return 'bg-orange-500/20 text-orange-400 border-orange-500/40';
      case 'ELEVATED':
      case 'MODERATE':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      default:
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
    }
  };

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-xl backdrop-blur-md text-white flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          {isStorm ? (
            <CloudLightning className="w-5 h-5 text-amber-400 animate-bounce" />
          ) : isRain ? (
            <CloudRain className="w-5 h-5 text-cyan-400 animate-pulse" />
          ) : (
            <Sun className="w-5 h-5 text-amber-400" />
          )}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Nagpur Weather Live</h4>
            <p className="text-[11px] text-slate-400">{weather.weather_condition}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border ${getImpactBadgeClass(traffic_impact.level)}`}>
            Impact: {traffic_impact.level} ({traffic_impact.score} pts)
          </div>
          {onViewOnMap && (
            <button
              onClick={onViewOnMap}
              className="px-2.5 py-1 bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 rounded-lg text-[11px] font-bold transition flex items-center gap-1"
            >
              <span>VIEW ON MAP</span>
              <ExternalLink className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Grid Stats */}
      <div className="grid grid-cols-4 gap-2 text-center text-xs">
        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-1">
            <Thermometer className="w-3 h-3 text-red-400" />
            <span>Temp</span>
          </div>
          <div className="font-semibold text-white">{weather.temperature_c}°C</div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-1">
            <CloudRain className="w-3 h-3 text-cyan-400" />
            <span>Rain</span>
          </div>
          <div className="font-semibold text-cyan-300">{weather.precipitation_mm} mm/h</div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-1">
            <Eye className="w-3 h-3 text-indigo-400" />
            <span>Visibility</span>
          </div>
          <div className="font-semibold text-indigo-300">{weather.visibility_km} km</div>
        </div>

        <div className="bg-slate-800/50 rounded-lg p-2 border border-slate-700/50">
          <div className="flex items-center justify-center gap-1 text-slate-400 text-[10px] mb-1">
            <Wind className="w-3 h-3 text-teal-400" />
            <span>Wind</span>
          </div>
          <div className="font-semibold text-teal-300">{weather.wind_speed_kmh} km/h</div>
        </div>
      </div>

      {/* Weather-Affected Junctions List */}
      {affectedJunctions.length > 0 && (
        <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800 space-y-1.5 font-mono text-xs">
          <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider font-bold">
            <span className="flex items-center gap-1 text-cyan-300">
              <MapPin className="w-3 h-3 text-cyan-400" />
              Weather-Affected Chowks ({affectedJunctions.length})
            </span>
            <span>Combined Impact</span>
          </div>
          <div className="space-y-1">
            {affectedJunctions.map((j) => (
              <div
                key={j.junction_id}
                onClick={onViewOnMap}
                className="p-1.5 rounded bg-slate-900/80 hover:bg-slate-800 border border-slate-800 flex items-center justify-between cursor-pointer transition text-[11px]"
              >
                <span className="font-semibold text-slate-200">{j.name}</span>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-slate-400">{j.weather_condition}</span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                    j.impact_level === 'SEVERE'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                      : j.impact_level === 'HIGH'
                      ? 'bg-orange-500/20 text-orange-300 border border-orange-500/30'
                      : 'bg-emerald-500/20 text-emerald-300'
                  }`}>
                    {j.combined_score} pts
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Traffic Consequence Note */}
      {traffic_impact.score > 0 && (
        <div className="bg-slate-800/40 rounded-lg px-3 py-1.5 text-[11px] text-slate-300 flex items-center justify-between border border-slate-700/40">
          <div className="flex items-center gap-1.5 text-amber-400">
            <ShieldAlert className="w-3.5 h-3.5" />
            <span>Speed Penalty: -{traffic_impact.speed_penalty_pct}%</span>
          </div>
          <span className="text-slate-400 text-[10px]">ETA ×{traffic_impact.eta_multiplier}</span>
        </div>
      )}
    </div>
  );
};

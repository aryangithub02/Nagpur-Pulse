import React, { useEffect, useState } from 'react';
import { Clock, CloudRain, Sun, ShieldAlert, ArrowRight } from 'lucide-react';
import { getWeatherForecast } from '../../services/api/weather';

export const WeatherForecastTimeline: React.FC = () => {
  const [forecast, setForecast] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchForecast = async () => {
      const data = await getWeatherForecast();
      setForecast(data);
      setLoading(false);
    };
    fetchForecast();
  }, []);

  if (loading || forecast.length === 0) {
    return null;
  }

  return (
    <div className="bg-slate-900/95 border border-slate-800 rounded-xl p-3 shadow-lg backdrop-blur-md text-white text-xs">
      <div className="flex items-center gap-1.5 text-slate-300 font-semibold mb-2.5 text-[11px] uppercase tracking-wider">
        <Clock className="w-3.5 h-3.5 text-cyan-400" />
        <span>Nagpur 24-Hour Forecast Risk Timeline</span>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {forecast.slice(0, 4).map((item, idx) => {
          const w = item.weather;
          const impact = item.traffic_impact;
          const timeStr = item.forecast_for ? new Date(item.forecast_for).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : `+${(idx+1)*3}h`;

          return (
            <div key={idx} className="bg-slate-800/60 rounded-lg p-2 border border-slate-700/50 flex flex-col items-center gap-1">
              <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
              {w.precipitation_mm > 0 ? (
                <CloudRain className="w-4 h-4 text-cyan-400" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
              <span className="text-[11px] font-semibold">{w.temperature_c}°C</span>
              <span className="text-[10px] text-cyan-300">{w.precipitation_mm > 0 ? `${w.precipitation_mm.toFixed(1)} mm` : '0 mm'}</span>
              <div className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                impact.level === 'SEVERE' ? 'bg-red-500/30 text-red-300' :
                impact.level === 'HIGH' ? 'bg-orange-500/30 text-orange-300' :
                impact.level === 'MODERATE' ? 'bg-amber-500/30 text-amber-300' : 'bg-emerald-500/30 text-emerald-300'
              }`}>
                {impact.level}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

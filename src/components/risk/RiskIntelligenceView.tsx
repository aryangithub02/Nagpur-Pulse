import React, { useEffect, useState } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { NAGPUR_JUNCTIONS } from '../../data/nagpurJunctions';
import { getWeatherHeatmap, WeatherHeatmapPoint } from '../../services/api/weather';
import { AlertOctagon, Activity, Shield, ChevronRight, Zap, CloudRain } from 'lucide-react';

export const RiskIntelligenceView: React.FC = () => {
  const { riskData, setSelectedJunction } = useNagpurPulseStore();
  const [weatherPoints, setWeatherPoints] = useState<WeatherHeatmapPoint[]>([]);

  useEffect(() => {
    let isMounted = true;
    const fetchWeather = async () => {
      const res = await getWeatherHeatmap();
      if (isMounted && res.heatmap_points) {
        setWeatherPoints(res.heatmap_points);
      }
    };
    fetchWeather();
    return () => {
      isMounted = false;
    };
  }, []);

  const criticalRiskCount = riskData.filter((r) => r.riskLevel === 'CRITICAL' || r.riskLevel === 'SEVERE').length;
  const highRiskCount = riskData.filter((r) => r.riskLevel === 'HIGH').length;

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Risk Metrics Summary Strip */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">High & Critical Risk Hotspots</p>
            <p className="text-3xl font-extrabold text-amber-400 mt-0.5">{criticalRiskCount + highRiskCount}</p>
            <span className="text-[10px] text-amber-300">ML Risk Prediction (rf_v3_weather)</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
            <AlertOctagon className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Environment & Traffic</p>
            <p className="text-xl font-bold text-cyan-400 mt-0.5">Weather Integrated</p>
            <span className="text-[10px] text-slate-500">Live OpenWeather & Traffic Stream</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <CloudRain className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Predictive Deployment</p>
            <p className="text-xl font-bold text-emerald-400 mt-0.5">Active Advisory</p>
            <span className="text-[10px] text-slate-500">Police HQ Dispatch System</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Main Grid: Risk Heatmap Canvas & Risk Score Ranking */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        {/* Map (8 Cols) */}
        <div className="lg:col-span-8">
          <UnifiedMap heightClass="h-[540px]" />
        </div>

        {/* Risk Scores Roster (4 Cols) */}
        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono">
          <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-2">
            <span className="font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Zap className="w-4 h-4 text-amber-400" />
              ML Risk & Weather Roster
            </span>
            <span className="text-[10px] text-slate-400">Combined Status</span>
          </div>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
            {riskData.map((item) => {
              const color = item.riskLevel === 'CRITICAL' ? 'text-rose-400 bg-rose-500/20 border-rose-500/30' : 'text-amber-400 bg-amber-500/20 border-amber-500/30';
              const scoreVal = item.riskScore <= 1 ? item.riskScore * 100 : item.riskScore;
              const wPoint = weatherPoints.find((w) => w.junction_id === item.locationId);

              return (
                <div
                  key={item.locationId}
                  onClick={() => {
                    const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === item.locationId);
                    if (j) setSelectedJunction(j);
                  }}
                  className="p-3 bg-slate-950/70 border border-slate-800 hover:border-amber-500/40 rounded-xl space-y-1.5 text-xs cursor-pointer transition"
                >
                  <div className="flex items-center justify-between">
                    <div className="font-bold text-slate-200">{item.locationName}</div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${color}`}>
                      ML: {item.riskLevel} ({scoreVal.toFixed(0)}%)
                    </span>
                  </div>

                  {wPoint && (
                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                      <span className="flex items-center gap-1 text-cyan-300">
                        <CloudRain className="w-3 h-3" />
                        Weather Impact: <strong className="text-white">{wPoint.weather_impact_score} pts</strong> ({wPoint.weather_condition})
                      </span>
                      <span className="text-emerald-400 font-bold">
                        Combined: {wPoint.combined_score}/100
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

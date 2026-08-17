import React from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { NAGPUR_JUNCTIONS } from '../../data/nagpurJunctions';
import { Shield, MapPin, Activity, AlertCircle } from 'lucide-react';

export const PoliceCoverageView: React.FC = () => {
  const { coverageData, units, setSelectedJunction } = useNagpurPulseStore();

  const overallPct = coverageData?.overallCoveragePercentage || 84.5;
  const activeUnitsCount = coverageData?.totalActiveUnits || units.length;

  return (
    <div className="flex flex-col gap-6 w-full font-sans">
      {/* Coverage Overview Bar */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-4 font-mono">
        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Overall Police Coverage</p>
            <p className="text-3xl font-extrabold text-blue-400 mt-0.5">{overallPct}%</p>
            <span className="text-[10px] text-slate-500">City-Wide Radius Coverage</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Response Fleet</p>
            <p className="text-3xl font-extrabold text-emerald-400 mt-0.5">{activeUnitsCount}</p>
            <span className="text-[10px] text-slate-500">Units Monitoring Grid</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Low Coverage Gaps</p>
            <p className="text-3xl font-extrabold text-rose-400 mt-0.5">2 Chowks</p>
            <span className="text-[10px] text-rose-300">Requires Patrol Re-allocation</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertCircle className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* Main Grid: Coverage Map & Chowk Coverage Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[560px]">
        <div className="lg:col-span-8">
          <UnifiedMap heightClass="h-[540px]" />
        </div>

        <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-col gap-3 font-mono">
          <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">Chowk Coverage Metrics</div>

          <div className="space-y-2.5 overflow-y-auto max-h-[460px] pr-1">
            {(coverageData?.locations || NAGPUR_JUNCTIONS.slice(0, 10).map((j) => ({
              locationId: String(j.id),
              locationName: j.name,
              activeUnitsCount: Math.floor(Math.random() * 3) + 1,
              coveragePercentage: Math.floor(Math.random() * 30) + 70,
              status: 'ADEQUATE',
            }))).map((item: any) => (
              <div
                key={item.locationId}
                onClick={() => {
                  const j = NAGPUR_JUNCTIONS.find((loc) => String(loc.id) === item.locationId);
                  if (j) setSelectedJunction(j);
                }}
                className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between text-xs cursor-pointer transition hover:border-blue-500/40"
              >
                <div>
                  <div className="font-bold text-slate-200">{item.locationName}</div>
                  <div className="text-[10px] text-slate-500">{item.activeUnitsCount} Units Assigned</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-blue-400">{item.coveragePercentage}%</div>
                  <div className="text-[10px] text-slate-400">{item.status}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

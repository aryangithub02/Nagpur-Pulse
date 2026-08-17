import React from 'react';
import { NagpurJunction, IncidentItem } from '../types';
import { NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';
import { getHaversineDistanceMeters } from '../services/incidentService';
import { 
  MapPin, 
  Flame, 
  AlertTriangle, 
  ArrowRight, 
  ShieldAlert,
  Compass,
  Activity
} from 'lucide-react';

interface JunctionHotspotsProps {
  incidents: IncidentItem[];
  selectedJunctionId: number | null;
  onSelectJunction: (id: number) => void;
}

export const JunctionHotspots: React.FC<JunctionHotspotsProps> = ({
  incidents,
  selectedJunctionId,
  onSelectJunction,
}) => {
  // Compute risk score and incident count within 1.5km radius for each chowk
  const hotspots = NAGPUR_JUNCTIONS.map((junction) => {
    let incidentCount = 0;
    let accidentCount = 0;
    let maxSeverityScore = 0;
    let minDistance = Infinity;

    for (const inc of incidents) {
      const dist = getHaversineDistanceMeters(
        junction.latitude,
        junction.longitude,
        inc.location[0],
        inc.location[1]
      );

      if (dist <= 1500) {
        incidentCount++;
        if (inc.isAccident) accidentCount++;
        if (inc.severityScore > maxSeverityScore) {
          maxSeverityScore = inc.severityScore;
        }
        if (dist < minDistance) {
          minDistance = dist;
        }
      }
    }

    // Vulnerability score
    const riskScore = incidentCount * 2 + accidentCount * 5 + maxSeverityScore * 3;

    return {
      junction,
      incidentCount,
      accidentCount,
      maxSeverityScore,
      minDistance: minDistance === Infinity ? null : minDistance,
      riskScore,
    };
  })
    .filter((item) => item.incidentCount > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
    .slice(0, 8); // Top 8 active junction hotspots

  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-amber-400">
            <MapPin className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Nagpur Chowk Hotspots & Vulnerability
            </h3>
            <p className="text-[11px] text-slate-400">
              Proximity clusters around major surveyed intersections
            </p>
          </div>
        </div>
        <span className="text-[11px] text-slate-400 font-mono bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
          Radius: &lt;1.5 km
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {hotspots.length === 0 ? (
          <div className="col-span-full py-8 text-center text-xs text-slate-400">
            No active incident clusters detected near surveyed chowks at this moment.
          </div>
        ) : (
          hotspots.map(({ junction, incidentCount, accidentCount, maxSeverityScore, minDistance }) => {
            const isSelected = selectedJunctionId === junction.id;

            return (
              <div
                key={junction.id}
                onClick={() => onSelectJunction(junction.id)}
                className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 ${
                  isSelected
                    ? 'bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                    : 'bg-slate-950/50 hover:bg-slate-900/90 border-slate-800/90 hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-1.5">
                  <div className="truncate">
                    <h4 className="text-xs font-bold text-white truncate group-hover:text-amber-400">
                      {junction.name}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-medium">
                      {junction.zone ? `${junction.zone} Zone` : 'Nagpur Metro'}
                    </span>
                  </div>

                  {accidentCount > 0 && (
                    <span className="shrink-0 p-1 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/30" title="Accident active">
                      <Flame className="w-3.5 h-3.5 animate-bounce" />
                    </span>
                  )}
                </div>

                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px]">
                  <span className="text-slate-400">
                    <strong className="text-white font-mono">{incidentCount}</strong> incidents
                  </span>
                  <span className="text-[10px] font-mono text-amber-400 flex items-center gap-0.5">
                    View on Map <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

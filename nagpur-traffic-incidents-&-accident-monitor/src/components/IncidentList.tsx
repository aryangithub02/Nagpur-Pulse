import React, { useState } from 'react';
import { IncidentItem } from '../types';
import { 
  AlertTriangle, 
  Flame, 
  Car, 
  Construction, 
  Ban, 
  Clock, 
  MapPin, 
  Navigation, 
  ExternalLink,
  Copy,
  Check,
  ChevronRight,
  TrendingUp,
  AlertCircle,
  Radio
} from 'lucide-react';

interface IncidentListProps {
  incidents: IncidentItem[];
  selectedIncident: IncidentItem | null;
  onSelectIncident: (incident: IncidentItem) => void;
  onOpenDetailModal: (incident: IncidentItem) => void;
}

export const IncidentList: React.FC<IncidentListProps> = ({
  incidents,
  selectedIncident,
  onSelectIncident,
  onOpenDetailModal,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = (e: React.MouseEvent, incident: IncidentItem) => {
    e.stopPropagation();
    const text = `${incident.roadName} (${incident.location[0].toFixed(5)}, ${incident.location[1].toFixed(5)}) - ${incident.category} [${incident.severity}]`;
    navigator.clipboard.writeText(text);
    setCopiedId(incident.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getCategoryBadge = (incident: IncidentItem) => {
    if (incident.category === 'Accident' || incident.isAccident) {
      return {
        bg: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
        icon: <Flame className="w-3.5 h-3.5 text-rose-400" />,
        label: 'Accident / Crash',
        borderLeft: 'border-l-rose-500',
        cardBg: 'bg-rose-500/[0.04]',
      };
    }
    if (incident.category === 'Road Closed') {
      return {
        bg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
        icon: <Ban className="w-3.5 h-3.5 text-purple-400" />,
        label: 'Road Closed',
        borderLeft: 'border-l-purple-500',
        cardBg: 'bg-purple-500/[0.04]',
      };
    }
    if (incident.category === 'Road Works' || incident.category === 'Lane Closed') {
      return {
        bg: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        icon: <Construction className="w-3.5 h-3.5 text-amber-400" />,
        label: incident.category,
        borderLeft: 'border-l-amber-500',
        cardBg: 'bg-amber-500/[0.04]',
      };
    }
    if (incident.category === 'Congestion') {
      return {
        bg: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
        icon: <Car className="w-3.5 h-3.5 text-orange-400" />,
        label: 'Traffic Jam',
        borderLeft: 'border-l-orange-500',
        cardBg: 'bg-orange-500/[0.04]',
      };
    }
    return {
      bg: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: <AlertCircle className="w-3.5 h-3.5 text-cyan-400" />,
      label: incident.category,
      borderLeft: 'border-l-cyan-500',
      cardBg: 'bg-cyan-500/[0.04]',
    };
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'Critical':
        return 'bg-rose-600 text-white font-bold animate-pulse';
      case 'Major':
        return 'bg-orange-600 text-white font-bold';
      case 'Moderate':
        return 'bg-amber-600/90 text-white font-semibold';
      case 'Minor':
      default:
        return 'bg-slate-800 text-slate-300 font-medium';
    }
  };

  return (
    <div className="bento-card flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800/90 flex items-center justify-between bg-slate-950/40">
        <div>
          <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
            <span>Incident Stream</span>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
              {incidents.length} Active
            </span>
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Nagpur corridor telemetry stream
          </p>
        </div>
        <div className="flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          <span>Live Feed</span>
        </div>
      </div>

      {/* Incident Cards Scrollable Area */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2.5 max-h-[580px]">
        {incidents.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center mb-3 border border-slate-800 text-slate-500">
              <Check className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-slate-200">No Incidents Found</p>
            <p className="text-xs text-slate-400 max-w-xs mt-1">
              Traffic is flowing smoothly with the current filters, or no incidents match your query.
            </p>
          </div>
        ) : (
          incidents.map((incident) => {
            const badge = getCategoryBadge(incident);
            const isSelected = selectedIncident?.id === incident.id;

            return (
              <div
                key={incident.id}
                id={`incident-item-${incident.id}`}
                onClick={() => onSelectIncident(incident)}
                className={`p-3.5 rounded-2xl border-l-4 ${badge.borderLeft} border-y border-r border-slate-800/90 cursor-pointer transition-all duration-200 ${badge.cardBg} ${
                  isSelected
                    ? 'ring-2 ring-rose-500/60 bg-slate-900 shadow-xl'
                    : 'hover:bg-slate-900/80 hover:border-slate-700'
                }`}
              >
                {/* Top bar: Category badge, Severity, and Distance */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border ${badge.bg}`}>
                      {badge.icon}
                      {badge.label}
                    </span>

                    <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-mono ${getSeverityBadge(incident.severity)}`}>
                      {incident.severity}
                    </span>
                  </div>

                  <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 shrink-0">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {incident.timeAgo}
                  </span>
                </div>

                {/* Road / Location name */}
                <h4 className="text-xs sm:text-sm font-bold text-white tracking-tight flex items-center justify-between gap-2">
                  <span className="truncate">{incident.roadName}</span>
                  {incident.delayMinutes > 0 && (
                    <span className="shrink-0 text-[11px] font-mono font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/80">
                      +{incident.delayMinutes}m delay
                    </span>
                  )}
                </h4>

                {/* Description text */}
                <p className="text-xs text-slate-300 mt-1 line-clamp-2 leading-relaxed">
                  {incident.description}
                </p>

                {/* Nearest Chowk & Corridor length */}
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <div className="flex items-center gap-1 truncate">
                    <MapPin className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">
                      Near <strong className="text-slate-200">{incident.nearestJunction?.name || 'Nagpur Metro'}</strong>
                      {incident.nearestJunction?.distanceFormatted && (
                        <span className="text-slate-400 text-[10px] ml-1 font-mono">
                          ({incident.nearestJunction.distanceFormatted})
                        </span>
                      )}
                    </span>
                  </div>

                  {/* Actions: Copy and Detail */}
                  <div className="flex items-center gap-1 shrink-0 ml-2" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={(e) => handleCopy(e, incident)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition"
                      title="Copy coordinates and road info"
                    >
                      {copiedId === incident.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => onOpenDetailModal(incident)}
                      className="px-2 py-1 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-[10px] font-medium flex items-center gap-1 border border-slate-700 transition active:scale-95"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

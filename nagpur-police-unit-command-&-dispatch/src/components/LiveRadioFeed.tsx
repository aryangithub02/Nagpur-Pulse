import React, { useState } from 'react';
import { RadioTransmission } from '../types/police';
import { Radio, Siren, CheckCircle, Navigation, AlertTriangle, Shield, Volume2 } from 'lucide-react';
import { soundFX } from '../services/audioEffects';

interface LiveRadioFeedProps {
  logs: RadioTransmission[];
  onPlayTransmissionSound?: () => void;
}

export const LiveRadioFeed: React.FC<LiveRadioFeedProps> = ({ logs }) => {
  const [filterType, setFilterType] = useState<string>('ALL');

  const filteredLogs = logs.filter((log) => {
    if (filterType !== 'ALL' && log.type !== filterType) return false;
    return true;
  });

  const getLogIcon = (type: RadioTransmission['type']) => {
    switch (type) {
      case 'SOS_ALERT':
      case '112_CALL':
        return <Siren className="w-4 h-4 text-rose-400 animate-pulse" />;
      case 'DISPATCH':
        return <Navigation className="w-4 h-4 text-blue-400" />;
      case 'CLEAR_SCENE':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />;
      case 'STATUS_UPDATE':
      default:
        return <Radio className="w-4 h-4 text-cyan-400" />;
    }
  };

  const playSquelch = () => {
    soundFX.playRadioSquelch();
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-cyan-400 animate-ping"></div>
          <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
            Nagpur Police Dispatch Channel (156.800 MHz & Trunked Digital)
          </h3>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={playSquelch}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors"
            title="Play Radio Squelch Test"
          >
            <Volume2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>Radio Squelch Check</span>
          </button>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="bg-slate-900 border border-slate-700 rounded px-2.5 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
          >
            <option value="ALL">All Transmissions ({logs.length})</option>
            <option value="112_CALL">112 Emergency Calls</option>
            <option value="DISPATCH">Tactical Dispatches</option>
            <option value="STATUS_UPDATE">Status Updates</option>
            <option value="CLEAR_SCENE">Scene Clear / Resolved</option>
          </select>
        </div>
      </div>

      {/* Log Feed */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2 font-mono text-xs">
        {filteredLogs.length === 0 ? (
          <div className="text-center p-8 text-slate-500">
            No radio transmissions logged for this filter
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isAlert = log.type === '112_CALL' || log.type === 'SOS_ALERT';
            return (
              <div
                key={log.id}
                className={`p-3 rounded-lg border transition-all flex items-start gap-3 ${
                  isAlert
                    ? 'bg-rose-950/30 border-rose-800/60 shadow-xs'
                    : log.type === 'DISPATCH'
                    ? 'bg-blue-950/20 border-blue-800/40'
                    : 'bg-slate-950/60 border-slate-800/80'
                }`}
              >
                <div className="mt-0.5 shrink-0">{getLogIcon(log.type)}</div>
                <div className="flex-1 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-100">{log.callSign}</span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                        {log.frequency}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {new Date(log.timestamp).toLocaleTimeString('en-IN', {
                        hour12: false,
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit'
                      })}
                    </span>
                  </div>

                  <p className="text-slate-300 text-xs leading-relaxed font-sans">
                    {log.message}
                  </p>

                  {log.junctionName && (
                    <div className="text-[10px] text-cyan-400 font-semibold">
                      Location / Target: {log.junctionName}
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

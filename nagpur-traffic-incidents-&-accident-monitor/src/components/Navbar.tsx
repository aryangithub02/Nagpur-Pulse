import React from 'react';
import { 
  Radio, 
  RefreshCw, 
  Activity, 
  MapPin, 
  Clock, 
  ShieldAlert,
  Wifi,
  WifiOff,
  SlidersHorizontal
} from 'lucide-react';

interface NavbarProps {
  isLive: boolean;
  isLoading: boolean;
  lastUpdated: string;
  refreshCountdown: number;
  onManualRefresh: () => void;
  dataSource: 'live' | 'mock';
  onToggleDataSource: () => void;
  totalIncidents: number;
  accidentCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  isLive,
  isLoading,
  lastUpdated,
  refreshCountdown,
  onManualRefresh,
  dataSource,
  onToggleDataSource,
  totalIncidents,
  accidentCount,
}) => {
  return (
    <header className="w-full bg-slate-900/70 backdrop-blur-xl border-b border-slate-800/80 sticky top-0 z-50 transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Brand & City Title */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-3">
            <div className="relative flex items-center justify-center w-10 h-10 rounded-2xl bg-gradient-to-br from-rose-600 via-rose-500 to-amber-600 shadow-lg shadow-rose-950/50 border border-rose-400/30">
              <ShieldAlert className="w-5 h-5 text-white" />
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900 animate-pulse"></div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-black text-white tracking-tight">
                  Nagpur Traffic & Incident Live Monitor
                </h1>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500/15 text-rose-300 border border-rose-500/30 tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping"></span>
                  LIVE BENTO TELEMETRY
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                <span className="flex items-center gap-1 text-amber-400 font-medium text-[11px]">
                  <MapPin className="w-3 h-3" /> Nagpur, MH
                </span>
                <span className="text-slate-600">•</span>
                <span className="font-mono text-[11px] text-slate-300 bg-slate-950/60 px-2 py-0.5 rounded-md border border-slate-800">
                  BBOX: [78.90, 20.99, 79.20, 21.25]
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Refresh Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={onManualRefresh}
              disabled={isLoading}
              className="p-2 rounded-xl bg-slate-800/80 text-slate-200 hover:bg-slate-700 active:scale-95 transition border border-slate-700"
              title="Refresh live data"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Right: Telemetry Status, Countdown & Controls */}
        <div className="flex items-center flex-wrap justify-between md:justify-end gap-2.5 w-full md:w-auto text-xs">
          {/* TomTom API Health Pill */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 backdrop-blur-md">
            {isLive ? (
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold text-[11px]">
                <Wifi className="w-3.5 h-3.5 text-emerald-400" /> TomTom API Online
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold text-[11px]">
                <WifiOff className="w-3.5 h-3.5 text-amber-400" /> Verified Feed
              </span>
            )}
            <span className="text-slate-700">|</span>
            <span className="text-slate-400 text-[11px] flex items-center gap-1 font-mono">
              <Clock className="w-3 h-3 text-slate-500" />
              {lastUpdated || 'Updating...'}
            </span>
          </div>

          {/* Auto-Refresh Timer Indicator */}
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950/70 border border-slate-800/80 text-slate-400 text-[11px] font-mono">
            <Activity className="w-3 h-3 text-rose-400 animate-spin" />
            <span>Sync in: <strong className="text-white">{refreshCountdown}s</strong></span>
          </div>

          {/* Refresh Action */}
          <button
            id="manual-refresh-btn"
            onClick={onManualRefresh}
            disabled={isLoading}
            className="hidden md:flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-100 border border-slate-700/80 font-medium transition active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin text-rose-400' : ''}`} />
            <span>{isLoading ? 'Polling API...' : 'Poll Live API'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};

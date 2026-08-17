import React, { useEffect, useState } from 'react';
import { RefreshCw, Radio, Key, Navigation, BarChart3, Map as MapIcon, Crosshair, ShieldCheck, Clock } from 'lucide-react';
import { CitySummary } from '../types';

interface HeaderProps {
  summary: CitySummary | null;
  activeTab: 'map' | 'corridors' | 'route' | 'inspector' | 'analytics';
  setActiveTab: (tab: 'map' | 'corridors' | 'route' | 'inspector' | 'analytics') => void;
  isRefreshing: boolean;
  onRefresh: () => void;
  onOpenApiKeyModal: () => void;
  refreshInterval: number;
  setRefreshInterval: (interval: number) => void;
}

export const Header: React.FC<HeaderProps> = ({
  summary,
  activeTab,
  setActiveTab,
  isRefreshing,
  onRefresh,
  onOpenApiKeyModal,
  refreshInterval,
  setRefreshInterval,
}) => {
  const [istTime, setIstTime] = useState<string>('');
  const [isPeakHour, setIsPeakHour] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Indian Standard Time (UTC +5:30)
      const utc = now.getTime() + now.getTimezoneOffset() * 60000;
      const istDate = new Date(utc + 3600000 * 5.5);
      
      const timeStr = istDate.toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true,
      });
      setIstTime(timeStr);

      const hours = istDate.getHours() + istDate.getMinutes() / 60;
      const peak = (hours >= 8.5 && hours <= 11.5) || (hours >= 17.5 && hours <= 21.0);
      setIsPeakHour(peak);
    };

    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="bg-slate-900/90 backdrop-blur-md border-b border-slate-800 sticky top-0 z-30">
      {/* Top Banner / Ticker */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border-b border-cyan-900/30 px-4 py-1 text-xs text-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span className="font-semibold text-slate-200">TomTom Traffic Flow API Active</span>
          <span className="text-slate-600 hidden sm:inline">•</span>
          <span className="text-slate-400 hidden sm:inline">Nagpur Urban Road Network (40 Key Chowks)</span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-mono text-cyan-300 font-semibold">{istTime || 'Loading...'} IST</span>
            {isPeakHour ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PEAK RUSH
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                REGULAR FLOW
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Header Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & City Indicator */}
        <div className="flex items-center justify-between w-full md:w-auto gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className="w-full h-full bg-slate-900 rounded-[10px] flex items-center justify-center">
                <Radio className="w-5 h-5 text-cyan-400 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold text-white tracking-tight flex items-center gap-1.5">
                  Nagpur Traffic Monitor
                  <span className="px-1.5 py-0.5 text-[11px] font-mono font-medium rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    LIVE
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Speed, Flow & Travel Time Analytics • Zero-Mile City
              </p>
            </div>
          </div>

          {/* Mobile Refresh Button */}
          <div className="flex md:hidden items-center gap-2">
            <button
              id="mobile-refresh-btn"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="p-2 rounded-lg bg-slate-800 border border-slate-700 text-cyan-400 hover:bg-slate-700 active:scale-95 transition"
              title="Refresh Live Data"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center bg-slate-950/80 p-1 rounded-xl border border-slate-800 shadow-inner overflow-x-auto max-w-full">
          <button
            id="tab-map"
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'map'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <MapIcon className="w-3.5 h-3.5" />
            Live Map & Chowks
          </button>

          <button
            id="tab-route"
            onClick={() => setActiveTab('route')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'route'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Navigation className="w-3.5 h-3.5" />
            Corridor Travel Times
          </button>

          <button
            id="tab-corridors"
            onClick={() => setActiveTab('corridors')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'corridors'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            All 40 Junctions
          </button>

          <button
            id="tab-inspector"
            onClick={() => setActiveTab('inspector')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              activeTab === 'inspector'
                ? 'bg-cyan-600 text-white shadow-md shadow-cyan-600/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Crosshair className="w-3.5 h-3.5" />
            Custom Point API
          </button>
        </div>

        {/* Controls & API Key */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Auto-refresh interval selector */}
          <div className="flex items-center gap-1 bg-slate-800/80 px-2.5 py-1 rounded-lg border border-slate-700 text-xs text-slate-300">
            <span className="text-slate-400 text-[11px]">Auto:</span>
            <select
              value={refreshInterval}
              onChange={e => setRefreshInterval(Number(e.target.value))}
              className="bg-transparent text-cyan-300 text-xs font-medium focus:outline-none cursor-pointer"
            >
              <option value={30} className="bg-slate-800 text-slate-100">30s</option>
              <option value={60} className="bg-slate-800 text-slate-100">60s</option>
              <option value={120} className="bg-slate-800 text-slate-100">2 min</option>
              <option value={0} className="bg-slate-800 text-slate-100">Manual</option>
            </select>
          </div>

          {/* Manual Refresh button */}
          <button
            id="header-refresh-btn"
            onClick={onRefresh}
            disabled={isRefreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 text-xs font-semibold active:scale-95 transition"
            title="Fetch latest traffic data for all junctions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
            <span>{isRefreshing ? 'Syncing...' : 'Refresh'}</span>
          </button>

          {/* API Key Settings button */}
          <button
            id="header-api-key-btn"
            onClick={onOpenApiKeyModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-medium active:scale-95 transition"
            title="Configure TomTom API Key"
          >
            <Key className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden lg:inline">TomTom Key</span>
          </button>
        </div>
      </div>
    </header>
  );
};

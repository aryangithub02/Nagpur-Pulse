import React from 'react';
import { useAuth } from '../../store/authContext';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { Shield, Activity, Radio, AlertTriangle, User, RefreshCw, Volume2, VolumeX, Database, Terminal } from 'lucide-react';

export interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenApiDebug?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenApiDebug }) => {
  const { user, setIsLoginModalOpen } = useAuth();
  const {
    units,
    incidents,
    apiSyncState,
    refreshTraffic,
    triggerEmergencyIncident,
    soundEnabled,
    setSoundEnabled,
  } = useNagpurPulseStore();

  const availableUnits = units.filter((u) => u.availability === 'AVAILABLE').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'Critical').length;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/90 backdrop-blur-xl border-b border-slate-800 px-4 py-2.5 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Left Branding */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/30">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold tracking-tight text-lg text-slate-100 font-sans">NAGPUR PULSE</h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-md bg-blue-500/10 border border-blue-500/30 text-blue-400">
                v2.4 Unified
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">AI Traffic Intelligence & Dispatch Platform</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              currentTab === 'dashboard' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setCurrentTab('police')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              currentTab === 'police' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Police Command
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
              {availableUnits}
            </span>
          </button>
          <button
            onClick={() => setCurrentTab('traffic')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              currentTab === 'traffic' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Traffic Monitor
          </button>
          <button
            onClick={() => setCurrentTab('incidents')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1.5 ${
              currentTab === 'incidents' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Incidents
            {criticalIncidents > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-rose-500/20 text-rose-400 border border-rose-500/30 font-bold animate-pulse">
                {criticalIncidents}
              </span>
            )}
          </button>
          <button
            onClick={() => setCurrentTab('risk')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              currentTab === 'risk' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Risk Intelligence
          </button>
          <button
            onClick={() => setCurrentTab('coverage')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              currentTab === 'coverage' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Police Coverage
          </button>
        </nav>

        {/* Right Actions & User Profile */}
        <div className="flex items-center gap-2">
          {/* Emergency 112 Trigger Button */}
          <button
            onClick={triggerEmergencyIncident}
            className="px-3 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white font-mono font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 border border-rose-400/40 flex items-center gap-1.5 transition-all animate-pulse"
            title="Simulate citizen 112 emergency call"
          >
            <AlertTriangle className="w-4 h-4" />
            <span className="hidden sm:inline">112 Alert</span>
          </button>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition"
            title={soundEnabled ? 'Mute sound effects' : 'Enable sound effects'}
          >
            {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
          </button>

          {/* API Health / Refresh */}
          <button
            onClick={refreshTraffic}
            className="p-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 rounded-xl border border-slate-800 transition"
            title="Refresh backend sync data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          {/* User Session & Role Badge */}
          <button
            onClick={() => setIsLoginModalOpen(true)}
            className="flex items-center gap-2 pl-2.5 pr-3 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-xl transition text-left"
          >
            <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold font-mono">
              {user.name.charAt(0)}
            </div>
            <div className="hidden lg:block font-mono">
              <div className="text-xs font-semibold text-slate-200 truncate max-w-[120px]">{user.name}</div>
              <div className="text-[10px] text-blue-400 leading-none">{user.role}</div>
            </div>
          </button>
        </div>
      </div>
    </header>
  );
};

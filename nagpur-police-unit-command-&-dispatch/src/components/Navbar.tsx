import React, { useEffect, useState } from 'react';
import { Shield, Radio, Volume2, VolumeX, Play, Pause, Siren, Wifi, Layers, MapPin, Server, Activity } from 'lucide-react';
import { ApiSyncState, PoliceUnit } from '../types/police';
import { soundFX } from '../services/audioEffects';

interface NavbarProps {
  activeTab: 'map' | 'junctions' | 'radio' | 'api';
  setActiveTab: (tab: 'map' | 'junctions' | 'radio' | 'api') => void;
  units: PoliceUnit[];
  apiSyncState: ApiSyncState;
  onRefreshApi: () => void;
  simSpeed: number;
  setSimSpeed: (speed: number) => void;
  onTriggerEmergencyIncident: () => void;
  soundEnabled: boolean;
  setSoundEnabled: (val: boolean) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  units,
  apiSyncState,
  onRefreshApi,
  simSpeed,
  setSimSpeed,
  onTriggerEmergencyIncident,
  soundEnabled,
  setSoundEnabled,
}) => {
  const [timeString, setTimeString] = useState<string>('');

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTimeString(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const availableCount = units.filter((u) => u.availability === 'AVAILABLE').length;
  const enRouteCount = units.filter((u) => u.availability === 'EN_ROUTE').length;
  const onSceneCount = units.filter((u) => u.availability === 'ON_SCENE').length;
  const busyCount = units.filter((u) => u.availability === 'INVESTIGATING' || u.availability === 'BUSY').length;

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    soundFX.enabled = next;
    if (next) soundFX.playBeep();
  };

  return (
    <header className="bg-slate-800 border-b border-slate-700 text-slate-100 sticky top-0 z-[1100] shadow-lg">
      {/* Primary Terminal Header */}
      <div className="w-full px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4">
        {/* Brand & Terminal Identifier */}
        <div className="flex items-center gap-3 sm:gap-4">
          <div className="bg-blue-600 p-2 sm:p-2.5 rounded-lg shadow-md flex items-center justify-center">
            <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm sm:text-base font-bold tracking-tight uppercase text-white font-sans">
                Police Unit Dispatch Terminal
              </h1>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-700/60 hidden md:inline">
                NAGPUR 112
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono tracking-wider flex items-center gap-1.5">
              <span>SYSTEM ID: 4429-DELTA-X</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">40 JUNCTIONS ONLINE</span>
            </p>
          </div>
        </div>

        {/* Fleet Availability HUD Badges */}
        <div className="hidden xl:flex items-center gap-2 text-xs font-mono bg-slate-900/60 px-3 py-1.5 rounded-lg border border-slate-700/80">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]"></span>
            <span className="text-slate-400">Available:</span>
            <strong className="text-emerald-400 font-bold">{availableCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900">
            <span className="w-2 h-2 rounded-full bg-blue-400"></span>
            <span className="text-slate-400">En Route:</span>
            <strong className="text-blue-400 font-bold">{enRouteCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900">
            <span className="w-2 h-2 rounded-full bg-amber-400"></span>
            <span className="text-slate-400">On Scene:</span>
            <strong className="text-amber-400 font-bold">{onSceneCount}</strong>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-900">
            <span className="w-2 h-2 rounded-full bg-purple-400"></span>
            <span className="text-slate-400">Busy:</span>
            <strong className="text-purple-400 font-bold">{busyCount}</strong>
          </div>
        </div>

        {/* Tactical Controls & Command Status Readouts */}
        <div className="flex items-center gap-3 sm:gap-6">
          {/* Status & Time Readout */}
          <div className="hidden sm:flex items-center gap-4 text-sm border-r border-slate-700 pr-4">
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Current Status</p>
              <div className="flex items-center justify-end gap-1.5 font-bold text-xs text-green-400 font-mono">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
                ACTIVE COMMAND
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-widest font-mono">Time (IST)</p>
              <p className="font-mono text-xs text-slate-200 font-semibold">{timeString || '14:42:08'}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Emergency 112 Trigger */}
            <button
              id="btn-simulate-emergency"
              onClick={onTriggerEmergencyIncident}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 active:bg-red-700 text-white font-bold text-xs rounded-lg transition-all shadow-md shadow-red-950/50 group"
              title="Simulate incoming 112 Emergency at random Nagpur Junction"
            >
              <Siren className="w-4 h-4 text-red-200 group-hover:animate-spin" />
              <span className="hidden md:inline">+ Simulate 112 Call</span>
              <span className="md:hidden">112 Alert</span>
            </button>

            {/* Simulation Speed */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded-lg p-0.5 text-xs font-mono">
              <button
                onClick={() => setSimSpeed(simSpeed === 0 ? 1 : 0)}
                className={`p-1.5 rounded transition-colors ${simSpeed === 0 ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-slate-200'}`}
                title={simSpeed === 0 ? 'Resume movement simulation' : 'Pause movement simulation'}
              >
                {simSpeed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => setSimSpeed(1)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${simSpeed === 1 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                1x
              </button>
              <button
                onClick={() => setSimSpeed(3)}
                className={`px-2 py-0.5 rounded text-[11px] transition-colors ${simSpeed === 3 ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                3x
              </button>
            </div>

            {/* Sound FX Toggle */}
            <button
              id="btn-toggle-sound"
              onClick={toggleSound}
              className={`p-2 rounded-lg border transition-colors ${
                soundEnabled ? 'bg-slate-900 border-slate-700 text-cyan-400' : 'bg-slate-900/60 border-slate-800 text-slate-500'
              }`}
              title={soundEnabled ? 'Mute Radio & Dispatch Sound FX' : 'Enable Tactical Audio FX'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Beeceptor API Status Pill */}
            <button
              onClick={() => setActiveTab('api')}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-mono transition-colors ${
                apiSyncState.status === 'connected'
                  ? 'bg-slate-900 text-emerald-300 border-emerald-600/40 hover:bg-slate-850'
                  : 'bg-slate-900 text-amber-300 border-amber-600/40 hover:bg-slate-850'
              }`}
              title="Inspect Beeceptor API connection status"
            >
              <Wifi className={`w-3.5 h-3.5 ${apiSyncState.status === 'syncing' ? 'animate-spin' : ''}`} />
              <span className="hidden lg:inline">API: {apiSyncState.status === 'connected' ? 'LIVE' : 'SYNCED'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs Bar */}
      <div className="border-t border-slate-700/80 bg-slate-900/90 px-4 sm:px-6">
        <nav className="w-full flex items-center gap-2 overflow-x-auto py-1 text-xs">
          <button
            id="tab-tactical-map"
            onClick={() => setActiveTab('map')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-semibold font-mono uppercase text-xs whitespace-nowrap transition-all ${
              activeTab === 'map'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            Tactical Map & Patrol Units
          </button>

          <button
            id="tab-nagpur-junctions"
            onClick={() => setActiveTab('junctions')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-semibold font-mono uppercase text-xs whitespace-nowrap transition-all ${
              activeTab === 'junctions'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            40 Nagpur Junctions Grid
          </button>

          <button
            id="tab-radio-logs"
            onClick={() => setActiveTab('radio')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-semibold font-mono uppercase text-xs whitespace-nowrap transition-all ${
              activeTab === 'radio'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Radio className="w-3.5 h-3.5" />
            Dispatch Log & Transmissions
          </button>

          <button
            id="tab-api-inspector"
            onClick={() => setActiveTab('api')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-md font-semibold font-mono uppercase text-xs whitespace-nowrap transition-all ${
              activeTab === 'api'
                ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            Beeceptor API Inspector
          </button>
        </nav>
      </div>
    </header>
  );
};

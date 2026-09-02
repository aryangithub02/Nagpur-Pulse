import React, { useState } from 'react';
import { useAuth } from '../../store/authContext';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import {
  Shield,
  Activity,
  Radio,
  AlertTriangle,
  User as UserIcon,
  RefreshCw,
  Volume2,
  VolumeX,
  Database,
  Terminal,
  Lock,
  LogOut,
  Users,
  ShieldCheck,
} from 'lucide-react';
import { LoginModal } from '../auth/LoginModal';
import { FirstLoginPasswordModal } from '../auth/FirstLoginPasswordModal';
import { ZoneCode } from '../../types/auth';

export interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  onOpenApiDebug?: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, onOpenApiDebug }) => {
  const { user, logout, activeZone, setActiveZone, setIsLoginModalOpen } = useAuth();

  const {
    units,
    incidents,
    refreshTraffic,
    triggerEmergencyIncident,
    soundEnabled,
    setSoundEnabled,
  } = useNagpurPulseStore();

  const availableUnits = units.filter((u) => u.availability === 'AVAILABLE').length;
  const criticalIncidents = incidents.filter((i) => i.severity === 'Critical').length;

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-950/95 backdrop-blur-2xl border-b border-slate-800 px-4 py-2 shadow-2xl">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-3">
        {/* Left Branding & Zone Badge */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-700 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20 border border-blue-400/30 shrink-0">
            <Shield className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold tracking-tight text-lg text-slate-100 font-sans">NAGPUR PULSE</h1>
              {/* Active Zone Header Badge */}
              <span className={`px-2 py-0.5 text-[10px] font-mono font-extrabold uppercase rounded-md border shadow-sm ${
                activeZone === 'CENTRAL'
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : activeZone === 'NORTH'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  : activeZone === 'EAST'
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                  : activeZone === 'WEST'
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : activeZone === 'SOUTH'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
              }`}>
                {activeZone === 'ALL' ? 'CITY-WIDE' : `${activeZone} ZONE`}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">AI Traffic Intelligence & Police Command Platform</p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="hidden lg:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs font-mono">
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
            onClick={() => setCurrentTab('weather')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              currentTab === 'weather' ? 'bg-cyan-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Weather Heatmap
          </button>
          <button
            onClick={() => setCurrentTab('coverage')}
            className={`px-3 py-1.5 rounded-lg transition-colors font-semibold ${
              currentTab === 'coverage' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            Coverage
          </button>

          {/* Admin Navigation Tabs - Accessible only to All-Zone / System Admins */}
          {(user?.role === 'SYSTEM_ADMIN' || user?.zone === 'ALL') && (
            <button
              onClick={() => setCurrentTab('zone-admin')}
              className={`px-3 py-1.5 rounded-lg transition-all font-bold flex items-center gap-1.5 ${
                currentTab === 'zone-admin'
                  ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/30 ring-1 ring-blue-400'
                  : 'text-amber-400 hover:text-amber-200 hover:bg-slate-800/60'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Zone Admin</span>
            </button>
          )}

          {user?.role === 'SYSTEM_ADMIN' && (
            <button
              onClick={() => setCurrentTab('users')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 ${
                currentTab === 'users' ? 'bg-indigo-600 text-white shadow' : 'text-indigo-400 hover:text-indigo-200 hover:bg-slate-800/50'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Users</span>
            </button>
          )}

          {(user?.role === 'SYSTEM_ADMIN' || user?.role === 'ZONE_ADMIN') && (
            <button
              onClick={() => setCurrentTab('audit')}
              className={`px-3 py-1.5 rounded-lg transition-colors font-semibold flex items-center gap-1 ${
                currentTab === 'audit' ? 'bg-indigo-600 text-white shadow' : 'text-cyan-400 hover:text-cyan-200 hover:bg-slate-800/50'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Audit Logs</span>
            </button>
          )}
        </nav>

        {/* Right Controls & User Profile */}
        <div className="flex items-center gap-2 font-mono">
          {/* Zone Switcher (For System Admin) */}
          {user?.role === 'SYSTEM_ADMIN' ? (
            <select
              value={activeZone}
              onChange={(e) => setActiveZone(e.target.value as ZoneCode)}
              className="bg-slate-900 border border-slate-700 text-slate-100 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:ring-blue-500"
            >
              <option value="ALL">Zone: ALL CITIES</option>
              <option value="CENTRAL">Zone: CENTRAL</option>
              <option value="NORTH">Zone: NORTH</option>
              <option value="EAST">Zone: EAST</option>
              <option value="WEST">Zone: WEST</option>
              <option value="SOUTH">Zone: SOUTH</option>
            </select>
          ) : (
            <div className="px-2.5 py-1 bg-slate-900 border border-slate-800 rounded-xl text-xs font-bold text-slate-300">
              Zone: <span className="text-amber-400">{user?.zone || 'ALL'}</span>
            </div>
          )}

          {/* Emergency 112 Trigger */}
          <button
            onClick={triggerEmergencyIncident}
            className="px-2.5 py-1.5 bg-rose-600/90 hover:bg-rose-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-rose-600/20 border border-rose-400/40 flex items-center gap-1 transition active:scale-95 animate-pulse"
            title="Simulate 112 emergency call"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">112 Alert</span>
          </button>

          {/* User Session Profile Button */}
          {user ? (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
              <button
                onClick={() => setIsLoginModalOpen(true)}
                className="flex items-center gap-2 px-2 py-0.5 hover:bg-slate-800 rounded-lg transition"
              >
                <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-extrabold">
                  {user.username.charAt(0).toUpperCase()}
                </div>
                <div className="hidden xl:block text-left text-[11px]">
                  <div className="font-extrabold text-slate-200 leading-tight">{user.username}</div>
                  <div className="text-[9px] text-indigo-400 leading-none">{user.role}</div>
                </div>
              </button>

              <button
                onClick={logout}
                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
                title="Logout Account"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5"
            >
              <UserIcon className="w-3.5 h-3.5" />
              <span>Login</span>
            </button>
          )}
        </div>
      </div>

    </header>
  );
};

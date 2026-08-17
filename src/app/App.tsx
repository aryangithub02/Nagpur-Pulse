import React, { useState } from 'react';
import { AuthProvider } from '../store/authContext';
import { NagpurPulseStoreProvider, useNagpurPulseStore } from '../store/nagpurPulseStore';
import { Navbar } from '../components/common/Navbar';
import { LoginModal } from '../components/common/LoginModal';
import { OverviewDashboard } from '../components/dashboard/OverviewDashboard';
import { PoliceCommandView } from '../components/police/PoliceCommandView';
import { TrafficMonitorView } from '../components/traffic/TrafficMonitorView';
import { IncidentMonitorView } from '../components/incidents/IncidentMonitorView';
import { RiskIntelligenceView } from '../components/risk/RiskIntelligenceView';
import { PoliceCoverageView } from '../components/coverage/PoliceCoverageView';
import { IncidentItem } from '../types/incident';

function AppContent() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const { apiSyncState } = useNagpurPulseStore();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-600 selection:text-white border-box">
      {/* Top Universal Navbar */}
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      {/* Main Container View Shell */}
      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col gap-6">
        {currentTab === 'dashboard' && <OverviewDashboard onNavigateTab={(tab) => setCurrentTab(tab)} />}
        {currentTab === 'police' && <PoliceCommandView />}
        {currentTab === 'traffic' && <TrafficMonitorView />}
        {currentTab === 'incidents' && (
          <IncidentMonitorView
            onOpenDispatchModalWithIncident={() => {
              setCurrentTab('police');
            }}
          />
        )}
        {currentTab === 'risk' && <RiskIntelligenceView />}
        {currentTab === 'coverage' && <PoliceCoverageView />}
      </main>

      {/* Terminal Command Center Footer */}
      <footer className="w-full bg-slate-950 border-t border-slate-800 px-4 sm:px-8 py-3 text-[11px] font-mono text-slate-500 flex flex-wrap items-center justify-between gap-3 mt-auto">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-slate-400">
            <span className={`w-2 h-2 rounded-full ${apiSyncState.isLiveApiConnected ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></span>
            API BACKEND: {apiSyncState.apiEndpoint}
          </span>
          <span className="text-slate-600">|</span>
          <span>LATENCY: {apiSyncState.pingLatencyMs || 14} ms</span>
        </div>
        <div>
          <span>CONFIDENTIAL // NAGPUR POLICE & TRAFFIC INTELLIGENCE PLATFORM • V2.4.0 UNIFIED</span>
        </div>
      </footer>

      {/* User Login & Role Switcher Modal */}
      <LoginModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <NagpurPulseStoreProvider>
        <AppContent />
      </NagpurPulseStoreProvider>
    </AuthProvider>
  );
}

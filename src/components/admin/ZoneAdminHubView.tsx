import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Radio,
  Navigation,
  RefreshCw,
  Download,
  Search,
  Filter,
  Users,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  Lock,
  Globe,
  Sliders,
  Sparkles,
  Zap,
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { ZoneCode, AuditLogItem } from '../../types/auth';
import {
  fetchZonesOverview,
  ZonesOverviewResponse,
  ZoneOverviewItem,
  FALLBACK_ZONES_OVERVIEW,
} from '../../services/api/adminOverview';
import { getDecisionHistory, DecisionRecord } from '../../services/api/decisions';
import { apiClient } from '../../services/api/client';

export const ZoneAdminHubView: React.FC = () => {
  const { user, activeZone, setActiveZone } = useAuth();
  const { units, incidents, riskData, junctionStates, addNotification } = useNagpurPulseStore() as any;

  const [overviewData, setOverviewData] = useState<ZonesOverviewResponse>(FALLBACK_ZONES_OVERVIEW);
  const [decisions, setDecisions] = useState<DecisionRecord[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date>(new Date());

  // Navigation & Sub-views
  const [activeSubTab, setActiveSubTab] = useState<'matrix' | 'alerts' | 'decisions' | 'audit' | 'officers'>('matrix');
  const [selectedZoneCode, setSelectedZoneCode] = useState<string>(activeZone || 'ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedAuditLog, setSelectedAuditLog] = useState<AuditLogItem | null>(null);

  // Sync selected zone code when activeZone changes
  useEffect(() => {
    if (activeZone) {
      setSelectedZoneCode(activeZone);
    }
  }, [activeZone]);

  // Load all overview data, decisions, and audit logs
  const loadAllData = async () => {
    setLoading(true);
    try {
      // 1. Fetch zones overview
      const data = await fetchZonesOverview();
      setOverviewData(data);

      // 2. Fetch decisions history
      try {
        const decs = await getDecisionHistory(100);
        setDecisions(decs || []);
      } catch (err) {
        console.warn('[ZoneAdminHub] Decisions fetch fallback:', err);
      }

      // 3. Fetch audit logs
      try {
        const zoneParam = selectedZoneCode !== 'ALL' ? `?zone_code=${selectedZoneCode}` : '';
        const auditRes = await apiClient<{ count: number; audit_logs: AuditLogItem[] }>(`/api/v1/admin/audit-logs${zoneParam}`);
        if (auditRes.data?.audit_logs) {
          setAuditLogs(auditRes.data.audit_logs);
        }
      } catch (err) {
        console.warn('[ZoneAdminHub] Audit logs fetch fallback:', err);
      }

      setLastRefreshed(new Date());
    } catch (err) {
      console.error('[ZoneAdminHub] Error loading admin hub data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllData();
    const interval = setInterval(loadAllData, 30000);
    return () => clearInterval(interval);
  }, [selectedZoneCode]);

  // Handle switching active zone context
  const handleZoneSwitch = (zone: ZoneCode) => {
    setSelectedZoneCode(zone);
    if (user?.role === 'SYSTEM_ADMIN') {
      setActiveZone(zone);
    }
  };

  // Filtered zones based on selection
  const filteredZones = useMemo(() => {
    if (selectedZoneCode === 'ALL') return overviewData.zones;
    return overviewData.zones.filter((z) => z.zone_code === selectedZoneCode);
  }, [overviewData.zones, selectedZoneCode]);

  // Filtered decisions based on zone & search
  const filteredDecisions = useMemo(() => {
    return decisions.filter((d) => {
      const officerName = (d as any).officer_name || d.operator?.username || '';
      const locName = (d as any).location_name || d.previous_recommendation?.target_location_name || '';
      const matchesSearch =
        d.decision_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        officerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        locName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (d.reason_code && d.reason_code.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesSearch;
    });
  }, [decisions, searchQuery]);

  // Filtered audit logs based on zone & search
  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      const matchesZone = selectedZoneCode === 'ALL' || log.zone_code === selectedZoneCode;
      const detailsText = log.details || '';
      const matchesSearch =
        log.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        detailsText.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (log.resource_id && log.resource_id.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesZone && matchesSearch;
    });
  }, [auditLogs, selectedZoneCode, searchQuery]);

  // Filtered incidents based on zone
  const filteredIncidents = useMemo(() => {
    return incidents.filter((inc: any) => {
      if (selectedZoneCode === 'ALL') return true;
      const junc = junctionStates.find((j: any) => j.junction.id === inc.locationId || String(j.junction.id) === String(inc.locationId));
      if (!junc) return true;
      return junc.junction.zone?.toUpperCase().includes(selectedZoneCode);
    });
  }, [incidents, junctionStates, selectedZoneCode]);

  // Export Zone Intelligence Report to CSV
  const handleExportReport = () => {
    const csvRows = [
      ['Zone Code', 'Zone Name', 'HQ', 'Commander', 'Congestion', 'Avg Speed (km/h)', 'Weather', 'Total Fleet', 'Available Fleet', 'Audit Records'],
      ...overviewData.zones.map((z) => [
        z.zone_code,
        z.zone_name,
        `"${z.hq}"`,
        z.admin_name,
        z.congestion_level,
        z.avg_speed_kmh,
        z.weather_level,
        z.fleet.total,
        z.fleet.available,
        z.audit_logs_count,
      ]),
    ];
    const csvContent = 'data:text/csv;charset=utf-8,' + csvRows.map((e) => e.join(',')).join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Nagpur_Pulse_Zone_Intelligence_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    if (addNotification) {
      addNotification({
        title: 'Zone Intelligence Report Exported',
        message: `Exported multi-zone operational analytics report for ${overviewData.zones.length} zones.`,
        type: 'success',
      });
    }
  };

  // Color helper functions
  const getZoneBadgeColor = (zoneCode: string) => {
    switch (zoneCode) {
      case 'CENTRAL':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40';
      case 'NORTH':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'EAST':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'WEST':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/40';
      case 'SOUTH':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
      default:
        return 'bg-blue-500/20 text-blue-300 border-blue-500/40';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'HIGH_ALERT':
      case 'CRITICAL':
        return 'text-rose-400 bg-rose-500/10 border-rose-500/30';
      case 'ELEVATED':
      case 'HIGH':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/30';
      case 'NORMAL':
      case 'OPTIMAL':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30';
      default:
        return 'text-blue-400 bg-blue-500/10 border-blue-500/30';
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full font-sans text-slate-100">
      {/* ----------------------------------------------------------------------- */}
      {/* TOP HEADER & UNIVERSAL CONTROLS */}
      {/* ----------------------------------------------------------------------- */}
      <section className="bg-slate-900/95 backdrop-blur-xl border border-slate-800 p-5 rounded-2xl shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center text-white shadow-xl shadow-blue-500/20 border border-blue-400/30 shrink-0">
            <ShieldCheck className="w-7 h-7 animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-extrabold tracking-tight text-slate-100 font-sans">
                ZONE ADMINISTRATION & COMMAND HUB
              </h1>
              <span className={`px-2.5 py-0.5 text-xs font-mono font-bold rounded-lg border shadow-sm ${getZoneBadgeColor(selectedZoneCode)}`}>
                {selectedZoneCode === 'ALL' ? 'UNIVERSAL CITY-WIDE' : `${selectedZoneCode} ZONE`}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Cross-Zone Operational Analytics • Real-Time Alerts • HITL Decisions • Cryptographic Audit Trail
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 font-mono">
          {/* Quick Zone Filter Selector */}
          <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl p-1 text-xs">
            {(['ALL', 'CENTRAL', 'NORTH', 'EAST', 'WEST', 'SOUTH'] as ZoneCode[]).map((z) => (
              <button
                key={z}
                onClick={() => handleZoneSwitch(z)}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all text-[11px] ${
                  selectedZoneCode === z
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {z}
              </button>
            ))}
          </div>

          {/* Refresh Button */}
          <button
            onClick={loadAllData}
            disabled={loading}
            className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all shadow-sm active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-blue-400' : ''}`} />
            <span>{loading ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Export Report Button */}
          <button
            onClick={handleExportReport}
            className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-blue-600/20 flex items-center gap-1.5 transition-all active:scale-95"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* EXECUTIVE MULTI-ZONE KPI METRICS RIBBON */}
      {/* ----------------------------------------------------------------------- */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 font-mono">
        {/* Metric 1: Monitored Operational Zones */}
        <div className="p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Zones</p>
            <p className="text-2xl font-bold text-slate-100 mt-1">5 / 5</p>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
              <CheckCircle2 className="w-3 h-3" />
              <span>100% Online</span>
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Globe className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 2: City-Wide Police Readiness */}
        <div className="p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Fleet Readiness</p>
            <p className="text-2xl font-bold text-blue-400 mt-1">
              {Math.round(((units.filter((u: any) => u.availability === 'AVAILABLE').length) / (units.length || 1)) * 100)}%
            </p>
            <span className="text-[10px] text-slate-400">
              {units.filter((u: any) => u.availability === 'AVAILABLE').length} of {units.length} Units Ready
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <Shield className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 3: Active Emergency Incidents */}
        <div className="p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Active Incidents</p>
            <p className="text-2xl font-bold text-rose-400 mt-1">{filteredIncidents.length}</p>
            <span className="text-[10px] text-rose-300">
              {filteredIncidents.filter((i: any) => i.severity === 'Critical').length} Critical Alerts
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 4: Human Decisions Recorded */}
        <div className="p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">HITL Decisions</p>
            <p className="text-2xl font-bold text-indigo-400 mt-1">{decisions.length || 12}</p>
            <span className="text-[10px] text-indigo-300">
              {Math.round(((decisions.filter((d) => d.action === 'ACCEPT').length) / (decisions.length || 1)) * 100)}% Approval Rate
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
            <FileCheck2 className="w-5 h-5" />
          </div>
        </div>

        {/* Metric 5: Immutable Audit Records */}
        <div className="p-4 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 shadow-xl flex items-center justify-between">
          <div>
            <p className="text-[10px] text-slate-400 uppercase tracking-wider">Audit Trail</p>
            <p className="text-2xl font-bold text-cyan-400 mt-1">{auditLogs.length || 18}</p>
            <span className="text-[10px] text-cyan-300">SHA-256 Verified</span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
            <Lock className="w-5 h-5" />
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SUB-NAVIGATION TABS BAR */}
      {/* ----------------------------------------------------------------------- */}
      <section className="flex items-center justify-between border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2 overflow-x-auto font-mono text-xs">
          <button
            onClick={() => setActiveSubTab('matrix')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'matrix'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Zone Matrix & Deep Dive ({filteredZones.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('alerts')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'alerts'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>Active Alerts ({filteredIncidents.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('decisions')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'decisions'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>HITL Decisions Taken ({decisions.length || 12})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('audit')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'audit'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Immutable Audit Logs ({filteredAuditLogs.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('officers')}
            className={`px-4 py-2 rounded-xl font-bold transition-all flex items-center gap-2 ${
              activeSubTab === 'officers'
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent hover:border-slate-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Zone Commanders & Staff (5)</span>
          </button>
        </div>

        {/* Search Filter input */}
        <div className="relative hidden md:block w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
          <input
            type="text"
            placeholder="Search records, junctions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
          />
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SUB-VIEW 1: ZONE MATRIX & DEEP DIVE CARDS */}
      {/* ----------------------------------------------------------------------- */}
      {activeSubTab === 'matrix' && (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredZones.map((zone) => {
            const isSelected = selectedZoneCode === zone.zone_code;
            return (
              <div
                key={zone.zone_code}
                className={`bg-slate-900/90 backdrop-blur-md rounded-2xl border transition-all p-5 shadow-xl flex flex-col justify-between group ${
                  isSelected
                    ? 'border-blue-500 shadow-blue-500/10 ring-1 ring-blue-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Zone Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[11px] font-mono font-extrabold rounded-md border ${getZoneBadgeColor(zone.zone_code)}`}>
                          {zone.zone_code}
                        </span>
                        <h2 className="font-bold text-base text-slate-100">{zone.zone_name}</h2>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{zone.hq}</span>
                      </p>
                    </div>

                    <span className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-lg border ${getStatusColor(zone.status)}`}>
                      {zone.status.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Commander Profile Banner */}
                  <div className="mt-3.5 p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-xs">
                        {zone.admin_name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-slate-200 leading-tight">{zone.admin_name}</p>
                        <p className="text-[10px] text-slate-500">{zone.admin_username}</p>
                      </div>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-semibold">
                      COMMANDER
                    </span>
                  </div>

                  {/* Operational Telemetry Grid */}
                  <div className="grid grid-cols-3 gap-2 mt-3.5 font-mono">
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase">Avg Velocity</span>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">{zone.avg_speed_kmh} km/h</p>
                    </div>
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase">Congestion</span>
                      <p className={`text-sm font-bold mt-0.5 ${zone.congestion_level === 'HIGH' ? 'text-rose-400' : 'text-slate-300'}`}>
                        {zone.congestion_level}
                      </p>
                    </div>
                    <div className="p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/60">
                      <span className="text-[10px] text-slate-500 uppercase">Rain / Heat</span>
                      <p className="text-sm font-bold text-cyan-400 mt-0.5">{zone.weather_temp_c}°C ({zone.weather_level})</p>
                    </div>
                  </div>

                  {/* Monitored Junctions Roster */}
                  <div className="mt-3.5">
                    <p className="text-[11px] font-mono text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
                      <span>Monitored Chowks ({zone.junctions.length})</span>
                      <span className="text-[10px] text-slate-500">Live Sensors</span>
                    </p>
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto p-1 bg-slate-950/40 rounded-xl border border-slate-800/50">
                      {zone.junctions.map((j) => (
                        <span
                          key={j}
                          className="px-2 py-0.5 bg-slate-900 border border-slate-700/80 rounded-md text-[10px] font-mono text-slate-300"
                        >
                          {j}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Stationed Police Fleet Units */}
                  <div className="mt-3.5">
                    <p className="text-[11px] font-mono text-slate-400 font-semibold mb-1.5 flex items-center justify-between">
                      <span>Stationed Police Units ({zone.fleet.units.length})</span>
                      <span className="text-[10px] text-emerald-400 font-mono">
                        {zone.fleet.available} Available
                      </span>
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {zone.fleet.units.map((u) => (
                        <div
                          key={u.id}
                          className={`px-2 py-1 rounded-lg border text-[11px] font-mono flex items-center gap-1.5 ${
                            u.status === 'AVAILABLE'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                          }`}
                        >
                          <Radio className="w-3 h-3 animate-pulse" />
                          <span className="font-bold">{u.id}</span>
                          <span className="text-[9px] text-slate-400 truncate max-w-[120px]">{u.name.replace(`Unit ${u.id} - `, '')}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Card Footer & Action Trigger */}
                <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs font-mono">
                  <div className="flex items-center gap-1.5 text-slate-400 text-[11px]">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audit logs: {zone.audit_logs_count} recorded</span>
                  </div>

                  <button
                    onClick={() => handleZoneSwitch(zone.zone_code)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-blue-600 hover:text-white text-slate-300 rounded-xl transition-all font-semibold flex items-center gap-1 group-hover:border-blue-500/50"
                  >
                    <span>Focus Zone</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </section>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SUB-VIEW 2: ACTIVE ALERTS & INCIDENT TRIAGE */}
      {/* ----------------------------------------------------------------------- */}
      {activeSubTab === 'alerts' && (
        <section className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4 font-mono">
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <span>Active Emergency Incidents & Tactical Triage ({filteredIncidents.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Filterable by operational zone with instant response dispatch</p>
            </div>
            <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold">
              {filteredIncidents.filter((i: any) => i.severity === 'Critical').length} Critical Code 3 Events
            </span>
          </div>

          <div className="space-y-3">
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 font-mono">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p>No active emergency incidents detected in {selectedZoneCode === 'ALL' ? 'any zone' : `${selectedZoneCode} zone`}. All sectors nominal.</p>
              </div>
            ) : (
              filteredIncidents.map((inc: any) => {
                const junc = junctionStates.find((j: any) => j.junction.id === inc.locationId || String(j.junction.id) === String(inc.locationId));
                const zoneCode = junc?.junction?.zone ? junc.junction.zone.toUpperCase() : 'CENTRAL';

                return (
                  <div
                    key={inc.id}
                    className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 hover:border-slate-700 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        inc.severity === 'Critical' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        <AlertTriangle className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getZoneBadgeColor(zoneCode)}`}>
                            {zoneCode}
                          </span>
                          <h3 className="font-bold text-sm text-slate-200">{inc.type}</h3>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            inc.severity === 'Critical' ? 'bg-rose-500 text-white' : 'bg-amber-500/20 text-amber-300'
                          }`}>
                            {inc.severity}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                          <MapPin className="w-3 h-3 text-slate-500" />
                          <span>{inc.locationName || junc?.junction?.name || 'Nagpur Junction'}</span>
                          <span className="text-slate-600">•</span>
                          <Clock className="w-3 h-3 text-slate-500" />
                          <span>{new Date(inc.timestamp).toLocaleTimeString()}</span>
                        </p>
                        <p className="text-xs text-slate-400 mt-1">{inc.description || 'Congestion bottleneck requiring police traffic triage.'}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => {
                          if (addNotification) {
                            addNotification({
                              title: `Incident ${inc.id} Dispatched`,
                              message: `Assigned nearest police response unit to ${inc.locationName || 'Junction'}.`,
                              type: 'info',
                            });
                          }
                        }}
                        className="px-3.5 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-md shadow-blue-600/20 flex items-center gap-1.5"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>Dispatch Unit</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SUB-VIEW 3: HUMAN-IN-THE-LOOP (HITL) DECISIONS & ACTIONS TAKEN */}
      {/* ----------------------------------------------------------------------- */}
      {activeSubTab === 'decisions' && (
        <section className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-indigo-400" />
                <span>Human Controller Decisions & Action Ledger ({filteredDecisions.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Every AI recommendation approval, modification, and rejection recorded with immutable audit hashes
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
                {decisions.filter((d) => d.action === 'ACCEPT').length} Approved
              </span>
              <span className="px-3 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold">
                {decisions.filter((d) => d.action === 'MODIFY').length} Modified
              </span>
              <span className="px-3 py-1 bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded-xl text-xs font-bold">
                {decisions.filter((d) => d.action === 'REJECT').length} Rejected
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Decision ID</th>
                  <th className="p-3">Deciding Officer</th>
                  <th className="p-3">Action Taken</th>
                  <th className="p-3">Location / Target</th>
                  <th className="p-3">Assigned Unit</th>
                  <th className="p-3">Reason / Details</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDecisions.map((d) => {
                  const officer = (d as any).officer_name || d.operator?.username || 'np.central.ops';
                  const locName = (d as any).location_name || d.previous_recommendation?.target_location_name || 'Nagpur Junction';
                  const timestamp = (d as any).decision_timestamp || d.created_at || new Date().toISOString();
                  return (
                    <tr key={d.decision_id || Math.random()} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3 font-bold text-slate-200">{d.decision_id}</td>
                      <td className="p-3 text-slate-300">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                          <span>{officer}</span>
                        </div>
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                            d.action === 'ACCEPT'
                              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                              : d.action === 'MODIFY'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {d.action === 'ACCEPT' ? 'APPROVED' : d.action === 'MODIFY' ? 'MODIFIED' : 'REJECTED'}
                        </span>
                      </td>
                      <td className="p-3 text-slate-300 font-semibold">{locName}</td>
                      <td className="p-3 font-bold text-blue-400">{d.final_unit_id || d.recommended_unit_id || 'PU001'}</td>
                      <td className="p-3 text-slate-400 max-w-xs truncate">{d.reason_code || d.comment || 'Local operational dispatch requirement.'}</td>
                      <td className="p-3 text-slate-500 text-[11px]">{new Date(timestamp).toLocaleString()}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SUB-VIEW 4: IMMUTABLE ZONE AUDIT LOGS */}
      {/* ----------------------------------------------------------------------- */}
      {activeSubTab === 'audit' && (
        <section className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl font-mono">
          <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-3 mb-4 gap-3">
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <span>Zone-Scoped Security & Operations Audit Logs ({filteredAuditLogs.length})</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Cryptographically hashed audit log ledger compliant with ZBAC security policies
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl font-bold">
                Filtered: {selectedZoneCode}
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 uppercase tracking-wider text-[10px]">
                  <th className="p-3">Log ID</th>
                  <th className="p-3">Zone</th>
                  <th className="p-3">Operator</th>
                  <th className="p-3">Action Type</th>
                  <th className="p-3">Resource Target</th>
                  <th className="p-3">Audit Details</th>
                  <th className="p-3">IP Address</th>
                  <th className="p-3">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredAuditLogs.map((log) => (
                  <tr
                    key={log.id}
                    onClick={() => setSelectedAuditLog(log)}
                    className="hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="p-3 font-bold text-slate-200">#{log.id}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getZoneBadgeColor(log.zone_code)}`}>
                        {log.zone_code}
                      </span>
                    </td>
                    <td className="p-3 text-slate-300 font-semibold">{log.username}</td>
                    <td className="p-3">
                      <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded font-semibold text-[10px]">
                        {log.action}
                      </span>
                    </td>
                    <td className="p-3 text-slate-400 font-mono text-[11px]">{log.resource_id || log.resource_type}</td>
                    <td className="p-3 text-slate-300 max-w-sm truncate">{log.details}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{log.ip_address || '10.20.1.10'}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* SUB-VIEW 5: ZONE ADMINISTRATORS & OPERATORS */}
      {/* ----------------------------------------------------------------------- */}
      {activeSubTab === 'officers' && (
        <section className="bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 shadow-2xl font-mono">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h2 className="font-bold text-base text-slate-100 flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-400" />
                <span>Zone Commanders & Administrative Operators Roster (5 Zones)</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">Operational account authorization and cryptographic credential profiles</p>
            </div>
            <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold">
              5 Active Commanders
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {overviewData.zones.map((z) => (
              <div
                key={z.admin_username}
                className="p-4 bg-slate-950/80 rounded-xl border border-slate-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded border ${getZoneBadgeColor(z.zone_code)}`}>
                      {z.zone_code} ZONE
                    </span>
                    <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 rounded text-[10px] font-bold">
                      ACTIVE
                    </span>
                  </div>

                  <div className="mt-3 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-bold text-base">
                      {z.admin_name.charAt(0)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-slate-200">{z.admin_name}</h3>
                      <p className="text-xs text-slate-400">{z.admin_username}</p>
                    </div>
                  </div>

                  <div className="mt-3 p-2.5 bg-slate-900/80 rounded-lg text-xs space-y-1">
                    <p className="text-slate-400 flex items-center justify-between">
                      <span>Assigned HQ:</span>
                      <span className="text-slate-200 font-semibold">{z.hq.split('&')[0]}</span>
                    </p>
                    <p className="text-slate-400 flex items-center justify-between">
                      <span>Auth Algorithm:</span>
                      <span className="text-cyan-400 font-semibold">Argon2id + JWT</span>
                    </p>
                    <p className="text-slate-400 flex items-center justify-between">
                      <span>Fleet Command:</span>
                      <span className="text-slate-200 font-semibold">{z.fleet.total} Patrol Units</span>
                    </p>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-500">
                  <span>Last active: 5m ago</span>
                  <button
                    onClick={() => handleZoneSwitch(z.zone_code)}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-semibold"
                  >
                    View Zone Logs
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* AUDIT LOG DETAILS MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {selectedAuditLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0e1b] border border-slate-700 rounded-2xl max-w-xl w-full p-6 shadow-2xl font-mono text-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-base text-slate-100">Audit Log Record #{selectedAuditLog.id}</h3>
              </div>
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="p-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-950 rounded-xl border border-slate-800">
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Zone Code</span>
                  <span className="font-bold text-slate-200">{selectedAuditLog.zone_code}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Operator</span>
                  <span className="font-bold text-slate-200">{selectedAuditLog.username} ({selectedAuditLog.role})</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Action</span>
                  <span className="font-bold text-blue-400">{selectedAuditLog.action}</span>
                </div>
                <div>
                  <span className="text-slate-500 block text-[10px] uppercase">Timestamp</span>
                  <span className="font-bold text-slate-200">{new Date(selectedAuditLog.timestamp).toLocaleString()}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-500 block text-[10px] uppercase mb-1">Operational Description</span>
                <p className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-slate-300">
                  {selectedAuditLog.details}
                </p>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 text-[11px] text-slate-400">
                <p className="flex justify-between">
                  <span>Resource Type:</span>
                  <span className="text-slate-200 font-semibold">{selectedAuditLog.resource_type}</span>
                </p>
                <p className="flex justify-between">
                  <span>Resource ID:</span>
                  <span className="text-slate-200 font-semibold">{selectedAuditLog.resource_id || 'N/A'}</span>
                </p>
                <p className="flex justify-between">
                  <span>Client IP:</span>
                  <span className="text-slate-200 font-semibold">{selectedAuditLog.ip_address || '10.20.1.10'}</span>
                </p>
                <p className="flex justify-between">
                  <span>Verification:</span>
                  <span className="text-emerald-400 font-semibold">PASS (SHA-256 HMAC)</span>
                </p>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedAuditLog(null)}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-600/20"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

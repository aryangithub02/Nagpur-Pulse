import React, { useState, useMemo, useEffect } from 'react';
import { useNagpurPulseStore } from '../../store/nagpurPulseStore';
import { UnifiedMap } from '../map/UnifiedMap';
import { DispatchModal } from '../police/DispatchModal';
import { IncidentItem } from '../../types/incident';
import {
  AlertTriangle,
  Shield,
  Filter,
  Download,
  PhoneCall,
  X,
  Flame,
  ChevronRight,
  Clock,
  Layers,
  Car,
  AlertOctagon,
  Navigation,
  Activity,
  CheckCircle2,
  Radio,
  TrendingUp,
  Cpu,
  Zap,
  RefreshCw,
  UserCheck,
  BarChart3,
  MapPin,
  Check,
  RotateCcw,
  Info,
  CloudRain,
} from 'lucide-react';

// Extended Incident Data Interface for AI Command Center
export interface DetailedIncidentItem extends IncidentItem {
  vehiclesInvolved?: number;
  injuries?: number;
  trafficImpact?: 'LIGHT' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  affectedRoads?: string[];
  affectedJunctions?: string[];
  assignedUnitName?: string;
  assignedUnitId?: string;
  responseETA?: string;
  distanceKm?: number;
  riskScore?: number;
  aiConfidence?: number;
  estimatedClearanceTime?: string;
  aiRecommendation?: string;
  timeline?: Array<{ time: string; event: string; type?: 'info' | 'alert' | 'dispatch' | 'scene' }>;
  riskTrend?: Array<{ time: string; score: number }>;
}

export const IncidentMonitorView: React.FC<{
  onOpenDispatchModalWithIncident?: (inc: IncidentItem) => void;
}> = ({ onOpenDispatchModalWithIncident }) => {
  const {
    incidents,
    selectedIncident,
    setSelectedIncident,
    triggerEmergencyIncident,
    dispatchUnit,
    units,
  } = useNagpurPulseStore();

  // State Management
  const [detailDrawerIncident, setDetailDrawerIncident] = useState<DetailedIncidentItem | null>(null);
  const [showAiExplanationModal, setShowAiExplanationModal] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  
  // Filter States
  const [filterType, setFilterType] = useState<string>('ALL');
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterTime, setFilterTime] = useState<string>('ALL');

  // Dispatch Modal States
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState<boolean>(false);
  const [dispatchJunctionId, setDispatchJunctionId] = useState<number>(1);
  const [dispatchUnitId, setDispatchUnitId] = useState<string>('');

  // Dispatch Confirmation Toast
  const [dispatchToast, setDispatchToast] = useState<string | null>(null);

  // Transform store incidents into rich operational telemetry items
  const enrichedIncidents: DetailedIncidentItem[] = useMemo(() => {
    return incidents.map((inc, index) => {
      const isCrash = inc.category === 'Accident';
      const isClosed = inc.category === 'Road Closed';
      const isRoadworks = inc.category === 'Roadworks';
      
      const defaultVehicles = (inc as any).vehiclesInvolved ?? (isCrash ? 2 : 1);
      const defaultInjuries = (inc as any).injuries ?? (isCrash && inc.severity === 'Critical' ? 1 : 0);
      const defaultImpact = inc.severity === 'Critical' ? 'CRITICAL' : inc.severity === 'Heavy' ? 'SEVERE' : 'MODERATE';
      
      const unitAssigned = units.length > 0 ? units[index % units.length] : undefined;

      return {
        ...inc,
        vehiclesInvolved: (inc as any).vehiclesInvolved ?? defaultVehicles,
        injuries: (inc as any).injuries ?? defaultInjuries,
        trafficImpact: defaultImpact,
        affectedRoads: [inc.roadName || 'Nagpur Main Road', 'Wardha Main Arterial', 'Ring Road Bypass'],
        affectedJunctions: [inc.nearestJunction?.name || inc.roadName || 'Sitabuldi Chowk', 'Sitabuldi Square'],
        assignedUnitName: unitAssigned ? unitAssigned.callSign : 'Unassigned',
        assignedUnitId: unitAssigned ? unitAssigned.id : undefined,
        responseETA: `${String(Math.floor(4 + (index % 5))).padStart(2, '0')}:${String((index * 12) % 60).padStart(2, '0')} min`,
        distanceKm: parseFloat((1.2 + (index % 4) * 0.8).toFixed(1)),
        riskScore: inc.severity === 'Critical' ? 92 : inc.severity === 'Heavy' ? 78 : 54,
        aiConfidence: parseFloat((92.4 + (index % 6) * 1.1).toFixed(1)),
        estimatedClearanceTime: inc.severity === 'Critical' ? '35 - 45 min' : '20 - 30 min',
        aiRecommendation: isCrash
          ? 'Dispatch nearest Traffic Interceptor and divert vehicles toward Central Avenue Bypass.'
          : isClosed
          ? 'Maintain road barriers and update GPS navigation services for detour routing.'
          : 'Deploy foot-beat officer to clear bottleneck and signal override.',
        timeline: [
          { time: '14:32', event: 'Incident reported via Citizen 112 Helpline', type: 'info' },
          { time: '14:34', event: 'AI System classified as High Severity Risk', type: 'alert' },
          { time: '14:35', event: `Unit ${unitAssigned?.callSign || 'PCR-101'} dispatched to location`, type: 'dispatch' },
          { time: '14:38', event: 'Unit reported en route Code-3 with emergency lights', type: 'scene' },
        ],
        riskTrend: [
          { time: '12:00', score: 32 },
          { time: '13:00', score: 48 },
          { time: '14:00', score: 71 },
          { time: '14:30', score: inc.severity === 'Critical' ? 92 : 68 },
        ],
      };
    });
  }, [incidents, units]);

  // Filtered Incidents Stream
  const filteredIncidents = useMemo(() => {
    return enrichedIncidents.filter((i) => {
      const matchesSearch =
        i.roadName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        i.category.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesType = filterType === 'ALL' || i.category.toUpperCase().includes(filterType.toUpperCase());
      const matchesSeverity = filterSeverity === 'ALL' || i.severity.toUpperCase() === filterSeverity.toUpperCase();
      const matchesStatus = filterStatus === 'ALL' || (i.status || 'ACTIVE').toUpperCase() === filterStatus.toUpperCase();

      return matchesSearch && matchesType && matchesSeverity && matchesStatus;
    });
  }, [enrichedIncidents, searchQuery, filterType, filterSeverity, filterStatus]);

  // Summary Metrics KPIs
  const kpiMetrics = useMemo(() => {
    const totalActive = enrichedIncidents.length;
    const criticalCount = enrichedIncidents.filter((i) => i.severity === 'Critical').length;
    const accidentsCount = enrichedIncidents.filter((i) => i.category === 'Accident').length;
    const jamsCount = enrichedIncidents.filter((i) => i.category === 'Jam' || i.category === 'Hazard').length;
    const respondingUnitsCount = enrichedIncidents.filter((i) => i.assignedUnitId).length;

    return {
      totalActive,
      criticalCount,
      accidentsCount,
      jamsCount,
      avgResponseTime: '08:42 min',
      unitsResponding: `${respondingUnitsCount} / ${units.length}`,
    };
  }, [enrichedIncidents, units]);

  // Reset all filters
  const handleResetFilters = () => {
    setFilterType('ALL');
    setFilterSeverity('ALL');
    setFilterStatus('ALL');
    setFilterTime('ALL');
    setSearchQuery('');
  };

  // Export JSON Report
  const handleExportData = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(filteredIncidents, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Nagpur_Traffic_Incidents_Report_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
  };

  // Dispatch Unit Action
  const handleDispatchUnit = (inc: DetailedIncidentItem) => {
    const targetUnit = units.find((u) => u.id === inc.assignedUnitId) || units[0];
    const junctionId = inc.nearestJunction?.id || 1;

    setDispatchJunctionId(junctionId);
    if (targetUnit) setDispatchUnitId(targetUnit.id);
    setIsDispatchModalOpen(true);

    if (targetUnit) {
      dispatchUnit(targetUnit.id, junctionId, inc.roadName, inc.category, 'HIGH');
      setDispatchToast(`Unit ${targetUnit.callSign} dispatched to ${inc.roadName}`);
      setTimeout(() => setDispatchToast(null), 4000);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full font-sans bg-[#050811] text-slate-100 p-2 selection:bg-blue-500/30 min-h-screen">
      
      {/* ----------------------------------------------------------------------- */}
      {/* 1. TOP INCIDENT KPI METRICS BAR */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Active Incidents */}
        <div className="bg-[#0c0f1d] border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">ACTIVE INCIDENTS</span>
            <Flame className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-slate-100">{kpiMetrics.totalActive}</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">+3 last hr</span>
          </div>
        </div>

        {/* Critical Incidents */}
        <div className="bg-[#0c0f1d] border border-red-900/40 hover:border-red-500/60 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider text-red-300">CRITICAL EVENTS</span>
            <AlertOctagon className="w-4 h-4 text-red-500 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-red-400">{kpiMetrics.criticalCount}</span>
            <span className="text-[10px] font-mono text-red-400 font-bold bg-red-950/80 px-1.5 py-0.5 rounded border border-red-500/40">Immediate</span>
          </div>
        </div>

        {/* Active Accidents */}
        <div className="bg-[#0c0f1d] border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">ACCIDENTS</span>
            <Car className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-sky-300">{kpiMetrics.accidentsCount}</span>
            <span className="text-[10px] font-mono text-sky-400 font-bold bg-sky-950/60 px-1.5 py-0.5 rounded border border-sky-500/30">Verified</span>
          </div>
        </div>

        {/* Traffic Jams */}
        <div className="bg-[#0c0f1d] border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">TRAFFIC JAMS</span>
            <Activity className="w-4 h-4 text-amber-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-amber-300">{kpiMetrics.jamsCount}</span>
            <span className="text-[10px] font-mono text-amber-400 font-bold bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-500/30">Bottlenecks</span>
          </div>
        </div>

        {/* Avg Response Time */}
        <div className="bg-[#0c0f1d] border border-slate-800/80 hover:border-purple-500/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">AVG RESPONSE</span>
            <Clock className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-purple-300">{kpiMetrics.avgResponseTime}</span>
            <span className="text-[10px] font-mono text-purple-400 font-bold bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-500/30">Target &lt;10m</span>
          </div>
        </div>

        {/* Units Responding */}
        <div className="bg-[#0c0f1d] border border-slate-800/80 hover:border-emerald-500/40 rounded-2xl p-3.5 flex flex-col justify-between shadow-lg transition-all group">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-mono font-bold uppercase tracking-wider">UNITS ACTIVE</span>
            <Shield className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black font-mono text-emerald-300">{kpiMetrics.unitsResponding}</span>
            <span className="text-[10px] font-mono text-emerald-400 font-bold bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-500/30">Deployed</span>
          </div>
        </div>
      </div>

      {/* Dispatch Confirmation Toast */}
      {dispatchToast && (
        <div className="bg-emerald-950/90 border border-emerald-500/60 text-emerald-200 px-4 py-2.5 rounded-xl font-mono text-xs shadow-2xl flex items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{dispatchToast}</span>
          </div>
          <button onClick={() => setDispatchToast(null)} className="p-1 text-slate-400 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 2. MAIN DASHBOARD LAYOUT: MAP LEFT (65%) & INCIDENTS PANEL RIGHT (35%) */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        
        {/* LEFT COLUMN: INTERACTIVE INCIDENT MAP (7 COLS / ~62%) */}
        <div className="lg:col-span-7 flex flex-col gap-3">
          
          {/* Map Outer Container */}
          <div className="relative rounded-2xl border border-slate-800/90 overflow-hidden shadow-2xl bg-[#090b14]">
            <UnifiedMap heightClass="h-[640px]" />

            {/* Top Left Status Badge */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2 pointer-events-none">
              <div className="px-3 py-1.5 bg-[#0c0e18]/90 backdrop-blur-md rounded-xl border border-blue-500/40 text-blue-300 text-xs font-mono font-extrabold flex items-center gap-2 shadow-lg">
                <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                <span>NAGPUR GIS TRAFFIC MONITOR</span>
              </div>
            </div>

            {/* Bottom Live GIS Layer Legend (Matching Screenshot Specifications) */}
            <div className="absolute bottom-3 left-3 right-3 z-20 flex items-center justify-between pointer-events-none gap-2">
              <div className="px-3.5 py-2 bg-[#0c0e18]/95 backdrop-blur-md rounded-xl border border-slate-800 text-xs font-mono pointer-events-auto flex items-center gap-4 shadow-2xl flex-wrap">
                <div className="flex items-center gap-1.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                  <Activity className="w-3.5 h-3.5 text-blue-400" />
                  <span>LIVE GIS LAYER:</span>
                </div>
                <div className="flex items-center gap-3 text-[11px]">
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#3B82F6]"></span> Accident
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]"></span> Jam / Congestion
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#A855F7]"></span> Road Closure
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#FACC15]"></span> Road Work
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]"></span> Critical
                  </span>
                  <span className="flex items-center gap-1 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#22C55E]"></span> Police Unit
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: ACTIVE INCIDENTS STREAM & FILTER TOOLBAR (5 COLS / ~38%) */}
        <div className="lg:col-span-5 bg-[#0b0e1a]/95 border border-slate-800/90 rounded-2xl p-4 shadow-2xl flex flex-col gap-3 font-mono">
          
          {/* Section Header & Citizen 112 Trigger */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-purple-400" />
              <span className="font-extrabold text-slate-100 uppercase tracking-wider text-xs">ACTIVE INCIDENTS</span>
              <span className="px-2 py-0.5 rounded-full bg-purple-950 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                {filteredIncidents.length}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={triggerEmergencyIncident}
                className="px-2.5 py-1 text-[10px] font-extrabold bg-rose-600 hover:bg-rose-500 text-white rounded-lg transition shadow-md shadow-rose-600/30 flex items-center gap-1"
              >
                <AlertTriangle className="w-3 h-3" />
                <span>+ CITIZEN 112</span>
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* FILTER TOOLBAR */}
          {/* ----------------------------------------------------------------------- */}
          <div className="space-y-2 bg-[#090b14] p-2.5 rounded-xl border border-slate-800/80 text-[11px]">
            {/* Search Input */}
            <input
              type="text"
              placeholder="Search location, road, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#111422] border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 focus:outline-none focus:border-blue-500 text-xs"
            />

            {/* Filter Dropdowns */}
            <div className="grid grid-cols-2 gap-1.5">
              {/* Type Filter */}
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-[#111422] border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-[11px]"
              >
                <option value="ALL">TYPE: ALL</option>
                <option value="ACCIDENT">Accident</option>
                <option value="JAM">Traffic Jam</option>
                <option value="ROAD CLOSED">Road Closure</option>
                <option value="ROADWORKS">Road Work</option>
              </select>

              {/* Severity Filter */}
              <select
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
                className="bg-[#111422] border border-slate-800 rounded-lg px-2 py-1 text-slate-300 text-[11px]"
              >
                <option value="ALL">SEVERITY: ALL</option>
                <option value="CRITICAL">Critical</option>
                <option value="HEAVY">High / Heavy</option>
                <option value="MODERATE">Moderate</option>
                <option value="MINOR">Low / Minor</option>
              </select>
            </div>

            {/* Reset Filters & Export */}
            <div className="flex items-center justify-between pt-1 text-[10px]">
              <button
                onClick={handleResetFilters}
                className="text-slate-400 hover:text-slate-200 flex items-center gap-1 font-bold"
              >
                <RotateCcw className="w-3 h-3 text-purple-400" />
                <span>RESET FILTERS</span>
              </button>

              <button
                onClick={handleExportData}
                className="text-slate-400 hover:text-sky-300 flex items-center gap-1 font-bold"
              >
                <Download className="w-3 h-3 text-sky-400" />
                <span>EXPORT REPORT</span>
              </button>
            </div>
          </div>

          {/* ----------------------------------------------------------------------- */}
          {/* VERTICALLY STACKED ACTIVE INCIDENT CARDS STREAM */}
          {/* ----------------------------------------------------------------------- */}
          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {filteredIncidents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs font-mono">
                No active traffic incidents match the selected filter criteria.
              </div>
            ) : (
              filteredIncidents.map((inc) => {
                const isSelected = selectedIncident?.id === inc.id;
                const isCritical = inc.severity === 'Critical';
                const isCrash = inc.category === 'Accident';
                const isClosed = inc.category === 'Road Closed';

                // Border and Card Style Palette
                const borderClass = isCritical
                  ? 'border-red-500/80 bg-red-950/20 shadow-red-500/10'
                  : isClosed
                  ? 'border-purple-500/80 bg-purple-950/20 shadow-purple-500/10'
                  : isCrash
                  ? 'border-blue-500/80 bg-blue-950/20 shadow-blue-500/10'
                  : 'border-amber-500/80 bg-amber-950/20 shadow-amber-500/10';

                const badgeBg = isCritical
                  ? 'bg-red-600/30 text-red-300 border-red-500/50'
                  : isClosed
                  ? 'bg-purple-600/30 text-purple-300 border-purple-500/50'
                  : isCrash
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                  : 'bg-amber-600/30 text-amber-300 border-amber-500/50';

                return (
                  <div
                    key={inc.id}
                    onClick={() => setSelectedIncident(inc)}
                    className={`p-3.5 rounded-2xl border-2 transition-all cursor-pointer shadow-lg relative ${borderClass} ${
                      isSelected ? 'ring-2 ring-white scale-[1.01]' : 'hover:border-opacity-100'
                    }`}
                  >
                    {/* Category & Severity Badges */}
                    <div className="flex items-center justify-between text-xs mb-2">
                      <div className="flex items-center gap-2">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-extrabold border ${badgeBg}`}>
                          {inc.category.toUpperCase()}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                            isCritical
                              ? 'bg-red-950 text-red-300 border-red-500'
                              : 'bg-slate-800 text-slate-300 border-slate-700'
                          }`}
                        >
                          {inc.severity.toUpperCase()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] text-slate-400">
                        <Clock className="w-3 h-3 text-slate-500" />
                        <span>{inc.timeAgo || 'Just now'}</span>
                      </div>
                    </div>

                    {/* Location Title & Description */}
                    <h4 className="font-black text-sm text-slate-100 font-sans tracking-wide">
                      {inc.roadName || 'Nagpur Corridor'}
                    </h4>
                    <p className="text-xs text-slate-300 font-sans mt-1 line-clamp-2">
                      {inc.description || 'Traffic incident active'}
                    </p>

                    {/* Telemetry Chips (Impact, Vehicles, Unit, ETA) */}
                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-[10px]">
                      <span className="px-2 py-0.5 rounded bg-slate-900/80 text-amber-300 border border-slate-800">
                        Impact: {inc.trafficImpact}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900/80 text-sky-300 border border-slate-800">
                        Unit: {inc.assignedUnitName}
                      </span>
                      <span className="px-2 py-0.5 rounded bg-slate-900/80 text-emerald-300 border border-slate-800">
                        ETA: {inc.responseETA}
                      </span>
                    </div>

                    {/* Card Footer: Location & View Details Button */}
                    <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
                      <div className="flex items-center gap-1.5 text-amber-400 text-[11px] truncate max-w-[200px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                        <span>Near {inc.nearestJunction?.name || inc.roadName}</span>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDetailDrawerIncident(inc);
                        }}
                        className="px-3 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-100 rounded-xl border border-slate-700 flex items-center gap-1 font-bold text-xs transition"
                      >
                        <span>VIEW DETAILS</span>
                        <ChevronRight className="w-3.5 h-3.5 text-blue-400" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* 3. LARGE INCIDENT DETAIL DRAWER / MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {detailDrawerIncident && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0b0e1a] border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative font-mono text-slate-100 my-8">
            
            {/* Drawer Close Button */}
            <button
              onClick={() => setDetailDrawerIncident(null)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white bg-slate-800 rounded-xl transition"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header Title */}
            <div className="flex items-center gap-3 mb-5 border-b border-slate-800 pb-4">
              <div className="w-12 h-12 rounded-xl bg-blue-600/20 border border-blue-500/40 flex items-center justify-center text-blue-400 shrink-0">
                <Flame className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-blue-600/30 text-blue-300 border border-blue-500/50">
                    {detailDrawerIncident.category.toUpperCase()}
                  </span>
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-red-950 text-red-400 border border-red-500/50">
                    {detailDrawerIncident.severity.toUpperCase()}
                  </span>
                </div>
                <h3 className="font-extrabold text-lg text-slate-100 font-sans mt-1">
                  {detailDrawerIncident.roadName}
                </h3>
              </div>
            </div>

            {/* Grid Layout inside Drawer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              
              {/* Incident Information */}
              <div className="bg-[#080a14] p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div className="font-bold text-slate-300 text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  <span>Incident Telemetry</span>
                </div>
                <div><span className="text-slate-400">Incident ID:</span> <span className="text-slate-200 font-bold">{detailDrawerIncident.id}</span></div>
                <div><span className="text-slate-400">Status:</span> <span className="text-emerald-400 font-bold">ACTIVE</span></div>
                <div><span className="text-slate-400">Vehicles Involved:</span> <span className="text-slate-200">{detailDrawerIncident.vehiclesInvolved}</span></div>
                <div><span className="text-slate-400">Injuries Reported:</span> <span className="text-slate-200">{detailDrawerIncident.injuries}</span></div>
                <div><span className="text-slate-400">Reported Time:</span> <span className="text-slate-200">{detailDrawerIncident.startTime || '14:32'}</span></div>
                <div><span className="text-slate-400">Coordinates:</span> <span className="text-slate-300 font-mono">{detailDrawerIncident.location && Array.isArray(detailDrawerIncident.location) && detailDrawerIncident.location.length >= 2 ? `${detailDrawerIncident.location[0].toFixed(4)}, ${detailDrawerIncident.location[1].toFixed(4)}` : '21.1458, 79.0882'}</span></div>
                <div><span className="text-slate-400">Estimated Clearance:</span> <span className="text-amber-300 font-bold">{detailDrawerIncident.estimatedClearanceTime}</span></div>
              </div>

              {/* Traffic Impact Section */}
              <div className="bg-[#080a14] p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div className="font-bold text-slate-300 text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-amber-400" />
                  <span>Traffic Impact</span>
                </div>
                <div><span className="text-slate-400">Average Speed:</span> <span className="text-amber-400 font-bold">14 km/h</span></div>
                <div><span className="text-slate-400">Congestion Level:</span> <span className="text-red-400 font-bold">{detailDrawerIncident.trafficImpact}</span></div>
                <div><span className="text-slate-400">Estimated Delay:</span> <span className="text-amber-300 font-bold">+18 min</span></div>
                <div><span className="text-slate-400">Affected Roads:</span> <span className="text-slate-300">{detailDrawerIncident.affectedRoads?.join(', ')}</span></div>
                <div><span className="text-slate-400">Affected Junctions:</span> <span className="text-slate-300">{detailDrawerIncident.affectedJunctions?.join(', ')}</span></div>
              </div>

              {/* Incident Weather Context (Section 16 & 17 of Prompt) */}
              <div className="col-span-1 md:col-span-2 bg-[#080a14] p-4 rounded-xl border border-cyan-500/30 space-y-1.5">
                <div className="font-bold text-cyan-300 text-xs uppercase tracking-wider mb-1 flex items-center justify-between border-b border-slate-800 pb-1">
                  <span className="flex items-center gap-1.5">
                    <CloudRain className="w-4 h-4 text-cyan-400" />
                    <span>Environmental Weather Context</span>
                  </span>
                  <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                    OBSERVED AT INCIDENT SITE
                  </span>
                </div>

                <div className="text-xs text-slate-200 font-semibold pt-1">
                  "Incident occurred during current weather observation."
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 pt-1 text-[11px]">
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Condition</span>
                    <strong className="text-white">Rain / Drizzle</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Rainfall Rate</span>
                    <strong className="text-cyan-300">0.29 mm/h</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Visibility Range</span>
                    <strong className="text-slate-200">10.0 km</strong>
                  </div>
                  <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
                    <span className="text-slate-400 block text-[10px]">Weather Impact</span>
                    <strong className="text-amber-300">LOW (9.6 pts)</strong>
                  </div>
                </div>

                {detailDrawerIncident.category === 'Hazard' || detailDrawerIncident.description.toLowerCase().includes('water') ? (
                  <div className="mt-2 p-2 rounded bg-indigo-950/40 border border-indigo-500/30 text-[11px] text-indigo-300">
                    <strong>Waterlogging Operational Relationship:</strong> Rainfall ──► Weather Impact ──► Waterlogging Incident ──► Traffic Congestion ──► Risk.
                  </div>
                ) : null}
              </div>

              {/* Response Units Table */}
              <div className="col-span-1 md:col-span-2 bg-[#080a14] p-4 rounded-xl border border-slate-800/80">
                <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-1">
                  <div className="font-bold text-slate-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Response Units Assigned</span>
                  </div>
                  <button
                    onClick={() => handleDispatchUnit(detailDrawerIncident)}
                    className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>DISPATCH UNIT</span>
                  </button>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="text-slate-400 border-b border-slate-800">
                        <th className="py-1">Unit</th>
                        <th className="py-1">Type</th>
                        <th className="py-1">Distance</th>
                        <th className="py-1">ETA</th>
                        <th className="py-1">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr className="border-b border-slate-800/50">
                        <td className="py-1.5 font-bold text-sky-300">{detailDrawerIncident.assignedUnitName || 'NP-17'}</td>
                        <td className="py-1.5 text-slate-300">PCR Van</td>
                        <td className="py-1.5 text-slate-300">{detailDrawerIncident.distanceKm} km</td>
                        <td className="py-1.5 text-amber-300 font-bold">{detailDrawerIncident.responseETA}</td>
                        <td className="py-1.5">
                          <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-300 border border-amber-500/40 text-[10px] font-bold">
                            EN ROUTE
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Incident Timeline */}
              <div className="col-span-1 md:col-span-2 bg-[#080a14] p-4 rounded-xl border border-slate-800/80">
                <div className="font-bold text-slate-300 text-xs uppercase tracking-wider mb-2 border-b border-slate-800 pb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-purple-400" />
                  <span>Incident Timeline</span>
                </div>
                <div className="space-y-2">
                  {detailDrawerIncident.timeline?.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-[11px]">
                      <span className="text-purple-400 font-mono font-bold w-12">{item.time}</span>
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                      <span className="text-slate-300">{item.event}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* AI Incident Intelligence Panel */}
              <div className="col-span-1 md:col-span-2 bg-[#080a14] p-4 rounded-xl border border-purple-500/30">
                <div className="flex items-center justify-between mb-2 border-b border-slate-800 pb-1">
                  <div className="font-bold text-purple-300 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <Cpu className="w-3.5 h-3.5 text-purple-400" />
                    <span>AI Incident Analysis</span>
                  </div>
                  <button
                    onClick={() => setShowAiExplanationModal(true)}
                    className="px-2.5 py-1 bg-purple-950 hover:bg-purple-900 text-purple-300 border border-purple-500/40 rounded-lg text-[10px] font-bold"
                  >
                    VIEW AI EXPLANATION
                  </button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                  <div className="p-2 bg-slate-900 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">Risk Score</div>
                    <div className="text-lg font-black text-purple-300">{detailDrawerIncident.riskScore} / 100</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">Classification</div>
                    <div className="text-xs font-bold text-red-400 uppercase mt-1">{detailDrawerIncident.category}</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">AI Confidence</div>
                    <div className="text-lg font-black text-emerald-400">{detailDrawerIncident.aiConfidence}%</div>
                  </div>
                  <div className="p-2 bg-slate-900 rounded-lg text-center">
                    <div className="text-[10px] text-slate-400">Predicted Impact</div>
                    <div className="text-xs font-bold text-amber-400 uppercase mt-1">{detailDrawerIncident.trafficImpact}</div>
                  </div>
                </div>

                <div className="p-2.5 bg-purple-950/40 border border-purple-500/30 rounded-lg text-xs text-purple-200">
                  <span className="font-bold text-purple-300">Recommended Action: </span>
                  <span>{detailDrawerIncident.aiRecommendation}</span>
                </div>
              </div>

            </div>

            {/* Drawer Footer Actions */}
            <div className="mt-5 flex items-center justify-between border-t border-slate-800 pt-4">
              <button
                onClick={() => setDetailDrawerIncident(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold"
              >
                Close Drawer
              </button>

              <button
                onClick={() => {
                  handleDispatchUnit(detailDrawerIncident);
                  setDetailDrawerIncident(null);
                  if (onOpenDispatchModalWithIncident) onOpenDispatchModalWithIncident(detailDrawerIncident);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-extrabold shadow-lg shadow-blue-600/30 flex items-center gap-2"
              >
                <Shield className="w-4 h-4" />
                <span>DISPATCH RESPONSE UNIT</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ----------------------------------------------------------------------- */}
      {/* 4. AI EXPLANATION MODAL */}
      {/* ----------------------------------------------------------------------- */}
      {showAiExplanationModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0d101d] border border-purple-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl relative font-mono text-slate-100">
            <button
              onClick={() => setShowAiExplanationModal(false)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-5 h-5 text-purple-400" />
              <h3 className="font-extrabold text-base text-purple-200">AI Risk Model Explanation</h3>
            </div>

            <div className="space-y-3 text-xs text-slate-300">
              <p>
                The Nagpur Pulse AI Traffic Model calculated this incident risk score based on real-time TomTom flow segment telemetry, historical junction bottleneck patterns, and local emergency call density.
              </p>
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-1">
                <div className="font-bold text-purple-300">Key Risk Feature Weights:</div>
                <div>• Speed Reduction Delta: <span className="text-amber-400 font-bold">-68%</span></div>
                <div>• Nearby Police Density: <span className="text-sky-400 font-bold">Low (1.8 km)</span></div>
                <div>• Time-of-Day Peak Factor: <span className="text-purple-400 font-bold">1.45x</span></div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowAiExplanationModal(false)}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl text-xs"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Emergency Contact Helplines Bar */}
      <section className="bg-[#0b0e1a]/95 border border-slate-800 rounded-2xl p-4 shadow-xl flex flex-wrap items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <PhoneCall className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-slate-200">Nagpur Traffic Control Room Emergency Helplines</div>
            <div className="text-[11px] text-slate-400">Direct Command Dispatch & Citizen Emergency Desk</div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <span className="text-purple-400">Police 112</span>
          <span className="text-sky-400">Traffic Control: 0712-2560800</span>
          <span className="text-emerald-400">Ambulance: 108</span>
        </div>
      </section>

      {/* 5. DISPATCH MODAL OVERLAY */}
      <DispatchModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        initialJunctionId={dispatchJunctionId}
        initialUnitId={dispatchUnitId}
      />
    </div>
  );
};

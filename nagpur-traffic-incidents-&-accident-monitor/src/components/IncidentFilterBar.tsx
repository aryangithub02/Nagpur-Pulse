import React from 'react';
import { FilterOptions, IncidentCategory, SeverityLevel } from '../types';
import { NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';
import { 
  Search, 
  X, 
  Download, 
  Flame, 
  AlertCircle, 
  Car, 
  Construction, 
  Ban,
  MapPin,
  SlidersHorizontal,
  FileSpreadsheet
} from 'lucide-react';

interface IncidentFilterBarProps {
  filters: FilterOptions;
  onFilterChange: (newFilters: FilterOptions) => void;
  onExportData: (format: 'json' | 'csv') => void;
  totalFilteredCount: number;
}

const CATEGORIES: { label: string; value: 'ALL' | IncidentCategory; icon: React.ReactNode }[] = [
  { label: 'All Incidents', value: 'ALL', icon: null },
  { label: 'Accidents', value: 'Accident', icon: <Flame className="w-3.5 h-3.5 text-rose-400" /> },
  { label: 'Jams / Stoppage', value: 'Congestion', icon: <Car className="w-3.5 h-3.5 text-orange-400" /> },
  { label: 'Road Works', value: 'Road Works', icon: <Construction className="w-3.5 h-3.5 text-amber-400" /> },
  { label: 'Closures', value: 'Road Closed', icon: <Ban className="w-3.5 h-3.5 text-purple-400" /> },
  { label: 'Hazards', value: 'Hazard', icon: <AlertCircle className="w-3.5 h-3.5 text-cyan-400" /> },
];

const SEVERITIES: { label: string; value: 'ALL' | SeverityLevel; color: string }[] = [
  { label: 'All Severities', value: 'ALL', color: 'text-slate-300' },
  { label: 'Critical', value: 'Critical', color: 'text-rose-400' },
  { label: 'Major', value: 'Major', color: 'text-orange-400' },
  { label: 'Moderate', value: 'Moderate', color: 'text-amber-400' },
  { label: 'Minor', value: 'Minor', color: 'text-emerald-400' },
];

export const IncidentFilterBar: React.FC<IncidentFilterBarProps> = ({
  filters,
  onFilterChange,
  onExportData,
  totalFilteredCount,
}) => {
  return (
    <div className="bento-card p-4 sm:p-5 flex flex-col gap-3.5 shadow-xl">
      {/* Top row: Search input, Chowk dropdown, Sort, and Export */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            id="incident-search-input"
            type="text"
            placeholder="Search road, chowk, corridor..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange({ ...filters, searchQuery: e.target.value })}
            className="w-full bg-slate-950/80 border border-slate-800/90 rounded-xl pl-10 pr-8 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 transition"
          />
          {filters.searchQuery && (
            <button
              onClick={() => onFilterChange({ ...filters, searchQuery: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Chowk selection dropdown & Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <div className="relative w-full sm:w-56">
            <MapPin className="w-3.5 h-3.5 text-amber-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <select
              id="chowk-filter-select"
              value={filters.selectedJunctionId || ''}
              onChange={(e) => {
                const val = e.target.value ? Number(e.target.value) : null;
                onFilterChange({ ...filters, selectedJunctionId: val });
              }}
              className="w-full bg-slate-950/80 border border-slate-800/90 rounded-xl pl-9 pr-7 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500 appearance-none cursor-pointer"
            >
              <option value="">All Nagpur Chowks (40)</option>
              {NAGPUR_JUNCTIONS.map((j) => (
                <option key={j.id} value={j.id}>
                  {j.name} ({j.zone || 'Nagpur'})
                </option>
              ))}
            </select>
          </div>

          {/* Sort Selector */}
          <div className="relative">
            <select
              id="sort-by-select"
              value={filters.sortBy}
              onChange={(e) => onFilterChange({ ...filters, sortBy: e.target.value as any })}
              className="bg-slate-950/80 border border-slate-800/90 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="severity">Sort: Highest Severity</option>
              <option value="delay">Sort: Highest Delay</option>
              <option value="time">Sort: Most Recent</option>
            </select>
          </div>

          {/* Export button */}
          <div className="hidden lg:flex items-center gap-1.5">
            <button
              onClick={() => onExportData('csv')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
              title="Export CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => onExportData('json')}
              className="px-3 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700/80 text-xs font-medium flex items-center gap-1.5 transition active:scale-95"
              title="Export JSON"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Bottom row: Category & Severity Filter Pills */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
        {/* Category Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full no-scrollbar text-xs">
          {CATEGORIES.map((cat) => {
            const isSelected = filters.category === cat.value;
            return (
              <button
                key={cat.value}
                onClick={() => onFilterChange({ ...filters, category: cat.value })}
                className={`px-3 py-1.5 rounded-xl border text-xs font-medium flex items-center gap-1.5 whitespace-nowrap transition-all duration-150 ${
                  isSelected
                    ? 'bg-rose-600 text-white border-rose-500 shadow-md shadow-rose-950'
                    : 'bg-slate-950/60 hover:bg-slate-800 text-slate-300 border-slate-800/90'
                }`}
              >
                {cat.icon}
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* Severity Filter Pills & Filtered Counter */}
        <div className="flex items-center gap-2 self-end lg:self-auto text-xs">
          <div className="flex items-center gap-1 bg-slate-950/70 p-1 rounded-xl border border-slate-800/90">
            {SEVERITIES.map((sev) => {
              const isSelected = filters.severity === sev.value;
              return (
                <button
                  key={sev.value}
                  onClick={() => onFilterChange({ ...filters, severity: sev.value })}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition ${
                    isSelected
                      ? 'bg-slate-800 text-white font-bold shadow-sm'
                      : `${sev.color} hover:text-white`
                  }`}
                >
                  {sev.label}
                </button>
              );
            })}
          </div>

          <div className="px-2.5 py-1.5 rounded-xl bg-slate-950/90 text-slate-400 border border-slate-800 text-[11px] font-mono whitespace-nowrap">
            Showing <strong className="text-white">{totalFilteredCount}</strong>
          </div>
        </div>
      </div>
    </div>
  );
};

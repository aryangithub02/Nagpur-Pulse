import React, { useState } from 'react';
import {
  Shield,
  Lock,
  User as UserIcon,
  AlertCircle,
  ArrowRight,
  X,
  Eye,
  EyeOff,
  MapPin,
  Building2,
  CheckCircle2,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { ZoneCode } from '../../types/auth';

interface ZoneOption {
  code: ZoneCode;
  username: string;
  name: string;
  subtext: string;
  stations: string;
  color: string;
  borderColor: string;
  bgColor: string;
  badgeColor: string;
}

const ZONES_DATA: ZoneOption[] = [
  {
    code: 'CENTRAL',
    username: 'np.central.ops',
    name: 'Central Zone',
    subtext: 'Sitabuldi, Sadar, Mahal, Itwari',
    stations: 'CPS-1 (Sitabuldi HQ), CPS-2 (Sadar)',
    color: 'text-cyan-400',
    borderColor: 'border-cyan-500/50',
    bgColor: 'bg-cyan-500/10 hover:bg-cyan-500/20',
    badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
  },
  {
    code: 'NORTH',
    username: 'np.north.ops',
    name: 'North Zone',
    subtext: 'Indora, Automotive, Kamptee, Jaripatka',
    stations: 'NPS-1 (Indora), NPS-2 (Kamptee)',
    color: 'text-amber-400',
    borderColor: 'border-amber-500/50',
    bgColor: 'bg-amber-500/10 hover:bg-amber-500/20',
    badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  },
  {
    code: 'EAST',
    username: 'np.east.ops',
    name: 'East Zone',
    subtext: 'Kalamna, Pardi, Lakadganj, Nandanvan',
    stations: 'EPS-1 (Pardi), EPS-2 (Kalamna)',
    color: 'text-emerald-400',
    borderColor: 'border-emerald-500/50',
    bgColor: 'bg-emerald-500/10 hover:bg-emerald-500/20',
    badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  },
  {
    code: 'WEST',
    username: 'np.west.ops',
    name: 'West Zone',
    subtext: 'Dharampeth, Ambazari, Wadi, Hingna',
    stations: 'WPS-1 (Dharampeth), WPS-2 (Ambazari)',
    color: 'text-purple-400',
    borderColor: 'border-purple-500/50',
    bgColor: 'bg-purple-500/10 hover:bg-purple-500/20',
    badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
  },
  {
    code: 'SOUTH',
    username: 'np.south.ops',
    name: 'South Zone',
    subtext: 'Chhatrapati Sq, Khamla, Manewada, Ajni',
    stations: 'SPS-1 (Chhatrapati), SPS-2 (Ajni)',
    color: 'text-rose-400',
    borderColor: 'border-rose-500/50',
    bgColor: 'bg-rose-500/10 hover:bg-rose-500/20',
    badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
  },
  {
    code: 'ALL',
    username: 'admin',
    name: 'System Admin (All Zones)',
    subtext: 'City-wide Command Authority',
    stations: 'Nagpur Police Control Room (HQ)',
    color: 'text-indigo-400',
    borderColor: 'border-indigo-500/50',
    bgColor: 'bg-indigo-500/10 hover:bg-indigo-500/20',
    badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
  },
];

export const LoginModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
  const { login, setActiveZone } = useAuth();
  const [selectedZone, setSelectedZoneState] = useState<ZoneCode>('CENTRAL');
  const [username, setUsername] = useState<string>('np.central.ops');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSelectZone = (z: ZoneOption) => {
    setSelectedZoneState(z.code);
    setUsername(z.username);
    setPassword('');
    setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await login(username, password);
    setLoading(false);

    if (result.success) {
      setActiveZone(selectedZone);
      onClose();
    } else {
      setError(result.message || 'Invalid credentials.');
    }
  };

  const activeZoneObj = ZONES_DATA.find((z) => z.code === selectedZone) || ZONES_DATA[0];

  return (
    <div className="fixed inset-0 z-[9999] bg-slate-950/95 backdrop-blur-2xl flex items-center justify-center p-4 font-sans overflow-y-auto">
      <div className="bg-[#0b0d19] border border-slate-700/80 rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative text-slate-100 space-y-6 my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-slate-400 hover:text-white bg-slate-900/80 hover:bg-slate-800 rounded-xl transition border border-slate-800"
          title="Close Modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header Ribbon */}
        <div className="flex items-center gap-4 border-b border-slate-800/80 pb-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-900 border border-slate-700/80 p-2 flex items-center justify-center shadow-2xl shadow-blue-500/20 shrink-0">
            <img src="/assets/logo.png" alt="Nagpur Pulse Logo" className="w-full h-full object-contain filter drop-shadow-lg" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-xl tracking-tight text-white">NAGPUR PULSE</h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm">
                ARGON2ID AUTH
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Police Command & Zone-Based Operational Login
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3.5 bg-rose-950/90 border border-rose-500/50 rounded-2xl text-rose-200 text-xs font-mono flex items-center gap-2.5 shadow-lg animate-in slide-in-from-top-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span className="font-bold">{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* 1. OPERATIONAL ZONE SELECTOR */}
          <div className="space-y-2">
            <label className="block text-xs font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-indigo-400" />
              <span>Select Operational Zone</span>
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ZONES_DATA.map((z) => {
                const isSelected = selectedZone === z.code;
                return (
                  <button
                    key={z.code}
                    type="button"
                    onClick={() => handleSelectZone(z)}
                    className={`p-2.5 rounded-2xl border text-left transition-all duration-150 relative ${
                      isSelected
                        ? `${z.bgColor} ${z.borderColor} ring-1 ring-indigo-500 shadow-lg`
                        : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 text-slate-400'
                    }`}
                  >
                    <div className="flex items-center justify-between font-mono font-bold text-xs">
                      <span className={isSelected ? 'text-white' : 'text-slate-300'}>{z.code}</span>
                      {isSelected && <CheckCircle2 className={`w-3.5 h-3.5 ${z.color}`} />}
                    </div>
                    <p className="text-[10px] font-mono text-slate-400 truncate mt-0.5">{z.name.replace(' Zone', '')}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Zone Details Card */}
          <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 space-y-1 font-mono text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Zone Sector Scoping:</span>
              <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${activeZoneObj.badgeColor}`}>
                {activeZoneObj.code}
              </span>
            </div>
            <p className="text-slate-200 font-extrabold text-xs">{activeZoneObj.name}</p>
            <p className="text-slate-400 text-[11px] font-sans">{activeZoneObj.subtext}</p>
            <p className="text-[10px] text-slate-400 pt-1 border-t border-slate-900">
              <strong className="text-slate-300">Station Scope:</strong> {activeZoneObj.stations}
            </p>
          </div>

          {/* 2. USERNAME & PASSWORD INPUTS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono text-xs">
            <div>
              <label className="block text-slate-400 text-[11px] font-bold mb-1">Police ID / Username</label>
              <div className="relative">
                <UserIcon className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. np.central.ops"
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 text-[11px] font-bold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password.."
                  className="w-full bg-slate-950 border border-slate-700/80 rounded-xl pl-9 pr-9 py-2 text-slate-100 font-sans focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800/80">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 font-mono font-bold text-xs rounded-xl border border-slate-800 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-extrabold font-mono text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition active:scale-95"
            >
              {loading ? (
                <span>Verifying Argon2id...</span>
              ) : (
                <>
                  <KeyRound className="w-4 h-4" />
                  <span>Authenticate & Enter Zone</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

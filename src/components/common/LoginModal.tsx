import React, { useState } from 'react';
import { useAuth } from '../../store/authContext';
import { UserRole } from '../../types/auth';
import { Shield, UserCheck, Lock, X } from 'lucide-react';

export const LoginModal: React.FC = () => {
  const { user, login, logout, isLoginModalOpen, setIsLoginModalOpen } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>(user.role);
  const [name, setName] = useState<string>(user.name);

  if (!isLoginModalOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    login(selectedRole, name);
  };

  const rolesList: Array<{ role: UserRole; title: string; desc: string }> = [
    { role: 'ADMIN', title: 'System Administrator', desc: 'Full access across command, traffic & API simulation' },
    { role: 'POLICE_COMMANDER', title: 'Police HQ Commander', desc: 'High-priority unit dispatch, 112 triage & radio control' },
    { role: 'DISPATCHER', title: 'Control Room Dispatcher', desc: 'Active dispatch, route calculation & unit assignment' },
    { role: 'TRAFFIC_OPERATOR', title: 'Traffic Signal Operator', desc: 'Corridor speed inspection & congestion analysis' },
    { role: 'ANALYST', title: 'Intelligence Analyst', desc: 'ML risk predictions & spatial coverage gaps' },
    { role: 'VIEWER', title: 'Public Viewer', desc: 'Read-only traffic flow & incident monitoring' },
  ];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-md w-full p-6 shadow-2xl relative font-sans text-slate-100">
        <button
          onClick={() => setIsLoginModalOpen(false)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base">Nagpur Pulse Operator Login</h2>
            <p className="text-xs text-slate-400 font-mono">Role-Based Authentication & Permissions</p>
          </div>
        </div>

        <form onSubmit={handleSave} className="space-y-4 text-xs font-mono">
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Operator Name / Call Sign</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-sans focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Select Access Role</label>
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {rolesList.map((item) => (
                <div
                  key={item.role}
                  onClick={() => setSelectedRole(item.role)}
                  className={`p-3 rounded-xl border cursor-pointer transition ${
                    selectedRole === item.role
                      ? 'bg-blue-600/20 border-blue-500 text-blue-200'
                      : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold text-xs">
                    <span>{item.title}</span>
                    <span className="text-[10px] text-blue-400">{item.role}</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-sans mt-0.5">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={logout}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl"
            >
              Sign Out
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-blue-600/30"
            >
              Save & Authenticate
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

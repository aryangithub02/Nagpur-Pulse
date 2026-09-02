import React, { useState, useEffect } from 'react';
import { Users, UserPlus, Shield, Lock, RefreshCw, CheckCircle2, XCircle, Search, Filter } from 'lucide-react';
import { useAuth } from '../../store/authContext';
import { User, UserRole, ZoneCode } from '../../types/auth';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

export const UserManagementView: React.FC = () => {
  const { token, user: currentUser } = useAuth();
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('ALL');

  // Create User Modal state
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [newUsername, setNewUsername] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('OfficerPass@2026!');
  const [newRole, setNewRole] = useState<UserRole>('FIELD_OFFICER');
  const [newZone, setNewZone] = useState<ZoneCode>('CENTRAL');
  const [formError, setFormError] = useState<string | null>(null);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (resp.ok) {
        const data = await resp.json();
        setUsersList(data.users);
      }
    } catch (err) {
      console.warn('User fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    try {
      const resp = await fetch(`${API_BASE_URL}/api/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          username: newUsername,
          password: newPassword,
          role: newRole,
          zone_code: newZone,
        }),
      });

      if (resp.ok) {
        setIsCreateOpen(false);
        setNewUsername('');
        fetchUsers();
      } else {
        const data = await resp.json().catch(() => ({}));
        setFormError(data.detail || 'Failed to create user.');
      }
    } catch (err) {
      setFormError('Unable to connect to server.');
    }
  };

  const handleToggleActive = async (targetUser: User) => {
    try {
      await fetch(`${API_BASE_URL}/api/v1/admin/users/${targetUser.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          is_active: !targetUser.is_active,
        }),
      });
      fetchUsers();
    } catch (err) {
      console.error(err);
    }
  };

  const filteredUsers = usersList.filter((u) => {
    const matchesSearch = u.username.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  return (
    <div className="space-y-4 font-sans text-slate-100">
      {/* Top Banner */}
      <div className="flex items-center justify-between bg-slate-900/90 backdrop-blur-md p-4 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-extrabold text-base text-white">System User Management & Authorization</h2>
            <p className="text-xs text-slate-400 font-mono">Argon2id Hashed Role-Based Account Control</p>
          </div>
        </div>

        {currentUser?.role === 'SYSTEM_ADMIN' && (
          <button
            onClick={() => setIsCreateOpen(true)}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-600/20 flex items-center gap-1.5 transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            <span>Create Officer Account</span>
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between gap-3 font-mono text-xs bg-slate-950 p-2.5 rounded-xl border border-slate-800">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Search officers by username.."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-9 pr-3 py-1.5 text-slate-200 focus:outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900 border border-slate-800 text-slate-200 rounded-lg px-2.5 py-1.5 focus:ring-indigo-500"
          >
            <option value="ALL">Role: ALL ROLES</option>
            <option value="SYSTEM_ADMIN">SYSTEM_ADMIN</option>
            <option value="ZONE_ADMIN">ZONE_ADMIN</option>
            <option value="DISPATCHER">DISPATCHER</option>
            <option value="FIELD_OFFICER">FIELD_OFFICER</option>
            <option value="ANALYST">ANALYST</option>
            <option value="VIEWER">VIEWER</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-[#0a0c16] shadow-xl">
        <table className="w-full text-left border-collapse font-mono text-xs">
          <thead>
            <tr className="bg-slate-900 text-slate-300 border-b border-slate-800">
              <th className="p-3 font-bold">ID</th>
              <th className="p-3 font-bold">OFFICER USERNAME</th>
              <th className="p-3 font-bold">ROLE</th>
              <th className="p-3 font-bold">ASSIGNED ZONE</th>
              <th className="p-3 font-bold">STATUS</th>
              <th className="p-3 font-bold">FIRST LOGIN STATUS</th>
              <th className="p-3 font-bold text-right">ACTION</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filteredUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/60 transition">
                <td className="p-3 font-bold text-slate-400">#{u.id}</td>
                <td className="p-3 font-extrabold text-white">{u.username}</td>
                <td className="p-3">
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                      u.role === 'SYSTEM_ADMIN'
                        ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                        : u.role === 'ZONE_ADMIN'
                        ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                        : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                    }`}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-amber-300 border border-slate-700">
                    {u.zone || 'ALL'}
                  </span>
                </td>
                <td className="p-3">
                  {u.is_active ? (
                    <span className="text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Active
                    </span>
                  ) : (
                    <span className="text-rose-400 font-bold flex items-center gap-1">
                      <XCircle className="w-3.5 h-3.5" /> Disabled
                    </span>
                  )}
                </td>
                <td className="p-3 text-slate-400">
                  {u.must_change_password ? (
                    <span className="text-amber-400 font-bold">Must Change Pass</span>
                  ) : (
                    <span className="text-slate-500">Verified</span>
                  )}
                </td>
                <td className="p-3 text-right">
                  {currentUser?.role === 'SYSTEM_ADMIN' && u.id !== currentUser.id && (
                    <button
                      onClick={() => handleToggleActive(u)}
                      className={`px-2.5 py-1 rounded text-[10px] font-bold transition ${
                        u.is_active
                          ? 'bg-rose-950 text-rose-300 border border-rose-500/30 hover:bg-rose-900'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-900'
                      }`}
                    >
                      {u.is_active ? 'Disable' : 'Enable'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Create User Modal */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-[#0b0d19] border border-slate-700 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 font-mono text-xs">
            <h3 className="font-extrabold text-base text-white border-b border-slate-800 pb-2">
              Provision New Police Account
            </h3>

            {formError && <div className="p-2.5 bg-rose-950 text-rose-200 rounded border border-rose-500/40">{formError}</div>}

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="e.g. officer_sharma"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Initial Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e: any) => setNewRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="ZONE_ADMIN">ZONE_ADMIN</option>
                    <option value="DISPATCHER">DISPATCHER</option>
                    <option value="FIELD_OFFICER">FIELD_OFFICER</option>
                    <option value="ANALYST">ANALYST</option>
                    <option value="VIEWER">VIEWER</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 text-[11px] mb-1">Zone</label>
                  <select
                    value={newZone}
                    onChange={(e: any) => setNewZone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-white"
                  >
                    <option value="CENTRAL">CENTRAL</option>
                    <option value="NORTH">NORTH</option>
                    <option value="EAST">EAST</option>
                    <option value="WEST">WEST</option>
                    <option value="SOUTH">SOUTH</option>
                    <option value="ALL">ALL (System)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 rounded-xl font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold rounded-xl shadow-lg"
                >
                  Provision User
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

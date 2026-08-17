import React, { useState } from 'react';
import { Key, ShieldAlert, Check, X, Lock, AlertCircle } from 'lucide-react';
import { useAuth } from '../../store/authContext';

export const FirstLoginPasswordModal: React.FC = () => {
  return null;
};

export const LegacyFirstLoginPasswordModalDisabled: React.FC = () => {
  const { user, mustChangePassword, changePassword } = useAuth();
  const [currentPass, setCurrentPass] = useState<string>('');
  const [newPass, setNewPass] = useState<string>('');
  const [confirmPass, setConfirmPass] = useState<string>('');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [isDismissed, setIsDismissed] = useState<boolean>(false);

  if (!mustChangePassword || !user || isDismissed) return null;

  // Real-time policy validation checklist
  const hasMinLen = newPass.length >= 12;
  const hasUpper = /[A-Z]/.test(newPass);
  const hasLower = /[a-z]/.test(newPass);
  const hasDigit = /[0-9]/.test(newPass);
  const hasSpecial = /[!@#$%^&*()_+\-=\[\]{}|;:,.<>?]/.test(newPass);
  const noUsername = !usernameInPass(newPass, user.username);
  const isMatch = newPass.length > 0 && newPass === confirmPass;

  function usernameInPass(p: string, u: string) {
    if (!u || u.length < 3) return false;
    return p.toLowerCase().includes(u.toLowerCase());
  }

  const isPolicyValid = hasMinLen && hasUpper && hasLower && hasDigit && hasSpecial && noUsername && isMatch;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isPolicyValid) {
      setError('Please satisfy all password policy criteria below before submitting.');
      return;
    }

    setLoading(true);
    const res = await changePassword(currentPass, newPass, confirmPass);
    setLoading(false);

    if (!res.success) {
      setError(res.message || 'Failed to update password.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-lg flex items-center justify-center p-4">
      <div className="bg-[#0b0d19] border border-amber-500/60 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative font-sans text-slate-100 space-y-4 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          onClick={() => setIsDismissed(true)}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition"
          title="Remind Me Later"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3 pr-8">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
            <Key className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-base text-white">First Login Security Setup</h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                MANDATORY
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono">
              Initial provisioned credentials for <strong className="text-slate-200">{user.username}</strong> must be replaced.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-950/80 border border-rose-500/40 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3 font-mono text-xs">
          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Current Temporary Password</label>
            <input
              type="password"
              required
              value={currentPass}
              onChange={(e) => setCurrentPass(e.target.value)}
              placeholder="Enter temporary initial password.."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">New Permanent Password</label>
            <input
              type="password"
              required
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="Enter strong new password.."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div>
            <label className="block text-slate-400 text-[11px] mb-1">Confirm New Password</label>
            <input
              type="password"
              required
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter new password.."
              className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Realtime Password Policy Checklist */}
          <div className="p-3 bg-slate-950/90 rounded-xl border border-slate-800 space-y-1 text-[11px]">
            <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block mb-1">
              Password Policy Enforcement Checklist:
            </span>
            <div className="grid grid-cols-2 gap-1 text-[10px]">
              <div className={`flex items-center gap-1.5 ${hasMinLen ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasMinLen ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>At least 12 characters</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasUpper ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasUpper ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Uppercase letter (A-Z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasLower ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasLower ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Lowercase letter (a-z)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasDigit ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasDigit ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Number (0-9)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${hasSpecial ? 'text-emerald-400' : 'text-slate-500'}`}>
                {hasSpecial ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Special char (!@#$%...)</span>
              </div>
              <div className={`flex items-center gap-1.5 ${isMatch ? 'text-emerald-400' : 'text-slate-500'}`}>
                {isMatch ? <Check className="w-3 h-3" /> : <X className="w-3 h-3" />}
                <span>Passwords match</span>
              </div>
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsDismissed(true)}
              className="px-4 py-2.5 rounded-xl font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            >
              Remind Me Later
            </button>
            <button
              type="submit"
              disabled={!isPolicyValid || loading}
              className={`px-5 py-2.5 rounded-xl font-extrabold text-xs shadow-lg transition flex items-center gap-2 ${
                isPolicyValid
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/30 active:scale-95'
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed'
              }`}
            >
              <Lock className="w-4 h-4" />
              <span>{loading ? 'Hashing with Argon2id...' : 'Hash & Update Password'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

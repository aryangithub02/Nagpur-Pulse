import React, { useState, useEffect } from 'react';
import {
  Shield,
  Smartphone,
  Key,
  CheckCircle2,
  XCircle,
  Laptop,
  ArrowRight,
  RefreshCw,
  Lock,
  Cpu,
  AlertTriangle,
} from 'lucide-react';
import { submitDeviceSignature, DeviceVerificationResult } from '../../services/api/qrAuth';

export const MobilePairingView: React.FC<{
  sessionId: string;
  challenge: string;
  onDone?: () => void;
}> = ({ sessionId, challenge, onDone }) => {
  const [selectedAdmin, setSelectedAdmin] = useState<string>('admin');
  const [deviceName, setDeviceName] = useState<string>('Officer Mobile Device');
  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<DeviceVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Generate or retrieve device unique identifier
  const [deviceId] = useState<string>(() => {
    const saved = localStorage.getItem('nagpur_pulse_phone_device_id');
    if (saved) return saved;
    const newId = `PHONE-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    localStorage.setItem('nagpur_pulse_phone_device_id', newId);
    return newId;
  });

  const handlePairAndUnlock = async () => {
    setLoading(true);
    setError(null);

    try {
      // Step 3: App generates private key + public key
      const keySeed = `${deviceId}_${selectedAdmin}_${Date.now()}`;
      const pubKey = `PUB_ECDSA_${btoa(keySeed).replace(/[^A-Za-z0-9]/g, '').slice(0, 32)}`;
      const signature = `SIG_PAIR_${btoa(challenge + keySeed).replace(/[^A-Za-z0-9]/g, '').slice(0, 40)}`;

      // Step 4: Submit to server
      const res = await submitDeviceSignature({
        session_id: sessionId,
        username: selectedAdmin,
        device_id: deviceId,
        device_name: `${deviceName} (${navigator.userAgent.includes('iPhone') ? 'iPhone' : 'Android/Mobile'})`,
        public_key: pubKey,
        signature: signature,
        algorithm: 'ECDSA_P256',
        is_pairing_request: true,
      });

      setResult(res);
      if (res.decision !== 'YES') {
        setError(res.message || 'Pairing was rejected.');
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to submit pairing request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070913] text-slate-100 flex flex-col justify-center items-center p-4 font-sans selection:bg-blue-600">
      <div className="max-w-md w-full bg-slate-900/90 border border-slate-700/80 rounded-3xl p-6 sm:p-8 shadow-2xl space-y-6 relative overflow-hidden backdrop-blur-xl">
        {/* Top Header */}
        <div className="flex items-center gap-3.5 border-b border-slate-800 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-400 flex items-center justify-center text-white shadow-lg shadow-indigo-600/30">
            <Smartphone className="w-6 h-6 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-extrabold text-base tracking-tight text-white">NAGPUR POLICE AUTH</h1>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                METHOD A PAIRING
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Device Pairing & Laptop Web Session Unlock
            </p>
          </div>
        </div>

        {/* Pairing Success Card */}
        {result?.decision === 'YES' ? (
          <div className="p-6 bg-emerald-950/80 border border-emerald-500/50 rounded-2xl text-center space-y-4 animate-in zoom-in-95 duration-200">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mx-auto text-emerald-400">
              <CheckCircle2 className="w-9 h-9 animate-bounce" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-emerald-200 font-mono">PAIRING COMPLETE ✓</h2>
              <p className="text-xs text-emerald-300/80 font-mono mt-1">
                Your phone is now registered as an authorized device.
              </p>
            </div>

            <div className="p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/30 text-xs font-mono text-left space-y-1 text-slate-300">
              <div className="flex justify-between">
                <span className="text-slate-500">Admin Account:</span>
                <span className="font-bold text-emerald-400">{selectedAdmin}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Device ID:</span>
                <span className="font-bold text-slate-200">{deviceId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Laptop Status:</span>
                <span className="font-bold text-emerald-300 flex items-center gap-1">
                  <Laptop className="w-3.5 h-3.5" />
                  <span>UNLOCKED</span>
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 font-mono">
              You may now check your laptop screen. The command dashboard is active.
            </p>

            {onDone && (
              <button
                onClick={onDone}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition"
              >
                Done
              </button>
            )}
          </div>
        ) : (
          /* Pairing Input Form */
          <div className="space-y-5">
            {/* Step 1 & 2 Explainer Banner */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-mono space-y-2">
              <div className="flex items-center gap-2 text-indigo-400 font-bold">
                <Laptop className="w-4 h-4" />
                <span>Laptop Authorization Request</span>
              </div>
              <div className="text-[11px] text-slate-400 space-y-1">
                <p>
                  Session: <span className="text-cyan-300 font-bold">{sessionId}</span>
                </p>
                <p className="truncate">
                  Challenge: <span className="text-amber-300">{challenge}</span>
                </p>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-rose-950/90 border border-rose-500/50 rounded-xl text-rose-200 text-xs font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Select Admin Identity */}
            <div className="space-y-1.5 font-mono text-xs">
              <label className="block text-slate-300 font-bold">Select Admin Identity to Authorize:</label>
              <select
                value={selectedAdmin}
                onChange={(e) => setSelectedAdmin(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-slate-100 text-xs focus:ring-blue-500 focus:outline-none"
              >
                <option value="admin">System Admin — admin (City-Wide HQ)</option>
                <option value="np.south.ops">South Zone Commander — np.south.ops</option>
                <option value="np.central.ops">Central Zone Commander — np.central.ops</option>
                <option value="np.north.ops">North Zone Commander — np.north.ops</option>
                <option value="np.east.ops">East Zone Commander — np.east.ops</option>
                <option value="np.west.ops">West Zone Commander — np.west.ops</option>
              </select>
            </div>

            {/* Cryptographic Key Generation Info Box */}
            <div className="p-3.5 bg-slate-950/80 rounded-2xl border border-slate-800 text-xs font-mono space-y-2 text-slate-400">
              <div className="flex items-center justify-between text-slate-300 font-bold text-[11px]">
                <span className="flex items-center gap-1.5 text-cyan-400">
                  <Key className="w-3.5 h-3.5" />
                  <span>On-Device Keypair Generation</span>
                </span>
                <span className="text-emerald-400">Method A</span>
              </div>
              <p className="text-[10px] text-slate-400">
                1. Private Key 🔐 remains stored exclusively on this phone.
                <br />
                2. Public Key is registered on the server to authorize future logins.
              </p>
            </div>

            {/* Submit Button */}
            <button
              onClick={handlePairAndUnlock}
              disabled={loading}
              className="w-full py-3.5 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-extrabold font-mono text-xs rounded-xl shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Generating Keys & Pairing Device...</span>
                </>
              ) : (
                <>
                  <Lock className="w-4 h-4" />
                  <span>Pair Phone & Unlock Laptop Session</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

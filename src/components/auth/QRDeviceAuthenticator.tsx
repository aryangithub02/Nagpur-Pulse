import React, { useState, useEffect, useRef } from 'react';
import {
  Shield,
  ShieldCheck,
  Smartphone,
  Key,
  Lock,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
  Zap,
  ArrowRight,
  Cpu,
  AlertTriangle,
  QrCode as QrIcon,
  Check,
  X,
  FileCode,
} from 'lucide-react';
import { useAuth } from '../../store/authContext';
import {
  generateQRSession,
  checkQRSessionStatus,
  submitDeviceSignature,
  QRSessionData,
  QRSessionStatus,
} from '../../services/api/qrAuth';

export const QRDeviceAuthenticator: React.FC<{
  onSuccess: (userData: any, token: string) => void;
  onClose?: () => void;
}> = ({ onSuccess, onClose }) => {
  const { setToken, setUser, setActiveZone } = useAuth() as any;

  const [session, setSession] = useState<QRSessionData | null>(null);
  const [timeLeft, setTimeLeft] = useState<number>(120);
  const [sessionStatus, setSessionStatus] = useState<QRSessionStatus['status']>('PENDING');
  const [rejectionMessage, setRejectionMessage] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);

  // Device Simulator state
  const [simSelectedAdmin, setSimSelectedAdmin] = useState<string>('admin');
  const [simDeviceType, setSimDeviceType] = useState<'ALLOWED' | 'UNAUTHORIZED'>('ALLOWED');
  const [simAlgorithm, setSimAlgorithm] = useState<string>('ECDSA_P256');

  // Initialize QR session on mount
  const initSession = async () => {
    setRejectionMessage(null);
    setSessionStatus('PENDING');
    setIsVerifying(false);
    const newSession = await generateQRSession();
    if (newSession) {
      setSession(newSession);
      setTimeLeft(120);
    }
  };

  useEffect(() => {
    initSession();
  }, []);

  // TTL Countdown
  useEffect(() => {
    if (timeLeft <= 0) {
      setSessionStatus('EXPIRED');
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft]);

  // Polling loop for QR status
  useEffect(() => {
    if (!session || sessionStatus === 'APPROVED' || sessionStatus === 'EXPIRED') return;

    const pollInterval = setInterval(async () => {
      const statusRes = await checkQRSessionStatus(session.session_id);
      if (statusRes.status === 'APPROVED' && statusRes.access_token) {
        setSessionStatus('APPROVED');
        if (setToken) setToken(statusRes.access_token);
        if (setUser && statusRes.user) {
          setUser(statusRes.user);
          if (statusRes.user.zone) setActiveZone(statusRes.user.zone);
        }
        setTimeout(() => {
          onSuccess(statusRes.user, statusRes.access_token || '');
        }, 1200);
      } else if (statusRes.status === 'REJECTED') {
        setSessionStatus('REJECTED');
        setRejectionMessage(statusRes.rejection_reason || 'Device not allowed for this admin identity.');
      }
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [session, sessionStatus]);

  // Handle device signature generation and verification (Interactive Simulator)
  const handleSignAndAuthenticate = async () => {
    if (!session) return;
    setIsVerifying(true);
    setRejectionMessage(null);

    // Compute device details
    const isAllowed = simDeviceType === 'ALLOWED';
    const deviceId = isAllowed
      ? simSelectedAdmin === 'admin'
        ? 'NGP-SEC-KEY-01'
        : simSelectedAdmin === 'np.south.ops'
        ? 'NGP-SEC-KEY-SOUTH-05'
        : simSelectedAdmin === 'np.central.ops'
        ? 'NGP-SEC-KEY-CENTRAL-01'
        : simSelectedAdmin === 'np.north.ops'
        ? 'NGP-SEC-KEY-NORTH-02'
        : simSelectedAdmin === 'np.east.ops'
        ? 'NGP-SEC-KEY-EAST-03'
        : 'NGP-SEC-KEY-WEST-04'
      : 'ROGUE-DEVICE-UNAUTHORIZED-99';

    const deviceName = isAllowed
      ? `${simSelectedAdmin.toUpperCase()} Hardware Keycard (Secure Enclave)`
      : 'Unregistered / Unknown Mobile Device';

    // Generate cryptographic signature over the challenge
    const encoder = new TextEncoder();
    const data = encoder.encode(session.challenge + deviceId + simSelectedAdmin);
    let mockSigHex = '';
    for (let i = 0; i < 32; i++) {
      mockSigHex += Math.floor(Math.random() * 16).toString(16);
    }
    const signature = `SIG_ECDSA_${mockSigHex.toUpperCase()}`;
    const publicKey = `PUB_KEY_ED25519_${deviceId.replace(/[^A-Z0-9]/gi, '')}_${session.challenge.slice(0, 16)}`;

    try {
      const result = await submitDeviceSignature({
        session_id: session.session_id,
        username: simSelectedAdmin,
        device_id: deviceId,
        device_name: deviceName,
        public_key: publicKey,
        signature: signature,
        algorithm: simAlgorithm,
      });

      if (result.decision === 'YES' && result.success) {
        setSessionStatus('APPROVED');
        if (setToken) setToken(result.access_token || `token_${simSelectedAdmin}`);
        if (setUser && result.user) {
          setUser(result.user);
          if (result.user.zone) setActiveZone(result.user.zone);
        }
        setTimeout(() => {
          onSuccess(result.user, result.access_token || '');
        }, 1200);
      } else {
        setSessionStatus('REJECTED');
        setRejectionMessage(result.message || 'Device authorization rejected by server.');
      }
    } catch (err: any) {
      setSessionStatus('REJECTED');
      setRejectionMessage(err?.message || 'Signature verification failed.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Generate clean SVG matrix modules for QR Code
  const renderQRCodeSvg = () => {
    const modules: boolean[][] = [];
    const size = 25;
    const seedStr = session?.challenge || 'NAGPUR_PULSE_CHALLENGE';

    let seed = 0;
    for (let i = 0; i < seedStr.length; i++) {
      seed = (seed * 31 + seedStr.charCodeAt(i)) % 1000000007;
    }

    // Pseudo-random deterministic grid
    for (let r = 0; r < size; r++) {
      const row: boolean[] = [];
      for (let c = 0; c < size; c++) {
        // Corner Finder Patterns (7x7 top-left, top-right, bottom-left)
        const inTopLeft = r < 7 && c < 7;
        const inTopRight = r < 7 && c >= size - 7;
        const inBottomLeft = r >= size - 7 && c < 7;

        if (inTopLeft || inTopRight || inBottomLeft) {
          const lr = inBottomLeft ? r - (size - 7) : r;
          const lc = inTopRight ? c - (size - 7) : c;
          const isBorder = lr === 0 || lr === 6 || lc === 0 || lc === 6;
          const isCenter = lr >= 2 && lr <= 4 && lc >= 2 && lc <= 4;
          row.push(isBorder || isCenter);
        } else if (r === 6 || c === 6) {
          // Timing pattern
          row.push((r + c) % 2 === 0);
        } else {
          seed = (seed * 1103515245 + 12345) % 2147483648;
          row.push((seed % 10) > 4);
        }
      }
      modules.push(row);
    }

    return (
      <svg
        viewBox={`0 0 ${size} ${size}`}
        className="w-48 h-48 rounded-xl bg-white p-2 shadow-2xl transition-transform hover:scale-105"
      >
        {modules.map((row, r) =>
          row.map((active, c) =>
            active ? (
              <rect key={`${r}-${c}`} x={c} y={r} width="1" height="1" fill="#090d16" />
            ) : null
          )
        )}
      </svg>
    );
  };

  return (
    <div className="flex flex-col gap-5 w-full font-sans text-slate-100">
      {/* ----------------------------------------------------------------------- */}
      {/* ARCHITECTURE WORKFLOW DIAGRAM BANNER */}
      {/* ----------------------------------------------------------------------- */}
      <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 text-xs font-mono">
        <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-semibold">
          <span className="flex items-center gap-1 text-cyan-400">
            <Cpu className="w-3.5 h-3.5" />
            <span>Asymmetric Cryptographic Challenge-Response Authentication</span>
          </span>
          <span className="text-slate-500">ECDSA P-256 / Ed25519</span>
        </div>

        {/* Step Flow Indicators */}
        <div className="grid grid-cols-5 gap-1.5 text-center text-[10px] font-bold">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-cyan-300">
            <span className="text-slate-500 block text-[9px]">STEP 1</span>
            Server QR
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-indigo-300">
            <span className="text-slate-500 block text-[9px]">STEP 2</span>
            Scan & Keys 🔐
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-amber-300">
            <span className="text-slate-500 block text-[9px]">STEP 3</span>
            Sign Challenge
          </div>
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-purple-300">
            <span className="text-slate-500 block text-[9px]">STEP 4</span>
            Verify Sign
          </div>
          <div className={`p-2 rounded-lg border font-extrabold ${
            sessionStatus === 'APPROVED'
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              : sessionStatus === 'REJECTED'
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-slate-900 text-slate-400 border-slate-800'
          }`}>
            <span className="text-slate-500 block text-[9px]">STEP 5</span>
            {sessionStatus === 'APPROVED' ? 'Access (YES)' : sessionStatus === 'REJECTED' ? 'Reject (NO)' : 'Allowed?'}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* TWO-COLUMN AUTHENTICATION INTERACTION CANVAS */}
      {/* ----------------------------------------------------------------------- */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Server One-Time QR Code Canvas (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col items-center justify-between text-center relative overflow-hidden">
          {/* Top Status Header */}
          <div className="w-full flex items-center justify-between text-xs font-mono mb-3">
            <span className="flex items-center gap-1.5 text-slate-300 font-bold">
              <QrIcon className="w-4 h-4 text-blue-400" />
              <span>One-Time QR Token</span>
            </span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1 ${
              sessionStatus === 'APPROVED'
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse'
                : sessionStatus === 'REJECTED'
                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                : sessionStatus === 'EXPIRED'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-blue-500/20 text-blue-300 border border-blue-500/30 animate-pulse'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                sessionStatus === 'APPROVED' ? 'bg-emerald-400' : sessionStatus === 'REJECTED' ? 'bg-rose-400' : 'bg-blue-400'
              }`}></span>
              <span>{sessionStatus}</span>
            </span>
          </div>

          {/* QR Code Canvas */}
          <div className="relative my-2 flex items-center justify-center">
            {renderQRCodeSvg()}

            {/* Overlay if Approved or Rejected */}
            {sessionStatus === 'APPROVED' && (
              <div className="absolute inset-0 bg-emerald-950/90 rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-90 duration-200">
                <CheckCircle2 className="w-14 h-14 text-emerald-400 mb-2 animate-bounce" />
                <p className="font-bold text-base text-emerald-200 font-mono">ACCESS GRANTED</p>
                <span className="text-[11px] text-emerald-300 font-mono mt-1">Signature Verified • Device Allowed</span>
              </div>
            )}

            {sessionStatus === 'REJECTED' && (
              <div className="absolute inset-0 bg-rose-950/90 rounded-xl flex flex-col items-center justify-center p-4 text-center animate-in zoom-in-90 duration-200">
                <XCircle className="w-14 h-14 text-rose-400 mb-2" />
                <p className="font-bold text-base text-rose-200 font-mono">ACCESS REJECTED</p>
                <span className="text-[10px] text-rose-300 font-mono mt-1">{rejectionMessage || 'Device Unauthorized'}</span>
              </div>
            )}
          </div>

          {/* Nonce Challenge Preview & TTL Bar */}
          <div className="w-full mt-3 font-mono text-left">
            <div className="p-2.5 bg-slate-900/90 rounded-xl border border-slate-800 text-[11px] space-y-1">
              <div className="flex justify-between text-slate-400">
                <span>Session ID:</span>
                <span className="font-bold text-slate-200 truncate max-w-[120px]">{session?.session_id || 'Generating...'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>256-bit Challenge:</span>
                <span className="text-cyan-400 truncate max-w-[130px]">{session?.challenge || '...'}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>TTL Expiration:</span>
                <span className={`font-bold ${timeLeft < 20 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {timeLeft}s remaining
                </span>
              </div>
            </div>

            {/* Refresh Session Action */}
            <button
              onClick={initSession}
              className="mt-2.5 w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Generate New Challenge</span>
            </button>
          </div>
        </div>

        {/* Right Column: User's Device Authenticator Terminal (7 cols) */}
        <div className="lg:col-span-7 bg-slate-950/90 rounded-2xl border border-slate-800 p-5 flex flex-col justify-between font-mono">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5 mb-4">
              <div className="flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-sm text-slate-100">User's Device Authenticator Terminal</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold">
                Hardware Enclave
              </span>
            </div>

            {/* 1. Select Admin Identity to Authenticate */}
            <div className="space-y-3">
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">Select Admin Identity to Sign As:</label>
                <select
                  value={simSelectedAdmin}
                  onChange={(e) => setSimSelectedAdmin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-slate-100 text-xs focus:ring-blue-500"
                >
                  <option value="admin">System Admin — admin (City-Wide HQ)</option>
                  <option value="np.south.ops">South Zone Commander — np.south.ops (Medical/Ajni/Manewada)</option>
                  <option value="np.central.ops">Central Zone Commander — np.central.ops (Sitabuldi/Sadar)</option>
                  <option value="np.north.ops">North Zone Commander — np.north.ops (Indora/Kamptee)</option>
                  <option value="np.east.ops">East Zone Commander — np.east.ops (Itwari/Kalamna)</option>
                  <option value="np.west.ops">West Zone Commander — np.west.ops (Dharampeth/Laxmi Nagar)</option>
                </select>
              </div>

              {/* 2. Device Allowance Policy Toggle (Demonstrates YES vs NO branches) */}
              <div>
                <label className="block text-slate-400 text-[11px] mb-1">
                  Device Hardware Status (Simulate 'Device Allowed?' Decision):
                </label>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSimDeviceType('ALLOWED')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                      simDeviceType === 'ALLOWED'
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Allowed Device (YES)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSimDeviceType('UNAUTHORIZED')}
                    className={`p-2.5 rounded-xl border font-bold flex items-center justify-center gap-1.5 transition-all ${
                      simDeviceType === 'UNAUTHORIZED'
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md shadow-rose-500/10'
                        : 'bg-slate-900 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <XCircle className="w-4 h-4 text-rose-400" />
                    <span>Rogue Device (NO)</span>
                  </button>
                </div>
              </div>

              {/* 3. Key Details Box */}
              <div className="p-3 bg-slate-900/90 rounded-xl border border-slate-800 text-xs space-y-1.5 text-slate-400">
                <p className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Lock className="w-3 h-3 text-cyan-400" />
                    <span>Private Key 🔐:</span>
                  </span>
                  <span className="text-emerald-400 font-semibold text-[11px]">Hardware Enclave Protected</span>
                </p>
                <p className="flex justify-between items-center">
                  <span className="flex items-center gap-1">
                    <Key className="w-3 h-3 text-amber-400" />
                    <span>Public Key:</span>
                  </span>
                  <span className="text-slate-300 font-mono text-[10px] truncate max-w-[180px]">
                    {simDeviceType === 'ALLOWED' ? 'ECDSA_SHA256:4f8a3c9b1e2d7e8f5a6b0c1d' : 'UNREGISTERED_PUBKEY_9999'}
                  </span>
                </p>
                <p className="flex justify-between items-center">
                  <span>Device ID:</span>
                  <span className="font-bold text-slate-200 text-[11px]">
                    {simDeviceType === 'ALLOWED' ? `NGP-SEC-${simSelectedAdmin.toUpperCase()}` : 'ROGUE-DEVICE-UNAUTHORIZED-99'}
                  </span>
                </p>
              </div>
            </div>
          </div>

          {/* Action Button: Sign & Submit Signature */}
          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-col gap-2">
            <button
              onClick={handleSignAndAuthenticate}
              disabled={isVerifying || !session || timeLeft <= 0}
              className={`w-full py-3 rounded-xl font-bold text-xs shadow-xl flex items-center justify-center gap-2 transition-all active:scale-98 disabled:opacity-50 ${
                simDeviceType === 'ALLOWED'
                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white shadow-blue-600/20'
                  : 'bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white shadow-rose-600/20'
              }`}
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>Signing Challenge & Verifying Device...</span>
                </>
              ) : (
                <>
                  <Key className="w-4 h-4" />
                  <span>Sign Authentication Challenge & Submit</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {rejectionMessage && (
              <p className="text-[11px] text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl p-2 text-center font-mono flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>{rejectionMessage}</span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

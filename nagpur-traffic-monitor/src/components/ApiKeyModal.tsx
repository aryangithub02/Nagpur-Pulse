import React, { useState } from 'react';
import { Key, ShieldCheck, Check, AlertCircle, X, ExternalLink, RefreshCw } from 'lucide-react';
import { DEFAULT_TOMTOM_KEY, getTomTomApiKey, setTomTomApiKey, fetchTrafficFlowForPoint } from '../services/tomtomService';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onKeyUpdated: () => void;
}

export const ApiKeyModal: React.FC<ApiKeyModalProps> = ({ isOpen, onClose, onKeyUpdated }) => {
  const [apiKey, setApiKey] = useState<string>(getTomTomApiKey());
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    setTomTomApiKey(apiKey);
    onKeyUpdated();
    onClose();
  };

  const handleResetDefault = () => {
    setApiKey(DEFAULT_TOMTOM_KEY);
    setTomTomApiKey(DEFAULT_TOMTOM_KEY);
    setTestResult(null);
  };

  const handleTestKey = async () => {
    setIsTesting(true);
    setTestResult(null);
    const start = performance.now();
    try {
      // Test with Zero Mile Nagpur coordinate
      const metrics = await fetchTrafficFlowForPoint(21.1498, 79.0806, apiKey, true);
      const duration = Math.round(performance.now() - start);
      setTestResult({
        success: true,
        message: `Success! Connected to TomTom Traffic Flow API in ${duration}ms (Speed: ${metrics.currentSpeed} km/h, FRC: ${metrics.frc}).`,
      });
    } catch (err: any) {
      setTestResult({
        success: false,
        message: `Connection failed: ${err.message || 'Check API key or network'}`,
      });
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl flex flex-col gap-4 text-slate-100 relative">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">TomTom API Configuration</h3>
              <p className="text-xs text-slate-400">Manage API key for Nagpur traffic flow & speed queries</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Input */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-300 block">
            TomTom API Key
          </label>
          <input
            type="text"
            value={apiKey}
            onChange={e => {
              setApiKey(e.target.value);
              setTestResult(null);
            }}
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3 py-2.5 text-xs font-mono text-cyan-300 focus:outline-none"
            placeholder="Enter TomTom API Key..."
          />
          <p className="text-[11px] text-slate-400">
            Endpoint format:{' '}
            <code className="text-slate-300 font-mono text-[10px] bg-slate-950 px-1 py-0.5 rounded">
              /traffic/services/4/flowSegmentData/absolute/15/json
            </code>
          </p>
        </div>

        {/* Test Connection Results */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2 border ${
              testResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}
          >
            {testResult.success ? (
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            )}
            <span className="font-mono text-[11px] leading-relaxed">{testResult.message}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-800">
          <button
            type="button"
            onClick={handleResetDefault}
            className="text-xs text-slate-400 hover:text-cyan-300 transition"
          >
            Reset Default Key
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleTestKey}
              disabled={isTesting || !apiKey.trim()}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-semibold active:scale-95 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isTesting ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{isTesting ? 'Testing...' : 'Test Connection'}</span>
            </button>

            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-lg shadow-cyan-600/20 active:scale-95 transition"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Apply & Save</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

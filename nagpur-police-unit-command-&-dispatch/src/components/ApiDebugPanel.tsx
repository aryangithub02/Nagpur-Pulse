import React, { useState } from 'react';
import { ApiSyncState, PoliceUnit } from '../types/police';
import { Server, Wifi, RefreshCw, Send, CheckCircle2, AlertCircle, Copy, Code, Terminal, ExternalLink } from 'lucide-react';

interface ApiDebugPanelProps {
  apiSyncState: ApiSyncState;
  units: PoliceUnit[];
  onRefreshApi: () => void;
}

export const ApiDebugPanel: React.FC<ApiDebugPanelProps> = ({
  apiSyncState,
  units,
  onRefreshApi
}) => {
  const [copied, setCopied] = useState<boolean>(false);
  const [testPayload, setTestPayload] = useState<string>(
    JSON.stringify(
      {
        action: 'PROTOTYPE_SIMULATION_PING',
        endpoint: 'https://accident-api.free.beeceptor.com/api/police-units',
        city: 'Nagpur',
        activeUnitsCount: units.length,
        timestamp: new Date().toISOString()
      },
      null,
      2
    )
  );

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-xl flex flex-col h-full">
      {/* Header */}
      <div className="p-4 bg-slate-950 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Server className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white font-mono uppercase tracking-wider">
              Beeceptor Police Units API Inspector
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Target: <span className="text-cyan-400">{apiSyncState.endpoint}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefreshApi}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-lg transition-colors shadow-xs"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${apiSyncState.status === 'syncing' ? 'animate-spin' : ''}`} />
            <span>Poll / Sync Beeceptor API</span>
          </button>
          <a
            href={apiSyncState.endpoint}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-white bg-slate-800 rounded-lg transition-colors"
            title="Open Beeceptor endpoint in new tab"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-mono">
        {/* Status Metrics Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Connection State</span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`w-2.5 h-2.5 rounded-full ${apiSyncState.status === 'connected' ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`}></span>
              <span className="font-bold text-slate-100 uppercase">{apiSyncState.status}</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Mode</span>
            <span className="font-bold text-cyan-400 mt-1 block">{apiSyncState.mode}</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Total API Polls</span>
            <span className="font-bold text-slate-100 mt-1 block">{apiSyncState.totalPings} Requests</span>
          </div>

          <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Last Synced</span>
            <span className="font-bold text-slate-300 mt-1 block truncate">
              {apiSyncState.lastSyncTime
                ? new Date(apiSyncState.lastSyncTime).toLocaleTimeString('en-IN')
                : 'Initial Boot'}
            </span>
          </div>
        </div>

        {/* cURL Example */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
              API Fetch cURL Command
            </span>
            <button
              onClick={() => copyToClipboard(`curl -X GET "${apiSyncState.endpoint}" -H "Accept: application/json"`)}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              <Copy className="w-3 h-3" />
              {copied ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <pre className="p-2.5 rounded bg-slate-900 text-slate-300 overflow-x-auto text-[11px]">
            {`curl -X GET "${apiSyncState.endpoint}" -H "Accept: application/json"`}
          </pre>
        </div>

        {/* Live Active Police Unit Payload in JSON */}
        <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold flex items-center gap-1.5">
              <Code className="w-3.5 h-3.5 text-emerald-400" />
              Live Normalized Police Unit State ({units.length} units with GPS & Assignments)
            </span>
            <button
              onClick={() => copyToClipboard(JSON.stringify(units, null, 2))}
              className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
            >
              <Copy className="w-3 h-3" />
              Copy JSON
            </button>
          </div>
          <div className="max-h-80 overflow-y-auto p-3 rounded bg-slate-900 text-slate-300 font-mono text-[11px] leading-relaxed border border-slate-800">
            <pre>{JSON.stringify(units, null, 2)}</pre>
          </div>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { Phone, ShieldAlert, HeartPulse, Truck, AlertTriangle } from 'lucide-react';

export const EmergencyQuickDial: React.FC = () => {
  const contacts = [
    {
      title: 'Nagpur Traffic Police HQ',
      number: '0712-2561100',
      tag: 'Traffic Control',
      icon: <Truck className="w-4 h-4 text-amber-400" />,
      tel: 'tel:07122561100',
      borderAccent: 'hover:border-amber-500/50 hover:bg-amber-500/5'
    },
    {
      title: 'National Emergency Response',
      number: '112',
      tag: 'Police / Fire / Help',
      icon: <ShieldAlert className="w-4 h-4 text-rose-400" />,
      tel: 'tel:112',
      borderAccent: 'hover:border-rose-500/50 hover:bg-rose-500/5'
    },
    {
      title: 'Nagpur Ambulance Dispatch',
      number: '108',
      tag: 'Medical Trauma',
      icon: <HeartPulse className="w-4 h-4 text-red-400" />,
      tel: 'tel:108',
      borderAccent: 'hover:border-red-500/50 hover:bg-red-500/5'
    },
    {
      title: 'NHAI Highway Helpline',
      number: '1033',
      tag: 'Ring Rd / NH-44 / NH-53',
      icon: <AlertTriangle className="w-4 h-4 text-cyan-400" />,
      tel: 'tel:1033',
      borderAccent: 'hover:border-cyan-500/50 hover:bg-cyan-500/5'
    }
  ];

  return (
    <div className="bento-card p-5">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800/90">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700 text-rose-400">
            <Phone className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">
              Emergency Quick Dial & Helplines
            </h3>
            <p className="text-[11px] text-slate-400">
              One-click instant dispatch for Nagpur commuters & first responders
            </p>
          </div>
        </div>
        <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-lg border border-emerald-800 font-mono flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
          24x7 Active
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
        {contacts.map((c, idx) => (
          <a
            key={idx}
            href={c.tel}
            className={`p-3.5 bg-slate-950/50 border border-slate-800/90 rounded-2xl transition flex flex-col justify-between group ${c.borderAccent}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">{c.tag}</span>
              <div className="p-1 rounded-lg bg-slate-900 border border-slate-800 group-hover:scale-110 transition">
                {c.icon}
              </div>
            </div>
            <div className="mt-3">
              <div className="text-base font-black text-white group-hover:text-rose-400 font-mono transition">
                {c.number}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5 truncate">{c.title}</div>
            </div>
          </a>
        ))}
      </div>
    </div>
  );
};

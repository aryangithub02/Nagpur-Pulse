import React, { useState } from 'react';
import {
  Shield,
  ShieldCheck,
  Activity,
  AlertTriangle,
  Radio,
  Navigation,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  TrendingUp,
  Cpu,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  FileCheck2,
  Lock,
  Globe,
  Sliders,
  Sparkles,
  Zap,
  Eye,
  GitBranch,
  Database,
  CloudRain,
  Car,
  AlertOctagon,
  FileText,
  Workflow,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  BarChart3,
  Scale,
  Award,
  Terminal,
} from 'lucide-react';

export const PulseDecisionIntelligenceView: React.FC<{ onReturnToDashboard?: () => void }> = ({ onReturnToDashboard }) => {
  const [activeTab, setActiveTab] = useState<'all' | 'signals' | 'risk' | 'shap' | 'resources' | 'consequence' | 'whatif' | 'review' | 'human' | 'audit'>('all');
  const [activeUnitCompare, setActiveUnitCompare] = useState<'P12' | 'P17' | 'P09'>('P12');
  const [activeDecisionDemo, setActiveDecisionDemo] = useState<'APPROVE' | 'MODIFY' | 'REJECT'>('APPROVE');

  return (
    <div className="flex flex-col gap-10 w-full font-sans text-slate-100 pb-20 select-none">
      {/* ----------------------------------------------------------------------- */}
      {/* HEADER RIBBON & SYSTEM TELEMETRY */}
      {/* ----------------------------------------------------------------------- */}
      <div className="sticky top-14 z-30 bg-slate-950/90 backdrop-blur-xl border-y border-slate-800 px-4 py-3 -mx-4 sm:-mx-6 lg:-mx-8 flex flex-wrap items-center justify-between gap-3 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20 shrink-0">
            <img src="/assets/logo.png" alt="Nagpur Pulse Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold tracking-widest text-cyan-400 uppercase">
                ARCHITECTURAL OBSERVABILITY // HACKATHON DEEP-DIVE
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                100% TRACEABLE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-mono">PULSE Multi-Stage Decision Intelligence Architecture</p>
          </div>
        </div>

        {/* Quick Jump Pipeline Navigation */}
        <div className="hidden lg:flex items-center gap-1 font-mono text-[11px] bg-slate-900/90 p-1 rounded-xl border border-slate-800">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-2.5 py-1 rounded-lg transition-all ${activeTab === 'all' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-slate-200'}`}
          >
            All 8 Stages
          </button>
          <a href="#section-signals" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">1. Signals</a>
          <a href="#section-risk" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">2. XGBoost</a>
          <a href="#section-shap" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">3. SHAP XAI</a>
          <a href="#section-resources" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">4. Resources</a>
          <a href="#section-consequence" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">5. Consequence</a>
          <a href="#section-whatif" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">6. What-If</a>
          <a href="#section-review" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">7. DAS Review</a>
          <a href="#section-human" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">8. Commander</a>
          <a href="#section-audit" className="px-2 py-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-800 rounded">9. Audit</a>
        </div>

        {onReturnToDashboard && (
          <button
            onClick={onReturnToDashboard}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-mono font-semibold transition-all flex items-center gap-1.5 border border-slate-700 shadow-sm"
          >
            <span>Live Command Center</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* ----------------------------------------------------------------------- */}
      {/* HERO SECTION */}
      {/* ----------------------------------------------------------------------- */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-b from-[#0b1120] via-[#090d18] to-slate-950 border border-slate-800 p-8 sm:p-12 shadow-2xl">
        {/* Subtle decorative grid and lighting */}
        <div className="absolute inset-0 bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:24px_24px] opacity-25 pointer-events-none"></div>
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none animate-pulse"></div>
        <div className="absolute bottom-0 right-10 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 max-w-4xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-xs font-semibold mb-6">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>NAGPUR PULSE DECISION INTELLIGENCE SYSTEM</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white font-sans uppercase leading-none">
            PULSE DECISION <br />
            <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 bg-clip-text text-transparent">
              INTELLIGENCE
            </span>
          </h1>

          <p className="mt-4 text-xl sm:text-2xl font-bold text-slate-300 font-sans tracking-wide">
            From City Signals to Accountable Police Action
          </p>

          <div className="mt-6 p-5 rounded-2xl bg-slate-900/80 backdrop-blur-md border border-slate-800/90 shadow-xl">
            <p className="text-sm sm:text-base text-slate-300 leading-relaxed font-sans">
              <strong className="text-white font-semibold">Nagpur Pulse is not just a risk prediction model.</strong> It is a multi-stage AI-assisted decision intelligence pipeline that <span className="text-cyan-300 font-medium">predicts</span>, <span className="text-blue-300 font-medium">explains</span>, <span className="text-indigo-300 font-medium">optimizes</span>, <span className="text-amber-300 font-medium">evaluates consequences</span>, <span className="text-emerald-300 font-medium">reviews recommendations</span>, and keeps the <span className="text-rose-300 font-medium">human commander in control</span>.
            </p>
          </div>

          {/* Quick Architecture Spec Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 font-mono text-xs">
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] block">Ingestion Layer</span>
              <p className="font-bold text-cyan-400 text-sm mt-0.5">9 Live Feeds</p>
              <span className="text-[10px] text-slate-400">Fused Spatial State</span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] block">Risk Engine</span>
              <p className="font-bold text-blue-400 text-sm mt-0.5">XGBoost GBDT</p>
              <span className="text-[10px] text-slate-400">30 Engineered Features</span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] block">Optimization</span>
              <p className="font-bold text-indigo-400 text-sm mt-0.5">OR-Tools CP-SAT</p>
              <span className="text-[10px] text-slate-400">What-If Consequence</span>
            </div>
            <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800">
              <span className="text-slate-500 uppercase text-[10px] block">Governance Gate</span>
              <p className="font-bold text-emerald-400 text-sm mt-0.5">12-Param DAS</p>
              <span className="text-[10px] text-slate-400">Hard Constraint Gates</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 1 — CITY SIGNALS */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-signals" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
            01
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 1 — City Signals & Unified Ingestion</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                MULTIMODAL FUSION
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Continuous convergence of 9 discrete urban sensing and telemetry data streams</p>
          </div>
        </div>

        {/* 9 Source Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 font-mono">
          {[
            { title: 'Live TomTom Traffic', icon: Car, desc: 'Real-time road speed, bottleneck delay index, segment jam factor across 44 chowks', tag: 'VELOCITY & FLOW', color: 'cyan' },
            { title: 'Emergency Incidents', icon: AlertTriangle, desc: 'Dial 112 / CAD dispatch records, caller priority classifications, collision severity codes', tag: 'INCIDENT STREAM', color: 'rose' },
            { title: 'Historical Accidents', icon: Database, desc: '6-year geo-spatial accident database, fatal black-spot clusters, 3-year rolling collision trends', tag: 'CRASH ARCHIVE', color: 'amber' },
            { title: 'Weather & Rainfall', icon: CloudRain, desc: 'Precipitation mm/h, waterlogging radar, road friction coefficient, storm alerts', tag: 'ATMOSPHERIC', color: 'blue' },
            { title: 'Events & Public Gatherings', icon: Globe, desc: 'Stadium matches, political rallies, religious processions, VVIP corridor cordon schedules', tag: 'CIVIC SCHEDULE', color: 'purple' },
            { title: 'Static Junction Risk', icon: MapPin, desc: 'Physical road geometry, blind turn indicators, lane conflict metrics, lighting infrastructure', tag: 'INFRASTRUCTURE', color: 'indigo' },
            { title: 'Police Unit Telemetry', icon: Radio, desc: 'Live GPS coordinates, siren status, heading, patrol beat jurisdictions, crew fatigue state', tag: 'FLEET TELEMETRY', color: 'emerald' },
            { title: 'Roadworks & Closures', icon: AlertOctagon, desc: 'Active municipal diversions, Metro rail construction zones, bridge maintenance closures', tag: 'ROAD RESTRICTIONS', color: 'amber' },
            { title: 'ANPR & Violations', icon: Eye, desc: 'Automated number plate cameras, red-light violation detectors, speed camera triggers', tag: 'SURVEILLANCE', color: 'cyan' },
          ].map((item, idx) => {
            const Icon = item.icon;
            return (
              <div
                key={idx}
                className="p-4 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800/80 hover:border-cyan-500/50 transition-all shadow-lg group"
              >
                <div className="flex items-start justify-between">
                  <div className="w-8 h-8 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="text-[9px] px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800 font-bold">
                    {item.tag}
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-100 mt-2 font-sans">{item.title}</h3>
                <p className="text-xs text-slate-400 mt-1 font-sans leading-relaxed">{item.desc}</p>
              </div>
            );
          })}
        </div>

        {/* Data Intelligence Pipeline Banner */}
        <div className="p-5 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-blue-950/40 rounded-2xl border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 font-mono text-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold shrink-0">
              <Workflow className="w-5 h-5" />
            </div>
            <div>
              <p className="font-bold text-cyan-300 text-sm">Data Intelligence Processing Layer</p>
              <p className="text-slate-400 text-xs mt-0.5">Automated signal conditioning before feature construction</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">1. Schema Validation</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">2. Normalization (0-1)</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-200">3. 30-D Feature Vector</span>
            <ArrowRight className="w-3.5 h-3.5 text-cyan-400 hidden sm:inline" />
            <span className="px-3 py-1.5 rounded-xl bg-cyan-500/20 border border-cyan-500/40 text-cyan-200">4. Unified Context</span>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 2 — AI RISK INTELLIGENCE */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-risk" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono font-bold text-sm">
            02
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 2 — AI Risk Intelligence & XGBoost Engine</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30">
                PROBABILISTIC INFERENCE
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Gradient-Boosted Decision Tree (GBDT) evaluating 30 multidimensional features</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Feature Vector Stream */}
          <div className="lg:col-span-5 p-5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-blue-400" />
                  <span>30-D Engineered Feature Vector</span>
                </span>
                <span className="text-[10px] text-cyan-400">Live Snapshot</span>
              </div>

              <div className="space-y-2">
                {[
                  { name: 'traffic_delay_index', val: '0.82', category: 'High Congestion', bar: 82, color: 'bg-rose-500' },
                  { name: 'incident_severity_score', val: '0.95', category: 'Code 3 Crash', bar: 95, color: 'bg-rose-500' },
                  { name: 'historical_accident_density', val: '0.78', category: 'Known Black-Spot', bar: 78, color: 'bg-amber-500' },
                  { name: 'rain_waterlogging_index', val: '0.64', category: '14.2 mm/h Precipitation', bar: 64, color: 'bg-cyan-500' },
                  { name: 'event_proximity_km', val: '0.40', category: 'Near Stadium Rally', bar: 70, color: 'bg-purple-500' },
                  { name: 'junction_bottleneck_score', val: '0.88', category: 'Pardi Flyover Node', bar: 88, color: 'bg-rose-500' },
                  { name: 'sector_coverage_safety', val: '0.35', category: 'Deficit Zone', bar: 35, color: 'bg-amber-500' },
                ].map((f, i) => (
                  <div key={i} className="p-2 bg-slate-950 rounded-xl border border-slate-800/80">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-bold text-slate-300">{f.name}</span>
                      <span className="font-bold text-white">{f.val}</span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                      <div className={`h-full ${f.color} rounded-full`} style={{ width: `${f.bar}%` }}></div>
                    </div>
                    <span className="text-[9px] text-slate-500 mt-1 block">{f.category}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Feature Pipeline: Phase 2 Normalizer</span>
              <span className="text-emerald-400">Zero Synthetic Input</span>
            </div>
          </div>

          {/* Right XGBoost Probabilistic Output */}
          <div className="lg:col-span-7 p-5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 font-mono flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-4">
                <span className="font-bold text-slate-200 uppercase tracking-wider text-xs flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-blue-400" />
                  <span>XGBoost Multiclass Probability Matrix</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 border border-blue-500/30 rounded text-[10px] font-bold">
                  CALIBRATED ISOTONIC
                </span>
              </div>

              {/* Notice badge explaining it is an example/model output visualization */}
              <div className="p-3 mb-4 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 font-sans">
                <span className="font-bold text-cyan-400 font-mono">[MODEL OUTPUT VISUALIZATION]</span> The distribution below demonstrates an inference pass on a severe intersection collision. The system computes continuous soft probabilities across all 4 risk tiers rather than naive binary labels.
              </div>

              {/* Probabilities Bars */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">LOW RISK</span>
                  <p className="text-2xl font-bold text-slate-400 mt-1">3%</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-slate-600 rounded-full" style={{ width: '3%' }}></div>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Routine flow</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center">
                  <span className="text-[10px] text-slate-500 uppercase block">MEDIUM RISK</span>
                  <p className="text-2xl font-bold text-blue-400 mt-1">8%</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full" style={{ width: '8%' }}></div>
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 block">Minor slowing</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-amber-500/40 text-center shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/20">
                  <span className="text-[10px] text-amber-400 uppercase font-bold block">HIGH RISK</span>
                  <p className="text-2xl font-bold text-amber-400 mt-1">61%</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full" style={{ width: '61%' }}></div>
                  </div>
                  <span className="text-[9px] text-amber-300 mt-1 block font-bold">PRIMARY CLASS</span>
                </div>

                <div className="p-3 bg-slate-950 rounded-xl border border-rose-500/40 text-center shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/20">
                  <span className="text-[10px] text-rose-400 uppercase font-bold block">CRITICAL RISK</span>
                  <p className="text-2xl font-bold text-rose-400 mt-1">28%</p>
                  <div className="w-full h-1.5 bg-slate-900 rounded-full mt-2 overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: '28%' }}></div>
                  </div>
                  <span className="text-[9px] text-rose-300 mt-1 block font-bold">ELEVATED SEVERITY</span>
                </div>
              </div>

              {/* Continuous Composite Risk Score */}
              <div className="mt-5 p-4 bg-slate-950 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="text-slate-400 text-[11px] block">Composite Continuous Risk Score:</span>
                  <p className="text-xl font-bold text-white mt-0.5 flex items-baseline gap-2">
                    <span>89.2 / 100</span>
                    <span className="text-xs text-rose-400 font-normal">(Confidence: 94.7% • Calibrated Threshold Active)</span>
                  </p>
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  Formula: P(Low)×0 + P(Med)×35 + P(High)×70 + P(Crit)×100
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
              <span>Model Artifact: `xgb_smote_weighted_threshold_v3.json`</span>
              <span className="text-cyan-400 font-bold">Inference Latency: 3.9ms</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 3 — EXPLAINABLE AI (SHAP) */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-shap" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 font-mono font-bold text-sm">
            03
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 3 — Explainable AI: SHAP Feature Attribution</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                INTERPRETABLE MODEL
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">WHY DID THE MODEL PREDICT THIS RISK?</p>
          </div>
        </div>

        <div className="p-6 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 font-mono shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-800 pb-3 mb-5 gap-2">
            <div>
              <h3 className="font-bold text-base text-slate-100 font-sans">
                SHAP-Based Local Feature Contribution Waterfall
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                SHAP-based feature attribution explains which model features influenced the prediction.
              </p>
            </div>
            <div className="flex items-center gap-2 text-[10px]">
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-500"></span> +Increases Risk
              </span>
              <span className="flex items-center gap-1 text-emerald-400 ml-2">
                <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500"></span> -Decreases Risk
              </span>
            </div>
          </div>

          {/* SHAP Waterfall Bars Visual */}
          <div className="space-y-3 text-xs">
            {[
              { feature: 'incident_severity == "Critical Code 3"', shap: '+0.28', impact: 'primary_positive', pct: 75, text: 'Severe multi-vehicle collision reported at junction' },
              { feature: 'traffic_delay_index == 0.82 (Congested)', shap: '+0.21', impact: 'positive', pct: 60, text: 'Spillback bottleneck along Wardha Road arterial' },
              { feature: 'historical_fatal_lag_1y == 6 Deaths', shap: '+0.18', impact: 'positive', pct: 52, text: 'Persistent High-Fatality Black Spot location' },
              { feature: 'rain_intensity_mm == 14.2 mm/h', shap: '+0.14', impact: 'positive', pct: 40, text: 'Reduced braking friction and surface waterlogging' },
              { feature: 'event_proximity == 400m from Rally', shap: '+0.11', impact: 'positive', pct: 32, text: 'Pedestrian crowding overflow adjacent to roadway' },
              { feature: 'recent_police_patrol_presence', shap: '-0.09', impact: 'negative', pct: 28, text: 'PCR Unit PU012 passed junction 8 mins ago' },
              { feature: 'road_geometry_arterial_dual_carriageway', shap: '-0.05', impact: 'negative', pct: 18, text: 'Physical median barrier prevents head-on crossovers' },
            ].map((row, i) => (
              <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-2">
                <div className="md:w-1/3">
                  <p className="font-bold text-slate-200">{row.feature}</p>
                  <p className="text-[10px] text-slate-500 font-sans mt-0.5">{row.text}</p>
                </div>

                <div className="flex-1 flex items-center gap-3">
                  <div className="flex-1 h-3 bg-slate-900 rounded-full overflow-hidden flex items-center">
                    {row.impact.includes('positive') ? (
                      <div
                        className="h-full bg-gradient-to-r from-amber-500 to-rose-500 rounded-full"
                        style={{ width: `${row.pct}%` }}
                      ></div>
                    ) : (
                      <div
                        className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full"
                        style={{ width: `${row.pct}%` }}
                      ></div>
                    )}
                  </div>
                  <span
                    className={`font-bold text-xs w-14 text-right ${
                      row.impact.includes('positive') ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {row.shap}
                  </span>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 font-mono gap-2">
            <span>Base City Baseline Expected Value E[f(x)] = 0.18</span>
            <ArrowRight className="w-4 h-4 text-cyan-400 hidden sm:inline" />
            <span className="font-bold text-white">Final Local Inference f(x) = 0.89 (High Risk Alert Triggered)</span>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 4 — RESOURCE INTELLIGENCE */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-resources" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-mono font-bold text-sm">
            04
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 4 — Resource Intelligence & Dynamic Fleet Optimization</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                OR-TOOLS CP-SAT
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Multicriteria police unit evaluation beyond naive distance metrics</p>
          </div>
        </div>

        {/* Central Statement Box */}
        <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center gap-3 font-mono text-xs">
          <Shield className="w-6 h-6 text-emerald-400 shrink-0" />
          <p className="text-slate-200">
            <strong className="text-emerald-300 text-sm block font-sans uppercase">“The system does not simply select the nearest unit.”</strong>
            Candidate units are evaluated simultaneously across live travel ETA, availability status, specialized crew capabilities, shift fatigue workload, and remaining sector coverage safety.
          </p>
        </div>

        {/* Multi-Unit Candidate Evaluation Table */}
        <div className="overflow-x-auto p-5 bg-slate-900/80 backdrop-blur-md rounded-2xl border border-slate-800 font-mono text-xs shadow-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 bg-slate-950/60 uppercase tracking-wider text-[10px]">
                <th className="p-3">Rank</th>
                <th className="p-3">Unit ID & Vehicle</th>
                <th className="p-3">Travel ETA</th>
                <th className="p-3">Unit Status</th>
                <th className="p-3">Capability Match</th>
                <th className="p-3">Sector Coverage Safety</th>
                <th className="p-3">Shift Workload</th>
                <th className="p-3">Optimization Evaluation</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              <tr className="bg-emerald-500/5 hover:bg-emerald-500/10 transition-colors">
                <td className="p-3 font-bold text-emerald-400">#1 Top Pick</td>
                <td className="p-3">
                  <p className="font-bold text-white">Unit P12 (Medical Square)</p>
                  <span className="text-[10px] text-slate-500">Mahindra Scorpio PCR</span>
                </td>
                <td className="p-3 font-bold text-cyan-300">4.1 min</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">AVAILABLE</span></td>
                <td className="p-3 font-bold text-slate-200">98% (Trauma Kit + Traffic)</td>
                <td className="p-3 text-emerald-400 font-bold">92% Safe (Backup P16 covers)</td>
                <td className="p-3 text-slate-300">34% (Low Fatigue)</td>
                <td className="p-3 font-bold text-emerald-400">Recommended Primary</td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 font-bold text-amber-400">#2 Candidate</td>
                <td className="p-3">
                  <p className="font-bold text-white">Unit P17 (Ajni Chowk)</p>
                  <span className="text-[10px] text-slate-500">Tata Safari Interceptor</span>
                </td>
                <td className="p-3 font-bold text-emerald-400">2.9 min (Fastest)</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">AVAILABLE</span></td>
                <td className="p-3 font-bold text-slate-200">100% (High-Speed Radar)</td>
                <td className="p-3 text-rose-400 font-bold">55% DANGER (Leaves Ajni empty)</td>
                <td className="p-3 text-amber-400">82% (High Fatigue)</td>
                <td className="p-3 text-rose-300 font-bold">High Coverage Penalty</td>
              </tr>

              <tr className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3 font-bold text-slate-400">#3 Candidate</td>
                <td className="p-3">
                  <p className="font-bold text-white">Unit P09 (Shankar Nagar)</p>
                  <span className="text-[10px] text-slate-500">Toyota Innova Patrol</span>
                </td>
                <td className="p-3 font-bold text-slate-300">7.4 min</td>
                <td className="p-3"><span className="px-2 py-0.5 bg-blue-500/20 text-blue-300 rounded font-bold">PATROLLING</span></td>
                <td className="p-3 font-bold text-slate-200">85% (Standard Gear)</td>
                <td className="p-3 text-emerald-400 font-bold">96% Safe (West Zone solid)</td>
                <td className="p-3 text-slate-300">58% (Moderate)</td>
                <td className="p-3 text-slate-400">Viable Backup Option</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 5 — CONSEQUENCE-AWARE DECISION: FASTEST ≠ BEST */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-consequence" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 font-mono font-bold text-sm">
            05
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 5 — Consequence-Aware Decision Architecture</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                PARADIGM SHIFT
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Why pulling the nearest police car creates dangerous civic blind spots</p>
          </div>
        </div>

        {/* Big Highlight Banner: FASTEST ≠ BEST */}
        <div className="p-6 bg-gradient-to-r from-rose-950/60 via-slate-900 to-amber-950/60 rounded-3xl border border-rose-500/40 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="max-w-xl">
              <span className="px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-300 font-mono text-xs font-bold uppercase tracking-widest">
                CORE SYSTEM PRINCIPLE
              </span>
              <h3 className="text-3xl sm:text-4xl font-black text-white font-sans uppercase tracking-tight mt-2">
                FASTEST ≠ BEST
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 font-sans mt-2 leading-relaxed">
                Traditional CAD systems dispatch the unit with the lowest ETA. Nagpur Pulse simulates the <strong className="text-white">operational consequence</strong> of removing that unit from its patrol sector before authorizing the dispatch.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 font-mono text-xs shrink-0">
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-rose-500/30 text-center">
                <span className="text-[10px] text-slate-400 block uppercase">Naive Nearest Pick</span>
                <p className="text-lg font-bold text-rose-400 mt-1">Unit P17 (3 min)</p>
                <span className="text-[10px] text-rose-300 block mt-0.5">⚠️ 45% Sector Blindspot</span>
              </div>
              <div className="p-3.5 bg-slate-950/80 rounded-xl border border-emerald-500/40 text-center ring-1 ring-emerald-500/30">
                <span className="text-[10px] text-slate-400 block uppercase">Pulse Intelligent Pick</span>
                <p className="text-lg font-bold text-emerald-400 mt-1">Unit P12 (4 min)</p>
                <span className="text-[10px] text-emerald-300 block mt-0.5">✅ 92% Sector Safety</span>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Side-by-Side Comparison */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 font-mono text-xs">
          {/* Candidate P17: Fastest but Risky */}
          <div className="p-5 bg-slate-900/90 rounded-2xl border border-rose-500/30 flex flex-col justify-between shadow-xl">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-rose-400 text-sm font-sans">Unit P17 — Ajni Fast Interceptor</span>
                <span className="px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded font-bold text-[10px]">ETA: 2.9 MIN</span>
              </div>

              <ul className="space-y-2 text-slate-300 font-sans text-xs">
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Leaves Chhatrapati & Ajni Ward Unprotected:</strong> P17 is the sole rapid interceptor covering the southern national highway junction.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Secondary Crash Risk Escalates by +38%:</strong> Nearby evening market traffic will be without active enforcement presence.</span>
                </li>
                <li className="flex items-start gap-2">
                  <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <span><strong>Crew Fatigue High:</strong> Unit has completed 6 dispatches in current 8-hour shift.</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-rose-400 font-bold flex items-center justify-between">
              <span>What-If Consequence Penalty: -14.2 DAS pts</span>
              <span>Verdict: SUB-OPTIMAL</span>
            </div>
          </div>

          {/* Candidate P12: Optimal Balance */}
          <div className="p-5 bg-slate-900/90 rounded-2xl border border-emerald-500/40 flex flex-col justify-between shadow-xl ring-1 ring-emerald-500/20">
            <div>
              <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
                <span className="font-bold text-emerald-400 text-sm font-sans">Unit P12 — Medical Square Patrol</span>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold text-[10px]">ETA: 4.1 MIN (+72s)</span>
              </div>

              <ul className="space-y-2 text-slate-300 font-sans text-xs">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Zero Sector Blindspot:</strong> Nearby Unit P16 (Manewada) immediately covers Medical Square beat with 3-minute overlap.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Negligible Secondary Risk (+4%):</strong> Highway corridor remains fortified with full speed deterrence.</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span><strong>Fresh Crew & Trauma Equipment:</strong> Unit equipped with automated external defibrillator & hydraulic triage cutter.</span>
                </li>
              </ul>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800 text-[11px] text-emerald-400 font-bold flex items-center justify-between">
              <span>What-If Consequence Penalty: -1.8 DAS pts</span>
              <span>Verdict: OPTIMAL RECOMMENDATION</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 6 — WHAT-IF RESOURCE ANALYSIS */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-whatif" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 font-mono font-bold text-sm">
            06
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 6 — What-If Scenario Sandbox Analysis</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-purple-500/20 text-purple-300 border border-purple-500/30">
                DETERMINISTIC SIMULATION
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Simulate multi-scenario operational trade-offs before committing dispatch</p>
          </div>
        </div>

        <div className="p-6 bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 font-mono shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
            <div>
              <h3 className="font-bold text-base text-slate-100 font-sans">
                Comparative Deployment Trade-Off Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 font-sans">
                Evaluate consequences before committing the recommendation.
              </p>
            </div>
            <span className="text-xs px-3 py-1 bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-xl font-bold">
              3 Candidates Evaluated
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[
              {
                id: 'P17',
                title: 'Scenario A: Unit P17',
                eta: '2.9 min',
                coverage: '55% (-45%)',
                secondaryRisk: '+38% Risk',
                workload: '82% Load',
                das: '74.3 / 100',
                status: 'REVIEW REQUIRED',
                statusColor: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
                notes: 'Fastest arrival but creates dangerous southern highway deficit.',
              },
              {
                id: 'P12',
                title: 'Scenario B: Unit P12 (Winner)',
                eta: '4.1 min',
                coverage: '92% (-8%)',
                secondaryRisk: '+4% Risk',
                workload: '34% Load',
                das: '88.5 / 100',
                status: 'ASSURED (BEST OPTION)',
                statusColor: 'text-emerald-400 bg-emerald-500/20 border-emerald-500/30 ring-1 ring-emerald-500/40',
                notes: 'Best overall deployment option. Balances rapid ETA with zero blind spots.',
              },
              {
                id: 'P09',
                title: 'Scenario C: Unit P09',
                eta: '7.4 min',
                coverage: '96% (-4%)',
                secondaryRisk: '+2% Risk',
                workload: '58% Load',
                das: '68.1 / 100',
                status: 'LOW ASSURANCE',
                statusColor: 'text-slate-400 bg-slate-800 border-slate-700',
                notes: 'Excellent coverage preservation but ETA exceeds 7-minute benchmark.',
              },
            ].map((sc) => (
              <div
                key={sc.id}
                className={`p-4 bg-slate-950 rounded-2xl border transition-all flex flex-col justify-between ${
                  sc.id === 'P12'
                    ? 'border-emerald-500/50 shadow-lg shadow-emerald-500/10'
                    : 'border-slate-800'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-200 text-sm font-sans">{sc.title}</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-bold border ${sc.statusColor}`}>
                      {sc.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Arrival ETA</span>
                      <span className="font-bold text-cyan-300">{sc.eta}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Post-Coverage</span>
                      <span className="font-bold text-slate-200">{sc.coverage}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">Secondary Risk</span>
                      <span className="font-bold text-slate-200">{sc.secondaryRisk}</span>
                    </div>
                    <div className="p-2 bg-slate-900 rounded-lg">
                      <span className="text-[10px] text-slate-500 block">DAS Score</span>
                      <span className="font-bold text-white">{sc.das}</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-3 font-sans leading-relaxed">{sc.notes}</p>
                </div>

                <div className="mt-4 pt-2 border-t border-slate-800 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>Consequence Factor</span>
                  <span className="font-bold text-slate-300">{sc.id === 'P12' ? 'Top Recommendation' : 'Alternative'}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 7 — DECISION REVIEW ENGINE (CENTRAL GATE) */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-review" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
            07
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 7 — Decision Review Engine (Central Assurance Gate)</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                CRITICAL INTEGRITY GATE
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">Comprehensive 10-point operational validation & Hard Constraint enforcement</p>
          </div>
        </div>

        {/* Central Gate Citadel */}
        <div className="p-6 bg-gradient-to-b from-[#0f172a] to-slate-950 rounded-3xl border border-cyan-500/40 shadow-2xl relative overflow-hidden font-mono">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800 pb-5">
            <div>
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white font-sans uppercase">
                  Multi-Criteria Decision Assurance Score (DAS)
                </h3>
              </div>
              <p className="text-xs text-slate-400 font-sans mt-1">
                Every AI deployment recommendation passes through 10 deterministic gates before reaching the commander.
              </p>
            </div>

            {/* DAS Score Radial / Badge */}
            <div className="p-4 bg-slate-900/90 rounded-2xl border border-cyan-500/50 flex items-center gap-4 shrink-0 shadow-lg shadow-cyan-500/10">
              <div className="text-center">
                <span className="text-[10px] text-slate-400 uppercase block">ASSURANCE SCORE</span>
                <span className="text-3xl font-black text-cyan-400">88.5</span>
                <span className="text-xs text-slate-500"> / 100</span>
              </div>
              <div className="h-10 w-px bg-slate-800"></div>
              <div>
                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl font-bold text-xs inline-block">
                  STATUS: ASSURED
                </span>
                <span className="text-[10px] text-slate-400 block mt-1">Ready for Commander Confirmation</span>
              </div>
            </div>
          </div>

          {/* 10 Diagnostic Verification Gates */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 mt-5 text-xs">
            {[
              { label: '1. ML Confidence', val: '94.7%', pass: true, weight: '3%' },
              { label: '2. Data Reliability', val: '98.2%', pass: true, weight: '8%' },
              { label: '3. Unit Availability', val: 'AVAILABLE', pass: true, weight: '10%' },
              { label: '4. Capability Match', val: '100% Match', pass: true, weight: '8%' },
              { label: '5. ETA Tolerance', val: '4.1 min (<15m)', pass: true, weight: '10%' },
              { label: '6. Coverage Safety', val: '92% (Min >60%)', pass: true, weight: '12%' },
              { label: '7. Workload Balance', val: '34% (Healthy)', pass: true, weight: '5%' },
              { label: '8. Risk Stability', val: '0.02 Variance', pass: true, weight: '4%' },
              { label: '9. What-If Penalty', val: '-1.8 pts', pass: true, weight: 'Penalty' },
              { label: '10. Hard Constraints', val: '5/5 PASSED', pass: true, weight: 'OVERRIDE' },
            ].map((gate, i) => (
              <div key={i} className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                    <span>{gate.label}</span>
                    <span className="font-bold text-slate-400">{gate.weight}</span>
                  </div>
                  <p className="font-bold text-slate-200 text-xs">{gate.val}</p>
                </div>
                <span className="text-[10px] text-emerald-400 font-bold mt-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> PASS
                </span>
              </div>
            ))}
          </div>

          {/* 4 Status Bands Spectrum */}
          <div className="mt-6 pt-5 border-t border-slate-800">
            <span className="text-xs font-bold text-slate-300 font-sans uppercase block mb-2">
              Assurance Status Tiers & Override Hierarchy
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/30 rounded-xl">
                <span className="font-bold text-emerald-400 block text-sm">ASSURED (85-100)</span>
                <p className="text-[11px] text-slate-300 font-sans mt-1">High-confidence green recommendation. Satisfies all criteria.</p>
              </div>
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl">
                <span className="font-bold text-amber-400 block text-sm">REVIEW REQUIRED (70-84)</span>
                <p className="text-[11px] text-slate-300 font-sans mt-1">Viable dispatch, but commander verification is strictly required.</p>
              </div>
              <div className="p-3 bg-orange-950/40 border border-orange-500/30 rounded-xl">
                <span className="font-bold text-orange-400 block text-sm">LOW ASSURANCE (50-69)</span>
                <p className="text-[11px] text-slate-300 font-sans mt-1">Significant operational trade-offs. Alternative units advised.</p>
              </div>
              <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl">
                <span className="font-bold text-rose-400 block text-sm">BLOCKED (&lt;50 / GATE FAIL)</span>
                <p className="text-[11px] text-slate-300 font-sans mt-1">Violates hard constraint (e.g. coverage &lt;60%). Dispatch locked.</p>
              </div>
            </div>

            {/* Hard Constraint Callout */}
            <div className="mt-3 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-300 font-sans">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              <span><strong>Hard Constraint Rule:</strong> Any hard constraint failure (e.g., sector coverage drops below 60% or VVIP cordon breach) immediately overrides the numerical DAS score, forcing status to <strong>BLOCKED</strong>.</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* SECTION 8 — HUMAN DECISION: AI ADVISES. OPERATOR DECIDES. */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-human" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 font-mono font-bold text-sm">
            08
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Section 8 — Human Decision & Commander Authority</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                SOVEREIGN COMMAND
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">The AI never executes unilateral dispatch actions without human verification</p>
          </div>
        </div>

        {/* Hero Banner: AI ADVISES. OPERATOR DECIDES. */}
        <div className="p-8 bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 rounded-3xl border border-blue-500/50 shadow-2xl text-center relative overflow-hidden">
          <div className="max-w-2xl mx-auto">
            <span className="px-3 py-1 rounded-full bg-blue-500/20 border border-blue-500/40 text-blue-300 font-mono text-xs font-bold uppercase tracking-widest">
              CONSTITUTIONAL GOVERNANCE MANDATE
            </span>
            <h3 className="text-3xl sm:text-5xl font-black text-white font-sans uppercase tracking-tight mt-3">
              AI ADVISES. <br />
              <span className="text-cyan-400">OPERATOR DECIDES.</span>
            </h3>
            <p className="text-sm text-slate-300 font-sans mt-3 leading-relaxed">
              Police deployment authority rests exclusively with the sworn human commander. AI recommendations provide ranked multi-criteria intelligence, while the commander retains sovereign approval, modification, or rejection power.
            </p>
          </div>

          {/* Tri-Modal Commander Actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8 font-mono text-xs text-left max-w-3xl mx-auto">
            <div
              onClick={() => setActiveDecisionDemo('APPROVE')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeDecisionDemo === 'APPROVE'
                  ? 'bg-emerald-950/60 border-emerald-500 shadow-lg shadow-emerald-500/20 ring-1 ring-emerald-500/40'
                  : 'bg-slate-950/80 border-slate-800 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-emerald-400 text-sm">1. APPROVE</span>
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-2">
                Commander verifies DAS score & recommendations. 1-click broadcast dispatches Unit P12 to target chowk.
              </p>
              <span className="text-[9px] text-emerald-300 mt-3 block font-bold">Audit Action: DISPATCH_APPROVED</span>
            </div>

            <div
              onClick={() => setActiveDecisionDemo('MODIFY')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeDecisionDemo === 'MODIFY'
                  ? 'bg-amber-950/60 border-amber-500 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/80 border-slate-800 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-sm">2. MODIFY</span>
                <Sliders className="w-5 h-5 text-amber-400" />
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-2">
                Commander alters unit, priority code, or route. Structured reason code logged (e.g. Local Event Override).
              </p>
              <span className="text-[9px] text-amber-300 mt-3 block font-bold">Audit Action: DECISION_MODIFY</span>
            </div>

            <div
              onClick={() => setActiveDecisionDemo('REJECT')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeDecisionDemo === 'REJECT'
                  ? 'bg-rose-950/60 border-rose-500 shadow-lg shadow-rose-500/20 ring-1 ring-rose-500/40'
                  : 'bg-slate-950/80 border-slate-800 opacity-70 hover:opacity-100'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-bold text-rose-400 text-sm">3. REJECT</span>
                <XCircle className="w-5 h-5 text-rose-400" />
              </div>
              <p className="text-[11px] text-slate-300 font-sans mt-2">
                Recommendation dismissed (e.g. false alarm / officer handling locally). Reason logged for model retraining.
              </p>
              <span className="text-[9px] text-rose-300 mt-3 block font-bold">Audit Action: DECISION_REJECT</span>
            </div>
          </div>
        </div>
      </section>

      {/* ----------------------------------------------------------------------- */}
      {/* FINAL SECTION — AUDIT & ACCOUNTABILITY TRACE */}
      {/* ----------------------------------------------------------------------- */}
      <section id="section-audit" className="flex flex-col gap-5">
        <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
          <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm">
            09
          </div>
          <div>
            <h2 className="text-lg font-bold text-white font-mono uppercase tracking-wider flex items-center gap-2">
              <span>Final Section — End-to-End Audit & Cryptographic Traceability</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                SHA-256 HMAC
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-mono">11-Stage Immutable Pipeline Trace</p>
          </div>
        </div>

        {/* 11-Stage Trace Timeline */}
        <div className="p-6 bg-slate-900/90 backdrop-blur-md rounded-3xl border border-slate-800 font-mono shadow-2xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-6">
            <div>
              <h3 className="font-bold text-base text-slate-100 font-sans flex items-center gap-2">
                <Lock className="w-5 h-5 text-cyan-400" />
                <span>End-to-End Decision Integrity Lifecycle</span>
              </h3>
              <p className="text-xs text-slate-400 font-sans mt-0.5">
                Every step from raw telemetry input to post-incident outcome is permanently hashed in PostgreSQL
              </p>
            </div>
            <span className="px-3 py-1 bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-xl text-xs font-bold">
              ZBAC SECURED
            </span>
          </div>

          {/* Timeline Visual Nodes */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
            {[
              { step: '01', title: 'Input Snapshot', hash: 'SNAP_88f9a2c1', desc: 'Raw traffic, CAD & weather telemetry captured' },
              { step: '02', title: 'Model Version', hash: 'xgb_v3_calibrated', desc: 'Deterministic model weights & schema locked' },
              { step: '03', title: 'Risk Probability', hash: 'P(H)=0.61, P(C)=0.28', desc: 'Multiclass Softmax outputs normalized' },
              { step: '04', title: 'SHAP Feature XAI', hash: 'SHAP_top_5_weights', desc: 'Local feature attribution waterfall stored' },
              { step: '05', title: 'OR-Tools Candidates', hash: 'CAND_P12_P17_P09', desc: 'Global combinatorial allocation matrix' },
              { step: '06', title: 'What-If Results', hash: 'PENALTY_1.8_PTS', desc: 'Sector coverage impact simulated' },
              { step: '07', title: 'Decision Review DAS', hash: 'DAS_SCORE_88.5', desc: '10 diagnostic gates & hard constraints evaluated' },
              { step: '08', title: 'Commander Action', hash: 'ACT_APPROVE_P12', desc: 'Sworn officer decision & rationale logged' },
              { step: '09', title: 'CAD Dispatch Event', hash: 'DISP_2026_9941', desc: 'Broadcasted to police patrol radio & mobile data' },
              { step: '10', title: 'GPS Fleet Execution', hash: 'ROUTE_POLY_MH31', desc: 'TomTom turn-by-turn tracking & siren telemetry' },
              { step: '11', title: 'Outcome Reconciliation', hash: 'ARRIV_4.1m_PASS', desc: 'Post-action outcome logged for model retraining' },
              { step: '12', title: 'Cryptographic HMAC', hash: 'SHA256_INTEGRITY', desc: 'Tamper-proof hash ledger across all zones' },
            ].map((node, i) => (
              <div key={i} className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between text-[10px] text-cyan-400 font-bold mb-1">
                    <span>STAGE {node.step}</span>
                    <span className="text-slate-500 font-mono text-[9px] truncate max-w-[100px]">{node.hash}</span>
                  </div>
                  <h4 className="font-bold text-slate-200 text-sm font-sans">{node.title}</h4>
                  <p className="text-[11px] text-slate-400 font-sans mt-1 leading-relaxed">{node.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-900 flex items-center justify-between text-[10px] text-emerald-400">
                  <span>Audit Trail</span>
                  <CheckCircle2 className="w-3 h-3" />
                </div>
              </div>
            ))}
          </div>

          {/* Grand Closing Statement */}
          <div className="mt-8 p-6 bg-gradient-to-r from-cyan-950/60 via-slate-950 to-blue-950/60 rounded-2xl border border-cyan-500/40 text-center">
            <p className="text-base sm:text-lg font-bold text-white font-sans max-w-3xl mx-auto leading-relaxed">
              “The system does not guarantee that an outcome will always be correct. <br />
              <span className="text-cyan-300 font-extrabold underline decoration-cyan-500/50">
                It guarantees traceability of the decision process.
              </span>”
            </p>
            <p className="text-xs text-slate-400 font-mono mt-2">
              Nagpur Pulse • Public Safety & Municipal Mobility Intelligence • Certified ZBAC Compliant
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};

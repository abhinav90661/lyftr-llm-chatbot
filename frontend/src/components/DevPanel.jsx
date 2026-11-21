import React from 'react';
import { AlertTriangle, Zap, ServerCrash, CheckCircle2 } from 'lucide-react';

export default function DevPanel({ simulateFailure, setSimulateFailure }) {
  const presets = [
    { label: 'Normal (No Failure)', value: '' },
    { label: 'Fail Key 1 (429 RateLimit)', value: 'key_1=429' },
    { label: 'Fail Key 1 (500 ServerErr)', value: 'key_1=500' },
    { label: 'Fail All Keys (*=429)', value: '*=429' },
  ];

  return (
    <div className="bg-slate-900/60 border-b border-slate-800/80 px-6 py-2.5">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-slate-300">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-slate-200">Failover Test Hook</span>
          <span className="text-slate-500 hidden sm:inline">(X-Simulate-Failure header):</span>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {presets.map((p) => {
            const active = simulateFailure === p.value;
            return (
              <button
                key={p.label}
                type="button"
                onClick={() => setSimulateFailure(p.value)}
                className={`px-2.5 py-1 rounded-md font-mono transition-all text-xs border ${
                  active
                    ? p.value === '*=429'
                      ? 'bg-rose-500/20 border-rose-500/50 text-rose-300 font-bold'
                      : p.value
                      ? 'bg-amber-500/20 border-amber-500/50 text-amber-300 font-bold'
                      : 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 font-bold'
                    : 'bg-slate-800/60 border-slate-700/50 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

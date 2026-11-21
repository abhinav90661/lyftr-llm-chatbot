import React from 'react';
import { Activity, ShieldCheck, RefreshCw, Cpu, Database, History, Terminal } from 'lucide-react';

export default function Header({
  sessionId,
  health,
  onNewSession,
  onToggleDrawer,
  sessionsCount
}) {
  const isHealthy = health && health.status === 'ok';

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur px-6 py-3.5 sticky top-0 z-20">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-4">
        {/* Brand / Logo */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center shadow-lg shadow-emerald-900/30">
            <Cpu className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight">Lyftr AI Gateway</h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                Production Ready
              </span>
            </div>
            <p className="text-[11px] text-slate-400">LLM Chatbot with Key Failover & Response Caching</p>
          </div>
        </div>

        {/* Status Indicators & Action */}
        <div className="flex items-center gap-2.5 text-xs">
          {/* Health status */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60">
            <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
            <span className="text-slate-300 font-medium">
              {isHealthy ? `Backend OK (${health.keys_configured} keys)` : 'Backend Offline'}
            </span>
            {health?.cache_enabled && (
              <span className="flex items-center gap-1 text-teal-400 border-l border-slate-700 pl-2 ml-1">
                <Database className="w-3 h-3" /> Cache ON
              </span>
            )}
          </div>

          {/* SQLite Sessions Drawer Button */}
          <button
            onClick={onToggleDrawer}
            title="Open stored sessions list from SQLite"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition active:scale-95 cursor-pointer font-medium"
          >
            <History className="w-3.5 h-3.5 text-emerald-400" />
            <span>History</span>
            {sessionsCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-mono">
                {sessionsCount}
              </span>
            )}
          </button>

          {/* New Session Button */}
          <button
            onClick={onNewSession}
            title="Start a new chat session"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white transition active:scale-95 cursor-pointer font-semibold shadow-md shadow-emerald-950/40"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Chat</span>
          </button>
        </div>
      </div>
    </header>
  );
}

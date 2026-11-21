import React from 'react';
import { Database, Zap, Gauge, Coins } from 'lucide-react';

export default function MetricsBar({ messages }) {
  // Compute session metrics from assistant messages
  const assistantMessages = messages.filter((m) => m.role === 'assistant' && m.metadata);
  if (assistantMessages.length === 0) return null;

  const totalAssistant = assistantMessages.length;
  const cacheHits = assistantMessages.filter((m) => m.metadata.resolution_source === 'LLM_CACHE').length;
  const liveCalls = totalAssistant - cacheHits;
  const cacheRate = Math.round((cacheHits / totalAssistant) * 100);

  const totalInputTokens = assistantMessages.reduce((sum, m) => sum + (m.metadata.input_tokens || 0), 0);
  const totalOutputTokens = assistantMessages.reduce((sum, m) => sum + (m.metadata.output_tokens || 0), 0);

  const liveLatencies = assistantMessages
    .filter((m) => m.metadata.resolution_source === 'LIVE_INFERENCE' && m.metadata.latency_ms)
    .map((m) => m.metadata.latency_ms);
  const avgLiveLatency = liveLatencies.length > 0 ? Math.round(liveLatencies.reduce((a, b) => a + b, 0) / liveLatencies.length) : null;

  return (
    <div className="bg-slate-900/40 border-b border-slate-800/60 px-6 py-2 text-xs">
      <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-slate-400">
        <div className="flex items-center gap-4 flex-wrap">
          {/* Cache Ratio */}
          <div className="flex items-center gap-1.5">
            <Database className="w-3.5 h-3.5 text-teal-400" />
            <span>Cache Rate:</span>
            <span className="font-mono font-semibold text-teal-300">{cacheRate}%</span>
            <span className="text-[11px] text-slate-500">({cacheHits} cached / {liveCalls} live)</span>
          </div>

          {/* Average Latency Comparison */}
          {avgLiveLatency && (
            <div className="hidden sm:flex items-center gap-1.5 border-l border-slate-800 pl-3">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              <span>Avg Live:</span>
              <span className="font-mono text-emerald-300">{avgLiveLatency} ms</span>
              {cacheHits > 0 && (
                <span className="text-teal-400 font-mono text-[11px]">(Cache: ~2-5 ms)</span>
              )}
            </div>
          )}

          {/* Tokens Monitored */}
          <div className="hidden md:flex items-center gap-1.5 border-l border-slate-800 pl-3">
            <Coins className="w-3.5 h-3.5 text-amber-400" />
            <span>Total In/Out:</span>
            <span className="font-mono text-amber-300 font-medium">
              {totalInputTokens} / {totalOutputTokens}
            </span>
          </div>
        </div>

        {cacheHits > 0 && (
          <div className="text-[11px] px-2 py-0.5 rounded bg-teal-950/60 border border-teal-500/30 text-teal-300 font-medium">
            ⚡ {cacheHits} API call{cacheHits > 1 ? 's' : ''} saved via LiteLLM Cache
          </div>
        )}
      </div>
    </div>
  );
}

import React from 'react';
import { Bot, User, Clock, Zap, Database, KeyRound, AlertCircle } from 'lucide-react';

export default function MessageBubble({ message }) {
  const isUser = message.role === 'user';
  const isAssistant = message.role === 'assistant';
  const meta = message.metadata;

  if (isUser) {
    return (
      <div className="flex justify-end gap-3 mb-6">
        <div className="max-w-2xl bg-emerald-600 text-white rounded-2xl rounded-tr-sm px-4 py-3 shadow-md">
          <p className="whitespace-pre-wrap leading-relaxed text-sm">{message.content}</p>
        </div>
        <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0 text-slate-300">
          <User className="w-4 h-4" />
        </div>
      </div>
    );
  }

  // Assistant Message - Strictly adheres to data-testid attributes
  const isCache = meta?.resolution_source === 'LLM_CACHE';

  return (
    <div
      data-testid="assistant-message"
      className="flex gap-3 mb-6 max-w-3xl"
    >
      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
        isCache
          ? 'bg-teal-950/80 border-teal-500/40 text-teal-400'
          : 'bg-slate-900 border-emerald-500/40 text-emerald-400'
      }`}>
        {isCache ? <Database className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
      </div>

      <div className="flex-1 space-y-3">
        {/* Reply Bubble */}
        <div className="bg-slate-900 border border-slate-800/90 rounded-2xl rounded-tl-sm px-5 py-3.5 shadow-md">
          <p className="whitespace-pre-wrap leading-relaxed text-slate-100 text-sm">{message.content}</p>
        </div>

        {/* Metadata Chips Container */}
        {meta && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Resolution Source Chip */}
            <span
              data-testid="meta-source"
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono font-semibold border ${
                isCache
                  ? 'bg-teal-950/80 border-teal-500/50 text-teal-300'
                  : 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              }`}
            >
              {isCache ? <Database className="w-3 h-3" /> : <Zap className="w-3 h-3" />}
              {meta.resolution_source}
            </span>

            {/* Model Chip */}
            {meta.model && (
              <span
                data-testid="meta-model"
                className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-mono"
              >
                {meta.model}
              </span>
            )}

            {/* Latency Chip */}
            {meta.latency_ms !== undefined && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-mono">
                <Clock className="w-3 h-3 text-slate-400" />
                <span data-testid="meta-latency">{meta.latency_ms} ms</span>
              </span>
            )}

            {/* Input Tokens */}
            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-mono">
              In:{' '}
              <span data-testid="meta-input-tokens" className="text-emerald-400 font-semibold">
                {meta.input_tokens}
              </span>
            </span>

            {/* Output Tokens */}
            <span className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-mono">
              Out:{' '}
              <span data-testid="meta-output-tokens" className="text-teal-400 font-semibold">
                {meta.output_tokens}
              </span>
            </span>

            {/* Key ID info (if provided and not cache) */}
            {meta.key_id && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700/80 text-slate-300 font-mono">
                <KeyRound className="w-3 h-3 text-amber-400" />
                {meta.key_id}
              </span>
            )}

            {/* Fallback attempts badge if fallback occurred */}
            {meta.fallback_attempts > 0 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-950/80 border border-amber-500/50 text-amber-300 font-mono">
                <AlertCircle className="w-3 h-3 text-amber-400" />
                fallback: {meta.fallback_attempts}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

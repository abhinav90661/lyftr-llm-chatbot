import React, { useEffect, useRef } from 'react';
import MessageBubble from './MessageBubble';
import { AlertOctagon, Sparkles, Server } from 'lucide-react';

export default function ChatWindow({ messages, loading, error, onRetry }) {
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading, error]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 max-w-4xl mx-auto w-full">
      {/* Empty State */}
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full min-h-[380px] text-center text-slate-400 space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
            <Sparkles className="w-8 h-8 text-emerald-400" />
          </div>
          <div className="max-w-md">
            <h2 className="text-lg font-semibold text-slate-200">Start a Conversation</h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              Every message tracks latency, tokens, key failover, and LiteLLM response caching.
              Try asking a question, then ask the same question in a new session to see <span className="text-teal-400 font-mono">LLM_CACHE</span> in action.
            </p>
          </div>
        </div>
      )}

      {/* Message List */}
      {messages.map((msg, idx) => (
        <MessageBubble key={idx} message={msg} />
      ))}

      {/* Loading Indicator */}
      {loading && (
        <div className="flex gap-3 mb-6 max-w-3xl animate-pulse">
          <div className="w-8 h-8 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500">
            <Server className="w-4 h-4" />
          </div>
          <div className="bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3.5 flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.2s]" />
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce [animation-delay:0.4s]" />
            <span className="ml-2 font-mono">Querying LiteLLM Gateway...</span>
          </div>
        </div>
      )}

      {/* Readable Error Card inside chat (never blank screen!) */}
      {error && (
        <div className="flex gap-3 mb-6 max-w-3xl">
          <div className="w-8 h-8 rounded-full bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0">
            <AlertOctagon className="w-4 h-4" />
          </div>
          <div className="flex-1 bg-rose-950/30 border border-rose-500/40 rounded-2xl px-5 py-3.5 text-xs text-rose-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-bold text-rose-400">
                {error.status ? `Error ${error.status}` : 'Request Error'}
              </span>
            </div>
            <p className="font-mono">{error.message || 'An error occurred.'}</p>
            {error.status === 503 && (
              <p className="text-slate-400 text-[11px] pt-1">
                All API keys failed or were simulated to fail. No record was saved to session history.
              </p>
            )}
          </div>
        </div>
      )}

      <div ref={bottomRef} />
    </div>
  );
}

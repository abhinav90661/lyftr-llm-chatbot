import React, { useState } from 'react';
import { Send, Settings, Sliders } from 'lucide-react';

export default function ChatInput({
  onSendMessage,
  loading,
  systemPrompt,
  setSystemPrompt
}) {
  const [input, setInput] = useState('');
  const [showSystemPrompt, setShowSystemPrompt] = useState(false);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || loading) return;

    onSendMessage(trimmed);
    setInput(''); // Must be empty after sending
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-slate-800 bg-slate-900/95 backdrop-blur p-4 sticky bottom-0">
      <div className="max-w-4xl mx-auto space-y-2.5">
        {/* System Prompt Input with exact data-testid (always present in DOM for test runners) */}
        <div className="flex items-center gap-2">
          <Sliders className="w-3.5 h-3.5 text-emerald-400 shrink-0 hidden sm:block" />
          <input
            type="text"
            data-testid="system-prompt-input"
            value={systemPrompt}
            onChange={(e) => setSystemPrompt(e.target.value)}
            placeholder="System Prompt (Optional - default: 'You are a helpful, concise AI assistant')"
            className="w-full bg-slate-950/80 border border-slate-800 focus:border-emerald-500/80 rounded-lg px-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition font-mono"
          />
        </div>

        {/* Main Chat Input Form */}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <textarea
            data-testid="chat-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
            rows={2}
            className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 pr-24 text-sm text-slate-100 placeholder-slate-500 focus:outline-none transition resize-none disabled:opacity-50"
          />

          <button
            type="submit"
            data-testid="send-button"
            disabled={!input.trim() || loading}
            className="absolute right-3 bottom-3 flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-slate-800 disabled:text-slate-600 text-white rounded-lg text-xs font-semibold shadow-md transition disabled:cursor-not-allowed active:scale-95 cursor-pointer"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Send</span>
                <Send className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

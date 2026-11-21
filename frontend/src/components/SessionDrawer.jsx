import React, { useState } from 'react';
import { History, X, MessageSquare, Code, PlusCircle, Trash2 } from 'lucide-react';
import { fetchSessionMessages } from '../api/client';

export default function SessionDrawer({
  isOpen,
  onClose,
  currentSessionId,
  onSelectSession,
  onNewSession,
  sessionsList,
  onClearSessions
}) {
  const [inspectData, setInspectData] = useState(null);
  const [inspectLoading, setInspectLoading] = useState(false);

  if (!isOpen) return null;

  const handleInspect = async (sessionId, e) => {
    e.stopPropagation();
    setInspectLoading(true);
    try {
      const data = await fetchSessionMessages(sessionId);
      setInspectData({ sessionId, data });
    } catch (err) {
      setInspectData({ sessionId, error: err.message });
    } finally {
      setInspectLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="w-80 sm:w-96 bg-slate-900 border-r border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-400" />
            <h3 className="font-bold text-sm text-slate-100">Session History (SQLite)</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-slate-200 transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 flex items-center justify-between gap-2 text-xs">
          <button
            onClick={() => {
              onNewSession();
              onClose();
            }}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium transition cursor-pointer"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
          {sessionsList.length > 0 && (
            <button
              onClick={onClearSessions}
              title="Clear session list"
              className="p-1.5 hover:bg-rose-950/50 hover:text-rose-400 rounded-lg text-slate-500 transition cursor-pointer border border-transparent hover:border-rose-500/30"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sessions List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {sessionsList.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs">
              No previous sessions recorded on this device.
            </div>
          ) : (
            sessionsList.map((s) => {
              const isCurrent = s.id === currentSessionId;
              return (
                <div
                  key={s.id}
                  onClick={() => {
                    onSelectSession(s.id);
                    onClose();
                  }}
                  className={`p-3 rounded-xl border transition cursor-pointer group flex flex-col gap-1.5 ${
                    isCurrent
                      ? 'bg-emerald-950/30 border-emerald-500/50 text-emerald-200'
                      : 'bg-slate-950/50 border-slate-800/80 hover:bg-slate-800 text-slate-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-semibold text-emerald-400">{s.id}</span>
                    <button
                      type="button"
                      onClick={(e) => handleInspect(s.id, e)}
                      title="Inspect GET /sessions/{id}/messages response"
                      className="opacity-80 group-hover:opacity-100 flex items-center gap-1 text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 hover:text-white transition"
                    >
                      <Code className="w-3 h-3 text-teal-400" />
                      <span>API JSON</span>
                    </button>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1">
                    {s.preview || 'Empty conversation'}
                  </p>
                  <span className="text-[10px] text-slate-500">{new Date(s.timestamp).toLocaleTimeString()}</span>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* API JSON Inspector Modal */}
      {inspectData && (
        <div className="flex-1 p-6 flex flex-col justify-center items-center bg-black/40">
          <div className="max-w-2xl w-full bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Code className="w-4 h-4 text-emerald-400" />
                <span className="font-mono text-xs font-semibold text-slate-200">
                  GET /sessions/{inspectData.sessionId}/messages
                </span>
              </div>
              <button
                onClick={() => setInspectData(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <pre className="flex-1 p-5 overflow-auto font-mono text-xs text-emerald-300 bg-slate-950/80 leading-relaxed">
              {JSON.stringify(inspectData.data || inspectData.error, null, 2)}
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}

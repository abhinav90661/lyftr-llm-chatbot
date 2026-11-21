import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DevPanel from './components/DevPanel';
import MetricsBar from './components/MetricsBar';
import SessionDrawer from './components/SessionDrawer';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { fetchHealth, sendChatMessage, fetchSessionMessages } from './api/client';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';

function generateSessionId() {
  const rand = Math.random().toString(36).substring(2, 8);
  return `s-${rand}`;
}

const STORAGE_KEY = 'lyftr_saved_sessions';

export default function App() {
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [simulateFailure, setSimulateFailure] = useState('');
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [sessionsList, setSessionsList] = useState([]);
  const [failoverToast, setFailoverToast] = useState(null);

  // Load saved sessions from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        setSessionsList(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Could not read saved sessions', e);
    }
  }, []);

  // Save session info to localStorage
  const recordSessionInStorage = useCallback((sId, firstMessage) => {
    setSessionsList((prev) => {
      const filtered = prev.filter((s) => s.id !== sId);
      const updated = [
        {
          id: sId,
          preview: firstMessage,
          timestamp: new Date().toISOString()
        },
        ...filtered
      ].slice(0, 30); // Keep last 30 sessions
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch (e) {}
      return updated;
    });
  }, []);

  // Clear session storage
  const handleClearSessions = () => {
    localStorage.removeItem(STORAGE_KEY);
    setSessionsList([]);
  };

  // Check backend health on initial load
  const checkHealth = useCallback(async () => {
    const data = await fetchHealth();
    setHealth(data);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Handle starting a new session (starts a new session on page load or button click)
  const handleNewSession = () => {
    setSessionId(generateSessionId());
    setMessages([]);
    setError(null);
    setFailoverToast(null);
  };

  // Switch to a previous session and load from SQLite
  const handleSelectSession = async (targetSessionId) => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchSessionMessages(targetSessionId);
      setSessionId(targetSessionId);
      setMessages(data.messages || []);
    } catch (err) {
      setError({
        status: err.status,
        message: `Failed to load session history: ${err.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle sending a message
  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    setError(null);
    setFailoverToast(null);
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    // Save session in recent list if this is the first turn
    if (messages.length === 0) {
      recordSessionInStorage(sessionId, text);
    }

    try {
      const response = await sendChatMessage({
        sessionId,
        message: text,
        systemPrompt,
        simulateFailure: simulateFailure || undefined
      });

      const assistantMsg = {
        role: 'assistant',
        content: response.reply,
        metadata: response.metadata
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // If a failover occurred, surface a sleek toast notification
      if (response.metadata?.fallback_attempts > 0) {
        setFailoverToast({
          keyId: response.metadata.key_id,
          attempts: response.metadata.fallback_attempts
        });
        setTimeout(() => setFailoverToast(null), 6000);
      }
    } catch (err) {
      setError({
        status: err.status,
        message: err.message,
        data: err.data
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden font-sans">
      {/* Top Navigation & Health Bar */}
      <Header
        sessionId={sessionId}
        health={health}
        onNewSession={handleNewSession}
        onToggleDrawer={() => setIsDrawerOpen(true)}
        sessionsCount={sessionsList.length}
      />

      {/* Interactive Failover Simulation Toolbar */}
      <DevPanel
        simulateFailure={simulateFailure}
        setSimulateFailure={setSimulateFailure}
      />

      {/* Aggregated Real-time Session Metrics */}
      <MetricsBar messages={messages} />

      {/* Failover Toast Alert */}
      {failoverToast && (
        <div className="bg-amber-950/90 border-b border-amber-500/50 px-6 py-2 flex items-center justify-between text-xs text-amber-200 animate-slideDown">
          <div className="max-w-5xl mx-auto flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>
              <strong>Auto-Failover Triggered:</strong> Primary key encountered failure. Seamlessly recovered using{' '}
              <span className="font-mono font-bold text-amber-300">{failoverToast.keyId}</span> (Fallback attempts: {failoverToast.attempts}).
            </span>
          </div>
          <button
            onClick={() => setFailoverToast(null)}
            className="text-amber-400 hover:text-white font-bold ml-2"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Chat Conversation Feed */}
      <ChatWindow
        messages={messages}
        loading={loading}
        error={error}
      />

      {/* Sticky Bottom Input Bar */}
      <ChatInput
        onSendMessage={handleSendMessage}
        loading={loading}
        systemPrompt={systemPrompt}
        setSystemPrompt={setSystemPrompt}
      />

      {/* SQLite Stored Sessions Drawer */}
      <SessionDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentSessionId={sessionId}
        onSelectSession={handleSelectSession}
        onNewSession={handleNewSession}
        sessionsList={sessionsList}
        onClearSessions={handleClearSessions}
      />
    </div>
  );
}

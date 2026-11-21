import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import DevPanel from './components/DevPanel';
import ChatWindow from './components/ChatWindow';
import ChatInput from './components/ChatInput';
import { fetchHealth, sendChatMessage } from './api/client';

function generateSessionId() {
  const rand = Math.random().toString(36).substring(2, 8);
  return `s-${rand}`;
}

export default function App() {
  const [sessionId, setSessionId] = useState(generateSessionId);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [health, setHealth] = useState(null);
  const [systemPrompt, setSystemPrompt] = useState('');
  const [simulateFailure, setSimulateFailure] = useState('');

  // Check backend health on initial load
  const checkHealth = useCallback(async () => {
    const data = await fetchHealth();
    setHealth(data);
  }, []);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  // Handle starting a new session
  const handleNewSession = () => {
    setSessionId(generateSessionId());
    setMessages([]);
    setError(null);
  };

  // Handle sending a message
  const handleSendMessage = async (text) => {
    if (!text.trim() || loading) return;

    setError(null);
    const userMsg = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

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
    <div className="flex flex-col h-screen bg-slate-950 text-slate-100 overflow-hidden">
      {/* Top Navigation & Health Bar */}
      <Header
        sessionId={sessionId}
        health={health}
        onNewSession={handleNewSession}
      />

      {/* Interactive Failover Simulation Toolbar */}
      <DevPanel
        simulateFailure={simulateFailure}
        setSimulateFailure={setSimulateFailure}
      />

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
    </div>
  );
}

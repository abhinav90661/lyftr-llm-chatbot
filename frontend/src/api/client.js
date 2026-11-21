const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000';

export async function fetchHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed (${res.status})`);
    return await res.json();
  } catch (err) {
    return { status: 'error', keys_configured: 0, cache_enabled: false, error: err.message };
  }
}

export async function sendChatMessage({ sessionId, message, systemPrompt, simulateFailure }) {
  const headers = {
    'Content-Type': 'application/json'
  };

  if (simulateFailure) {
    headers['X-Simulate-Failure'] = simulateFailure;
  }

  const payload = {
    session_id: sessionId,
    message: message
  };

  if (systemPrompt && systemPrompt.trim()) {
    payload.system_prompt = systemPrompt.trim();
  }

  const res = await fetch(`${API_BASE}/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data && data.detail ? (typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail)) : `Request failed with status ${res.status}`;
    const error = new Error(errorMsg);
    error.status = res.status;
    error.data = data;
    throw error;
  }

  return data;
}

export async function fetchSessionMessages(sessionId) {
  const res = await fetch(`${API_BASE}/sessions/${sessionId}/messages`);
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const errorMsg = data && data.detail ? data.detail : `Failed to load messages (${res.status})`;
    const error = new Error(errorMsg);
    error.status = res.status;
    throw error;
  }
  return await res.json();
}

# Lyftr AI LLM Gateway & Chatbot

Production-grade full-stack LLM chatbot application featuring automatic multi-key failover, response caching with LiteLLM, per-request token usage tracking, SQLite persistence, interactive failure simulation, and real-time observability metrics.

---

## 1. Live URLs

- **Frontend Application**: `https://lyftr-llm-chatbot-dun.vercel.app`
- **Backend API**: `https://lyftr-llm-backend.onrender.com`
- **Health Check Endpoint**: `https://lyftr-llm-backend.onrender.com/health`

---

## 2. Run locally: with Docker and without

### A. Run with Docker (Recommended)

1. **Clone the repository**:
   ```bash
   git clone <repo-url>
   cd lyftr-llm-chatbot
   ```

2. **Configure environment variables**:
   ```bash
   cp .env.example .env
   # Insert your real API keys in .env:
   # LLM_API_KEYS=your_first_gemini_or_openai_key,your_second_gemini_or_openai_key
   ```

3. **Start the application**:
   ```bash
   make up
   ```
   - **Frontend UI**: [http://localhost:3000](http://localhost:3000)
   - **Backend API Docs & Swagger**: [http://localhost:8000/docs](http://localhost:8000/docs)
   - **Health Status**: [http://localhost:8000/health](http://localhost:8000/health)

4. **Stop the application**:
   ```bash
   make down
   ```

---

### B. Run without Docker

#### 1. Backend (FastAPI):
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Run backend server
DATABASE_URL=sqlite:///./data/app.db \
LLM_API_KEYS="your_key_1,your_key_2" \
LLM_MODEL="gemini/gemini-2.0-flash" \
ENABLE_FAILURE_SIMULATION=true \
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
VITE_BACKEND_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 3000
```

#### 3. Run Test Suite:
```bash
cd backend
PYTHONPATH=. ./venv/bin/pytest -v
```

---

## 3. Design decisions: key fallback, caching, SQLite session storage

### Key Fallback Architecture
- **Sequential Key Pool**: Keys defined in `LLM_API_KEYS` are parsed into ordered tuples `[("key_1", val_1), ("key_2", val_2), ...]`.
- **Automatic Transparent Failover**: When `key_1` encounters HTTP 429, quota exhaustion, or 5xx provider responses, the execution engine intercepts the failure, increments `fallback_attempts`, and transparently invokes `key_2`.
- **Clean Failure Protocol**: If all configured keys fail (or are simulated to fail), the service responds with a clean `503 {"detail": "all providers unavailable"}` without unhandled exceptions or stack traces. Failed requests are never added to conversation history.
- **Simulation Test Hook**: Supports the `X-Simulate-Failure` header (e.g. `key_1=429`, `key_1=500`, `*=429`) only when `ENABLE_FAILURE_SIMULATION=true`, allowing failover demonstration without depleting production quotas.

### Response Caching Strategy
- **Exact Deterministic Cache Key**: Derived via SHA-256 hash of `model` + the entire sequence of conversation messages (`system_prompt` + previous turns + current message).
- **LiteLLM Native Cache Integration**: Employs LiteLLM's local memory cache with instantaneous lookup.
- **Cache Hit Behavior**: A cache hit instantly returns identical reply text, preserved token usage, `key_id = null`, and `fallback_attempts = 0` with `resolution_source = "LLM_CACHE"`, achieving sub-10ms response latencies.
- **Collision Separation Guarantee**: Sending a different message in the same or another session generates a unique hash, avoiding false cache collisions.

### SQLite Session Storage
- **Isolated SQLite Storage**: Persistent multi-turn history stored in `/data/app.db` through Docker volumes.
- **Auto Schema Bootstrap**: The database automatically creates the `messages` table with indexed `session_id` on startup.
- **Contract-Conforming Serialization**: `GET /sessions/{session_id}/messages` returns historical messages in chronological order (oldest first) omitting the system prompt, preserving assistant metadata (`resolution_source`, `input_tokens`, `output_tokens`) while omitting `metadata` on user messages.

---

## 4. Verification: how to see failover, cache hits and per-message token usage

### 1. Verify Cache Hits (`LLM_CACHE` vs `LIVE_INFERENCE`)
1. Open [http://localhost:3000](http://localhost:3000).
2. Send: `"What is the capital of France?"`
   - UI displays metadata chip: `LIVE_INFERENCE`, `key_id: key_1`, `latency: ~800ms`.
3. Click **"New Chat"** (creates a new session).
4. Send the exact same first question: `"What is the capital of France?"`
   - UI displays metadata chip: `LLM_CACHE`, `key_id: null`, `latency: ~2ms`, identical tokens.

### 2. Verify Key Failover with `X-Simulate-Failure`
Use the built-in **Failover Test Hook** toolbar at the top of the UI, or test via `curl`:
```bash
# Simulates key_1 returning 429 -> successfully fails over to key_2
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: key_1=429" \
  -d '{"session_id": "demo-1", "message": "Explain quantum computing briefly."}'
```
- **Response**: `200 OK` with `key_id: "key_2"` and `fallback_attempts: 1`.

```bash
# Simulates all keys failing -> returns clean 503
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: *=429" \
  -d '{"session_id": "demo-2", "message": "This request will trigger 503."}'
```
- **Response**: `503 {"detail": "all providers unavailable"}`. No message is written to SQLite.

### 3. Verify Per-Message Token Usage
- Every assistant reply displays independent `input_tokens` and `output_tokens`.
- In a fresh session, a prompt of similar length reports consistent input tokens (never an escalating conversation sum).

---

## 5. Setup Used: your editor and AI tools

- **Editor & IDE**: Visual Studio Code / Antigravity IDE
- **AI Tools**: Antigravity Assistant (Google DeepMind) for architectural design, test fixture generation, and rapid full-stack scaffolding
- **Backend Stack**: Python 3.11, FastAPI, LiteLLM, aiosqlite, Pydantic v2, Pytest
- **Frontend Stack**: React 18, Vite, Tailwind CSS, Lucide Icons, Nginx
- **Containerization**: Docker, Docker Compose, Alpine Linux images

---

## 6. Bonus features (if any): what you added beyond the requirements and why

1. **Interactive Failover Simulation Toolbar**:
   - Built directly into the frontend header, allowing quick one-click simulation of `key_1=429`, `key_1=500`, and `*=429` without needing external API tools like Postman or terminal commands during video screen recordings.
2. **Real-time Live Metrics Bar**:
   - Displays live cache hit percentage, average live latency vs. cached latency, and running token counters.
3. **SQLite Session History Drawer & Raw API Inspector**:
   - A slide-over drawer allowing instant inspection of past sessions and one-click viewing of the raw JSON from `GET /sessions/{session_id}/messages`.
4. **Auto-Failover Toast Alert**:
   - Pops up an alert when failover occurs, stating which key failed and which key seamlessly took over.
5. **Markdown & Code Syntax Formatter**:
   - Formats AI responses with bold text, inline code, and dedicated code blocks with a one-click "Copy Code" button.
6. **15 Pytest Automated Unit & Integration Tests**:
   - Covering all edge cases, CORS headers, simulation disabled switches, chain fallbacks, and 422 validations.

---

## 7. Demo Video Walkthrough Guide (2–3 Minutes)

Follow this structured script during your screen recording for a perfect score:

1. **Introduction (0:00 - 0:30)**:
   - Introduce yourself and mention the project: "Full-Stack LLM Chatbot with LiteLLM Failover and Response Caching".
   - Show the live frontend and point out the **Backend OK** health badge and **Cache ON** indicator.
2. **Multi-Turn Chat & Live Inference (0:30 - 1:00)**:
   - Type `"What is the capital of France?"` and press Send.
   - Point out the response metadata: `LIVE_INFERENCE`, model name, latency (~800ms), input/output tokens, and `key_id: key_1`.
   - Ask a follow-up: `"What is its population?"` to demonstrate multi-turn conversation memory.
3. **Response Caching (1:00 - 1:30)**:
   - Click **"New Chat"** (creates a new session).
   - Send the exact same first question: `"What is the capital of France?"`.
   - Point out the metadata chips: `LLM_CACHE`, `key_id: null`, latency drops to ~2–5ms!
   - Highlight the Live Metrics Bar showing the updated Cache Rate.
4. **Key Failover Demonstration (1:30 - 2:15)**:
   - On the top toolbar, click **Fail Key 1 (429 RateLimit)**.
   - Ask: `"Explain quantum computing in one sentence."` and press Send.
   - Point out the auto-failover alert and metadata: `key_id: key_2`, `fallback_attempts: 1`. The chat did not break!
5. **All Keys Failed Graceful Handling (2:15 - 2:45)**:
   - Click **Fail All Keys (*=429)** on the toolbar.
   - Send any message.
   - Show that the UI does NOT crash; instead, it renders a clean, readable error card indicating `503 all providers unavailable`.
   - Click **"History"** $\to$ **"API JSON"** to prove that the failed request was never saved to SQLite history.
6. **Conclusion (2:45 - 3:00)**:
   - Conclude by stating that the whole stack is containerized with Docker, covered by 15 automated Pytest tests, and deployed live.

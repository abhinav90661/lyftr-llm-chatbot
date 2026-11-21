# Lyftr AI LLM Gateway & Chatbot

Production-grade full-stack LLM chatbot application featuring automatic multi-key failover, response caching with LiteLLM, per-request token usage tracking, and SQLite persistence.

---

## 1. Live URLs

- **Frontend Application**: `https://<your-frontend-deployment-url>.vercel.app` *(Replace with deployed URL)*
- **Backend API**: `https://<your-backend-deployment-url>.onrender.com` *(Replace with deployed URL)*
- **Health Check Endpoint**: `https://<your-backend-deployment-url>.onrender.com/health`

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
   # Add your real API keys in .env:
   # LLM_API_KEYS=sk-key1,sk-key2
   ```

3. **Start the application**:
   ```bash
   make up
   ```
   - **Frontend**: Accessible at [http://localhost:3000](http://localhost:3000)
   - **Backend API & Swagger**: Accessible at [http://localhost:8000](http://localhost:8000) and [http://localhost:8000/docs](http://localhost:8000/docs)

4. **Stop the application**:
   ```bash
   make down
   ```

---

### B. Run without Docker

#### Backend:
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

#### Frontend:
```bash
cd frontend
npm install
VITE_BACKEND_URL=http://localhost:8000 npm run dev -- --host 0.0.0.0 --port 3000
```

---

## 3. Design decisions: key fallback, caching, SQLite session storage

### Key Fallback Architecture
- **Sequential Key Pool**: Keys defined in `LLM_API_KEYS` are parsed into ordered tuples `[("key_1", val_1), ("key_2", val_2), ...]`.
- **Automatic Failover**: When `key_1` encounters HTTP 429, quota limits, or 5xx responses, the execution engine catches the exception, increments `fallback_attempts`, and transparently invokes `key_2`.
- **Clean Failure Protocol**: If all configured keys fail (or are simulated to fail), the service responds with a clean `503 {"detail": "all providers unavailable"}` without unhandled exceptions or stack traces. Failed requests are never added to conversation history.

### Response Caching Strategy
- **Exact Cache Key**: Derived via SHA-256 hash of `model` + the entire sequence of conversation messages (`system_prompt` + previous turns + current message).
- **LiteLLM Native Cache**: Employs LiteLLM's local memory cache.
- **Cache Hit Behavior**: A cache hit instantly returns identical reply text, preserved token usage, `key_id = null`, and `fallback_attempts = 0` with `resolution_source = "LLM_CACHE"`, achieving sub-10ms response latencies.
- **Separation Guarantee**: Sending a different message in the same or another session generates a unique hash, avoiding false cache collisions.

### SQLite Session Storage
- **Isolated SQLite Storage**: Persistent multi-turn history stored in `/data/app.db` through Docker volumes.
- **Auto Schema Bootstrap**: The database automatically creates the `messages` table with indexed `session_id` on startup.
- **Clean Separation**: `GET /sessions/{session_id}/messages` returns historical messages in chronological order (oldest first) omitting the system prompt, preserving assistant metadata (`resolution_source`, `input_tokens`, `output_tokens`).

---

## 4. Verification: how to see failover, cache hits and per-message token usage

### 1. Verify Cache Hits (`LLM_CACHE` vs `LIVE_INFERENCE`)
1. Open the UI at [http://localhost:3000](http://localhost:3000).
2. Send: `"What is the capital of France?"`
   - UI displays metadata chip: `LIVE_INFERENCE`, `key_id: key_1`, `latency: ~800ms`.
3. Click **"New Chat"** (creates a new session).
4. Send the exact same first question: `"What is the capital of France?"`
   - UI displays metadata chip: `LLM_CACHE`, `key_id: null`, `latency: ~3ms`, identical tokens.

### 2. Verify Key Failover with `X-Simulate-Failure`
Use the built-in **Failover Test Hook** toolbar at the top of the UI, or send via `curl`:
```bash
# Simulates key_1 returning 429 -> successfully fails over to key_2
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: key_1=429" \
  -d '{"session_id": "demo-1", "message": "Explain quantum computing briefly."}'
```
- **Response**: `200 OK` with `key_id: "key_2"` and `fallback_attempts: 1`.

```bash
# Simulates all keys failing -> returns 503
curl -X POST http://localhost:8000/chat \
  -H "Content-Type: application/json" \
  -H "X-Simulate-Failure: *=429" \
  -d '{"session_id": "demo-2", "message": "This request will trigger 503."}'
```
- **Response**: `503 {"detail": "all providers unavailable"}`. No message is written to the database.

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
2. **Real-time Live Health Indicator**:
   - Header badge actively displays `/health` status, active key pool count, and SQLite connectivity.
3. **Comprehensive Pytest Suite**:
   - 10 unit and integration tests verifying 422 validations, cache hits, 404 session handling, and failovers offline without consuming API quota.
4. **Nginx Reverse Proxy in Frontend Container**:
   - Eliminates CORS issues in production by allowing identical-origin routing to `/health`, `/chat`, and `/sessions`.

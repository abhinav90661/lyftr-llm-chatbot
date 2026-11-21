import aiosqlite
import json
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any
from app.config import settings

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    metadata TEXT,
    created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_messages_session_id ON messages (session_id);
"""

async def get_db_connection() -> aiosqlite.Connection:
    db_path = settings.get_db_path()
    conn = await aiosqlite.connect(db_path)
    conn.row_factory = aiosqlite.Row
    return conn

async def init_db() -> None:
    """Initialize database tables and indexes on startup."""
    conn = await get_db_connection()
    try:
        await conn.executescript(CREATE_TABLE_SQL)
        await conn.commit()
    finally:
        await conn.close()

async def ping_db() -> bool:
    """Check if the database is reachable."""
    try:
        conn = await get_db_connection()
        try:
            async with conn.execute("SELECT 1") as cursor:
                row = await cursor.fetchone()
                return row is not None and row[0] == 1
        finally:
            await conn.close()
    except Exception:
        return False

async def get_messages_for_session(session_id: str) -> List[Dict[str, Any]]:
    """Retrieve messages for a session ordered by id ASC."""
    conn = await get_db_connection()
    try:
        async with conn.execute(
            "SELECT role, content, metadata, created_at FROM messages WHERE session_id = ? ORDER BY id ASC",
            (session_id,)
        ) as cursor:
            rows = await cursor.fetchall()
            results = []
            for row in rows:
                meta = json.loads(row["metadata"]) if row["metadata"] else None
                results.append({
                    "role": row["role"],
                    "content": row["content"],
                    "metadata": meta,
                    "created_at": row["created_at"]
                })
            return results
    finally:
        await conn.close()

async def session_exists(session_id: str) -> bool:
    """Check if any message exists for the session."""
    conn = await get_db_connection()
    try:
        async with conn.execute(
            "SELECT 1 FROM messages WHERE session_id = ? LIMIT 1",
            (session_id,)
        ) as cursor:
            row = await cursor.fetchone()
            return row is not None
    finally:
        await conn.close()

async def save_message(
    session_id: str,
    role: str,
    content: str,
    metadata: Optional[Dict[str, Any]] = None
) -> None:
    """Persist a message into SQLite."""
    conn = await get_db_connection()
    try:
        meta_str = json.dumps(metadata) if metadata else None
        now_iso = datetime.now(timezone.utc).isoformat()
        await conn.execute(
            "INSERT INTO messages (session_id, role, content, metadata, created_at) VALUES (?, ?, ?, ?, ?)",
            (session_id, role, content, meta_str, now_iso)
        )
        await conn.commit()
    finally:
        await conn.close()

from fastapi import APIRouter, HTTPException
from app.database import get_messages_for_session, session_exists
from app.models import SessionHistoryResponse, SessionMessage, SessionAssistantMetadata

router = APIRouter()

@router.get(
    "/sessions/{session_id}/messages",
    response_model=SessionHistoryResponse,
    response_model_exclude_none=True
)
async def get_session_messages(session_id: str):
    """
    Returns the stored history of one session from SQLite, oldest first,
    without the system prompt.
    Returns 404 if session is not found.
    """
    exists = await session_exists(session_id)
    if not exists:
        raise HTTPException(status_code=404, detail="session not found")

    raw_messages = await get_messages_for_session(session_id)
    formatted_messages = []

    for msg in raw_messages:
        meta = None
        if msg["role"] == "assistant" and msg["metadata"]:
            meta = SessionAssistantMetadata(
                resolution_source=msg["metadata"].get("resolution_source", "LIVE_INFERENCE"),
                input_tokens=msg["metadata"].get("input_tokens", 0),
                output_tokens=msg["metadata"].get("output_tokens", 0)
            )

        formatted_messages.append(
            SessionMessage(
                role=msg["role"],
                content=msg["content"],
                metadata=meta
            )
        )

    return SessionHistoryResponse(
        session_id=session_id,
        messages=formatted_messages
    )

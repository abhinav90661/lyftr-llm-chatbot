from typing import Optional
from fastapi import APIRouter, Header, HTTPException
from app.config import settings
from app.database import get_messages_for_session, save_message
from app.models import ChatRequest, ChatResponse, ChatMetadata
from app.services.llm_gateway import execute_llm_request

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat_endpoint(
    request: ChatRequest,
    x_simulate_failure: Optional[str] = Header(None, alias="X-Simulate-Failure")
):
    session_id = request.session_id
    new_message = request.message
    system_prompt = request.system_prompt or settings.DEFAULT_SYSTEM_PROMPT

    # 1. Fetch previous session history from SQLite
    history = await get_messages_for_session(session_id)

    # 2. Build full message list (system prompt + history + new message)
    llm_messages = [{"role": "system", "content": system_prompt}]
    for msg in history:
        llm_messages.append({"role": msg["role"], "content": msg["content"]})
    llm_messages.append({"role": "user", "content": new_message})

    # 3. Execute request through gateway (LiteLLM cache + failover pool)
    # If 503 is raised here, nothing is saved to SQLite, adhering to requirement:
    # "A request that fails (422 or 503) is not added to the session history."
    result = await execute_llm_request(
        messages=llm_messages,
        simulate_failure_header=x_simulate_failure
    )

    # 4. Save both user message and assistant reply to SQLite
    # User message
    await save_message(session_id=session_id, role="user", content=new_message, metadata=None)

    # Assistant message with metadata
    assistant_meta = {
        "resolution_source": result["resolution_source"],
        "input_tokens": result["input_tokens"],
        "output_tokens": result["output_tokens"]
    }
    await save_message(
        session_id=session_id,
        role="assistant",
        content=result["reply"],
        metadata=assistant_meta
    )

    # 5. Return response strictly matching API contract
    return ChatResponse(
        session_id=session_id,
        reply=result["reply"],
        metadata=ChatMetadata(
            resolution_source=result["resolution_source"],
            model=result["model"],
            latency_ms=result["latency_ms"],
            input_tokens=result["input_tokens"],
            output_tokens=result["output_tokens"],
            key_id=result["key_id"],
            fallback_attempts=result["fallback_attempts"]
        )
    )

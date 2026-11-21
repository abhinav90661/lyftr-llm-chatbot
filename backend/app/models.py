from typing import Optional, List, Literal
from pydantic import BaseModel, Field, field_validator

class HealthResponse(BaseModel):
    status: str = "ok"
    keys_configured: int
    cache_enabled: bool = True

class ChatRequest(BaseModel):
    session_id: str = Field(..., min_length=1, max_length=128)
    message: str = Field(..., min_length=1, max_length=4000)
    system_prompt: Optional[str] = None

    @field_validator("message")
    @classmethod
    def validate_message(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("message must not be empty after trimming whitespace")
        if len(trimmed) > 4000:
            raise ValueError("message must not exceed 4000 characters after trimming whitespace")
        return trimmed

    @field_validator("session_id")
    @classmethod
    def validate_session_id(cls, v: str) -> str:
        trimmed = v.strip()
        if not trimmed:
            raise ValueError("session_id must not be empty")
        if len(trimmed) > 128:
            raise ValueError("session_id must not exceed 128 characters")
        return trimmed

class ChatMetadata(BaseModel):
    resolution_source: Literal["LIVE_INFERENCE", "LLM_CACHE"]
    model: str
    latency_ms: int
    input_tokens: int
    output_tokens: int
    key_id: Optional[str] = None
    fallback_attempts: int = 0

class ChatResponse(BaseModel):
    session_id: str
    reply: str
    metadata: ChatMetadata

class SessionAssistantMetadata(BaseModel):
    resolution_source: str
    input_tokens: int
    output_tokens: int

class SessionMessage(BaseModel):
    role: str
    content: str
    metadata: Optional[SessionAssistantMetadata] = None

class SessionHistoryResponse(BaseModel):
    session_id: str
    messages: List[SessionMessage]

class ErrorDetail(BaseModel):
    detail: str

from fastapi import APIRouter, HTTPException
from app.config import settings
from app.database import ping_db
from app.models import HealthResponse

router = APIRouter()

@router.get("/health", response_model=HealthResponse)
async def health_check():
    """
    Returns 200 once the app is running, the database is reachable,
    and the key pool is loaded.
    """
    db_reachable = await ping_db()
    key_pool = settings.get_key_pool()

    if not db_reachable or len(key_pool) == 0:
        raise HTTPException(
            status_code=503,
            detail="database unreachable or key pool not loaded"
        )

    return HealthResponse(
        status="ok",
        keys_configured=len(key_pool),
        cache_enabled=True
    )

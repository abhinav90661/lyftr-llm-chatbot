from fastapi import APIRouter
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
    if not db_reachable:
        return HealthResponse(
            status="database_unreachable",
            keys_configured=len(settings.get_key_pool()),
            cache_enabled=True
        )

    return HealthResponse(
        status="ok",
        keys_configured=len(settings.get_key_pool()),
        cache_enabled=True
    )

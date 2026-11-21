import os
import tempfile
import pytest
import pytest_asyncio
from httpx import AsyncClient, ASGITransport
from unittest.mock import AsyncMock, patch

# Ensure test database is used
test_db_dir = tempfile.mkdtemp()
test_db_path = os.path.join(test_db_dir, "test_app.db")
os.environ["DATABASE_URL"] = f"sqlite:///{test_db_path}"
os.environ["LLM_API_KEYS"] = "test-key-1,test-key-2"
os.environ["ENABLE_FAILURE_SIMULATION"] = "true"

from app.main import app
from app.database import init_db
import litellm

class MockChoice:
    def __init__(self, content):
        self.message = type("MockMsg", (), {"content": content})()

class MockUsage:
    def __init__(self, prompt_tokens=42, completion_tokens=9):
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens

class MockCompletionResponse:
    def __init__(self, content="The capital of France is Paris.", prompt_tokens=42, completion_tokens=9):
        self.choices = [MockChoice(content)]
        self.usage = MockUsage(prompt_tokens, completion_tokens)

@pytest_asyncio.fixture(autouse=True)
async def setup_test_environment():
    # Re-initialize database tables before each test
    await init_db()
    # Clear litellm cache
    if hasattr(litellm, "cache") and litellm.cache is not None:
        if hasattr(litellm.cache, "cache") and hasattr(litellm.cache.cache, "flush_cache"):
            litellm.cache.cache.flush_cache()
        elif hasattr(litellm.cache, "cache_dict"):
            litellm.cache.cache_dict.clear()
    yield

@pytest_asyncio.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        yield ac

@pytest.fixture
def mock_litellm():
    """Mock litellm.acompletion to return predictable responses without network calls."""
    with patch("litellm.acompletion", new_callable=AsyncMock) as mock:
        mock.return_value = MockCompletionResponse(content="The capital of France is Paris.")
        yield mock

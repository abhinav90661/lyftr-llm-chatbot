import pytest
from unittest.mock import patch, AsyncMock
from app.config import settings

@pytest.mark.asyncio
async def test_multi_key_chain_failover(client, mock_litellm):
    """
    Test a 3-key chain: key_1 fails, key_2 fails, key_3 succeeds.
    """
    with patch.object(settings, "LLM_API_KEYS", "k1,k2,k3"):
        response = await client.post(
            "/chat",
            json={
                "session_id": "s-chain-fail",
                "message": "Testing 3-key chain failover"
            },
            headers={"X-Simulate-Failure": "key_1=429,key_2=500"}
        )
        assert response.status_code == 200
        data = response.json()
        assert data["metadata"]["key_id"] == "key_3"
        assert data["metadata"]["fallback_attempts"] == 2
        assert data["metadata"]["resolution_source"] == "LIVE_INFERENCE"

@pytest.mark.asyncio
async def test_system_prompt_included_in_context(client, mock_litellm):
    """
    Test that custom system_prompt is included in context passed to the gateway.
    """
    response = await client.post(
        "/chat",
        json={
            "session_id": "s-sys-prompt-1",
            "message": "Hello pirate",
            "system_prompt": "You are a friendly pirate."
        }
    )
    assert response.status_code == 200
    # Check that litellm was called with the custom system prompt in messages
    call_args = mock_litellm.call_args
    messages_sent = call_args.kwargs.get("messages")
    assert messages_sent[0]["role"] == "system"
    assert messages_sent[0]["content"] == "You are a friendly pirate."

@pytest.mark.asyncio
async def test_whitespace_trimmed_properly(client, mock_litellm):
    """
    Leading and trailing whitespace must be trimmed without rejection.
    """
    response = await client.post(
        "/chat",
        json={
            "session_id": "s-trim-test",
            "message": "   Hello with whitespace   "
        }
    )
    assert response.status_code == 200

    # Verify history stores trimmed message
    history = await client.get("/sessions/s-trim-test/messages")
    assert history.status_code == 200
    messages = history.json()["messages"]
    assert messages[0]["content"] == "Hello with whitespace"

@pytest.mark.asyncio
async def test_simulation_disabled_switch(client, mock_litellm):
    """
    When ENABLE_FAILURE_SIMULATION=false, X-Simulate-Failure is ignored.
    """
    with patch.object(settings, "ENABLE_FAILURE_SIMULATION", False):
        response = await client.post(
            "/chat",
            json={
                "session_id": "s-sim-disabled",
                "message": "Simulation switch test"
            },
            headers={"X-Simulate-Failure": "key_1=429"}
        )
        assert response.status_code == 200
        data = response.json()
        # Since simulation is disabled, key_1 is NOT failed
        assert data["metadata"]["key_id"] == "key_1"
        assert data["metadata"]["fallback_attempts"] == 0

@pytest.mark.asyncio
async def test_cors_headers_present(client):
    """
    Verify CORS headers are returned for preflight or normal requests.
    """
    response = await client.get("/health", headers={"Origin": "http://localhost:3000"})
    assert response.status_code == 200
    assert "access-control-allow-origin" in response.headers

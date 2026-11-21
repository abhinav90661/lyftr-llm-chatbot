import pytest

@pytest.mark.asyncio
async def test_failover_single_key(client, mock_litellm):
    # Simulate key_1 returning 429 -> should fall back to key_2
    response = await client.post(
        "/chat",
        json={
            "session_id": "s-fail-1",
            "message": "Test failover single key"
        },
        headers={"X-Simulate-Failure": "key_1=429"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["key_id"] == "key_2"
    assert data["metadata"]["fallback_attempts"] == 1
    assert data["metadata"]["resolution_source"] == "LIVE_INFERENCE"

@pytest.mark.asyncio
async def test_failover_500_status(client, mock_litellm):
    # Simulate key_1 returning 500 -> should fall back to key_2
    response = await client.post(
        "/chat",
        json={
            "session_id": "s-fail-2",
            "message": "Test failover 500 status"
        },
        headers={"X-Simulate-Failure": "key_1=500"}
    )
    assert response.status_code == 200
    data = response.json()
    assert data["metadata"]["key_id"] == "key_2"
    assert data["metadata"]["fallback_attempts"] == 1

@pytest.mark.asyncio
async def test_all_keys_failed_returns_503(client, mock_litellm):
    # Simulate all keys failing with *=429
    response = await client.post(
        "/chat",
        json={
            "session_id": "s-fail-3",
            "message": "Test all keys failing"
        },
        headers={"X-Simulate-Failure": "*=429"}
    )
    assert response.status_code == 503
    assert response.json() == {"detail": "all providers unavailable"}

    # Verify nothing was added to SQLite for this session
    session_res = await client.get("/sessions/s-fail-3/messages")
    assert session_res.status_code == 404

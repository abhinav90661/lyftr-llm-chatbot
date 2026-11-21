import pytest

@pytest.mark.asyncio
async def test_chat_validation_empty_message(client):
    response = await client.post("/chat", json={
        "session_id": "s-val-1",
        "message": "   "
    })
    assert response.status_code == 422
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_chat_validation_missing_session_id(client):
    response = await client.post("/chat", json={
        "message": "Hello"
    })
    assert response.status_code == 422
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_chat_validation_long_message(client):
    response = await client.post("/chat", json={
        "session_id": "s-val-2",
        "message": "a" * 4001
    })
    assert response.status_code == 422
    assert "detail" in response.json()

@pytest.mark.asyncio
async def test_chat_live_and_caching(client, mock_litellm):
    # 1. First call in session 1 -> LIVE_INFERENCE
    res1 = await client.post("/chat", json={
        "session_id": "s-cache-1",
        "message": "What is the capital of France?"
    })
    assert res1.status_code == 200
    data1 = res1.json()
    assert data1["session_id"] == "s-cache-1"
    assert data1["reply"] == "The capital of France is Paris."
    assert data1["metadata"]["resolution_source"] == "LIVE_INFERENCE"
    assert data1["metadata"]["key_id"] == "key_1"
    assert data1["metadata"]["fallback_attempts"] == 0
    assert data1["metadata"]["input_tokens"] == 42
    assert data1["metadata"]["output_tokens"] == 9

    # 2. Same first message in new session 2 -> LLM_CACHE
    res2 = await client.post("/chat", json={
        "session_id": "s-cache-2",
        "message": "What is the capital of France?"
    })
    assert res2.status_code == 200
    data2 = res2.json()
    assert data2["session_id"] == "s-cache-2"
    assert data2["reply"] == data1["reply"]
    assert data2["metadata"]["resolution_source"] == "LLM_CACHE"
    assert data2["metadata"]["key_id"] is None
    assert data2["metadata"]["fallback_attempts"] == 0
    assert data2["metadata"]["input_tokens"] == 42
    assert data2["metadata"]["output_tokens"] == 9
    assert data2["metadata"]["latency_ms"] >= 0

    # 3. Different message in session 2 -> LIVE_INFERENCE (not from cache)
    res3 = await client.post("/chat", json={
        "session_id": "s-cache-2",
        "message": "And what is its population?"
    })
    assert res3.status_code == 200
    data3 = res3.json()
    assert data3["metadata"]["resolution_source"] == "LIVE_INFERENCE"

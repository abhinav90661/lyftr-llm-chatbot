import pytest

@pytest.mark.asyncio
async def test_session_not_found_returns_404(client):
    response = await client.get("/sessions/unknown-session-999/messages")
    assert response.status_code == 404
    assert response.json() == {"detail": "session not found"}

@pytest.mark.asyncio
async def test_session_history_multi_turn(client, mock_litellm):
    session_id = "s-hist-test-1"

    # Turn 1: User asks question
    res1 = await client.post("/chat", json={
        "session_id": session_id,
        "message": "What is the capital of France?"
    })
    assert res1.status_code == 200

    # Turn 2: User asks follow-up
    res2 = await client.post("/chat", json={
        "session_id": session_id,
        "message": "What is its famous tower?"
    })
    assert res2.status_code == 200

    # Fetch history
    history_res = await client.get(f"/sessions/{session_id}/messages")
    assert history_res.status_code == 200
    data = history_res.json()
    assert data["session_id"] == session_id
    messages = data["messages"]
    assert len(messages) == 4

    # Check turn 1
    assert messages[0]["role"] == "user"
    assert messages[0]["content"] == "What is the capital of France?"
    assert messages[1]["role"] == "assistant"
    assert messages[1]["content"] == "The capital of France is Paris."
    assert messages[1]["metadata"]["resolution_source"] == "LIVE_INFERENCE"
    assert messages[1]["metadata"]["input_tokens"] == 42
    assert messages[1]["metadata"]["output_tokens"] == 9

    # Check turn 2
    assert messages[2]["role"] == "user"
    assert messages[2]["content"] == "What is its famous tower?"
    assert messages[3]["role"] == "assistant"
    assert messages[3]["metadata"]["resolution_source"] == "LIVE_INFERENCE"

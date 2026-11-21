import hashlib
import json
import logging
import time
from typing import List, Dict, Any, Optional
from fastapi import HTTPException
import litellm
from litellm.caching.caching import Cache

from app.config import settings
from app.services.failover import parse_simulate_failure_header

logger = logging.getLogger(__name__)

# Initialize LiteLLM's built-in cache (in-memory)
litellm.cache = Cache(type="local")

def compute_cache_key(model: str, messages: List[Dict[str, str]]) -> str:
    """
    Cache key: model + the full message list sent to the LLM (system prompt + history + new message).
    """
    payload = {
        "model": model,
        "messages": [{"role": m["role"], "content": m["content"]} for m in messages]
    }
    serialized = json.dumps(payload, sort_keys=True)
    return f"llm_cache:{hashlib.sha256(serialized.encode('utf-8')).hexdigest()}"

def get_from_cache(cache_key: str) -> Optional[Dict[str, Any]]:
    """Retrieve item from LiteLLM cache."""
    if not litellm.cache:
        return None
    try:
        if hasattr(litellm.cache, "cache") and hasattr(litellm.cache.cache, "get_cache"):
            return litellm.cache.cache.get_cache(cache_key)
        elif hasattr(litellm.cache, "get_cache"):
            return litellm.cache.get_cache(cache_key)
    except Exception as e:
        logger.debug(f"Cache get error: {e}")
    return None

def set_in_cache(cache_key: str, payload: Dict[str, Any]) -> None:
    """Store item in LiteLLM cache."""
    if not litellm.cache:
        return
    try:
        if hasattr(litellm.cache, "cache") and hasattr(litellm.cache.cache, "set_cache"):
            litellm.cache.cache.set_cache(cache_key, payload)
        elif hasattr(litellm.cache, "set_cache"):
            litellm.cache.set_cache(cache_key, payload)
    except Exception as e:
        logger.debug(f"Cache set error: {e}")

async def execute_llm_request(
    messages: List[Dict[str, str]],
    simulate_failure_header: Optional[str] = None
) -> Dict[str, Any]:
    """
    Executes completion with LiteLLM cache lookup and sequential key failover.
    """
    model = settings.LLM_MODEL
    cache_key = compute_cache_key(model, messages)
    start_time = time.perf_counter()

    # 1. Parse failure simulation header if enabled
    simulated_failures = {}
    if settings.ENABLE_FAILURE_SIMULATION and simulate_failure_header:
        simulated_failures = parse_simulate_failure_header(simulate_failure_header)

    # 2. Check LiteLLM cache first (bypass cache if failure simulation is active to guarantee failover execution)
    if not simulated_failures:
        cached_data = get_from_cache(cache_key)
        if cached_data:
            elapsed_ms = max(1, int((time.perf_counter() - start_time) * 1000))
            return {
                "reply": cached_data["reply"],
                "resolution_source": "LLM_CACHE",
                "model": model,
                "latency_ms": elapsed_ms,
                "input_tokens": cached_data["input_tokens"],
                "output_tokens": cached_data["output_tokens"],
                "key_id": None,
                "fallback_attempts": 0
            }

    key_pool = settings.get_key_pool()
    fallback_attempts = 0

    # 3. Iterate through key pool
    for key_id, api_key in key_pool:
        # Check simulation hook for this key or universal wildcard '*'
        sim_status = simulated_failures.get(key_id) or simulated_failures.get("*")
        if sim_status:
            logger.info(f"Simulating failure {sim_status} for {key_id}")
            fallback_attempts += 1
            continue

        try:
            # LiteLLM completion call with primary model and automatic model fallback for Gemini if needed
            model_candidates = [model]
            if "gemini" in model:
                for alt in ["gemini/gemini-1.5-flash", "gemini/gemini-flash-latest", "gemini/gemini-2.5-flash", "gemini/gemini-2.0-flash"]:
                    if alt not in model_candidates:
                        model_candidates.append(alt)

            response = None
            used_model = model
            for m_candidate in model_candidates:
                try:
                    response = await litellm.acompletion(
                        model=m_candidate,
                        messages=messages,
                        api_key=api_key,
                        timeout=30.0
                    )
                    used_model = m_candidate
                    break
                except Exception as m_err:
                    err_msg = str(m_err).lower()
                    if ("not found" in err_msg or "not available" in err_msg or "404" in err_msg) and m_candidate != model_candidates[-1]:
                        logger.info(f"Model {m_candidate} not available for {key_id}, trying {model_candidates[model_candidates.index(m_candidate)+1]}...")
                        continue
                    raise m_err

            if not response:
                raise RuntimeError("No response returned from provider")

            reply = response.choices[0].message.content or ""
            usage = getattr(response, "usage", None)
            input_tokens = getattr(usage, "prompt_tokens", 0) if usage else len(json.dumps(messages)) // 4
            output_tokens = getattr(usage, "completion_tokens", 0) if usage else len(reply) // 4

            elapsed_ms = max(1, int((time.perf_counter() - start_time) * 1000))

            # Store in LiteLLM cache
            cache_payload = {
                "reply": reply,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "model": used_model
            }
            set_in_cache(cache_key, cache_payload)

            return {
                "reply": reply,
                "resolution_source": "LIVE_INFERENCE",
                "model": used_model,
                "latency_ms": elapsed_ms,
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "key_id": key_id,
                "fallback_attempts": fallback_attempts
            }

        except Exception as exc:
            logger.warning(f"Provider call failed for {key_id}: {exc}")
            fallback_attempts += 1
            continue

    # 4. If all keys failed, return 503
    raise HTTPException(
        status_code=503,
        detail="all providers unavailable"
    )

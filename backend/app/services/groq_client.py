"""Groq API client for ClearSign AI inference.

Phase 6.1 — Handles all communication with the Groq API:
- Document classification (small model)
- Full clause breakdown with streaming (large model)
- Clause-level Q&A with streaming (small model)

Implements exponential backoff retry on 429 responses (TRD §8.1).
All calls are async — no sync blocking I/O.
"""

import asyncio
import logging
import os
from collections.abc import AsyncGenerator

from groq import AsyncGroq, RateLimitError

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Client Initialisation
# ---------------------------------------------------------------------------

_client: AsyncGroq | None = None


def get_client() -> AsyncGroq:
    """Get or create the singleton Groq async client."""
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is required")
        _client = AsyncGroq(api_key=api_key)
    return _client


# Model identifiers from environment (swappable without code change)
MODEL_LARGE = os.getenv("GROQ_MODEL_LARGE", "llama-3.3-70b-versatile")
MODEL_SMALL = os.getenv("GROQ_MODEL_SMALL", "llama-3.1-8b-instant")

# Retry configuration (TRD §8.1, Backend Schema §11)
MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # seconds — exponential backoff


# ---------------------------------------------------------------------------
# Core API Calls
# ---------------------------------------------------------------------------


async def call_completion(
    prompt: str,
    model: str,
    max_tokens: int,
    temperature: float = 0.0,
) -> str:
    """Make a non-streaming completion call to Groq.

    Used for document classification where we need the full
    response before proceeding.

    Args:
        prompt: The complete prompt to send.
        model: Groq model identifier.
        max_tokens: Maximum tokens in the response.
        temperature: Sampling temperature (default 0.0 for determinism).

    Returns:
        The full response content string.
    """
    client = get_client()

    for attempt in range(MAX_RETRIES):
        try:
            response = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
            )
            return response.choices[0].message.content or ""
        except RateLimitError:
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt]
                logger.warning(
                    "Groq 429 rate limit — retrying in %ds (attempt %d/%d)",
                    delay,
                    attempt + 1,
                    MAX_RETRIES,
                )
                await asyncio.sleep(delay)
            else:
                raise

    return ""  # Should not reach here


async def stream_completion(
    prompt: str,
    model: str,
    max_tokens: int,
    temperature: float = 0.0,
) -> AsyncGenerator[str, None]:
    """Make a streaming completion call to Groq.

    Yields response tokens as they arrive. Used for clause breakdown
    and Q&A to enable progressive rendering on the frontend.

    Args:
        prompt: The complete prompt to send.
        model: Groq model identifier.
        max_tokens: Maximum tokens in the response.
        temperature: Sampling temperature (default 0.0 for determinism).

    Yields:
        Response content tokens as strings.
    """
    client = get_client()

    for attempt in range(MAX_RETRIES):
        try:
            stream = await client.chat.completions.create(
                model=model,
                messages=[{"role": "user", "content": prompt}],
                max_tokens=max_tokens,
                temperature=temperature,
                stream=True,
            )

            async for chunk in stream:
                if chunk.choices and chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content

            return  # Stream completed successfully

        except RateLimitError:
            if attempt < MAX_RETRIES - 1:
                delay = RETRY_DELAYS[attempt]
                logger.warning(
                    "Groq 429 rate limit during stream — retrying in %ds (attempt %d/%d)",
                    delay,
                    attempt + 1,
                    MAX_RETRIES,
                )
                await asyncio.sleep(delay)
            else:
                raise


# ---------------------------------------------------------------------------
# High-Level API Functions
# ---------------------------------------------------------------------------


async def classify_document(prompt: str) -> str:
    """Classify document type using the small model.

    Args:
        prompt: Classifier prompt with document excerpt.

    Returns:
        Raw JSON response string from the model.
    """
    return await call_completion(
        prompt=prompt,
        model=MODEL_SMALL,
        max_tokens=256,
        temperature=0.0,
    )


async def stream_breakdown(prompt: str) -> AsyncGenerator[str, None]:
    """Stream clause breakdown using the large model.

    Args:
        prompt: Breakdown prompt with full document text.

    Yields:
        Response tokens for progressive JSON parsing.
    """
    async for token in stream_completion(
        prompt=prompt,
        model=MODEL_LARGE,
        max_tokens=4096,
        temperature=0.0,
    ):
        yield token


async def stream_qa(prompt: str) -> AsyncGenerator[str, None]:
    """Stream Q&A response using the small model.

    Args:
        prompt: Q&A prompt with clause context and user question.

    Yields:
        Response tokens for progressive rendering.
    """
    async for token in stream_completion(
        prompt=prompt,
        model=MODEL_SMALL,
        max_tokens=1024,
        temperature=0.0,
    ):
        yield token

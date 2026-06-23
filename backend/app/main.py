"""ClearSign API — Main Application Entry Point.

STATELESS CONSTRAINT (TRD §8.2):
    ClearSign v1.0 has NO authentication by design — no JWT, OAuth,
    session cookies, or login flows. This is an explicit architectural
    decision, not an omission. All routes are public.

    No file content is persisted anywhere. No database, no Redis,
    no external storage. All data lives in-memory for the duration
    of a single request lifecycle and is discarded immediately after.

    The only access-control mechanisms are:
    1. CORS origin restriction (production: clearsign.vercel.app only)
    2. IP-based rate limiting
"""

import os
import time
from collections import defaultdict

from dotenv import load_dotenv
from fastapi import FastAPI, Request, Response
from fastapi.middleware.cors import CORSMiddleware

from .routers import analyse, qa

# Load environment variables from .env file
load_dotenv()

# ---------------------------------------------------------------------------
# App Initialisation
# ---------------------------------------------------------------------------

app = FastAPI(
    title="ClearSign API",
    description="AI-powered document analysis — clause breakdown and Q&A",
    version="1.0.0",
    docs_url="/docs" if os.getenv("ENVIRONMENT", "development") == "development" else None,
    redoc_url=None,
)

# ---------------------------------------------------------------------------
# CORS Configuration (Phase 3.2 — TRD §8.3)
# ---------------------------------------------------------------------------

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in allowed_origins],
    allow_credentials=False,
    allow_methods=["POST", "GET"],
    allow_headers=["Content-Type"],
)

# ---------------------------------------------------------------------------
# Rate Limiting (Phase 3.3 — TRD §8.3)
# In-memory IP request counter. No Redis required.
# Returns 429 when limit exceeded.
# ---------------------------------------------------------------------------

RATE_LIMIT_REQUESTS = 30  # max requests per window
RATE_LIMIT_WINDOW_SECONDS = 60  # window duration

# {ip: [(timestamp, ...), ...]}
_rate_limit_store: dict[str, list[float]] = defaultdict(list)


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    """Simple in-memory rate limiter per client IP.

    Tracks request timestamps per IP and rejects with 429 if
    the count exceeds RATE_LIMIT_REQUESTS within the sliding window.
    """
    # Skip rate limiting for health checks
    if request.url.path == "/health":
        return await call_next(request)

    client_ip = request.client.host if request.client else "unknown"
    now = time.time()
    window_start = now - RATE_LIMIT_WINDOW_SECONDS

    # Prune old entries
    _rate_limit_store[client_ip] = [
        t for t in _rate_limit_store[client_ip] if t > window_start
    ]

    if len(_rate_limit_store[client_ip]) >= RATE_LIMIT_REQUESTS:
        return Response(
            content='{"detail": "Too many requests. Please try again shortly."}',
            status_code=429,
            media_type="application/json",
        )

    _rate_limit_store[client_ip].append(now)
    return await call_next(request)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------

app.include_router(analyse.router, prefix="/api/v1", tags=["Analysis"])
app.include_router(qa.router, prefix="/api/v1", tags=["Q&A"])


@app.get("/health", tags=["Infrastructure"])
@app.get("/api/health", tags=["Infrastructure"])
async def health_check():
    """Health check endpoint for infrastructure monitoring.

    Phase 3.4 — All routes are public. No auth header required.
    Returns 200 OK with status and version.
    """
    return {"status": "ok", "version": "1.0"}

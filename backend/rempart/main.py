"""FastAPI application entrypoint for Rempart."""

from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from .config import settings
from .nft.rollback import RollbackManager
from .ws.manager import ConnectionManager
from .ws.poller import RulesetPoller

logger = logging.getLogger("rempart")
logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan: initialize shared resources."""
    if settings.mock_mode:
        from .nft.mock_executor import MockExecutor
        logger.info("Starting in MOCK MODE - no real nftables interaction")
        app.state.executor = MockExecutor()
    else:
        from .nft.executor import NftExecutor
        logger.info("Starting with real nft binary: %s", settings.nft_binary)
        app.state.executor = NftExecutor(nft_binary=settings.nft_binary)

    app.state.rollback = RollbackManager(
        executor=app.state.executor,
        default_timeout=settings.rollback_timeout,
    )

    # WebSocket live updates
    app.state.ws_manager = ConnectionManager()
    poller = RulesetPoller(
        executor=app.state.executor,
        manager=app.state.ws_manager,
    )
    poller.start()
    logger.info("RulesetPoller started (interval=%.1fs)", poller.interval)

    yield

    poller.stop()


app = FastAPI(
    title="rempart",
    description="Web GUI for nftables - Transparency First",
    version="0.1.0",
    lifespan=lifespan,
)

# CORS for development (Vite dev server on different port)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import and include API routers
from .api.ruleset import router as ruleset_router
from .api.apply import router as apply_router
from .auth.router import router as auth_router
from .ws.routes import router as ws_router

app.include_router(auth_router, prefix="/api/auth", tags=["auth"])
app.include_router(ruleset_router, prefix="/api", tags=["ruleset"])
app.include_router(apply_router, prefix="/api", tags=["apply"])
app.include_router(ws_router)

# Serve frontend static files (production build)
static_dir = Path(__file__).parent / "static"
if static_dir.is_dir():
    app.mount("/", StaticFiles(directory=str(static_dir), html=True), name="static")

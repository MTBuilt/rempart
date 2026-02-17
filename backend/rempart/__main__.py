"""Allow running with `python -m rempart`."""

import uvicorn

from .config import settings

uvicorn.run(
    "rempart.main:app",
    host=settings.host,
    port=settings.port,
    reload=True,
)

from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings, configurable via environment variables."""

    host: str = "127.0.0.1"
    port: int = 8443
    # Mock mode: use in-memory simulator instead of real nft binary
    mock_mode: bool = True
    # Rollback timeout in seconds when applying rules
    rollback_timeout: int = 30
    # Polling interval for live updates (seconds)
    poll_interval: float = 2.0
    # Session TTL in seconds (default 8 hours)
    session_ttl: int = 28800
    # Path to auth config file
    auth_config_path: str = ""
    # Secret key for session signing (generated on first run if not set)
    secret_key: str = "change-me-in-production"
    # Path to nft binary (ignored in mock mode)
    nft_binary: str = "/usr/sbin/nft"
    # Path to save the persistent ruleset config
    nftables_conf_path: str = "/etc/nftables.conf"

    model_config = {"env_prefix": "REMPART_"}

    @property
    def resolved_auth_config_path(self) -> str:
        if self.auth_config_path:
            return self.auth_config_path
        # Default: local path for dev, /etc/rempart for production
        if self.mock_mode:
            return str(Path(__file__).parent.parent / ".rempart_auth.json")
        return "/etc/rempart/auth.json"


settings = Settings()

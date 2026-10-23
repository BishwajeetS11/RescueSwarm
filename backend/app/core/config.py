from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Runtime configuration loaded from environment variables.

    Secrets such as LLM_API_KEY are never returned by API endpoints.
    An empty LLM_API_KEY is expected when LLM_PROVIDER=mock.
    """

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    app_env: str = "development"
    app_host: str = "127.0.0.1"
    app_port: int = 8000
    database_url: str = "sqlite:///./rescueswarm.db"
    llm_provider: str = "mock"
    llm_model: str = ""
    llm_base_url: str = ""
    llm_api_key: str = ""
    llm_timeout_seconds: int = 15
    max_llm_calls_per_run: int = 5
    max_coordinator_steps: int = 10
    max_nodes: int = 25
    max_edges: int = 60
    max_incidents: int = 20
    max_resources: int = 30
    max_shelters: int = 10
    max_llm_text_chars: int = 4000
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()

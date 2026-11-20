from functools import lru_cache
from pathlib import Path
from typing import Annotated, Literal, Self

from pydantic import Field, SecretStr, field_validator, model_validator
from pydantic_settings import BaseSettings, NoDecode, SettingsConfigDict


class Settings(BaseSettings):
    """Process configuration, read from environment variables and an optional `.env` file.

    `.env.example` is the canonical list of variables; keep both in sync.
    """

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    log_level: Literal["debug", "info", "warning", "error"] = "info"
    log_format: Literal["text", "json"] = "text"
    cors_allowed_origins: Annotated[list[str], NoDecode] = Field(
        default_factory=lambda: ["http://localhost:5173"]
    )
    max_upload_bytes: int = Field(default=20 * 1024 * 1024, gt=0)
    max_pdf_pages: int = Field(default=200, gt=0)
    chunk_size: int = Field(default=1200, gt=0)
    chunk_overlap: int = Field(default=200, ge=0)

    # Keys are optional so the API starts without them; whatever needs one asks for it with
    # `require_secret`, which names the missing variable.
    anthropic_api_key: SecretStr | None = None
    llm_max_output_tokens: int = Field(default=1024, gt=0)
    voyage_api_key: SecretStr | None = None
    embedding_model: str = "voyage-4-lite"
    # Must match the vector index's dimension.
    embedding_dimensions: Literal[256, 512, 1024, 2048] = 1024
    pinecone_api_key: SecretStr | None = None
    pinecone_index_name: str = "docchat"
    fs_storage_dir: Path = Path("var/storage")

    @field_validator("cors_allowed_origins", mode="before")
    @classmethod
    def split_comma_separated(cls, value: object) -> object:
        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
        return value

    @model_validator(mode="after")
    def forbid_wildcard_cors_in_production(self) -> Self:
        if self.app_env == "production" and "*" in self.cors_allowed_origins:
            raise ValueError("CORS_ALLOWED_ORIGINS cannot contain '*' in production")
        return self

    @model_validator(mode="after")
    def overlap_smaller_than_chunk(self) -> Self:
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError("CHUNK_OVERLAP must be smaller than CHUNK_SIZE")
        return self


class MissingSetting(RuntimeError):
    """A variable that this command needs is not set."""


def require_secret(value: SecretStr | None, env_var: str) -> str:
    if value is None or not value.get_secret_value():
        raise MissingSetting(f"{env_var} is not set; add it to api/.env")
    return value.get_secret_value()


@lru_cache
def get_settings() -> Settings:
    return Settings()

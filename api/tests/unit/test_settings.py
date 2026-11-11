import pytest
from pydantic import ValidationError

from docchat.core.settings import Settings


def test_defaults_suit_local_development() -> None:
    settings = Settings(_env_file=None)

    assert settings.app_env == "development"
    assert settings.log_format == "text"
    assert settings.cors_allowed_origins == ["http://localhost:5173"]
    assert settings.max_upload_bytes == 20 * 1024 * 1024


def test_reads_comma_separated_origins_from_the_environment(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "https://a.example, https://b.example")

    settings = Settings(_env_file=None)

    assert settings.cors_allowed_origins == ["https://a.example", "https://b.example"]


def test_rejects_unknown_log_format(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LOG_FORMAT", "xml")

    with pytest.raises(ValidationError, match="log_format"):
        Settings(_env_file=None)


def test_production_forbids_wildcard_cors(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("CORS_ALLOWED_ORIGINS", "*")

    with pytest.raises(ValidationError, match="cannot contain"):
        Settings(_env_file=None)

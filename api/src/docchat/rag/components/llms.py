"""The chat model. This is the only module that names `ChatAnthropic` (ADR-0003)."""

from langchain_anthropic import ChatAnthropic
from langchain_core.language_models import BaseChatModel
from pydantic import SecretStr

from docchat.core.settings import Settings, require_secret

DEFAULT_MODEL = "claude-haiku-5-5"


def build_chat_model(settings: Settings) -> BaseChatModel:
    return ChatAnthropic(
        model=DEFAULT_MODEL,
        max_tokens=settings.llm_max_output_tokens,
        anthropic_api_key=SecretStr(
            require_secret(settings.anthropic_api_key, "ANTHROPIC_API_KEY")
        ),
        # Haiku 5.5 thinks adaptively at effort "medium" by default; answering from a handful of
        # excerpts needs little of it, and "low" answers faster for the same result.
        output_config={"effort": "low"},
    )

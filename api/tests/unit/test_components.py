import pytest
from langchain_anthropic import ChatAnthropic
from langchain_voyageai import VoyageAIEmbeddings
from pydantic import SecretStr

from docchat.core.settings import MissingSetting, Settings
from docchat.rag.components.llms import build_chat_model
from docchat.rag.components.registry import build_embeddings


def test_builds_voyage_embeddings_with_the_configured_dimensions() -> None:
    settings = Settings(_env_file=None, voyage_api_key=SecretStr("test-key"))

    embeddings = build_embeddings(settings)

    assert isinstance(embeddings, VoyageAIEmbeddings)
    assert (embeddings.model, embeddings.output_dimension) == ("voyage-4-lite", 1024)


def test_builds_haiku_with_the_output_cap_and_low_effort() -> None:
    settings = Settings(_env_file=None, anthropic_api_key=SecretStr("test-key"))

    llm = build_chat_model(settings)

    assert isinstance(llm, ChatAnthropic)
    assert (llm.model, llm.max_tokens) == ("claude-haiku-5-5", 1024)
    assert llm.output_config == {"effort": "low"}


@pytest.mark.parametrize(
    ("build", "variable"),
    [(build_embeddings, "VOYAGE_API_KEY"), (build_chat_model, "ANTHROPIC_API_KEY")],
)
def test_a_missing_key_names_its_variable(build: object, variable: str) -> None:
    with pytest.raises(MissingSetting, match=variable):
        build(Settings(_env_file=None))  # type: ignore[operator]

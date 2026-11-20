"""Builds the LangChain components from settings. Nothing else names an embeddings vendor."""

from langchain_core.embeddings import Embeddings
from langchain_voyageai import VoyageAIEmbeddings
from pydantic import SecretStr

from docchat.core.settings import Settings, require_secret


def build_embeddings(settings: Settings) -> Embeddings:
    # Voyage embeds a query and a document differently (input_type); LangChain's
    # embed_query and embed_documents pick the right one.
    return VoyageAIEmbeddings(
        model=settings.embedding_model,
        output_dimension=settings.embedding_dimensions,
        voyage_api_key=SecretStr(require_secret(settings.voyage_api_key, "VOYAGE_API_KEY")),
    )

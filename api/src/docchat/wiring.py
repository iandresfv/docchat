"""Builds the concrete adapters and services from the settings.

Shared by the two composition roots that run outside an HTTP request: the CLI and the worker.
Nothing else chooses an implementation.
"""

from docchat.adapters.pdf.pypdf_extractor import PypdfExtractor
from docchat.adapters.storage.fs_storage import FsStorage
from docchat.adapters.vector.pinecone_index import PineconeIndex
from docchat.core.settings import Settings, require_secret
from docchat.ports.object_storage import ObjectStorage
from docchat.ports.vector_index import VectorIndex
from docchat.rag.components.registry import build_embeddings
from docchat.services.ingestion_service import IngestionService


def build_storage(settings: Settings) -> ObjectStorage:
    return FsStorage(settings.fs_storage_dir)


def build_vector_index(settings: Settings) -> VectorIndex:
    return PineconeIndex.connect(
        api_key=require_secret(settings.pinecone_api_key, "PINECONE_API_KEY"),
        index_name=settings.pinecone_index_name,
    )


def build_ingestion_service(settings: Settings) -> IngestionService:
    return IngestionService(
        storage=build_storage(settings),
        extractor=PypdfExtractor(),
        embeddings=build_embeddings(settings),
        index=build_vector_index(settings),
        settings=settings,
    )

from uuid import UUID

import pytest
from langchain_core.embeddings import DeterministicFakeEmbedding
from langchain_core.language_models.fake_chat_models import ParrotFakeChatModel

from docchat.adapters.vector.memory_index import InMemoryIndex
from docchat.core.errors import NotFound
from docchat.ports.vector_index import Chunk
from docchat.rag.answer import answer_question

PDF_ID = UUID("00000000-0000-4000-8000-000000000001")
embeddings = DeterministicFakeEmbedding(size=8)


def indexed(*pages: tuple[int, str]) -> InMemoryIndex:
    index = InMemoryIndex()
    index.upsert(
        [
            Chunk(f"{PDF_ID}:{page:04d}:0000", PDF_ID, page, 0, text, embeddings.embed_query(text))
            for page, text in pages
        ]
    )
    return index


def test_the_model_sees_the_question_and_each_excerpt_with_its_page() -> None:
    index = indexed((2, "Celery runs ingestion only."), (5, "Pinecone is the managed store."))

    # The parrot model answers with the last message it received: the prompt we built.
    answer = answer_question(
        "What runs ingestion?",
        pdf_id=PDF_ID,
        embeddings=embeddings,
        index=index,
        llm=ParrotFakeChatModel(),
        k=2,
    )

    assert "[p.2] Celery runs ingestion only." in answer.text
    assert "[p.5] Pinecone is the managed store." in answer.text
    assert answer.text.endswith("Question: What runs ingestion?")
    assert sorted(source.chunk.page for source in answer.sources) == [2, 5]


def test_a_pdf_without_chunks_is_not_found() -> None:
    with pytest.raises(NotFound, match="ingest it first"):
        answer_question(
            "Anything?",
            pdf_id=PDF_ID,
            embeddings=embeddings,
            index=InMemoryIndex(),
            llm=ParrotFakeChatModel(),
        )

"""A one-shot answer from the closest chunks: embed the question, search the PDF, ask the model.

No conversation memory and no graph yet; the S4 graph (condense → retrieve → generate) replaces
this with the same inputs.
"""

from dataclasses import dataclass
from uuid import UUID

from langchain_core.embeddings import Embeddings
from langchain_core.language_models import BaseChatModel
from langchain_core.messages import HumanMessage, SystemMessage

from docchat.core.errors import NotFound
from docchat.ports.vector_index import ScoredChunk, VectorIndex
from docchat.rag.prompts import ANSWER_SYSTEM_PROMPT, answer_prompt


@dataclass(frozen=True, slots=True)
class Answer:
    text: str
    sources: list[ScoredChunk]


def answer_question(
    question: str,
    *,
    pdf_id: UUID,
    embeddings: Embeddings,
    index: VectorIndex,
    llm: BaseChatModel,
    k: int = 4,
) -> Answer:
    sources = index.search(embeddings.embed_query(question), pdf_id=pdf_id, k=k)
    if not sources:
        raise NotFound(f"PDF {pdf_id} has no indexed chunks; ingest it first.")
    reply = llm.invoke(
        [SystemMessage(ANSWER_SYSTEM_PROMPT), HumanMessage(answer_prompt(question, sources))]
    )
    return Answer(reply.text, sources)

"""Prompts. Kept apart from the code that sends them, so a change to the wording is its own diff."""

from collections.abc import Sequence

from docchat.ports.vector_index import ScoredChunk

ANSWER_SYSTEM_PROMPT = """\
You answer questions about one PDF using only the excerpts in the user's message. Each excerpt \
starts with the page it comes from, written as [p.N].

- Cite the page of every claim inline as [p.N], using only pages that appear in the excerpts.
- If the excerpts do not contain the answer, say that the document does not cover it; do not \
fill the gap with outside knowledge.
- Answer in the language of the question, briefly."""


def answer_prompt(question: str, sources: Sequence[ScoredChunk]) -> str:
    excerpts = "\n\n".join(f"[p.{source.chunk.page}] {source.chunk.text}" for source in sources)
    return f"<excerpts>\n{excerpts}\n</excerpts>\n\nQuestion: {question}"

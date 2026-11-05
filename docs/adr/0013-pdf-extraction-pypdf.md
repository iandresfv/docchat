# ADR-0013 — PDF extraction: pypdf directly

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Verified: `langchain-community` was sunset and its repository archived on 2026-06-19, and
`PyPDFLoader` lives there. PyMuPDF is licensed AGPL, which is a problem for a permissively
licensed portfolio project.

## Decision

`pypdf` 6.x (BSD-3) behind the `PdfExtractor` port, with page-aware chunking in
`rag/chunking.py` using `RecursiveCharacterTextSplitter` at 1200 characters with 200 of overlap
and the separators `"\n\n"`, `"\n"`, `". "`, `" "`.

Chunking happens one page at a time so the page number survives into the vector metadata and can
be cited in an answer. The cost is a short final chunk per page, which is accepted.

## Reversal

A `PyMuPdfExtractor` against the same port, with an AGPL note in the README.

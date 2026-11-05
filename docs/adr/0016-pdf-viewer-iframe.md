# ADR-0016 — PDF viewing: an iframe with a presigned URL and `#page=N`

- **Status:** Accepted
- **Date:** 2026-10-11

## Decision

Render the PDF in a plain `<iframe>` pointed at the presigned URL. Clicking a citation sets the
`src` to `${download_url}#page=${page}`.

Zero dependencies, and the browser's native viewer handles a 200-page file better than pdf.js
inside React for v1.

## Reversal

`react-pdf` 11 when highlighting the cited passage in the text layer becomes worth the bundle
size (planned for v1.x).

# ADR-0012 — Object storage: Garage single node behind the `ObjectStorage` port

- **Status:** Accepted
- **Date:** 2026-10-11

## Context

Uploaded PDFs need durable storage with presigned URLs for the viewer. Verified 2026-10-11: the
MinIO repository was archived on 2026-04-25 with no images published since 2025-10. Alternatives
checked: Garage v2.4.1 (AGPL, single binary, S3 API, ~256–512 Mi of memory), SeaweedFS,
versitygw, RustFS 1.0.

## Decision

Garage as a single node (`replication_factor=1`) in the cluster, reached through an `S3Storage`
adapter built on boto3, so moving to AWS S3 or Cloudflare R2 in production is a configuration
change. An `FsStorage` adapter covers tests and work without a cluster. Presigned GET URLs valid
for 10 minutes feed the PDF viewer.

## Rejected

MinIO (archived), a filesystem on a PVC alone (no presigned URLs, no S3 story), and hosted S3
for development (costs money and requires network).

## Reversal

Swap the endpoint and credentials, or delete the Garage manifests and run with `fs`.

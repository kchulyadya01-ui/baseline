import "server-only";

/**
 * Whether Vercel Blob is usable in this environment.
 *
 * There are two ways the SDK authenticates, and only checking for the first
 * one is wrong:
 *
 *   1. `BLOB_READ_WRITE_TOKEN` — the classic long-lived token.
 *   2. Vercel OIDC + `BLOB_STORE_ID` — what a store attached through the
 *      dashboard gets today. No read-write token is ever created, and the SDK
 *      documents the token as "ignored when Vercel OIDC token is available and
 *      either process.env.BLOB_STORE_ID or options.storeId is set".
 *
 * `VERCEL_OIDC_TOKEN` is injected by the platform at runtime and is also
 * written into .env.local by `vercel link`, so local development against the
 * real store works too.
 */
export function isBlobConfigured(): boolean {
  if (process.env.BLOB_READ_WRITE_TOKEN) return true;
  return Boolean(process.env.BLOB_STORE_ID && process.env.VERCEL_OIDC_TOKEN);
}

/**
 * True when a store is attached at all, OIDC token or not.
 *
 * Used for cleanup paths (deleting blobs behind a deleted project) where it is
 * worth attempting the call and tolerating a failure, rather than skipping it
 * and orphaning files.
 */
export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

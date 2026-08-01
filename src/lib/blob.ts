import "server-only";

/**
 * Whether a Vercel Blob store is attached.
 *
 * Deliberately only checks that a store exists, not that credentials resolve.
 * The SDK authenticates two different ways — a classic `BLOB_READ_WRITE_TOKEN`,
 * or the platform's OIDC token together with `BLOB_STORE_ID` — and how the
 * second one is plumbed through at runtime is the SDK's business, not ours.
 *
 * An earlier version of this required `VERCEL_OIDC_TOKEN` to be visible as an
 * env var and refused every upload on a correctly configured store because it
 * was not. Guessing at someone else's credential resolution is how that
 * happens; the SDK's own error is the honest answer, so failures now surface
 * from `handleUpload` rather than from a guess made before it.
 */
export function hasBlobStore(): boolean {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID);
}

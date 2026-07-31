import { ButtonLink } from "@/components/ui/button";

/**
 * The tools half of the site has no database and must keep working without
 * one. Every community entry point checks `isCommunityConfigured()` and renders
 * this instead of throwing, so a deployment missing DATABASE_URL degrades to an
 * explanation rather than a 500.
 */
export function CommunityNotConfigured() {
  return (
    <div className="mx-auto max-w-[40rem] px-5 py-28">
      <span className="label-mono">Community</span>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Not switched on yet
      </h1>
      <p className="mt-4 text-base text-fg-muted">
        The community section needs a database and an image store, and this
        deployment has neither configured. The tools work without them.
      </p>
      <p className="mt-4 text-sm text-fg-subtle">
        Set <code className="font-mono text-xs">DATABASE_URL</code> and{" "}
        <code className="font-mono text-xs">BLOB_READ_WRITE_TOKEN</code>, run{" "}
        <code className="font-mono text-xs">npx prisma migrate deploy</code>, and
        redeploy. Setup steps are in the README.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/fonts">Browse fonts</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}

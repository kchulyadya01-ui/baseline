import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth, authProviderStatus, signIn } from "@/lib/auth";
import { Input, Label } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to post work, save projects and message creators.",
  robots: { index: false, follow: false },
};

export default async function SignInPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/community";
  const error = typeof params.error === "string" ? params.error : null;

  const session = await auth();
  if (session?.user) redirect(session.user.handle ? next : "/welcome");

  const providers = authProviderStatus();

  return (
    <div className="mx-auto max-w-[24rem] px-5 py-24">
      <span className="label-mono">Baseline</span>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        Sign in
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        You only need an account to post work, save projects or message someone.
        The tools stay free and open without one.
      </p>

      {error ? (
        <p className="mt-6 rounded-control border border-danger/30 bg-danger-soft p-3 text-xs text-danger">
          That sign-in did not work. Try again, or use a different method.
        </p>
      ) : null}

      {!providers.any ? (
        <p className="mt-8 rounded-card border border-line bg-bg-sunken p-4 text-sm text-fg-muted">
          No sign-in method is configured on this deployment. Add Google OAuth
          credentials or a Resend API key — see the README.
        </p>
      ) : null}

      <div className="mt-8 space-y-3">
        {providers.google ? (
          <form
            action={async () => {
              "use server";
              await signIn("google", { redirectTo: next });
            }}
          >
            <button
              type="submit"
              className="flex h-11 w-full items-center justify-center gap-2.5 rounded-control border border-line-strong bg-bg-raised text-sm font-medium text-fg transition-colors hover:bg-bg-sunken"
            >
              <GoogleMark />
              Continue with Google
            </button>
          </form>
        ) : null}

        {providers.google && providers.email ? (
          <div className="flex items-center gap-3 py-1">
            <span className="h-px flex-1 bg-line" />
            <span className="label-mono">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        ) : null}

        {providers.email ? (
          <form
            action={async (formData: FormData) => {
              "use server";
              await signIn("resend", {
                email: String(formData.get("email") ?? ""),
                redirectTo: next,
              });
            }}
            className="space-y-2"
          >
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              required
              autoComplete="email"
              placeholder="you@studio.com"
            />
            <button
              type="submit"
              className="h-11 w-full rounded-control bg-accent text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
            >
              Email me a sign-in link
            </button>
          </form>
        ) : null}
      </div>

      <p className="mt-8 text-2xs leading-relaxed text-fg-subtle">
        By signing in you agree to keep it civil. Posting someone else&rsquo;s
        work is fine when you credit them; claiming it as yours is not.
      </p>
    </div>
  );
}

function GoogleMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="#4285F4"
        d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.4a5.5 5.5 0 0 1-2.4 3.6v3h3.9c2.3-2.1 3.6-5.2 3.6-8.8Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.2 0 6-1.1 8-3l-3.9-3c-1.1.7-2.5 1.2-4.1 1.2-3.1 0-5.8-2.1-6.7-5H1.3v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.3 14.2a7.2 7.2 0 0 1 0-4.6V6.5H1.3a12 12 0 0 0 0 10.8l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.8c1.8 0 3.4.6 4.6 1.8l3.4-3.4A12 12 0 0 0 1.3 6.5l4 3.1c.9-2.9 3.6-4.8 6.7-4.8Z"
      />
    </svg>
  );
}

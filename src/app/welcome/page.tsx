import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HandleForm } from "@/components/community/handle-form";
import { auth } from "@/lib/auth";
import { suggestHandle } from "@/lib/validation";

export const metadata: Metadata = {
  title: "Pick a handle",
  robots: { index: false, follow: false },
};

/**
 * Onboarding. Auth.js creates the user row on first sign-in, but a handle is
 * the public identity and has to be chosen, not generated — so every write path
 * routes through here until one exists.
 */
export default async function WelcomePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.searchParams;
  const next = typeof params.next === "string" ? params.next : "/community";

  const session = await auth();
  if (!session?.user?.id) redirect("/signin");
  if (session.user.handle) redirect(next);

  return (
    <div className="mx-auto max-w-[26rem] px-5 py-24">
      <span className="label-mono">One step</span>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        Pick a handle
      </h1>
      <p className="mt-3 text-sm text-fg-muted">
        This is your address on Baseline — people will find your work at{" "}
        <span className="font-mono text-xs text-fg">/u/your-handle</span>. You
        can change it later, up to three times a month.
      </p>

      <HandleForm
        suggestion={suggestHandle(session.user.email)}
        next={next}
        className="mt-8"
      />
    </div>
  );
}

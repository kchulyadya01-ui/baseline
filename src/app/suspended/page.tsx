import type { Metadata } from "next";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isCommunityConfigured } from "@/lib/db";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Account suspended",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SuspendedPage() {
  let reason: string | null = null;

  if (isCommunityConfigured()) {
    const session = await auth();
    if (session?.user?.id) {
      const record = await db.user.findUnique({
        where: { id: session.user.id },
        select: { suspendedReason: true },
      });
      reason = record?.suspendedReason ?? null;
    }
  }

  return (
    <div className="mx-auto max-w-[32rem] px-5 py-28">
      <span className="label-mono">Account</span>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        Your account is suspended
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        You can still read the community and use every tool on the site, but you
        cannot post, save, follow or send messages.
      </p>
      {reason ? (
        <p className="mt-4 rounded-card border border-line bg-bg-sunken p-4 text-sm text-fg">
          <span className="label-mono mb-1 block">Reason given</span>
          {reason}
        </p>
      ) : null}
      <p className="mt-4 text-sm text-fg-muted">
        If you think this is a mistake, reply to the email we sent and a person
        will look at it.
      </p>
      <div className="mt-8 flex gap-3">
        <ButtonLink href="/community" variant="secondary">
          Browse the community
        </ButtonLink>
        <ButtonLink href="/fonts">Use the tools</ButtonLink>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import { HandleForm } from "@/components/community/handle-form";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { ProfileForm } from "@/components/community/profile-form";
import { requireOnboarded, signOut } from "@/lib/auth";
import { db, isCommunityConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const user = await requireOnboarded("/settings");

  const [profile, blocks] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { name: true, bio: true, website: true, location: true, email: true },
    }),
    db.block.findMany({
      where: { blockerId: user.id },
      select: {
        blocked: { select: { id: true, handle: true, name: true } },
      },
    }),
  ]);

  return (
    <div className="mx-auto max-w-[36rem] px-5 pb-16">
      <header className="pt-12 pb-8">
        <span className="label-mono">Account</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Settings
        </h1>
        <p className="mt-2 text-sm text-fg-subtle">{profile?.email}</p>
      </header>

      <section className="border-t border-line py-8">
        <h2 className="label-mono mb-4">Handle</h2>
        <HandleForm current={user.handle} />
      </section>

      <section className="border-t border-line py-8">
        <h2 className="label-mono mb-4">Profile</h2>
        <ProfileForm
          initial={{
            name: profile?.name ?? "",
            bio: profile?.bio ?? "",
            website: profile?.website ?? "",
            location: profile?.location ?? "",
          }}
        />
      </section>

      <section className="border-t border-line py-8">
        <h2 className="label-mono mb-4">Blocked accounts</h2>
        {blocks.length === 0 ? (
          <p className="text-sm text-fg-muted">
            You have not blocked anyone. Blocking hides both accounts from each
            other and removes any follows in either direction.
          </p>
        ) : (
          <ul className="space-y-2">
            {blocks.map(({ blocked }) => (
              <li
                key={blocked.id}
                className="flex items-center justify-between rounded-control border border-line px-3 py-2 text-sm"
              >
                <span>{blocked.name ?? `@${blocked.handle}`}</span>
                <span className="text-2xs text-fg-subtle">
                  Unblock from their profile
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="border-t border-line py-8">
        <form
          action={async () => {
            "use server";
            await signOut({ redirectTo: "/" });
          }}
        >
          <button
            type="submit"
            className="h-10 rounded-control border border-line-strong px-4 text-sm text-fg-muted transition-colors hover:text-fg"
          >
            Sign out
          </button>
        </form>
      </section>
    </div>
  );
}

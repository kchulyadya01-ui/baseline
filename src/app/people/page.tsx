import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/community/avatar";
import { FollowButton } from "@/components/community/interactions";
import { CommunityNav } from "@/components/community/community-nav";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { PeopleSearch } from "@/components/community/people-search";
import { auth } from "@/lib/auth";
import { searchPeople } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";
import { pluralise } from "@/lib/utils";

export const metadata: Metadata = {
  title: "People — designers on Baseline",
  description:
    "Find designers by name, handle or what they work on. Follow the ones whose work you want to keep seeing.",
  alternates: { canonical: "/people" },
};

export const dynamic = "force-dynamic";

export default async function PeoplePage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const params = await props.searchParams;
  const q = typeof params.q === "string" ? params.q : "";

  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const people = await searchPeople({ q, viewerId });

  return (
    <div className="mx-auto max-w-[52rem] px-5">
      <div className="pt-6">
        <CommunityNav active="people" />
      </div>
      <header className="pt-12 pb-6">
        <span className="label-mono">Community</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          People
        </h1>
        <p className="mt-3 max-w-xl text-sm text-fg-muted">
          Search by handle, name or what someone writes about themselves.
        </p>
      </header>

      <PeopleSearch initialQuery={q} />

      <p className="py-5 text-sm text-fg-muted">
        {q
          ? `${people.length === 40 ? "40+" : people.length} ${people.length === 1 ? "person" : "people"} matching “${q}”`
          : `${pluralise(people.length, "person", "people")}, most followed first`}
      </p>

      {people.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-sm text-fg-muted">
          {q
            ? "Nobody matches that. Try a shorter search."
            : "No one has joined yet."}
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line pb-12">
          {people.map((person) => (
            <li
              key={person.id}
              className="flex items-start gap-4 py-4"
            >
              <Link href={`/u/${person.handle}`} className="shrink-0">
                <Avatar
                  name={person.name}
                  handle={person.handle}
                  image={person.image}
                />
              </Link>

              <div className="min-w-0 flex-1">
                <Link href={`/u/${person.handle}`} className="group">
                  <span className="block truncate text-sm font-medium text-fg group-hover:underline">
                    {person.name ?? `@${person.handle}`}
                  </span>
                  <span className="block truncate font-mono text-2xs text-fg-subtle">
                    @{person.handle}
                  </span>
                </Link>
                {person.bio ? (
                  <p className="mt-1 line-clamp-2 text-xs text-fg-muted">
                    {person.bio}
                  </p>
                ) : null}
                <p className="mt-1 text-2xs text-fg-subtle">
                  {pluralise(person._count.projects, "project")} ·{" "}
                  {pluralise(person._count.followers, "follower")}
                  {person.location ? ` · ${person.location}` : ""}
                </p>
              </div>

              {viewerId && !person.isSelf ? (
                <FollowButton
                  userId={person.id}
                  initialFollowing={person.isFollowing}
                  size="sm"
                />
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { ProjectCard, ProjectGrid } from "@/components/community/project-card";
import { RepostCard } from "@/components/community/repost-card";
import { ButtonLink } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import { getFeed, getRepostsFromFollowing, type FeedSort } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Community — work from designers using Baseline",
  description:
    "Browse projects from the community, save what you like into collections, and message the people who made it. Every post lists the fonts and colours it used.",
  alternates: { canonical: "/community" },
};

// The feed is per-viewer once blocks and follows apply, so it cannot be cached.
export const dynamic = "force-dynamic";

const SORTS: { key: FeedSort; label: string }[] = [
  { key: "recent", label: "Recent" },
  { key: "popular", label: "Popular" },
  { key: "following", label: "Following" },
];

export default async function CommunityPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const params = await props.searchParams;
  const single = (key: string) => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const session = await auth();
  const viewerId = session?.user?.id ?? null;
  const sort = (single("sort") as FeedSort) ?? "recent";
  const tag = single("tag");
  const fontSlug = single("font");
  const q = single("q");

  const { projects } = await getFeed({ sort, tag, fontSlug, q, viewerId });

  // The Following feed interleaves original posts with reposts from the same
  // people, ordered by when each appeared. Reposts only belong here — putting
  // them in Recent or Popular would let one project occupy the grid twice.
  const reposts =
    sort === "following" && viewerId && !tag && !fontSlug && !q
      ? await getRepostsFromFollowing(viewerId)
      : [];

  const followingRows = [
    ...projects.map((p) => ({ kind: "post" as const, at: p.publishedAt, project: p })),
    ...reposts.map((r) => ({
      kind: "repost" as const,
      at: r.createdAt,
      project: r.project,
      by: r.user,
      comment: r.comment,
      id: r.id,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  const filterLabel = tag
    ? `#${tag}`
    : fontSlug
      ? `set in ${fontSlug}`
      : q
        ? `“${q}”`
        : null;

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">05 · Community</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="max-w-2xl font-display text-4xl font-semibold tracking-tight">
              What people are making
            </h1>
            <p className="mt-4 max-w-2xl text-base text-fg-muted">
              Post your work, save what you like into collections, and message
              the person who made it. Every project lists the fonts and colours
              behind it, so a feed post is a lead back into the tools.
            </p>
          </div>
          <ButtonLink href="/submit" size="lg">
            Post a project
          </ButtonLink>
        </div>
      </header>

      <div className="sticky top-14 z-30 -mx-5 flex flex-wrap items-center gap-2 border-b border-line bg-bg/90 px-5 py-3 backdrop-blur-md">
        {SORTS.map((option) => {
          const href = option.key === "recent" ? "/community" : `/community?sort=${option.key}`;
          return (
            <Link
              key={option.key}
              href={href}
              className={cn(
                "rounded-full border px-3 py-1 text-xs transition-colors",
                sort === option.key
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong text-fg-muted hover:text-fg",
              )}
            >
              {option.label}
            </Link>
          );
        })}

        {filterLabel ? (
          <span className="ml-2 inline-flex items-center gap-2 rounded-full border border-accent-line bg-accent-soft px-3 py-1 text-xs text-accent">
            {filterLabel}
            <Link href="/community" aria-label="Clear filter">
              ×
            </Link>
          </span>
        ) : null}
      </div>

      <div className="py-8">
        {sort === "following" ? (
          followingRows.length === 0 ? (
            <EmptyFeed sort={sort} signedIn={Boolean(viewerId)} />
          ) : (
            <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {followingRows.map((row) =>
                row.kind === "repost" ? (
                  <RepostCard
                    key={`r-${row.id}`}
                    project={row.project}
                    by={row.by}
                    comment={row.comment}
                  />
                ) : (
                  <ProjectCard key={row.project.id} project={row.project} />
                ),
              )}
            </div>
          )
        ) : projects.length === 0 ? (
          <EmptyFeed sort={sort} signedIn={Boolean(viewerId)} />
        ) : (
          <ProjectGrid projects={projects} />
        )}
      </div>
    </div>
  );
}

function EmptyFeed({ sort, signedIn }: { sort: FeedSort; signedIn: boolean }) {
  if (sort === "following") {
    return (
      <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
        <p className="font-display text-lg font-medium">
          {signedIn ? "You are not following anyone yet" : "Sign in to see this"}
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
          {signedIn
            ? "Follow a few people and their work will collect here."
            : "Following is per-account, so this view needs you signed in."}
        </p>
        <ButtonLink
          href={signedIn ? "/community" : "/signin?next=/community"}
          variant="secondary"
          size="sm"
          className="mt-5"
        >
          {signedIn ? "Browse recent work" : "Sign in"}
        </ButtonLink>
      </div>
    );
  }

  return (
    <div className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center">
      <p className="font-display text-lg font-medium">Nothing here yet</p>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">
        Be the first to post. A project needs one image and a title; the fonts
        and colours are optional but they are what makes the feed useful.
      </p>
      <ButtonLink href="/submit" size="sm" className="mt-5">
        Post a project
      </ButtonLink>
    </div>
  );
}

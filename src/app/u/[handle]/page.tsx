import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/avatar";
import {
  FollowButton,
  MessageButton,
  ReportMenu,
} from "@/components/community/interactions";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { ProjectGrid } from "@/components/community/project-card";
import { RepostCard } from "@/components/community/repost-card";
import { ButtonLink } from "@/components/ui/button";
import { auth } from "@/lib/auth";
import {
  getCollections,
  getProfile,
  getUserCredits,
  getUserProjects,
  getUserReposts,
} from "@/lib/community";
import { db, isCommunityConfigured } from "@/lib/db";
import { formatDate, pluralise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ handle: string }>;
}): Promise<Metadata> {
  if (!isCommunityConfigured()) return { title: "Profile" };

  const { handle } = await props.params;
  const user = await getProfile(handle, null);
  if (!user) return { title: "Profile not found" };

  return {
    title: `${user.name ?? `@${user.handle}`} — ${user._count.projects} projects`,
    description: user.bio ?? `Work posted by @${user.handle} on Baseline.`,
    alternates: { canonical: `/u/${user.handle}` },
  };
}

export default async function ProfilePage(props: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const { handle } = await props.params;
  const params = await props.searchParams;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const user = await getProfile(handle, viewerId);
  if (!user) notFound();

  const isSelf = viewerId === user.id;

  const [projects, reposts, taggedIn, collections, follow] = await Promise.all([
    getUserProjects(user.id, viewerId),
    getUserReposts(user.id, viewerId),
    getUserCredits(user.id, viewerId),
    getCollections(user.id, viewerId),
    viewerId && !isSelf
      ? db.follow.findUnique({
          where: {
            followerId_followingId: { followerId: viewerId, followingId: user.id },
          },
          select: { id: true },
        })
      : Promise.resolve(null),
  ]);

  const tab = typeof params.tab === "string" ? params.tab : "projects";

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <header className="border-b border-line pt-12 pb-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex gap-5">
            <Avatar
              name={user.name}
              handle={user.handle}
              image={user.image}
              size="lg"
            />
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight">
                {user.name ?? `@${user.handle}`}
              </h1>
              <p className="mt-1 font-mono text-xs text-fg-subtle">
                @{user.handle}
              </p>

              {user.bio ? (
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-fg-muted">
                  {user.bio}
                </p>
              ) : null}

              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-fg-subtle">
                <span>{pluralise(user._count.projects, "project")}</span>
                <span>{pluralise(user._count.followers, "follower")}</span>
                <span>{user._count.following} following</span>
                {user.location ? <span>{user.location}</span> : null}
                {user.website ? (
                  <a
                    href={user.website}
                    target="_blank"
                    rel="noreferrer nofollow"
                    className="text-accent hover:underline"
                  >
                    {user.website.replace(/^https?:\/\//, "")}
                  </a>
                ) : null}
                <span>Joined {formatDate(user.createdAt.toISOString())}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-2">
            {isSelf ? (
              <>
                <ButtonLink href="/submit">Post a project</ButtonLink>
                <ButtonLink href="/settings" variant="secondary">
                  Edit profile
                </ButtonLink>
              </>
            ) : viewerId ? (
              <>
                <FollowButton userId={user.id} initialFollowing={Boolean(follow)} />
                <MessageButton userId={user.id} />
              </>
            ) : (
              <ButtonLink href={`/signin?next=/u/${user.handle}`} variant="secondary">
                Sign in to follow
              </ButtonLink>
            )}
          </div>
        </div>
      </header>

      <section className="py-10">
        <div className="mb-6 flex flex-wrap gap-2">
          {[
            ["projects", "Projects", projects.length],
            ["reposts", "Reposts", reposts.length],
            ["tagged", "Tagged in", taggedIn.length],
          ].map(([key, label, count]) => (
            <Link
              key={key as string}
              href={
                key === "projects"
                  ? `/u/${user.handle}`
                  : `/u/${user.handle}?tab=${key}`
              }
              className={
                tab === key
                  ? "rounded-full border border-accent bg-accent-soft px-3 py-1 text-xs text-accent"
                  : "rounded-full border border-line-strong px-3 py-1 text-xs text-fg-muted hover:text-fg"
              }
            >
              {label as string}{" "}
              <span className="opacity-60">{count as number}</span>
            </Link>
          ))}
        </div>

        {tab === "reposts" ? (
          reposts.length === 0 ? (
            <EmptyTab text={isSelf ? "You have not reposted anything yet." : "Nothing reposted yet."} />
          ) : (
            <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
              {reposts.map((r) => (
                <RepostCard
                  key={r.id}
                  project={r.project}
                  by={{ handle: user.handle, name: user.name, image: user.image }}
                  comment={r.comment}
                />
              ))}
            </div>
          )
        ) : tab === "tagged" ? (
          taggedIn.length === 0 ? (
            <EmptyTab text={isSelf ? "Nobody has tagged you on a project yet." : "Not tagged on anything yet."} />
          ) : (
            <ProjectGrid projects={taggedIn.map((c) => c.project)} />
          )
        ) : projects.length === 0 ? (
          <EmptyTab text={isSelf ? "You have not posted anything yet." : "Nothing posted yet."} />
        ) : (
          <ProjectGrid projects={projects} />
        )}
      </section>

      {collections.length ? (
        <section className="border-t border-line py-10">
          <h2 className="label-mono mb-6">Collections</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {collections.map((collection) => (
              <Link
                key={collection.id}
                href={`/u/${user.handle}/collections/${collection.slug}`}
                className="group rounded-card border border-line bg-bg-raised p-4 transition-colors hover:border-line-strong"
              >
                <div className="grid grid-cols-4 gap-1 overflow-hidden rounded">
                  {Array.from({ length: 4 }).map((_, i) => {
                    const image = collection.saves[i]?.project.images[0];
                    return image ? (
                      <img
                        key={i}
                        src={image.url}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full object-cover"
                      />
                    ) : (
                      <span key={i} className="aspect-square w-full bg-bg-inset" />
                    );
                  })}
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {collection.name}
                  </span>
                  <span className="shrink-0 text-2xs text-fg-subtle">
                    {collection.itemCount}
                  </span>
                </div>
                {collection.isPrivate ? (
                  <span className="mt-1 block text-2xs text-fg-subtle">Private</span>
                ) : null}
              </Link>
            ))}
          </div>
        </section>
      ) : null}

      {viewerId && !isSelf ? (
        <div className="flex justify-end pb-10">
          <ReportMenu userId={user.id} targetUserId={user.id} />
        </div>
      ) : null}
    </div>
  );
}

function EmptyTab({ text }: { text: string }) {
  return (
    <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-sm text-fg-muted">
      {text}
    </p>
  );
}

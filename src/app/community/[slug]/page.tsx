import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/avatar";
import {
  FollowButton,
  LikeButton,
  MessageButton,
  ReportMenu,
  SaveButton,
} from "@/components/community/interactions";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { Badge } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { getProject, getViewerState } from "@/lib/community";
import { db, isCommunityConfigured } from "@/lib/db";
import { getFont } from "@/lib/fonts";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  if (!isCommunityConfigured()) return { title: "Community" };

  const { slug } = await props.params;
  const project = await getProject(slug, null);
  if (!project) return { title: "Project not found" };

  const cover = project.images[0];

  return {
    title: `${project.title} by ${project.author.name ?? `@${project.author.handle}`}`,
    description:
      project.description?.slice(0, 200) ??
      `A project on Baseline${project.fonts.length ? `, set in ${project.fonts.map((f) => f.family).join(", ")}` : ""}.`,
    alternates: { canonical: `/community/${project.slug}` },
    openGraph: {
      type: "article",
      title: project.title,
      description: project.description?.slice(0, 200) ?? undefined,
      images: cover ? [{ url: cover.url, width: cover.width, height: cover.height }] : undefined,
    },
  };
}

export default async function ProjectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const { slug } = await props.params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const project = await getProject(slug, viewerId);
  if (!project) notFound();

  const [state, collections] = await Promise.all([
    getViewerState(project.id, project.authorId, viewerId),
    viewerId
      ? db.collection.findMany({
          where: { ownerId: viewerId },
          select: { id: true, name: true, isPrivate: true },
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="mx-auto max-w-[64rem] px-5">
      <nav className="pt-8 text-sm text-fg-muted">
        <Link href="/community" className="hover:text-fg">
          Community
        </Link>
        <span aria-hidden className="mx-2 text-fg-subtle">
          /
        </span>
        <span className="text-fg">{project.title}</span>
      </nav>

      {project.status === "REMOVED" ? (
        <p className="mt-6 rounded-card border border-danger/30 bg-danger-soft p-4 text-sm text-danger">
          A moderator removed this post. Only you can see it.
        </p>
      ) : null}

      <header className="pt-6 pb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight">
          {project.title}
        </h1>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href={`/u/${project.author.handle}`}
              className="flex items-center gap-3"
            >
              <Avatar
                name={project.author.name}
                handle={project.author.handle}
                image={project.author.image}
              />
              <span>
                <span className="block text-sm font-medium text-fg">
                  {project.author.name ?? `@${project.author.handle}`}
                </span>
                <span className="block text-xs text-fg-subtle">
                  {formatDate(project.publishedAt.toISOString())}
                </span>
              </span>
            </Link>

            {!state.isAuthor && viewerId ? (
              <FollowButton
                userId={project.authorId}
                initialFollowing={state.following}
                size="sm"
              />
            ) : null}
          </div>

          <div className="flex flex-wrap items-end gap-2">
            <LikeButton
              projectId={project.id}
              initialLiked={state.liked}
              initialCount={project.likeCount}
            />
            <SaveButton
              projectId={project.id}
              collections={collections}
              initialSavedIn={state.savedIn}
            />
            {!state.isAuthor ? <MessageButton userId={project.authorId} /> : null}
          </div>
        </div>
      </header>

      <div className="space-y-4">
        {project.images.map((image) => (
          <img
            key={image.id}
            src={image.url}
            alt={image.alt ?? ""}
            width={image.width}
            height={image.height}
            loading="lazy"
            decoding="async"
            className="w-full rounded-card border border-line bg-bg-sunken"
          />
        ))}
      </div>

      <div className="grid gap-10 py-12 lg:grid-cols-[1fr_18rem]">
        <div className="min-w-0 space-y-8">
          {project.description ? (
            <div className="max-w-2xl whitespace-pre-wrap text-base leading-relaxed text-fg-muted">
              {project.description}
            </div>
          ) : null}

          {project.sourceUrl || project.sourceCredit ? (
            <div className="rounded-card border border-line bg-bg-sunken p-4">
              <div className="label-mono mb-1.5">Credit</div>
              <p className="text-sm text-fg-muted">
                {project.sourceCredit ?? "Original work by someone else."}
                {project.sourceUrl ? (
                  <>
                    {" "}
                    <a
                      href={project.sourceUrl}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="text-accent underline underline-offset-4"
                    >
                      Source
                    </a>
                  </>
                ) : null}
              </p>
            </div>
          ) : null}

          {project.tags.length ? (
            <div className="flex flex-wrap gap-1.5">
              {project.tags.map(({ tag }) => (
                <Link
                  key={tag.id}
                  href={`/community?tag=${tag.slug}`}
                  className="rounded-full border border-line-strong px-3 py-1 text-xs text-fg-muted hover:text-fg"
                >
                  #{tag.label}
                </Link>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          {project.fonts.length ? (
            <section className="rounded-card border border-line bg-bg-raised p-5">
              <h2 className="label-mono mb-3">Type</h2>
              <ul className="space-y-2.5">
                {project.fonts.map((font) => {
                  const catalogued = font.fontSlug ? getFont(font.fontSlug) : undefined;
                  return (
                    <li key={font.id}>
                      {catalogued ? (
                        <Link
                          href={`/fonts/${catalogued.slug}`}
                          className="text-sm text-fg hover:underline"
                        >
                          {font.family}
                        </Link>
                      ) : (
                        <span className="text-sm text-fg">{font.family}</span>
                      )}
                      <div className="mt-0.5 flex items-center gap-1.5">
                        {font.role ? (
                          <span className="text-2xs text-fg-subtle">{font.role}</span>
                        ) : null}
                        {catalogued ? (
                          <Badge tone="success">{catalogued.license.id}</Badge>
                        ) : (
                          <Badge tone="warning">Not in catalogue</Badge>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ) : null}

          {project.colours.length ? (
            <section className="rounded-card border border-line bg-bg-raised p-5">
              <h2 className="label-mono mb-3">Palette</h2>
              <div className="flex flex-wrap gap-1.5">
                {project.colours.map((colour) => (
                  <span
                    key={colour.id}
                    className="flex flex-col items-center gap-1"
                    title={colour.hex}
                  >
                    <span
                      className="block h-10 w-10 rounded-md border border-line"
                      style={{ background: colour.hex }}
                    />
                    <span className="font-mono text-[9px] text-fg-subtle">
                      {colour.hex}
                    </span>
                  </span>
                ))}
              </div>
              <Link
                href="/colour"
                className="mt-4 inline-block text-xs text-accent hover:underline"
              >
                Check these in the Colour Studio →
              </Link>
            </section>
          ) : null}

          {viewerId && !state.isAuthor ? (
            <div className="flex justify-end">
              <ReportMenu projectId={project.id} targetUserId={project.authorId} />
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { DeleteProjectButton } from "@/components/community/delete-project-button";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { ProjectForm } from "@/components/community/project-form";
import { requireOnboarded } from "@/lib/auth";
import { db, isCommunityConfigured } from "@/lib/db";
import { queryFonts } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Edit project",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function EditProjectPage(props: {
  params: Promise<{ slug: string }>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const { slug } = await props.params;
  const user = await requireOnboarded(`/community/${slug}/edit`);

  const project = await db.project.findUnique({
    where: { slug },
    include: {
      images: { orderBy: { position: "asc" } },
      colours: { orderBy: { position: "asc" } },
      fonts: true,
      tags: { include: { tag: true } },
      credits: { include: { user: { select: { handle: true } } } },
    },
  });

  if (!project) notFound();
  // Someone else's post is not editable — send them to read it instead.
  if (project.authorId !== user.id) redirect(`/community/${slug}`);

  const suggestions = queryFonts({ sort: "popular", perPage: 300 }).fonts.map(
    (font) => ({ slug: font.slug, family: font.family }),
  );

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <nav className="pt-8 text-sm text-fg-muted">
        <Link href={`/community/${project.slug}`} className="hover:text-fg">
          ← Back to the post
        </Link>
      </nav>

      <header className="flex flex-wrap items-end justify-between gap-4 pt-6 pb-8">
        <div>
          <span className="label-mono">Community</span>
          <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
            Edit project
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-fg-muted">
            The link stays the same, so anywhere this is already shared keeps
            working.
          </p>
        </div>
        <DeleteProjectButton projectId={project.id} title={project.title} />
      </header>

      <ProjectForm
        fontSuggestions={suggestions}
        initial={{
          id: project.id,
          title: project.title,
          description: project.description ?? "",
          sourceUrl: project.sourceUrl ?? "",
          sourceCredit: project.sourceCredit ?? "",
          tags: project.tags.map((t) => t.tag.label),
          fonts: project.fonts.map((f) => ({
            family: f.family,
            fontSlug: f.fontSlug ?? "",
            role: f.role ?? "",
          })),
          colours: project.colours.map((c) => c.hex),
          credits: project.credits.map((c) => ({
            handle: c.user.handle ?? "",
            role: c.role ?? "",
          })),
          images: project.images.map((i) => ({
            url: i.url,
            blobPath: i.blobPath,
            alt: i.alt ?? "",
            width: i.width,
            height: i.height,
            bytes: i.bytes,
          })),
        }}
      />
    </div>
  );
}

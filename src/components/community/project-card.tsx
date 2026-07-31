import Link from "next/link";
import { Badge } from "@/components/ui/primitives";

export interface ProjectCardData {
  id: string;
  slug: string;
  title: string;
  likeCount: number;
  saveCount: number;
  status?: string;
  author: {
    id: string;
    handle: string | null;
    name: string | null;
    image: string | null;
  };
  images: { url: string; alt: string | null; width: number; height: number }[];
  colours: { hex: string }[];
  fonts: { family: string; fontSlug: string | null }[];
}

/**
 * Uploaded images are served straight from the Blob CDN with a plain <img>,
 * not through next/image. Next's optimiser runs user-supplied bytes through
 * sharp/libvips, which currently carries unpatched CVEs; the blob is already
 * CDN-cached and we recorded its dimensions at upload, so the optimiser buys
 * nothing here and costs a real attack surface.
 */
export function ProjectCard({ project }: { project: ProjectCardData }) {
  const cover = project.images[0];
  const ratio = cover ? cover.width / cover.height : 4 / 3;

  return (
    <article className="group">
      <Link
        href={`/community/${project.slug}`}
        className="block overflow-hidden rounded-card border border-line bg-bg-sunken transition-colors hover:border-line-strong"
      >
        {cover ? (
          <img
            src={cover.url}
            alt={cover.alt ?? project.title}
            width={cover.width}
            height={cover.height}
            loading="lazy"
            decoding="async"
            className="w-full object-cover"
            style={{ aspectRatio: ratio > 0.4 && ratio < 4 ? ratio : 4 / 3 }}
          />
        ) : (
          <div className="aspect-[4/3] w-full bg-bg-inset" />
        )}
      </Link>

      <div className="mt-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/community/${project.slug}`}
            className="block truncate text-sm font-medium text-fg hover:underline"
          >
            {project.title}
          </Link>
          {project.author.handle ? (
            <Link
              href={`/u/${project.author.handle}`}
              className="mt-0.5 block truncate text-xs text-fg-muted hover:text-fg"
            >
              {project.author.name ?? `@${project.author.handle}`}
            </Link>
          ) : null}
        </div>

        <div className="flex shrink-0 items-center gap-2 pt-0.5 text-xs text-fg-subtle">
          <span title={`${project.likeCount} likes`}>♥ {project.likeCount}</span>
          <span title={`${project.saveCount} saves`}>⧉ {project.saveCount}</span>
        </div>
      </div>

      {project.colours.length || project.fonts.length ? (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {project.colours.length ? (
            <div className="flex gap-0.5" aria-label="Colours used">
              {project.colours.map((colour, i) => (
                <span
                  key={`${colour.hex}-${i}`}
                  className="h-3 w-3 rounded-full border border-line"
                  style={{ background: colour.hex }}
                  title={colour.hex}
                />
              ))}
            </div>
          ) : null}
          {project.fonts.slice(0, 2).map((font) => (
            <span key={font.family} className="text-2xs text-fg-subtle">
              {font.family}
            </span>
          ))}
        </div>
      ) : null}

      {project.status && project.status !== "PUBLISHED" ? (
        <div className="mt-2">
          <Badge tone={project.status === "REMOVED" ? "danger" : "neutral"}>
            {project.status === "REMOVED" ? "Removed" : "Draft"}
          </Badge>
        </div>
      ) : null}
    </article>
  );
}

export function ProjectGrid({ projects }: { projects: ProjectCardData[] }) {
  return (
    <div className="grid gap-x-4 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  );
}

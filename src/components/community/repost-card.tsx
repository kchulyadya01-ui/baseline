import Link from "next/link";
import { Avatar } from "@/components/community/avatar";
import { ProjectCard, type ProjectCardData } from "@/components/community/project-card";

/**
 * A reposted project, with attribution above it.
 *
 * The card underneath is the ordinary ProjectCard pointing at the original —
 * a repost never gets its own page, and the author credit on the card stays
 * the original author's. The only thing added is who passed it along.
 */
export function RepostCard({
  project,
  by,
  comment,
}: {
  project: ProjectCardData;
  by: { handle: string | null; name: string | null; image: string | null };
  comment?: string | null;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2 text-xs text-fg-subtle">
        <span aria-hidden>⇄</span>
        {by.handle ? (
          <Link href={`/u/${by.handle}`} className="flex items-center gap-1.5 hover:text-fg">
            <Avatar name={by.name} handle={by.handle} image={by.image} size="sm" className="h-5 w-5 text-[9px]" />
            {by.name ?? `@${by.handle}`} reposted
          </Link>
        ) : (
          <span>reposted</span>
        )}
      </div>

      {comment ? (
        <p className="mb-2 border-l-2 border-line-strong pl-3 text-xs italic text-fg-muted">
          {comment}
        </p>
      ) : null}

      <ProjectCard project={project} />
    </div>
  );
}

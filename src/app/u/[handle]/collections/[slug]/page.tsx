import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/avatar";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { ProjectGrid } from "@/components/community/project-card";
import { Badge } from "@/components/ui/primitives";
import { auth } from "@/lib/auth";
import { getCollection } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";
import { pluralise } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata(props: {
  params: Promise<{ handle: string; slug: string }>;
}): Promise<Metadata> {
  const { handle, slug } = await props.params;
  return {
    title: `${slug.replace(/-/g, " ")} — a collection by @${handle}`,
    robots: { index: false, follow: true },
  };
}

export default async function CollectionPage(props: {
  params: Promise<{ handle: string; slug: string }>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const { handle, slug } = await props.params;
  const session = await auth();
  const viewerId = session?.user?.id ?? null;

  const collection = await getCollection(handle, slug, viewerId);
  if (!collection) notFound();

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <nav className="pt-8 text-sm text-fg-muted">
        <Link href={`/u/${collection.owner.handle}`} className="hover:text-fg">
          @{collection.owner.handle}
        </Link>
        <span aria-hidden className="mx-2 text-fg-subtle">
          /
        </span>
        <span className="text-fg">{collection.name}</span>
      </nav>

      <header className="border-b border-line pt-6 pb-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              {collection.name}
            </h1>
            {collection.description ? (
              <p className="mt-3 max-w-2xl text-sm text-fg-muted">
                {collection.description}
              </p>
            ) : null}
            <div className="mt-4 flex items-center gap-3">
              <Link
                href={`/u/${collection.owner.handle}`}
                className="flex items-center gap-2"
              >
                <Avatar
                  name={collection.owner.name}
                  handle={collection.owner.handle}
                  image={collection.owner.image}
                  size="sm"
                />
                <span className="text-sm text-fg-muted">
                  {collection.owner.name ?? `@${collection.owner.handle}`}
                </span>
              </Link>
              <span className="text-xs text-fg-subtle">
                {pluralise(collection.saves.length, "project")}
              </span>
              {collection.isPrivate ? <Badge>Private</Badge> : null}
            </div>
          </div>
        </div>
      </header>

      <div className="py-10">
        {collection.saves.length === 0 ? (
          <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-sm text-fg-muted">
            Nothing saved here yet.
          </p>
        ) : (
          <ProjectGrid projects={collection.saves.map((save) => save.project)} />
        )}
      </div>
    </div>
  );
}

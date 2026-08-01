import type { Metadata } from "next";
import Link from "next/link";
import { NewCollectionForm } from "@/components/community/new-collection-form";
import { CommunityNav } from "@/components/community/community-nav";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { requireOnboarded } from "@/lib/auth";
import { getCollections } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";
import { pluralise } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Your collections",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function CollectionsPage() {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const user = await requireOnboarded("/collections");
  const collections = await getCollections(user.id, user.id);

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <div className="pt-6">
        <CommunityNav active="collections" />
      </div>
      <header className="pt-12 pb-8">
        <span className="label-mono">Community</span>
        <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-display text-3xl font-semibold tracking-tight">
              Your collections
            </h1>
            <p className="mt-3 max-w-xl text-sm text-fg-muted">
              Boards of work you have saved. Private ones stay yours; public ones
              appear on your profile.
            </p>
          </div>
          <NewCollectionForm />
        </div>
      </header>

      {collections.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center text-sm text-fg-muted">
          Nothing saved yet. Saving anything from{" "}
          <Link href="/community" className="text-accent hover:underline">
            the community
          </Link>{" "}
          creates your first collection automatically.
        </p>
      ) : (
        <div className="grid gap-5 pb-12 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((collection) => (
            <Link
              key={collection.id}
              href={`/u/${user.handle}/collections/${collection.slug}`}
              className="group rounded-card border border-line bg-bg-raised p-4 transition-colors hover:border-line-strong"
            >
              <div className="grid grid-cols-2 gap-1 overflow-hidden rounded">
                {Array.from({ length: 4 }).map((_, i) => {
                  const image = collection.saves[i]?.project.images[0];
                  return image ? (
                    <img
                      key={i}
                      src={image.url}
                      alt=""
                      loading="lazy"
                      className="aspect-[4/3] w-full object-cover"
                    />
                  ) : (
                    <span key={i} className="aspect-[4/3] w-full bg-bg-inset" />
                  );
                })}
              </div>

              <div className="mt-3 flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">
                  {collection.name}
                </span>
                <span className="shrink-0 text-2xs text-fg-subtle">
                  {collection.itemCount + collection.fontCount === 0
                    ? "empty"
                    : [
                        collection.itemCount
                          ? pluralise(collection.itemCount, "project")
                          : null,
                        collection.fontCount
                          ? pluralise(collection.fontCount, "font")
                          : null,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                </span>
              </div>

              {collection.description ? (
                <p className="mt-1 line-clamp-2 text-xs text-fg-muted">
                  {collection.description}
                </p>
              ) : null}
              {collection.isPrivate ? (
                <span className="mt-2 inline-block text-2xs text-fg-subtle">
                  Private
                </span>
              ) : null}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

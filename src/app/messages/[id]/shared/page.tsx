import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/avatar";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { requireOnboarded } from "@/lib/auth";
import { getConversationShared } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";
import { formatBytes } from "@/lib/font-url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Media, links and docs",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type Tab = "media" | "links" | "docs";

/** Newest first, grouped into "This month", "July", "June 2025"… */
function groupByMonth<T extends { createdAt: Date }>(items: T[]) {
  const now = new Date();
  const groups = new Map<string, T[]>();

  for (const item of items) {
    const date = item.createdAt;
    const sameYear = date.getFullYear() === now.getFullYear();
    const label =
      sameYear && date.getMonth() === now.getMonth()
        ? "This month"
        : date.toLocaleDateString("en-GB", {
            month: "long",
            ...(sameYear ? {} : { year: "numeric" }),
          });
    const bucket = groups.get(label);
    if (bucket) bucket.push(item);
    else groups.set(label, [item]);
  }

  return [...groups.entries()];
}

export default async function SharedPage(props: {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const { id } = await props.params;
  const params = await props.searchParams;
  const user = await requireOnboarded(`/messages/${id}/shared`);

  const shared = await getConversationShared(id, user.id);
  if (!shared) notFound();

  const tab = (typeof params.tab === "string" ? params.tab : "media") as Tab;

  const counts = {
    media: shared.media.length,
    links: shared.links.length,
    docs: shared.docs.length,
  };

  return (
    <div className="mx-auto max-w-[46rem] px-5 pb-16">
      <header className="flex items-center gap-3 border-b border-line pt-8 pb-4">
        <Link
          href={`/messages/${id}`}
          aria-label="Back to the conversation"
          className="text-sm text-fg-subtle hover:text-fg"
        >
          ←
        </Link>
        {shared.other ? (
          <span className="flex min-w-0 items-center gap-3">
            <Avatar
              name={shared.other.name}
              handle={shared.other.handle}
              image={shared.other.image}
              size="sm"
            />
            <span className="truncate text-sm font-medium text-fg">
              {shared.other.name ?? `@${shared.other.handle}`}
            </span>
          </span>
        ) : null}
      </header>

      <nav className="flex gap-1 py-4">
        {(
          [
            ["media", "Media"],
            ["links", "Links"],
            ["docs", "Docs"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={key === "media" ? `/messages/${id}/shared` : `/messages/${id}/shared?tab=${key}`}
            className={cn(
              "rounded-control px-3 py-1.5 text-sm transition-colors",
              tab === key
                ? "bg-bg-inset font-medium text-fg"
                : "text-fg-muted hover:bg-bg-sunken hover:text-fg",
            )}
          >
            {label} <span className="opacity-60">{counts[key]}</span>
          </Link>
        ))}
      </nav>

      {tab === "media" ? (
        counts.media === 0 ? (
          <Empty text="No photos shared in this conversation yet." />
        ) : (
          groupByMonth(shared.media).map(([label, items]) => (
            <section key={label} className="mb-8">
              <h2 className="sticky top-14 z-10 bg-bg py-2 text-sm font-medium text-fg-muted">
                {label}
              </h2>
              <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
                {items.map((image) => (
                  <a
                    key={image.id}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block overflow-hidden rounded"
                  >
                    <img
                      src={image.url}
                      alt={image.name}
                      loading="lazy"
                      decoding="async"
                      className="aspect-square w-full object-cover transition-opacity hover:opacity-85"
                    />
                  </a>
                ))}
              </div>
            </section>
          ))
        )
      ) : null}

      {tab === "links" ? (
        counts.links === 0 ? (
          <Empty text="No links shared in this conversation yet." />
        ) : (
          groupByMonth(shared.links).map(([label, items]) => (
            <section key={label} className="mb-8">
              <h2 className="sticky top-14 z-10 bg-bg py-2 text-sm font-medium text-fg-muted">
                {label}
              </h2>
              <ul className="divide-y divide-line border-y border-line">
                {items.map((link) => (
                  <li key={link.id}>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noreferrer nofollow"
                      className="block py-3 transition-colors hover:bg-bg-sunken"
                    >
                      <span className="block truncate text-sm text-accent">
                        {link.url}
                      </span>
                      <span className="mt-0.5 block text-2xs text-fg-subtle">
                        {link.host} · {link.mine ? "you" : "them"}
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )
      ) : null}

      {tab === "docs" ? (
        counts.docs === 0 ? (
          <Empty text="No files shared in this conversation yet." />
        ) : (
          groupByMonth(shared.docs).map(([label, items]) => (
            <section key={label} className="mb-8">
              <h2 className="sticky top-14 z-10 bg-bg py-2 text-sm font-medium text-fg-muted">
                {label}
              </h2>
              <ul className="divide-y divide-line border-y border-line">
                {items.map((file) => (
                  <li key={file.id}>
                    <a
                      href={file.url}
                      target="_blank"
                      rel="noreferrer"
                      download={file.name}
                      className="flex items-center gap-3 py-3 transition-colors hover:bg-bg-sunken"
                    >
                      <span
                        aria-hidden
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded bg-bg-inset text-fg-muted"
                      >
                        ▤
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-fg">
                          {file.name}
                        </span>
                        <span className="block text-2xs text-fg-subtle">
                          {formatBytes(file.bytes)}
                        </span>
                      </span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          ))
        )
      ) : null}
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return (
    <p className="rounded-card border border-dashed border-line-strong px-6 py-14 text-center text-sm text-fg-muted">
      {text}
    </p>
  );
}

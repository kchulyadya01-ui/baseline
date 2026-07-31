import type { Metadata } from "next";
import Link from "next/link";
import { Avatar } from "@/components/community/avatar";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { requireOnboarded } from "@/lib/auth";
import { getConversations } from "@/lib/community";
import { isCommunityConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Messages",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const user = await requireOnboarded("/messages");
  const conversations = await getConversations(user.id);

  return (
    <div className="mx-auto max-w-[46rem] px-5">
      <header className="pt-12 pb-6">
        <span className="label-mono">Community</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Messages
        </h1>
      </header>

      {conversations.length === 0 ? (
        <p className="rounded-card border border-dashed border-line-strong px-6 py-16 text-center text-sm text-fg-muted">
          No conversations yet. Open someone&rsquo;s project or profile and hit{" "}
          <span className="text-fg">Message</span> to start one.
        </p>
      ) : (
        <ul className="divide-y divide-line border-y border-line">
          {conversations.map((conversation) => (
            <li key={conversation.id}>
              <Link
                href={`/messages/${conversation.id}`}
                className="flex items-center gap-3 py-4 transition-colors hover:bg-bg-sunken"
              >
                <Avatar
                  name={conversation.other.name}
                  handle={conversation.other.handle}
                  image={conversation.other.image}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-fg">
                      {conversation.other.name ?? `@${conversation.other.handle}`}
                    </span>
                    <span className="shrink-0 text-2xs text-fg-subtle">
                      {relativeTime(conversation.lastMessageAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-fg-muted">
                    {conversation.lastMessage
                      ? `${conversation.lastMessage.senderId === user.id ? "You: " : ""}${conversation.lastMessage.body}`
                      : "No messages yet"}
                  </p>
                </div>
                {conversation.unread ? (
                  <span
                    aria-label="Unread"
                    className="h-2 w-2 shrink-0 rounded-full bg-accent"
                  />
                ) : null}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function relativeTime(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Avatar } from "@/components/community/avatar";
import { ReportMenu } from "@/components/community/interactions";
import { MessageAttachments } from "@/components/community/message-attachments";
import { MessageComposer } from "@/components/community/message-composer";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { requireOnboarded } from "@/lib/auth";
import { getConversation } from "@/lib/community";
import { markConversationRead } from "@/lib/actions";
import { isCommunityConfigured } from "@/lib/db";

export const metadata: Metadata = {
  title: "Conversation",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function ConversationPage(props: {
  params: Promise<{ id: string }>;
}) {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  const { id } = await props.params;
  const user = await requireOnboarded(`/messages/${id}`);

  const conversation = await getConversation(id, user.id);
  if (!conversation) notFound();

  await markConversationRead(id);

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-[46rem] flex-col px-5">
      <header className="flex items-center gap-3 border-b border-line pt-8 pb-4">
        <Link
          href="/messages"
          aria-label="Back to messages"
          className="text-sm text-fg-subtle hover:text-fg"
        >
          ←
        </Link>
        <Link
          href={`/u/${conversation.other.handle}`}
          className="flex min-w-0 items-center gap-3"
        >
          <Avatar
            name={conversation.other.name}
            handle={conversation.other.handle}
            image={conversation.other.image}
            size="sm"
          />
          <span className="truncate text-sm font-medium text-fg">
            {conversation.other.name ?? `@${conversation.other.handle}`}
          </span>
        </Link>
        <Link
          href={`/messages/${id}/shared`}
          className="ml-auto text-xs text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          Media, links and docs
        </Link>
        <div>
          <ReportMenu
            userId={conversation.other.id}
            targetUserId={conversation.other.id}
          />
        </div>
      </header>

      <div className="flex-1 space-y-3 py-6">
        {conversation.messages.length === 0 ? (
          <p className="py-10 text-center text-sm text-fg-muted">
            No messages yet. Say hello.
          </p>
        ) : (
          conversation.messages.map((message) => {
            const mine = message.senderId === user.id;
            return (
              <div
                key={message.id}
                className={mine ? "flex justify-end" : "flex justify-start"}
              >
                <div
                  className={
                    mine
                      ? "max-w-[80%] space-y-2 rounded-card rounded-br-sm bg-accent px-4 py-2.5 text-sm text-accent-fg"
                      : "max-w-[80%] space-y-2 rounded-card rounded-bl-sm border border-line bg-bg-raised px-4 py-2.5 text-sm text-fg"
                  }
                >
                  <MessageAttachments
                    attachments={message.attachments}
                    mine={mine}
                  />
                  {message.body ? (
                    <p className="whitespace-pre-wrap break-words">{message.body}</p>
                  ) : null}
                  <p
                    className={
                      mine
                        ? "mt-1 text-[10px] opacity-70"
                        : "mt-1 text-[10px] text-fg-subtle"
                    }
                  >
                    {message.createdAt.toLocaleTimeString("en-GB", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {conversation.isBlocked ? (
        <p className="mb-8 rounded-card border border-line bg-bg-sunken p-4 text-center text-sm text-fg-muted">
          You cannot reply to this conversation. Unblock from their profile to
          message again.
        </p>
      ) : (
        <MessageComposer conversationId={conversation.id} />
      )}
    </div>
  );
}

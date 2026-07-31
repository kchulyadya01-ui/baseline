"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  reportContent,
  startConversation,
  toggleBlock,
  toggleFollow,
  toggleLike,
  toggleSave,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

/**
 * Optimistic buttons for like / save / follow.
 *
 * Each flips its own state immediately and rolls back if the action returns an
 * error, so a signed-out click shows the real reason instead of silently doing
 * nothing.
 */

function useAction() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return { pending, error, setError, start };
}

export function LikeButton({
  projectId,
  initialLiked,
  initialCount,
}: {
  projectId: string;
  initialLiked: boolean;
  initialCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const { pending, error, setError, start } = useAction();

  function click() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    setError(null);

    start(async () => {
      const result = await toggleLike(projectId);
      if (!result.ok) {
        setLiked(!next);
        setCount((c) => c + (next ? -1 : 1));
        setError(result.error ?? "Could not do that.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={liked}
        className={cn(
          "inline-flex h-10 items-center gap-2 rounded-control border px-4 text-sm transition-colors",
          liked
            ? "border-danger/40 bg-danger-soft text-danger"
            : "border-line-strong text-fg-muted hover:text-fg",
        )}
      >
        <span aria-hidden>{liked ? "♥" : "♡"}</span>
        {count}
      </button>
      {error ? <span className="text-2xs text-danger">{error}</span> : null}
    </div>
  );
}

export function SaveButton({
  projectId,
  collections,
  initialSavedIn,
}: {
  projectId: string;
  collections: { id: string; name: string; isPrivate: boolean }[];
  initialSavedIn: string[];
}) {
  const [savedIn, setSavedIn] = useState<string[]>(initialSavedIn);
  const [open, setOpen] = useState(false);
  const { pending, error, setError, start } = useAction();
  const isSaved = savedIn.length > 0;

  function save(collectionId?: string) {
    setError(null);
    start(async () => {
      const result = await toggleSave(projectId, collectionId);
      if (!result.ok) {
        setError(result.error ?? "Could not save.");
        return;
      }
      const data = result.data as { saved: boolean; collectionId: string };
      setSavedIn((prev) =>
        data.saved
          ? [...prev, data.collectionId]
          : prev.filter((id) => id !== data.collectionId),
      );
    });
  }

  return (
    <div className="relative flex flex-col items-start gap-1">
      <div className="flex">
        <button
          type="button"
          onClick={() => save(savedIn[0])}
          disabled={pending}
          className={cn(
            "inline-flex h-10 items-center gap-2 rounded-l-control border px-4 text-sm transition-colors",
            isSaved
              ? "border-accent bg-accent-soft text-accent"
              : "border-line-strong text-fg-muted hover:text-fg",
          )}
        >
          <span aria-hidden>⧉</span>
          {isSaved ? "Saved" : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Choose a collection"
          aria-expanded={open}
          className="inline-flex h-10 items-center rounded-r-control border border-l-0 border-line-strong px-2.5 text-xs text-fg-muted hover:text-fg"
        >
          ▾
        </button>
      </div>

      {open ? (
        <div className="absolute top-11 z-20 w-56 rounded-card border border-line bg-bg-raised p-1.5 shadow-lg">
          {collections.length === 0 ? (
            <p className="px-2.5 py-2 text-xs text-fg-subtle">
              No collections yet — saving creates one.
            </p>
          ) : null}
          {collections.map((collection) => {
            const inThis = savedIn.includes(collection.id);
            return (
              <button
                key={collection.id}
                type="button"
                onClick={() => save(collection.id)}
                disabled={pending}
                className="flex w-full items-center justify-between rounded px-2.5 py-1.5 text-left text-sm text-fg hover:bg-bg-sunken"
              >
                <span className="truncate">
                  {collection.name}
                  {collection.isPrivate ? (
                    <span className="ml-1 text-2xs text-fg-subtle">private</span>
                  ) : null}
                </span>
                <span aria-hidden className={inThis ? "text-accent" : "text-fg-subtle"}>
                  {inThis ? "✓" : "+"}
                </span>
              </button>
            );
          })}
        </div>
      ) : null}

      {error ? <span className="text-2xs text-danger">{error}</span> : null}
    </div>
  );
}

export function FollowButton({
  userId,
  initialFollowing,
  size = "md",
}: {
  userId: string;
  initialFollowing: boolean;
  size?: "sm" | "md";
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const { pending, error, setError, start } = useAction();

  function click() {
    const next = !following;
    setFollowing(next);
    setError(null);
    start(async () => {
      const result = await toggleFollow(userId);
      if (!result.ok) {
        setFollowing(!next);
        setError(result.error ?? "Could not do that.");
      }
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        aria-pressed={following}
        className={cn(
          "inline-flex items-center rounded-control border font-medium transition-colors",
          size === "sm" ? "h-8 px-3 text-xs" : "h-10 px-4 text-sm",
          following
            ? "border-line-strong text-fg-muted hover:text-fg"
            : "border-transparent bg-accent text-accent-fg hover:opacity-90",
        )}
      >
        {following ? "Following" : "Follow"}
      </button>
      {error ? <span className="text-2xs text-danger">{error}</span> : null}
    </div>
  );
}

export function MessageButton({
  userId,
  label = "Message",
}: {
  userId: string;
  label?: string;
}) {
  const router = useRouter();
  const { pending, error, setError, start } = useAction();

  function click() {
    setError(null);
    start(async () => {
      const result = await startConversation(userId);
      if (!result.ok) {
        setError(result.error ?? "Could not open a conversation.");
        return;
      }
      const { conversationId } = result.data as { conversationId: string };
      router.push(`/messages/${conversationId}`);
    });
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={click}
        disabled={pending}
        className="inline-flex h-10 items-center rounded-control border border-line-strong px-4 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        {pending ? "Opening…" : label}
      </button>
      {error ? <span className="text-2xs text-danger">{error}</span> : null}
    </div>
  );
}

const REASONS = [
  { value: "STOLEN_WORK", label: "Posted without credit / stolen work" },
  { value: "SPAM", label: "Spam or misleading" },
  { value: "HARASSMENT", label: "Harassment or hate" },
  { value: "SEXUAL_CONTENT", label: "Sexual content" },
  { value: "VIOLENCE", label: "Violence or self-harm" },
  { value: "OTHER", label: "Something else" },
];

export function ReportMenu({
  projectId,
  messageId,
  userId,
  targetUserId,
}: {
  projectId?: string;
  messageId?: string;
  userId?: string;
  /** Present when blocking is also offered. */
  targetUserId?: string;
}) {
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const { pending, error, setError, start } = useAction();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await reportContent({ projectId, messageId, userId }, formData);
      if (!result.ok) {
        setError(result.error ?? "Could not send the report.");
        return;
      }
      setDone("Report sent. Thanks — a moderator will look at it.");
      setOpen(false);
    });
  }

  function block() {
    if (!targetUserId) return;
    setError(null);
    start(async () => {
      const result = await toggleBlock(targetUserId);
      if (!result.ok) {
        setError(result.error ?? "Could not block.");
        return;
      }
      const { blocked } = result.data as { blocked: boolean };
      setDone(blocked ? "Blocked. You will not see each other." : "Unblocked.");
    });
  }

  if (done) return <p className="text-xs text-fg-muted">{done}</p>;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="text-xs text-fg-subtle underline underline-offset-4 hover:text-fg"
      >
        Report
        {targetUserId ? " or block" : ""}
      </button>

      {open ? (
        <form
          action={submit}
          className="absolute right-0 z-30 mt-2 w-72 rounded-card border border-line bg-bg-raised p-4 shadow-lg"
        >
          <div className="label-mono mb-2">Why are you reporting this?</div>
          <div className="space-y-1.5">
            {REASONS.map((reason) => (
              <label
                key={reason.value}
                className="flex items-start gap-2 text-xs text-fg"
              >
                <input
                  type="radio"
                  name="reason"
                  value={reason.value}
                  required
                  className="mt-0.5"
                />
                {reason.label}
              </label>
            ))}
          </div>
          <textarea
            name="detail"
            rows={2}
            maxLength={1000}
            placeholder="Anything else we should know? (optional)"
            className="mt-3 w-full rounded-control border border-line-strong bg-bg px-2.5 py-1.5 text-xs"
          />
          <div className="mt-3 flex items-center gap-2">
            <button
              type="submit"
              disabled={pending}
              className="h-8 rounded-control bg-accent px-3 text-xs font-medium text-accent-fg"
            >
              Send report
            </button>
            {targetUserId ? (
              <button
                type="button"
                onClick={block}
                disabled={pending}
                className="h-8 rounded-control border border-line-strong px-3 text-xs text-fg-muted hover:text-danger"
              >
                Block instead
              </button>
            ) : null}
          </div>
          {error ? <p className="mt-2 text-2xs text-danger">{error}</p> : null}
        </form>
      ) : null}
    </div>
  );
}

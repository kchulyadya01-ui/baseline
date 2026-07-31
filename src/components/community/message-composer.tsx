"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { sendMessage } from "@/lib/actions";

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await sendMessage(conversationId, formData);
      if (!result.ok) {
        setError(result.errors?.body ?? result.error ?? "Could not send that.");
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="sticky bottom-0 bg-bg pb-8 pt-2">
      {error ? <p className="mb-2 text-xs text-danger">{error}</p> : null}
      <div className="flex items-end gap-2">
        <textarea
          name="body"
          rows={1}
          required
          maxLength={4000}
          placeholder="Write a message…"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line — the convention people expect.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-control border border-line-strong bg-bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />
        <button
          type="submit"
          disabled={pending}
          className="h-11 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

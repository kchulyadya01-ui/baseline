"use client";

import { useState, useTransition } from "react";
import { deleteProject } from "@/lib/actions";

/**
 * Deleting is irreversible and takes the images with it, so it asks first and
 * makes you type the title. A single misclick should not destroy a post.
 */
export function DeleteProjectButton({
  projectId,
  title,
}: {
  projectId: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const matches = typed.trim().toLowerCase() === title.trim().toLowerCase();

  function remove() {
    if (!matches) return;
    setError(null);
    start(async () => {
      const result = await deleteProject(projectId);
      // On success the action redirects, so reaching here means it failed.
      if (result && !result.ok) setError(result.error ?? "Could not delete it.");
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="h-9 rounded-control border border-line-strong px-3 text-xs text-fg-muted transition-colors hover:border-danger/40 hover:text-danger"
      >
        Delete project
      </button>
    );
  }

  return (
    <div className="w-full max-w-sm rounded-card border border-danger/30 bg-danger-soft p-4">
      <p className="text-xs text-danger">
        This deletes the post and its images for good. Type{" "}
        <strong>{title}</strong> to confirm.
      </p>
      <input
        autoFocus
        value={typed}
        onChange={(e) => setTyped(e.target.value)}
        placeholder={title}
        className="mt-2 h-8 w-full rounded-control border border-line-strong bg-bg px-2 text-xs"
      />
      {error ? <p className="mt-2 text-2xs text-danger">{error}</p> : null}
      <div className="mt-3 flex gap-2">
        <button
          type="button"
          onClick={remove}
          disabled={pending || !matches}
          className="h-8 rounded-control bg-danger px-3 text-xs font-medium text-white disabled:opacity-40"
        >
          {pending ? "Deleting…" : "Delete for good"}
        </button>
        <button
          type="button"
          onClick={() => {
            setConfirming(false);
            setTyped("");
          }}
          className="h-8 rounded-control border border-line-strong px-3 text-xs text-fg-muted"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

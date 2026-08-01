"use client";

import Link from "next/link";
import { useEffect, useState, useTransition } from "react";
import {
  createCollectionAndSaveFont,
  toggleSavedFont,
} from "@/lib/actions";
import { cn } from "@/lib/utils";

interface CollectionOption {
  id: string;
  name: string;
  isPrivate: boolean;
}

/**
 * Save a font into a folder, from the specimen page.
 *
 * Same shape as the project save menu on purpose — folders hold both, so the
 * gesture should not be two different gestures.
 */
export function SaveFontButton({
  fontSlug,
  family,
}: {
  fontSlug: string;
  family: string;
}) {
  // Fetched rather than passed in: font pages are statically rendered for SEO
  // and must not become dynamic just to read a session.
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  const [collections, setCollections] = useState<CollectionOption[]>([]);
  const [savedIn, setSavedIn] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrivate, setNewPrivate] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const isSaved = savedIn.length > 0;

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/collections?fontSlug=${encodeURIComponent(fontSlug)}`)
      .then((r) => r.json())
      .then((data) => {
        if (cancelled) return;
        setSignedIn(Boolean(data.signedIn));
        setCollections(data.collections ?? []);
        setSavedIn(data.savedIn ?? []);
      })
      .catch(() => {
        if (!cancelled) setSignedIn(false);
      });
    return () => {
      cancelled = true;
    };
  }, [fontSlug]);

  // Reserve the space while the session is unknown, so the row does not jump.
  if (signedIn === null) {
    return (
      <span
        aria-hidden
        className="inline-flex h-10 w-24 items-center rounded-control border border-line px-4 text-sm text-fg-subtle"
      >
        ⧉ Save
      </span>
    );
  }

  if (!signedIn) {
    return (
      <Link
        href={`/signin?next=/fonts/${fontSlug}`}
        className="inline-flex h-10 items-center gap-2 rounded-control border border-line-strong px-4 text-sm text-fg-muted transition-colors hover:text-fg"
      >
        <span aria-hidden>⧉</span> Save
      </Link>
    );
  }

  function save(collectionId?: string) {
    setError(null);
    start(async () => {
      const result = await toggleSavedFont(fontSlug, family, collectionId);
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

  function createFolder() {
    const name = newName.trim();
    if (!name) return;
    setError(null);
    start(async () => {
      const result = await createCollectionAndSaveFont(
        fontSlug,
        family,
        name,
        newPrivate,
      );
      if (!result.ok) {
        setError(result.errors?.name ?? result.error ?? "Could not create it.");
        return;
      }
      const { collection } = result.data as { collection: CollectionOption };
      setCollections((prev) => [collection, ...prev]);
      setSavedIn((prev) => [...prev, collection.id]);
      setNewName("");
      setNewPrivate(false);
      setCreating(false);
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
          {isSaved ? `Saved${savedIn.length > 1 ? ` ×${savedIn.length}` : ""}` : "Save"}
        </button>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-label="Choose a folder"
          aria-expanded={open}
          className="inline-flex h-10 items-center rounded-r-control border border-l-0 border-line-strong px-2.5 text-xs text-fg-muted hover:text-fg"
        >
          ▾
        </button>
      </div>

      {open ? (
        <div className="absolute top-11 z-30 w-64 rounded-card border border-line bg-bg-raised p-1.5 shadow-lg">
          <div className="max-h-56 overflow-y-auto">
            {collections.length === 0 && !creating ? (
              <p className="px-2.5 py-2 text-xs text-fg-subtle">
                No folders yet. Save to make one, or name it below.
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
                  <span
                    aria-hidden
                    className={inThis ? "text-accent" : "text-fg-subtle"}
                  >
                    {inThis ? "✓" : "+"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="mt-1 border-t border-line pt-1.5">
            {creating ? (
              <div className="space-y-2 px-1 pb-1">
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      createFolder();
                    }
                    if (e.key === "Escape") setCreating(false);
                  }}
                  maxLength={80}
                  placeholder="Folder name"
                  className="h-8 w-full rounded-control border border-line-strong bg-bg px-2 text-xs text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
                />
                <label className="flex items-center gap-1.5 text-2xs text-fg-muted">
                  <input
                    type="checkbox"
                    checked={newPrivate}
                    onChange={(e) => setNewPrivate(e.target.checked)}
                  />
                  Private
                </label>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={createFolder}
                    disabled={pending || !newName.trim()}
                    className="h-7 flex-1 rounded-control bg-accent text-2xs font-medium text-accent-fg disabled:opacity-50"
                  >
                    {pending ? "Saving…" : "Create & save"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCreating(false)}
                    className="h-7 rounded-control border border-line-strong px-2 text-2xs text-fg-muted"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-1.5 rounded px-2.5 py-1.5 text-left text-sm text-accent hover:bg-bg-sunken"
              >
                <span aria-hidden>+</span> New folder
              </button>
            )}
          </div>
        </div>
      ) : null}

      {error ? <span className="text-2xs text-danger">{error}</span> : null}
    </div>
  );
}

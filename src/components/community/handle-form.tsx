"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input, Label } from "@/components/ui/primitives";
import { claimHandle } from "@/lib/actions";
import { cn } from "@/lib/utils";

export function HandleForm({
  suggestion,
  current,
  next,
  className,
}: {
  suggestion?: string;
  current?: string | null;
  next?: string;
  className?: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(current ?? suggestion ?? "");
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    setSaved(false);
    start(async () => {
      const result = await claimHandle(formData);
      if (!result.ok) {
        setError(result.errors?.handle ?? result.error ?? "Could not save that.");
        return;
      }
      setSaved(true);
      if (next) {
        router.push(next);
        router.refresh();
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form action={submit} className={cn("space-y-3", className)}>
      <div>
        <Label htmlFor="handle">Handle</Label>
        <div className="mt-1 flex items-center gap-1.5">
          <span className="font-mono text-sm text-fg-subtle">/u/</span>
          <Input
            id="handle"
            name="handle"
            value={value}
            onChange={(e) => setValue(e.target.value.toLowerCase())}
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            required
            minLength={3}
            maxLength={24}
            className="font-mono"
          />
        </div>
        <p className="mt-1.5 text-2xs text-fg-subtle">
          3–24 characters. Letters, numbers, hyphens and underscores.
        </p>
      </div>

      {error ? <p className="text-xs text-danger">{error}</p> : null}
      {saved && !next ? <p className="text-xs text-success">Saved.</p> : null}

      <button
        type="submit"
        disabled={pending || value.length < 3}
        className="h-10 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : current ? "Update handle" : "Continue"}
      </button>
    </form>
  );
}

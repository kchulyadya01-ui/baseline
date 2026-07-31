"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input, Label } from "@/components/ui/primitives";
import { createCollection } from "@/lib/actions";

export function NewCollectionForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setErrors({});
    start(async () => {
      const result = await createCollection(formData);
      if (!result.ok) {
        setErrors(result.errors ?? { form: result.error ?? "Could not create it." });
        return;
      }
      setOpen(false);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-10 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90"
      >
        New collection
      </button>
    );
  }

  return (
    <form
      action={submit}
      className="w-full max-w-sm space-y-3 rounded-card border border-line bg-bg-raised p-4"
    >
      <div>
        <Label htmlFor="collection-name">Name</Label>
        <Input
          id="collection-name"
          name="name"
          required
          maxLength={80}
          autoFocus
          placeholder="Editorial references"
          className="mt-1"
        />
        {errors.name ? (
          <p className="mt-1 text-xs text-danger">{errors.name}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="collection-description">Description</Label>
        <Input
          id="collection-description"
          name="description"
          maxLength={500}
          placeholder="Optional"
          className="mt-1"
        />
      </div>

      <label className="flex items-center gap-2 text-xs text-fg-muted">
        <input type="checkbox" name="isPrivate" />
        Private — only you can see it
      </label>

      {errors.form ? <p className="text-xs text-danger">{errors.form}</p> : null}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-9 rounded-control bg-accent px-3 text-xs font-medium text-accent-fg disabled:opacity-50"
        >
          {pending ? "Creating…" : "Create"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-control border border-line-strong px-3 text-xs text-fg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

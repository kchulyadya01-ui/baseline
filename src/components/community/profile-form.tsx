"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Input, Label } from "@/components/ui/primitives";
import { updateProfile } from "@/lib/actions";

export function ProfileForm({
  initial,
}: {
  initial: { name: string; bio: string; website: string; location: string };
}) {
  const router = useRouter();
  const [bio, setBio] = useState(initial.bio);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);
  const [pending, start] = useTransition();

  function submit(formData: FormData) {
    setErrors({});
    setSaved(false);
    start(async () => {
      const result = await updateProfile(formData);
      if (!result.ok) {
        setErrors(result.errors ?? { form: result.error ?? "Could not save." });
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form action={submit} className="space-y-4">
      <div>
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={initial.name}
          maxLength={60}
          placeholder="How your name appears on your work"
          className="mt-1"
        />
      </div>

      <div>
        <Label htmlFor="bio">Bio</Label>
        <textarea
          id="bio"
          name="bio"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          maxLength={280}
          rows={3}
          className="mt-1 w-full rounded-control border border-line-strong bg-bg-raised px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
          placeholder="What you make, and for whom."
        />
        <p className="mt-1 text-2xs text-fg-subtle">{bio.length}/280</p>
      </div>

      <div>
        <Label htmlFor="website">Website</Label>
        <Input
          id="website"
          name="website"
          defaultValue={initial.website}
          maxLength={200}
          placeholder="https://…"
          className="mt-1"
        />
        {errors.website ? (
          <p className="mt-1 text-xs text-danger">{errors.website}</p>
        ) : null}
      </div>

      <div>
        <Label htmlFor="location">Location</Label>
        <Input
          id="location"
          name="location"
          defaultValue={initial.location}
          maxLength={60}
          placeholder="Kathmandu"
          className="mt-1"
        />
      </div>

      {errors.form ? <p className="text-xs text-danger">{errors.form}</p> : null}
      {saved ? <p className="text-xs text-success">Saved.</p> : null}

      <button
        type="submit"
        disabled={pending}
        className="h-10 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}

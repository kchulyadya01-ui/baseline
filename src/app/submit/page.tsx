import type { Metadata } from "next";
import { CommunityNotConfigured } from "@/components/community/not-configured";
import { ProjectForm } from "@/components/community/project-form";
import { requireOnboarded } from "@/lib/auth";
import { isCommunityConfigured } from "@/lib/db";
import { queryFonts } from "@/lib/fonts";

export const metadata: Metadata = {
  title: "Post a project",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function SubmitPage() {
  if (!isCommunityConfigured()) return <CommunityNotConfigured />;

  await requireOnboarded("/submit");

  // A shortlist for the font autocomplete. Typing a commercial face still works
  // — it just does not get a catalogue link.
  const suggestions = queryFonts({ sort: "popular", perPage: 300 }).fonts.map(
    (font) => ({ slug: font.slug, family: font.family }),
  );

  return (
    <div className="mx-auto max-w-[76rem] px-5">
      <header className="pt-12 pb-8">
        <span className="label-mono">Community</span>
        <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
          Post a project
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-fg-muted">
          Images, a title, and — the part that makes it useful — the fonts and
          colours behind it.
        </p>
      </header>

      <ProjectForm fontSuggestions={suggestions} />
    </div>
  );
}

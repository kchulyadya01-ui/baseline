"use client";

import { useState } from "react";
import { CodeBlock } from "@/components/ui/copy";

/**
 * The code snippets, collapsed by default.
 *
 * This is a tool for designers first. Three blocks of CSS above the licence
 * summary put the developer handoff ahead of the thing most visitors came for,
 * so it folds away — still one click from the person who needs it, and out of
 * the way of the person who doesn't.
 */
export function DeveloperSnippets({
  html,
  css,
  next,
}: {
  html: string;
  css: string;
  next: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <section>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between rounded-card border border-line bg-bg-raised px-4 py-3 text-left transition-colors hover:bg-bg-sunken"
      >
        <span>
          <span className="block text-sm font-medium text-fg">
            Add it to a website
          </span>
          <span className="mt-0.5 block text-xs text-fg-muted">
            HTML, CSS and next/font snippets — for whoever builds it
          </span>
        </span>
        <span aria-hidden className="ml-4 shrink-0 text-fg-subtle">
          {open ? "−" : "+"}
        </span>
      </button>

      {open ? (
        <div className="mt-4 space-y-4">
          <CodeBlock code={html} language="html" />
          <CodeBlock code={css} language="css" />
          <CodeBlock code={next} language="next/font" />
        </div>
      ) : null}
    </section>
  );
}

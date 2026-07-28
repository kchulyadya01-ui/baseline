"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export function CopyButton({
  value,
  label = "Copy",
  className,
}: {
  value: string;
  label?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // Clipboard blocked (insecure context, permissions). Nothing to recover.
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className={cn(
        "inline-flex h-8 items-center gap-1.5 rounded-control border border-line-strong bg-bg-raised px-2.5",
        "text-xs font-medium text-fg-muted transition-colors hover:text-fg hover:bg-bg-sunken",
        className,
      )}
    >
      <span aria-hidden>{copied ? "✓" : "⧉"}</span>
      {copied ? "Copied" : label}
    </button>
  );
}

export function CodeBlock({
  code,
  language,
  maxHeight = "22rem",
}: {
  code: string;
  language?: string;
  maxHeight?: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-card border border-line bg-bg-sunken">
      <div className="flex items-center justify-between border-b border-line px-3 py-2">
        <span className="label-mono">{language ?? "code"}</span>
        <CopyButton value={code} />
      </div>
      <pre
        className="overflow-auto p-3 text-xs leading-relaxed"
        style={{ maxHeight }}
      >
        <code className="font-mono text-fg">{code}</code>
      </pre>
    </div>
  );
}

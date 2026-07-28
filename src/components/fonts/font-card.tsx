import Link from "next/link";
import { Badge } from "@/components/ui/primitives";
import { fontStack } from "@/lib/font-url";
import type { FontRecord } from "@/lib/types";

const SAMPLE = "Whereas disregard and contempt";

export function FontCard({
  font,
  sample = SAMPLE,
}: {
  font: FontRecord;
  sample?: string;
}) {
  return (
    <Link
      href={`/fonts/${font.slug}`}
      className="group flex flex-col justify-between rounded-card border border-line bg-bg-raised p-5 transition-colors hover:border-line-strong hover:bg-bg-sunken"
    >
      <p
        className="specimen mb-6 text-2xl leading-tight text-fg"
        style={{ fontFamily: fontStack(font) }}
      >
        {sample}
      </p>

      <div>
        <div className="flex items-baseline justify-between gap-3">
          <span className="truncate text-sm font-medium text-fg">
            {font.family}
          </span>
          <span className="label-mono shrink-0">{font.category}</span>
        </div>

        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          <Badge>{font.weights.length} wt</Badge>
          {font.isVariable ? <Badge tone="accent">Variable</Badge> : null}
          {font.hasItalic ? <Badge>Italic</Badge> : null}
          <Badge tone="success">{font.license.id}</Badge>
        </div>
      </div>
    </Link>
  );
}

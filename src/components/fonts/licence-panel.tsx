import { Badge } from "@/components/ui/primitives";
import type { FontLicense, FontProvenance } from "@/lib/types";

/**
 * Plain-language licensing.
 *
 * The rule everyone gets wrong: OFL lets you use the font in anything
 * commercial, but you may not sell the font file on its own. Say that in
 * words, then show where the claim came from — provenance on every claim is
 * the licence-accuracy NFR made visible.
 */

const PERMISSIONS = [
  {
    key: "commercialUse",
    yes: "Use it commercially — client work, products, packaging, ads",
    no: "Personal use only",
  },
  {
    key: "embedding",
    yes: "Embed it in websites, apps, PDFs and video",
    no: "No embedding",
  },
  {
    key: "modification",
    yes: "Modify it — new weights, tweaked glyphs, subset it down",
    no: "No modification",
  },
  {
    key: "redistributable",
    yes: "Redistribute it, bundled with your work",
    no: "No redistribution",
  },
] as const;

export function LicencePanel({
  license,
  provenance,
  family,
}: {
  license: FontLicense;
  provenance: FontProvenance;
  family: string;
}) {
  return (
    <section className="rounded-card border border-line bg-bg-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="label-mono">Licence</div>
          <h2 className="mt-1 font-display text-lg font-semibold">
            {license.name}
          </h2>
        </div>
        <Badge tone="success">Free for commercial use</Badge>
      </div>

      <ul className="mt-5 space-y-2.5">
        {PERMISSIONS.map((permission) => {
          const allowed = license[permission.key];
          return (
            <li key={permission.key} className="flex gap-3 text-sm">
              <span
                aria-hidden
                className={allowed ? "text-success" : "text-danger"}
              >
                {allowed ? "✓" : "✕"}
              </span>
              <span className={allowed ? "text-fg" : "text-fg-muted"}>
                {allowed ? permission.yes : permission.no}
              </span>
            </li>
          );
        })}

        <li className="flex gap-3 text-sm">
          <span aria-hidden className="text-danger">
            ✕
          </span>
          <span className="text-fg">
            {license.sellingFontItself
              ? "You may sell the font file itself"
              : "You may not sell the font file on its own"}
          </span>
        </li>
      </ul>

      {license.id === "OFL-1.1" ? (
        <p className="mt-5 rounded-control bg-bg-sunken p-3 text-xs leading-relaxed text-fg-muted">
          <strong className="text-fg">The bit everyone misses:</strong> modify{" "}
          {family} and hand the result around and it has to go out under the OFL
          too, under a different name. Simply using it in a design — however
          well paid — triggers exactly none of that.
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap gap-4 border-t border-line pt-4 text-xs">
        <a
          href={license.url}
          target="_blank"
          rel="noreferrer"
          className="text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          Full licence text
        </a>
        <a
          href={`https://github.com/google/fonts/tree/main/${provenance.path}`}
          target="_blank"
          rel="noreferrer"
          className="text-fg-muted underline underline-offset-4 hover:text-fg"
        >
          Source: {provenance.path}
        </a>
      </div>

      <p className="mt-3 text-2xs text-fg-subtle">
        Summary in plain words, not legal advice. The linked licence wins.
      </p>
    </section>
  );
}

import Link from "next/link";
import { getCatalogueMeta } from "@/lib/fonts";
import { formatDate } from "@/lib/utils";

export function SiteFooter() {
  const meta = getCatalogueMeta();

  return (
    <footer className="mt-24 border-t border-line">
      <div className="mx-auto grid max-w-[76rem] gap-10 px-5 py-12 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="block h-4 w-4 border-b-2 border-accent" />
            <span className="font-display text-base font-semibold tracking-tight">
              Baseline
            </span>
          </div>
          <p className="mt-3 max-w-xs text-sm text-fg-muted">
            Typography and colour tools for anyone who sets type. Free, no
            login, and nothing here will invoice you later.
          </p>
        </div>

        <div>
          <div className="label-mono">Tools</div>
          <ul className="mt-3 space-y-2 text-sm">
            {[
              ["/fonts", "Font Library"],
              ["/type-scale", "Type Scale Studio"],
              ["/colour", "Colour Studio"],
              ["/identify", "Font Identification"],
            ].map(([href, label]) => (
              <li key={href}>
                <Link href={href} className="text-fg-muted hover:text-fg">
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <div className="label-mono">Catalogue</div>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li>{meta.count.toLocaleString("en-GB")} open-licence families</li>
            <li>Synced {formatDate(meta.ingestedAt)}</li>
            <li>
              <a
                href={meta.source.repository}
                target="_blank"
                rel="noreferrer"
                className="hover:text-fg"
              >
                Source: google/fonts
              </a>
            </li>
          </ul>
        </div>

        <div>
          <div className="label-mono">Project</div>
          <ul className="mt-3 space-y-2 text-sm text-fg-muted">
            <li>
              <Link href="/licences" className="hover:text-fg">
                Licences explained
              </Link>
            </li>
            <li>
              <Link href="/roadmap" className="hover:text-fg">
                Roadmap
              </Link>
            </li>
            <li>
              <a
                href="https://github.com/kchulyadya01-ui/baseline"
                target="_blank"
                rel="noreferrer"
                className="hover:text-fg"
              >
                GitHub
              </a>
            </li>
          </ul>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="mx-auto flex max-w-[76rem] flex-wrap items-center justify-between gap-3 px-5 py-5">
          <p className="text-xs text-fg-subtle">
            Font metadata and licences from google/fonts. We index and link. We
            do not sell fonts, and we would not know how.
          </p>
          <p className="label-mono">Phase 1 · the wedge</p>
        </div>
      </div>
    </footer>
  );
}

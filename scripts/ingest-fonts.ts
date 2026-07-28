/**
 * Font ingestion — Phase 0 of the build plan.
 *
 * Source of truth is the google/fonts repository. Two reads:
 *   1. fonts.google.com/metadata/fonts  — family, category, designers, axes, subsets, popularity
 *   2. GitHub git-trees API             — directory membership under ofl/ apache/ ufl/, which IS the licence
 *
 * Licence by directory membership rather than by parsing METADATA.pb keeps the
 * ">99% licence accuracy" NFR cheap: a family is OFL because it lives in ofl/.
 * Provenance for every claim is recorded on the record itself.
 *
 * Output is committed to src/data/fonts.json so the build never touches the
 * network. Re-run nightly (Phase 0 gate: "catalogue searchable").
 *
 *   npm run ingest
 */
import { writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

const METADATA_URL = "https://fonts.google.com/metadata/fonts";
const GH_API = "https://api.github.com";
const OUT = join(process.cwd(), "src", "data", "fonts.json");

const LICENCES = {
  ofl: {
    id: "OFL-1.1",
    name: "SIL Open Font License 1.1",
    url: "https://openfontlicense.org/",
    redistributable: true,
    commercialUse: true,
    embedding: true,
    modification: true,
    sellingFontItself: false,
  },
  apache: {
    id: "Apache-2.0",
    name: "Apache License 2.0",
    url: "https://www.apache.org/licenses/LICENSE-2.0",
    redistributable: true,
    commercialUse: true,
    embedding: true,
    modification: true,
    sellingFontItself: true,
  },
  ufl: {
    id: "UFL-1.0",
    name: "Ubuntu Font Licence 1.0",
    url: "https://ubuntu.com/legal/font-licence",
    redistributable: true,
    commercialUse: true,
    embedding: true,
    modification: true,
    sellingFontItself: false,
  },
} as const;

type LicenceKey = keyof typeof LICENCES;

interface GoogleAxis {
  tag: string;
  min: number;
  max: number;
  defaultValue: number;
}

interface GoogleFamily {
  family: string;
  category: string;
  subsets: string[];
  axes: GoogleAxis[];
  designers: string[];
  fonts: Record<string, unknown>;
  popularity: number;
  dateAdded: string;
  lastModified: string;
  size: number;
  isNoto: boolean;
}

/** google/fonts directory names: lowercase, alphanumerics only. */
function dirSlug(family: string): string {
  return family.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** URL slug: readable and stable. "Playfair Display" -> "playfair-display" */
export function urlSlug(family: string): string {
  return family
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

async function ghJson<T>(path: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "baseline-font-ingest",
  };
  const token = process.env.GITHUB_TOKEN ?? process.env.GH_TOKEN;
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${GH_API}${path}`, { headers });
  if (!res.ok) {
    throw new Error(
      `GitHub ${path} -> ${res.status} ${res.statusText}. ` +
        `Set GITHUB_TOKEN to raise the rate limit (60/hr unauthenticated).`,
    );
  }
  return res.json() as Promise<T>;
}

/** Directory names under a licence folder. Uses git-trees, not contents: contents caps at 1000. */
async function licenceDirs(licence: LicenceKey): Promise<Set<string>> {
  const root = await ghJson<{ tree: { path: string; sha: string; type: string }[] }>(
    "/repos/google/fonts/git/trees/main",
  );
  const node = root.tree.find((t) => t.path === licence && t.type === "tree");
  if (!node) throw new Error(`No ${licence}/ directory in google/fonts`);

  const sub = await ghJson<{ tree: { path: string; type: string }[] }>(
    `/repos/google/fonts/git/trees/${node.sha}`,
  );
  return new Set(sub.tree.filter((t) => t.type === "tree").map((t) => t.path));
}

/** "400", "400i", "700" -> { weights: [400,700], hasItalic: true } */
function parseStyles(fonts: Record<string, unknown>) {
  const keys = Object.keys(fonts ?? {});
  const weights = [
    ...new Set(keys.map((k) => Number.parseInt(k.replace("i", ""), 10))),
  ]
    .filter((n) => Number.isFinite(n))
    .sort((a, b) => a - b);
  return { weights, hasItalic: keys.some((k) => k.endsWith("i")) };
}

async function main() {
  console.log("→ fetching Google Fonts metadata");
  const metaRes = await fetch(METADATA_URL);
  if (!metaRes.ok) throw new Error(`metadata -> ${metaRes.status}`);
  const meta = (await metaRes.json()) as { familyMetadataList: GoogleFamily[] };

  console.log("→ fetching licence directories from google/fonts");
  const dirs = {} as Record<LicenceKey, Set<string>>;
  for (const key of Object.keys(LICENCES) as LicenceKey[]) {
    dirs[key] = await licenceDirs(key);
    console.log(`  ${key}: ${dirs[key].size} families`);
  }

  const ingestedAt = new Date().toISOString();
  let unlicensed = 0;

  const fonts = meta.familyMetadataList
    .map((f) => {
      const dir = dirSlug(f.family);
      const licenceKey = (Object.keys(LICENCES) as LicenceKey[]).find((k) =>
        dirs[k].has(dir),
      );
      if (!licenceKey) {
        unlicensed += 1;
        return null;
      }
      const { weights, hasItalic } = parseStyles(f.fonts);
      const axes = (f.axes ?? []).map((a) => ({
        tag: a.tag,
        min: a.min,
        max: a.max,
        default: a.defaultValue,
      }));

      return {
        slug: urlSlug(f.family),
        family: f.family,
        category: f.category,
        designers: f.designers ?? [],
        subsets: (f.subsets ?? []).filter((s) => s !== "menu"),
        weights,
        hasItalic,
        axes,
        isVariable: axes.length > 0,
        popularity: f.popularity,
        dateAdded: f.dateAdded,
        lastModified: f.lastModified,
        sizeBytes: f.size,
        isNoto: f.isNoto,
        license: LICENCES[licenceKey],
        // Provenance: every licence claim points back at the directory it came from.
        provenance: {
          source: "github.com/google/fonts",
          path: `${licenceKey}/${dir}`,
          licenseFile: `https://github.com/google/fonts/blob/main/${licenceKey}/${dir}/OFL.txt`,
        },
      };
    })
    .filter((f): f is NonNullable<typeof f> => f !== null)
    .sort((a, b) => a.popularity - b.popularity);

  const payload = {
    ingestedAt,
    source: { metadata: METADATA_URL, repository: "https://github.com/google/fonts" },
    count: fonts.length,
    fonts,
  };

  await mkdir(join(process.cwd(), "src", "data"), { recursive: true });
  await writeFile(OUT, JSON.stringify(payload), "utf8");

  console.log(
    `✓ ${fonts.length} families → src/data/fonts.json` +
      (unlicensed ? ` (${unlicensed} skipped: no licence directory)` : ""),
  );
}

main().catch((err) => {
  console.error("✗ ingestion failed:", err.message);
  process.exit(1);
});

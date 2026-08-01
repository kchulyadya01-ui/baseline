/**
 * Build the glyph descriptor index — the "index" half of image-mode font
 * identification.
 *
 * For every family in the catalogue: fetch its regular-weight TTF from Google's
 * CDN, read the real outlines with opentype.js, rasterise eight key glyphs, and
 * store the concatenated vector in Postgres for pgvector to search.
 *
 *   DATABASE_URL=... npx tsx scripts/index-glyphs.ts            # all families
 *   DATABASE_URL=... npx tsx scripts/index-glyphs.ts --limit 50 # a sample
 *   DATABASE_URL=... npx tsx scripts/index-glyphs.ts --force    # re-index
 *
 * Safe to interrupt and re-run: already-indexed families are skipped unless
 * --force. Families whose file cannot be read are recorded as failures and
 * skipped rather than aborting the run — a handful of the 1,900 have unusual
 * packaging, and losing the other 1,890 to one of them would be absurd.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import opentype, { type Font } from "opentype.js";
import {
  CELL,
  DESCRIPTOR_DIMS,
  isSerifCategory,
  KEY_GLYPHS,
  normalise,
  rasterise,
  strokeStats,
  toVectorLiteral,
  type PathCommand,
} from "../src/lib/glyph-descriptor";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const args = process.argv.slice(2);
const force = args.includes("--force");
const limitIndex = args.indexOf("--limit");
const limit = limitIndex >= 0 ? Number(args[limitIndex + 1]) : Infinity;
const CONCURRENCY = 6;

interface CatalogueFont {
  slug: string;
  family: string;
  category: string;
  weights: number[];
}

function loadCatalogue(): CatalogueFont[] {
  const path = join(process.cwd(), "src", "data", "fonts.json");
  const data = JSON.parse(readFileSync(path, "utf8")) as {
    fonts: CatalogueFont[];
  };
  return data.fonts;
}

/**
 * Google's CSS endpoint hands back @font-face blocks; the font URL is inside.
 *
 * The v1 endpoint with a DEFAULT User-Agent is what serves a real TrueType file
 * from `/s/...`. Sending an old MSIE User-Agent — the usual trick for getting
 * TTF instead of WOFF2 — backfires here: it routes to `/l/font?kit=`, which
 * returns a proprietary subset format opentype.js cannot read at all.
 */
async function resolveFontFileUrl(family: string, weight: number): Promise<string | null> {
  const url = `https://fonts.googleapis.com/css?family=${family.replace(/ /g, "+")}:${weight}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) return null;
  const css = await response.text();
  // Prefer a /s/ URL — those are the real files.
  const all = [...css.matchAll(/url\((https:\/\/fonts\.gstatic\.com\/[^)]+)\)/g)].map(
    (m) => m[1],
  );
  return all.find((u) => u.includes("/s/")) ?? all[0] ?? null;
}

function describeFamily(font: Font, category: string) {
  const unitsPerEm = font.unitsPerEm || 1000;
  const vector: number[] = [];
  const grids: Record<string, number[]> = {};

  for (const character of KEY_GLYPHS) {
    const glyph = font.charToGlyph(character);
    // A missing glyph contributes zeroes rather than aborting — better a
    // partial descriptor than none for a family with a limited character set.
    if (!glyph || glyph.unicode === undefined) {
      vector.push(...new Array(CELL * CELL).fill(0));
      continue;
    }
    const path = glyph.getPath(0, 0, unitsPerEm);
    const grid = rasterise(path.commands as PathCommand[], CELL);
    grids[character] = grid;
    vector.push(...grid);
  }

  if (vector.length !== DESCRIPTOR_DIMS) {
    throw new Error(`descriptor is ${vector.length} dims, expected ${DESCRIPTOR_DIMS}`);
  }

  // Coarse metrics, measured from the outlines rather than the raster where
  // the font tells us directly.
  const xHeight = font.tables?.os2?.sxHeight ?? 0;
  const capHeight = font.tables?.os2?.sCapHeight ?? 0;
  const nGlyph = font.charToGlyph("n");
  const oGlyph = font.charToGlyph("o");

  const nBounds = nGlyph?.getBoundingBox();
  const widthRatio =
    nBounds && nBounds.y2 > nBounds.y1
      ? (nBounds.x2 - nBounds.x1) / (nBounds.y2 - nBounds.y1)
      : 0;

  const oStats = grids["o"] ? strokeStats(grids["o"], CELL) : { weight: 0, contrast: 0 };

  return {
    vector: normalise(vector),
    metrics: {
      xHeightRatio: capHeight > 0 && xHeight > 0 ? xHeight / capHeight : 0,
      widthRatio,
      strokeWeight: oStats.weight,
      strokeContrast: oStats.contrast,
      hasSerifs: isSerifCategory(category),
    },
    hasOutlines: Boolean(nGlyph && oGlyph),
  };
}

async function indexOne(entry: CatalogueFont): Promise<"done" | "skipped" | "failed"> {
  const weight = entry.weights.includes(400) ? 400 : entry.weights[0];
  if (!weight) return "failed";

  const fileUrl = await resolveFontFileUrl(entry.family, weight);
  if (!fileUrl) return "failed";

  const response = await fetch(fileUrl, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) return "failed";
  const buffer = await response.arrayBuffer();

  let parsed: Font;
  try {
    parsed = opentype.parse(buffer);
  } catch {
    return "failed";
  }

  const described = describeFamily(parsed, entry.category);
  if (!described.hasOutlines) return "failed";

  // Raw SQL: Prisma has no vector type, so the column is Unsupported.
  await db.$executeRawUnsafe(
    `INSERT INTO font_descriptors
       (id, "fontSlug", family, category, descriptor,
        "xHeightRatio", "widthRatio", "strokeWeight", "strokeContrast", "hasSerifs",
        "sourceUrl", "indexedAt")
     VALUES (gen_random_uuid()::text, $1, $2, $3, $4::vector, $5, $6, $7, $8, $9, $10, now())
     ON CONFLICT ("fontSlug") DO UPDATE SET
       descriptor = EXCLUDED.descriptor,
       "xHeightRatio" = EXCLUDED."xHeightRatio",
       "widthRatio" = EXCLUDED."widthRatio",
       "strokeWeight" = EXCLUDED."strokeWeight",
       "strokeContrast" = EXCLUDED."strokeContrast",
       "hasSerifs" = EXCLUDED."hasSerifs",
       "sourceUrl" = EXCLUDED."sourceUrl",
       "indexedAt" = now()`,
    entry.slug,
    entry.family,
    entry.category,
    toVectorLiteral(described.vector),
    described.metrics.xHeightRatio,
    described.metrics.widthRatio,
    described.metrics.strokeWeight,
    described.metrics.strokeContrast,
    described.metrics.hasSerifs,
    fileUrl,
  );

  return "done";
}

async function main() {
  const catalogue = loadCatalogue();

  const existing = force
    ? new Set<string>()
    : new Set(
        (
          await db.$queryRawUnsafe<{ fontSlug: string }[]>(
            `SELECT "fontSlug" FROM font_descriptors`,
          )
        ).map((r) => r.fontSlug),
      );

  const queue = catalogue
    .filter((f) => force || !existing.has(f.slug))
    .slice(0, limit === Infinity ? undefined : limit);

  console.log(
    `→ ${catalogue.length} families in the catalogue, ${existing.size} already indexed, ${queue.length} to do`,
  );

  let done = 0;
  let failed = 0;
  const failures: string[] = [];

  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const entry = queue[cursor++];
      try {
        const result = await indexOne(entry);
        if (result === "done") done += 1;
        else {
          failed += 1;
          failures.push(entry.family);
        }
      } catch (error) {
        failed += 1;
        failures.push(`${entry.family} (${(error as Error).message.slice(0, 50)})`);
      }

      const seen = done + failed;
      if (seen % 50 === 0 || seen === queue.length) {
        console.log(`  ${seen}/${queue.length} · ${done} indexed · ${failed} failed`);
      }
    }
  }

  await Promise.all(Array.from({ length: CONCURRENCY }, worker));

  console.log(`\n✓ ${done} indexed, ${failed} failed`);
  if (failures.length) {
    console.log(`  first failures: ${failures.slice(0, 8).join(", ")}`);
  }

  const total = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint as count FROM font_descriptors`,
  );
  console.log(`  ${total[0].count} descriptors in the index`);
}

main()
  .catch((error) => {
    console.error("✗ indexing failed:", error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

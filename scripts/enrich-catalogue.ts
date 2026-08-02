/**
 * Merge glyph-descriptor metrics into the catalogue snapshot.
 *
 * The metrics (width ratio, stroke contrast, serif-ness) are computed from real
 * outlines by scripts/index-glyphs.ts and live in Postgres. The Font Library is
 * deliberately database-free and statically rendered, so it cannot read them at
 * request time — copying them into src/data/fonts.json is what lets structural
 * filters ("condensed", "high contrast") work on a static page.
 *
 *   DATABASE_URL=... npx tsx scripts/enrich-catalogue.ts
 *
 * Run after index-glyphs. Safe to re-run.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL is required.");
  process.exit(1);
}

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
const PATH = join(process.cwd(), "src", "data", "fonts.json");

interface Row {
  fontSlug: string;
  widthRatio: number;
  strokeContrast: number;
  strokeWeight: number;
}

async function main() {
  const rows = await db.$queryRawUnsafe<Row[]>(
    `SELECT "fontSlug", "widthRatio", "strokeContrast", "strokeWeight" FROM font_descriptors`,
  );
  const byslug = new Map(rows.map((r) => [r.fontSlug, r]));
  console.log(`→ ${rows.length} descriptors in the database`);

  const data = JSON.parse(readFileSync(PATH, "utf8")) as {
    fonts: Record<string, unknown>[];
  };

  let enriched = 0;
  for (const font of data.fonts) {
    const metrics = byslug.get(font.slug as string);
    if (!metrics) continue;
    // Rounded: three decimals is far past the precision a filter needs, and it
    // keeps the snapshot from growing more than it has to.
    font.widthRatio = Number(metrics.widthRatio.toFixed(3));
    font.strokeContrast = Number(metrics.strokeContrast.toFixed(3));
    font.strokeWeight = Number(metrics.strokeWeight.toFixed(3));
    enriched += 1;
  }

  writeFileSync(PATH, JSON.stringify(data), "utf8");
  console.log(`✓ ${enriched} of ${data.fonts.length} families enriched`);
}

main()
  .catch((error) => {
    console.error("✗ enrichment failed:", error.message);
    process.exit(1);
  })
  .finally(() => db.$disconnect());

/**
 * Recompute strokeWeight and strokeContrast from the descriptors already in the
 * database — no font files re-downloaded.
 *
 * The descriptor vector is eight 14x14 glyph rasters concatenated, and 'o' is
 * one of them, so the metrics can be derived from what is already stored. This
 * exists because the first contrast metric was wrong and re-fetching 1,933 font
 * files to fix arithmetic would be silly.
 */
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { CELL, GLYPH_DIMS, KEY_GLYPHS, strokeStats } from "../src/lib/glyph-descriptor";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) { console.error("DATABASE_URL required"); process.exit(1); }
const db = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const O_INDEX = KEY_GLYPHS.indexOf("o");

async function main() {
  const rows = await db.$queryRawUnsafe<{ fontSlug: string; descriptor: string }[]>(
    `SELECT "fontSlug", descriptor::text AS descriptor FROM font_descriptors`,
  );
  console.log(`→ ${rows.length} descriptors`);

  // One UPDATE per row means ~2,000 round trips to a database in another
  // region, which takes minutes. A single statement per chunk takes seconds.
  const computed = rows.map((row) => {
    const vector = row.descriptor.slice(1, -1).split(",").map(Number);
    const o = vector.slice(O_INDEX * GLYPH_DIMS, (O_INDEX + 1) * GLYPH_DIMS);
    // Descriptors are L2-normalised, so rescale to 0-1 before thresholding.
    const peak = Math.max(...o) || 1;
    const stats = strokeStats(o.map((v) => v / peak), CELL);
    return { slug: row.fontSlug, ...stats };
  });

  const CHUNK = 400;
  for (let i = 0; i < computed.length; i += CHUNK) {
    const chunk = computed.slice(i, i + CHUNK);
    const values = chunk
      .map((c, j) => `($${j * 3 + 1}, $${j * 3 + 2}::double precision, $${j * 3 + 3}::double precision)`)
      .join(", ");
    await db.$executeRawUnsafe(
      `UPDATE font_descriptors AS f
       SET "strokeWeight" = v.weight, "strokeContrast" = v.contrast
       FROM (VALUES ${values}) AS v(slug, weight, contrast)
       WHERE f."fontSlug" = v.slug`,
      ...chunk.flatMap((c) => [c.slug, c.weight, c.contrast]),
    );
    console.log(`  ${Math.min(i + CHUNK, computed.length)}/${computed.length}`);
  }

  const sample = await db.$queryRawUnsafe<{ family: string; strokeContrast: number }[]>(
    `SELECT family, "strokeContrast" FROM font_descriptors ORDER BY "strokeContrast" DESC LIMIT 6`,
  );
  console.log("✓ done. Highest contrast:", sample.map((s) => `${s.family} ${s.strokeContrast}`).join(", "));
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => db.$disconnect());

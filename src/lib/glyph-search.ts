import "server-only";

import { decode as decodeJpeg } from "jpeg-js";
import { PNG } from "pngjs";
import { db } from "./db";
import {
  CELL,
  GLYPH_DIMS,
  KEY_GLYPHS,
  normalise,
  toVectorLiteral,
} from "./glyph-descriptor";
import {
  binarise,
  blobToCell,
  dominantLine,
  findBlobs,
  plausibleLetters,
  type Grey,
} from "./glyph-segment";

/**
 * Image-mode font identification: screenshot in, ranked families out.
 *
 * The index stores eight specific glyphs at fixed offsets in each family's
 * vector. A screenshot gives us letterforms but not their identity, so a query
 * cannot fill those slots directly. Instead each segmented letter is compared
 * against every one of the eight slots across the whole index, and a family
 * scores on how well its glyphs explain the letters that are actually present.
 *
 * That asymmetry is the honest limit of this approach, and it is why results
 * are always a shortlist. It is also why the URL identifier stays the primary
 * tool: reading a page's CSS is exact, and this never can be.
 */

const MAX_DIMENSION = 1400;
const MAX_LETTERS = 12;

export class ImageIdentifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// --- decoding ------------------------------------------------------------

function toGrey(
  pixels: Uint8Array | Buffer,
  width: number,
  height: number,
): Grey {
  const data = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i += 1) {
    const r = pixels[i * 4];
    const g = pixels[i * 4 + 1];
    const b = pixels[i * 4 + 2];
    const a = pixels[i * 4 + 3];
    // Composite onto white: a transparent PNG of black text is otherwise all
    // zeroes, and every pixel reads as ink.
    const alpha = a / 255;
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    data[i] = Math.round(luma * alpha + 255 * (1 - alpha));
  }
  return { data, width, height };
}

/** Box-downsample, so a phone screenshot does not blow the time budget. */
function downscale(grey: Grey): Grey {
  const longest = Math.max(grey.width, grey.height);
  if (longest <= MAX_DIMENSION) return grey;

  const factor = Math.ceil(longest / MAX_DIMENSION);
  const width = Math.floor(grey.width / factor);
  const height = Math.floor(grey.height / factor);
  const data = new Uint8Array(width * height);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      let sum = 0;
      let count = 0;
      for (let dy = 0; dy < factor; dy += 1) {
        for (let dx = 0; dx < factor; dx += 1) {
          const sx = x * factor + dx;
          const sy = y * factor + dy;
          if (sx >= grey.width || sy >= grey.height) continue;
          sum += grey.data[sy * grey.width + sx];
          count += 1;
        }
      }
      data[y * width + x] = count ? Math.round(sum / count) : 255;
    }
  }

  return { data, width, height };
}

export function decodeImage(buffer: Buffer): Grey {
  const isPng =
    buffer.length > 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isJpeg = buffer.length > 3 && buffer[0] === 0xff && buffer[1] === 0xd8;

  if (isPng) {
    const png = PNG.sync.read(buffer);
    return downscale(toGrey(png.data, png.width, png.height));
  }

  if (isJpeg) {
    const jpeg = decodeJpeg(buffer, { useTArray: true });
    return downscale(toGrey(jpeg.data, jpeg.width, jpeg.height));
  }

  throw new ImageIdentifyError(
    "Only PNG and JPEG screenshots can be read. Export a PNG and try again.",
    415,
  );
}

// --- search --------------------------------------------------------------

export interface GlyphMatch {
  fontSlug: string;
  family: string;
  category: string;
  hasSerifs: boolean;
  /** 0-1, cosine similarity averaged over the letters that were found. */
  score: number;
}

export interface ImageIdentifyResult {
  lettersFound: number;
  imageWidth: number;
  imageHeight: number;
  matches: GlyphMatch[];
  durationMs: number;
}

interface IndexRow {
  fontSlug: string;
  family: string;
  category: string;
  hasSerifs: boolean;
  descriptor: string;
}

function parseVector(literal: string): number[] {
  return literal
    .slice(1, -1)
    .split(",")
    .map((value) => Number.parseFloat(value));
}

export async function identifyFromImage(
  buffer: Buffer,
): Promise<ImageIdentifyResult> {
  const started = Date.now();

  const grey = decodeImage(buffer);
  const mask = binarise(grey);
  const blobs = findBlobs(mask, grey.width, grey.height);
  const letters = dominantLine(
    plausibleLetters(blobs, grey.width, grey.height),
  ).slice(0, MAX_LETTERS);

  if (letters.length < 2) {
    throw new ImageIdentifyError(
      "No readable letterforms found. Crop tighter to a single line of text, " +
        "on a plain background, and make sure the letters are reasonably large.",
      422,
    );
  }

  const cells = letters.map((blob) =>
    normalise(blobToCell(mask, grey.width, blob, CELL)),
  );

  // The whole index, read once. ~1,900 rows of 1,568 floats is about 12 MB and
  // scoring is a dot product per (letter, glyph slot) pair — fast enough that a
  // pgvector index would not earn its keep here, and this way each letter can
  // be matched against every slot rather than the vector as a whole.
  const rows = await db.$queryRawUnsafe<IndexRow[]>(
    `SELECT "fontSlug", family, category, "hasSerifs", descriptor::text AS descriptor
     FROM font_descriptors`,
  );

  if (rows.length === 0) {
    throw new ImageIdentifyError(
      "The glyph index is empty on this deployment. Run npm run index-glyphs.",
      503,
    );
  }

  const matches: GlyphMatch[] = [];

  for (const row of rows) {
    const vector = parseVector(row.descriptor);

    // Each glyph slot in the family, pre-normalised so a dot product is cosine.
    const slots: number[][] = [];
    for (let g = 0; g < KEY_GLYPHS.length; g += 1) {
      slots.push(normalise(vector.slice(g * GLYPH_DIMS, (g + 1) * GLYPH_DIMS)));
    }

    // Every letter takes its best-fitting slot; the family scores on the mean.
    let total = 0;
    for (const cell of cells) {
      let best = 0;
      for (const slot of slots) {
        let dot = 0;
        for (let i = 0; i < GLYPH_DIMS; i += 1) dot += cell[i] * slot[i];
        if (dot > best) best = dot;
      }
      total += best;
    }

    matches.push({
      fontSlug: row.fontSlug,
      family: row.family,
      category: row.category,
      hasSerifs: row.hasSerifs,
      score: total / cells.length,
    });
  }

  matches.sort((a, b) => b.score - a.score);

  return {
    lettersFound: letters.length,
    imageWidth: grey.width,
    imageHeight: grey.height,
    matches: matches.slice(0, 12),
    durationMs: Date.now() - started,
  };
}

/** How many families are indexed — the UI says so rather than implying totality. */
export async function glyphIndexSize(): Promise<number> {
  const rows = await db.$queryRawUnsafe<{ count: bigint }[]>(
    `SELECT count(*)::bigint AS count FROM font_descriptors`,
  );
  return Number(rows[0]?.count ?? 0);
}

export { toVectorLiteral };

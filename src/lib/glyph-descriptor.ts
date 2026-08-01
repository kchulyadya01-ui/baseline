/**
 * Glyph descriptors — the shared vocabulary of image-mode font identification.
 *
 * Both sides of the search speak this: the indexer renders a family's own
 * outlines into a descriptor, and a query renders letterforms cropped out of a
 * screenshot into the same shape. A match is then cosine distance in pgvector.
 *
 * WHY A RASTER DESCRIPTOR RATHER THAN A NEURAL EMBEDDING
 *
 * Identifying a typeface is a question about shape, and shape is directly
 * measurable — a lowercase 'a' either has a double-storey bowl or it does not.
 * Rasterising normalised outlines keeps that literal: the same glyph rendered
 * the same way gives the same vector every time, so a result is reproducible,
 * debuggable and explainable without a model, a training set or an inference
 * service. It is also the honest baseline any learned approach would have to
 * beat before it earned its complexity.
 *
 * The trade is real and worth stating: this compares silhouettes, so it is
 * strong on structural differences (serif vs sans, single vs double-storey,
 * condensed vs extended) and weaker on families that differ only in fine
 * detail. Confidence is reported accordingly.
 */

/** Glyphs chosen because they carry the most identifying structure. */
export const KEY_GLYPHS = ["a", "e", "g", "n", "o", "R", "M", "S"] as const;

export const CELL = 14;
export const GLYPH_DIMS = CELL * CELL; // 196
export const DESCRIPTOR_DIMS = KEY_GLYPHS.length * GLYPH_DIMS; // 1568

export interface GlyphMetrics {
  xHeightRatio: number;
  widthRatio: number;
  strokeWeight: number;
  strokeContrast: number;
  hasSerifs: boolean;
}

export interface Descriptor {
  vector: number[];
  metrics: GlyphMetrics;
}

// --- rasterisation -------------------------------------------------------

export interface PathCommand {
  type: "M" | "L" | "C" | "Q" | "Z";
  x?: number;
  y?: number;
  x1?: number;
  y1?: number;
  x2?: number;
  y2?: number;
}

interface Point {
  x: number;
  y: number;
}

/** Flatten curves into line segments. 12 steps is past the point of visible error at 14px. */
function flatten(commands: PathCommand[]): Point[][] {
  const contours: Point[][] = [];
  let current: Point[] = [];
  let cursor: Point = { x: 0, y: 0 };
  let start: Point = { x: 0, y: 0 };
  const STEPS = 12;

  const push = (p: Point) => current.push(p);

  for (const command of commands) {
    switch (command.type) {
      case "M":
        if (current.length > 1) contours.push(current);
        current = [];
        cursor = { x: command.x!, y: command.y! };
        start = cursor;
        push(cursor);
        break;

      case "L":
        cursor = { x: command.x!, y: command.y! };
        push(cursor);
        break;

      case "Q": {
        const from = cursor;
        for (let i = 1; i <= STEPS; i += 1) {
          const t = i / STEPS;
          const u = 1 - t;
          push({
            x: u * u * from.x + 2 * u * t * command.x1! + t * t * command.x!,
            y: u * u * from.y + 2 * u * t * command.y1! + t * t * command.y!,
          });
        }
        cursor = { x: command.x!, y: command.y! };
        break;
      }

      case "C": {
        const from = cursor;
        for (let i = 1; i <= STEPS; i += 1) {
          const t = i / STEPS;
          const u = 1 - t;
          push({
            x:
              u * u * u * from.x +
              3 * u * u * t * command.x1! +
              3 * u * t * t * command.x2! +
              t * t * t * command.x!,
            y:
              u * u * u * from.y +
              3 * u * u * t * command.y1! +
              3 * u * t * t * command.y2! +
              t * t * t * command.y!,
          });
        }
        cursor = { x: command.x!, y: command.y! };
        break;
      }

      case "Z":
        if (current.length > 1) {
          push(start);
          contours.push(current);
        }
        current = [];
        cursor = start;
        break;
    }
  }

  if (current.length > 1) contours.push(current);
  return contours;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export function contourBounds(contours: Point[][]): Bounds | null {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const contour of contours) {
    for (const point of contour) {
      if (point.x < minX) minX = point.x;
      if (point.x > maxX) maxX = point.x;
      if (point.y < minY) minY = point.y;
      if (point.y > maxY) maxY = point.y;
    }
  }

  if (!Number.isFinite(minX) || maxX <= minX || maxY <= minY) return null;
  return { minX, minY, maxX, maxY };
}

/**
 * Scanline fill with the non-zero winding rule, at 3x supersampling.
 *
 * Non-zero rather than even-odd because counters (the hole in an 'o') are wound
 * opposite to the outer contour in every real font; even-odd would fill them.
 *
 * Each glyph is normalised to its own bounding box and centred in the cell, so
 * the descriptor compares letterform proportion rather than point size.
 */
export function rasterise(commands: PathCommand[], size = CELL): number[] {
  const grid = new Array(size * size).fill(0);
  const contours = flatten(commands);
  const bounds = contourBounds(contours);
  if (!bounds) return grid;

  const width = bounds.maxX - bounds.minX;
  const height = bounds.maxY - bounds.minY;
  // Preserve aspect ratio: a condensed face must not be stretched to square.
  const scale = (size - 2) / Math.max(width, height);
  const offsetX = (size - width * scale) / 2;
  const offsetY = (size - height * scale) / 2;

  // No y flip. opentype's getPath() already returns screen-space coordinates
  // (y increasing downward, baseline at the y you pass in) — flipping again
  // rendered every indexed glyph upside down, so 'n' was stored as 'u'. The
  // index still matched itself perfectly, which is exactly why that went
  // unnoticed until a rendered sample was compared against a real screenshot.
  const toCell = (p: Point): Point => ({
    x: (p.x - bounds.minX) * scale + offsetX,
    y: (p.y - bounds.minY) * scale + offsetY,
  });

  const cells = contours.map((contour) => contour.map(toCell));
  const SS = 3;

  for (let row = 0; row < size; row += 1) {
    for (let sub = 0; sub < SS; sub += 1) {
      const y = row + (sub + 0.5) / SS;
      const crossings: { x: number; dir: number }[] = [];

      for (const contour of cells) {
        for (let i = 0; i < contour.length - 1; i += 1) {
          const a = contour[i];
          const b = contour[i + 1];
          if (a.y === b.y) continue;
          if (y < Math.min(a.y, b.y) || y >= Math.max(a.y, b.y)) continue;
          const t = (y - a.y) / (b.y - a.y);
          crossings.push({ x: a.x + t * (b.x - a.x), dir: b.y > a.y ? 1 : -1 });
        }
      }

      if (crossings.length < 2) continue;
      crossings.sort((p, q) => p.x - q.x);

      let winding = 0;
      for (let i = 0; i < crossings.length - 1; i += 1) {
        winding += crossings[i].dir;
        if (winding === 0) continue;
        const from = crossings[i].x;
        const to = crossings[i + 1].x;
        for (let col = Math.max(0, Math.floor(from)); col < Math.min(size, Math.ceil(to)); col += 1) {
          // Partial coverage at the ends of the span, full in the middle.
          const covered = Math.min(col + 1, to) - Math.max(col, from);
          if (covered > 0) grid[row * size + col] += covered / SS;
        }
      }
    }
  }

  return grid.map((v) => Math.min(1, v));
}

// --- descriptor assembly -------------------------------------------------

/** L2-normalise so cosine distance compares shape, not ink coverage. */
export function normalise(vector: number[]): number[] {
  let sum = 0;
  for (const value of vector) sum += value * value;
  const magnitude = Math.sqrt(sum);
  if (magnitude === 0) return vector;
  return vector.map((value) => value / magnitude);
}

export function toVectorLiteral(vector: number[]): string {
  return `[${vector.map((v) => v.toFixed(6)).join(",")}]`;
}

/**
 * Stroke weight and contrast from a rasterised glyph.
 *
 * Weight is the mean run length of filled pixels across the rows that have any
 * ink; contrast is the spread between the thickest and thinnest runs, which is
 * what separates a Didone from a grotesque.
 */
export function strokeStats(grid: number[], size = CELL) {
  const runs: number[] = [];

  for (let row = 0; row < size; row += 1) {
    let run = 0;
    for (let col = 0; col < size; col += 1) {
      if (grid[row * size + col] > 0.5) {
        run += 1;
      } else if (run > 0) {
        runs.push(run);
        run = 0;
      }
    }
    if (run > 0) runs.push(run);
  }

  if (runs.length === 0) return { weight: 0, contrast: 0 };

  const sorted = [...runs].sort((a, b) => a - b);
  const thin = sorted[Math.floor(sorted.length * 0.15)] || 1;
  const thick = sorted[Math.floor(sorted.length * 0.85)] || 1;

  return {
    weight: runs.reduce((a, b) => a + b, 0) / runs.length / size,
    contrast: thick / Math.max(1, thin),
  };
}

/**
 * Serif-ness comes from the catalogue, not from the pixels.
 *
 * An earlier version tried to detect it by comparing ink at the baseline with
 * ink just above it. It was wrong on nearly every family: a serif flare is a
 * sub-pixel feature at 14x14, so the ratio was dominated by the padding around
 * the glyph and reported `true` for plain grotesques.
 *
 * google/fonts already states the category, and it is authoritative. Inferring
 * something you have been told is how you end up confidently wrong.
 */
export function isSerifCategory(category: string): boolean {
  return category === "Serif";
}

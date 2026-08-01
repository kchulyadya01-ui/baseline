/**
 * Turning a screenshot into something the glyph index can be searched with.
 *
 * The hard half of image-mode identification is not the search — pgvector does
 * that in milliseconds — it is getting from "a photo of a poster" to "these are
 * the letterforms, normalised the same way the index was built".
 *
 * The pipeline, all pure JS so it runs in a serverless function:
 *
 *   1. greyscale, then Otsu's method to pick a threshold rather than guessing
 *   2. decide whether the text is dark-on-light or light-on-dark, and invert
 *      so ink is always 1
 *   3. connected components — each blob is a candidate letter
 *   4. throw out blobs that cannot be letters (too small, too thin, too large,
 *      absurd aspect ratio)
 *   5. group what is left into text lines by vertical overlap, and keep the
 *      line with the most letters — a screenshot usually contains one run of
 *      text worth identifying and a lot of furniture
 *   6. rasterise each surviving blob into the same 14x14 normalised cell the
 *      index uses
 *
 * What this does NOT do is decide WHICH letter each blob is. The index stores
 * eight specific glyphs in fixed positions, so a blob can only be compared
 * against all eight and scored on its best fit. That is the main accuracy
 * limit, and the reason results are presented as a ranked shortlist rather
 * than an answer.
 */

import { CELL } from "./glyph-descriptor";

export interface Grey {
  data: Uint8Array; // 0-255, one byte per pixel
  width: number;
  height: number;
}

export interface Blob {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  pixels: number;
}

/**
 * Otsu's method: pick the threshold that minimises variance within the two
 * resulting groups. Beats a fixed 128 on screenshots, which are rarely
 * full-contrast and often sit on a tinted background.
 */
export function otsuThreshold(grey: Grey): number {
  const histogram = new Array(256).fill(0);
  for (const value of grey.data) histogram[value] += 1;

  const total = grey.data.length;
  let sum = 0;
  for (let i = 0; i < 256; i += 1) sum += i * histogram[i];

  let sumBackground = 0;
  let weightBackground = 0;
  let best = 0;
  let threshold = 128;

  for (let t = 0; t < 256; t += 1) {
    weightBackground += histogram[t];
    if (weightBackground === 0) continue;
    const weightForeground = total - weightBackground;
    if (weightForeground === 0) break;

    sumBackground += t * histogram[t];
    const meanBackground = sumBackground / weightBackground;
    const meanForeground = (sum - sumBackground) / weightForeground;
    const variance =
      weightBackground *
      weightForeground *
      (meanBackground - meanForeground) ** 2;

    if (variance > best) {
      best = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Binarise so ink is 1.
 *
 * Which side is ink is decided by counting: text occupies far less area than
 * its background in any real screenshot, so whichever side is rarer is the ink.
 */
export function binarise(grey: Grey): Uint8Array {
  const threshold = otsuThreshold(grey);
  const mask = new Uint8Array(grey.data.length);

  let below = 0;
  for (const value of grey.data) if (value < threshold) below += 1;
  const inkIsDark = below <= grey.data.length / 2;

  for (let i = 0; i < grey.data.length; i += 1) {
    const dark = grey.data[i] < threshold;
    mask[i] = (inkIsDark ? dark : !dark) ? 1 : 0;
  }

  return mask;
}

/** Connected components, 8-connected, iterative flood fill. */
export function findBlobs(mask: Uint8Array, width: number, height: number): Blob[] {
  const seen = new Uint8Array(mask.length);
  const blobs: Blob[] = [];
  const stack: number[] = [];

  for (let start = 0; start < mask.length; start += 1) {
    if (mask[start] === 0 || seen[start]) continue;

    let minX = width;
    let minY = height;
    let maxX = 0;
    let maxY = 0;
    let pixels = 0;

    stack.length = 0;
    stack.push(start);
    seen[start] = 1;

    while (stack.length) {
      const index = stack.pop()!;
      const x = index % width;
      const y = (index - x) / width;

      pixels += 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;

      for (let dy = -1; dy <= 1; dy += 1) {
        for (let dx = -1; dx <= 1; dx += 1) {
          if (dx === 0 && dy === 0) continue;
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const neighbour = ny * width + nx;
          if (mask[neighbour] && !seen[neighbour]) {
            seen[neighbour] = 1;
            stack.push(neighbour);
          }
        }
      }
    }

    blobs.push({ minX, minY, maxX, maxY, pixels });
  }

  return blobs;
}

/** Reject blobs that cannot plausibly be a letter. */
export function plausibleLetters(blobs: Blob[], width: number, height: number): Blob[] {
  const area = width * height;

  return blobs.filter((blob) => {
    const w = blob.maxX - blob.minX + 1;
    const h = blob.maxY - blob.minY + 1;

    if (h < 8 || w < 3) return false; // too small to carry shape
    if (h > height * 0.85) return false; // a rule, a border, or the whole frame
    if (w > width * 0.6) return false;
    if (blob.pixels < 12) return false; // speckle
    if (blob.pixels > area * 0.25) return false; // a filled panel

    const aspect = w / h;
    if (aspect > 4 || aspect < 0.06) return false; // a line, not a letter

    // Density: a letter fills part of its box. A solid rectangle does not.
    const density = blob.pixels / (w * h);
    if (density > 0.95) return false;

    return true;
  });
}

/**
 * Group blobs into text lines by vertical overlap, and return the busiest line.
 *
 * A screenshot is mostly not the thing being identified — there is chrome, a
 * cursor, icons. The longest run of similarly-sized glyphs sitting on a shared
 * baseline is overwhelmingly the text someone cropped the shot for.
 */
export function dominantLine(blobs: Blob[]): Blob[] {
  if (blobs.length === 0) return [];

  const sorted = [...blobs].sort((a, b) => a.minY - b.minY);
  const lines: Blob[][] = [];

  for (const blob of sorted) {
    const height = blob.maxY - blob.minY + 1;
    const line = lines.find((candidate) => {
      const top = Math.min(...candidate.map((b) => b.minY));
      const bottom = Math.max(...candidate.map((b) => b.maxY));
      const overlap = Math.min(bottom, blob.maxY) - Math.max(top, blob.minY);
      return overlap > height * 0.4;
    });
    if (line) line.push(blob);
    else lines.push([blob]);
  }

  // Prefer the line with the most letters; break ties on the taller one, which
  // is more likely to be a heading than a caption.
  lines.sort((a, b) => {
    if (b.length !== a.length) return b.length - a.length;
    const heightOf = (line: Blob[]) =>
      Math.max(...line.map((x) => x.maxY - x.minY));
    return heightOf(b) - heightOf(a);
  });

  return lines[0].sort((a, b) => a.minX - b.minX);
}

/**
 * Rasterise a blob into the same normalised cell the index uses: fit to the
 * bounding box preserving aspect, centre, and supersample down.
 */
export function blobToCell(
  mask: Uint8Array,
  width: number,
  blob: Blob,
  size = CELL,
): number[] {
  const grid = new Array(size * size).fill(0);
  const w = blob.maxX - blob.minX + 1;
  const h = blob.maxY - blob.minY + 1;

  const scale = (size - 2) / Math.max(w, h);
  const offsetX = (size - w * scale) / 2;
  const offsetY = (size - h * scale) / 2;

  const counts = new Array(size * size).fill(0);

  for (let y = blob.minY; y <= blob.maxY; y += 1) {
    for (let x = blob.minX; x <= blob.maxX; x += 1) {
      const cellX = Math.floor((x - blob.minX) * scale + offsetX);
      const cellY = Math.floor((y - blob.minY) * scale + offsetY);
      if (cellX < 0 || cellY < 0 || cellX >= size || cellY >= size) continue;
      const index = cellY * size + cellX;
      counts[index] += 1;
      if (mask[y * width + x]) grid[index] += 1;
    }
  }

  return grid.map((filled, i) => (counts[i] ? filled / counts[i] : 0));
}

import {
  mmToPx,
  type LayoutId,
  type StationeryContent,
  type StationerySpec,
  type StationeryStyle,
} from "./stationery";

/**
 * Draw a piece of stationery onto a canvas.
 *
 * Canvas rather than SVG because the export has to be a real print file. An SVG
 * exported from the browser does not carry its webfonts, so it opens on someone
 * else's machine set in Times — which is a fun surprise at the printer. Drawing
 * to canvas with the font already loaded bakes the letterforms into pixels, and
 * the same code renders the on-screen preview and the 300 DPI export.
 *
 * Everything is positioned in millimetres and converted at the target DPI, so
 * the preview and the print file are the same drawing at different scales.
 */

export interface RenderOptions {
  spec: StationerySpec;
  layout: LayoutId;
  content: StationeryContent;
  style: StationeryStyle;
  face: "front" | "back";
  dpi: number;
  /** Draw bleed, trim and safe-area guides. Never on for an export. */
  guides: boolean;
  /** Include the bleed area. Exports need it; the preview shows trim only. */
  includeBleed: boolean;
}

export function canvasSize(spec: StationerySpec, dpi: number, includeBleed: boolean) {
  const extra = includeBleed ? spec.bleed * 2 : 0;
  return {
    width: Math.round(mmToPx(spec.width + extra, dpi)),
    height: Math.round(mmToPx(spec.height + extra, dpi)),
  };
}

/** Fonts must be loaded before drawing, or canvas silently falls back. */
export async function ensureFonts(style: StationeryStyle): Promise<void> {
  if (typeof document === "undefined" || !document.fonts) return;
  const families = [...new Set([style.displayFont, style.bodyFont])];
  await Promise.all(
    families.flatMap((family) => [
      document.fonts.load(`400 48px "${family}"`),
      document.fonts.load(`700 48px "${family}"`),
    ]),
  );
  await document.fonts.ready;
}

export function render(canvas: HTMLCanvasElement, options: RenderOptions): void {
  const { spec, style, dpi, includeBleed, guides } = options;
  const size = canvasSize(spec, dpi, includeBleed);

  canvas.width = size.width;
  canvas.height = size.height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const px = (mm: number) => mmToPx(mm, dpi);
  // Origin at the trim corner, so every layout works in trim coordinates and
  // does not have to know whether bleed is being drawn.
  const ox = includeBleed ? px(spec.bleed) : 0;
  const oy = includeBleed ? px(spec.bleed) : 0;

  ctx.fillStyle = style.surface;
  ctx.fillRect(0, 0, size.width, size.height);

  ctx.save();
  ctx.translate(ox, oy);
  drawLayout(ctx, options, px);
  ctx.restore();

  if (guides) drawGuides(ctx, options, px, size, ox, oy);
}

// --- layouts -------------------------------------------------------------

type Px = (mm: number) => number;

function drawLayout(
  ctx: CanvasRenderingContext2D,
  options: RenderOptions,
  px: Px,
): void {
  const { spec, layout, face } = options;
  const w = px(spec.width);
  const h = px(spec.height);

  // The back of a two-sided piece is the quiet side: a block of colour and the
  // company, so the front can stay uncluttered.
  if (face === "back") {
    drawBack(ctx, options, px, w, h);
    return;
  }

  switch (layout) {
    case "centred":
      drawCentred(ctx, options, px, w, h);
      break;
    case "sidebar":
      drawSidebar(ctx, options, px, w, h);
      break;
    case "minimal":
      drawMinimal(ctx, options, px, w, h);
      break;
    case "banner":
      drawBanner(ctx, options, px, w, h);
      break;
    default:
      drawClassic(ctx, options, px, w, h);
  }
}

/** Type sizes scale with the piece: a letterhead is not a big business card. */
function scaleFor(spec: StationerySpec): number {
  const area = spec.width * spec.height;
  if (area > 40000) return 2.2; // A4
  if (area > 15000) return 1.5; // slip, envelope, postcard
  return 1;
}

function setFont(
  ctx: CanvasRenderingContext2D,
  family: string,
  sizeMm: number,
  px: Px,
  weight = 400,
) {
  ctx.font = `${weight} ${px(sizeMm)}px "${family}", sans-serif`;
}

function drawClassic(
  ctx: CanvasRenderingContext2D,
  { spec, content, style }: RenderOptions,
  px: Px,
  w: number,
  h: number,
) {
  const s = scaleFor(spec);
  const m = px(spec.safe + 2);

  ctx.textBaseline = "alphabetic";
  ctx.fillStyle = style.ink;
  setFont(ctx, style.displayFont, 4.6 * s, px, 700);
  ctx.fillText(content.name, m, m + px(4.6 * s));

  ctx.fillStyle = style.accent;
  setFont(ctx, style.bodyFont, 2.5 * s, px, 500);
  ctx.fillText(content.role.toUpperCase(), m, m + px(9.2 * s));

  // Rule sits on the baseline grid rather than floating.
  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(1, px(0.25));
  ctx.beginPath();
  ctx.moveTo(m, m + px(12 * s));
  ctx.lineTo(m + px(14 * s), m + px(12 * s));
  ctx.stroke();

  ctx.fillStyle = style.muted;
  setFont(ctx, style.bodyFont, 2.3 * s, px);
  const details = [content.email, content.phone, content.website].filter(Boolean);
  details.forEach((line, i) => {
    ctx.fillText(line, m, h - m - px(3.4 * s * (details.length - 1 - i)));
  });

  ctx.fillStyle = style.ink;
  setFont(ctx, style.bodyFont, 2.4 * s, px, 600);
  ctx.textAlign = "right";
  ctx.fillText(content.company, w - m, m + px(4.6 * s));
  ctx.textAlign = "left";
}

function drawCentred(
  ctx: CanvasRenderingContext2D,
  { spec, content, style }: RenderOptions,
  px: Px,
  w: number,
  h: number,
) {
  const s = scaleFor(spec);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = style.ink;
  setFont(ctx, style.displayFont, 5.2 * s, px, 700);
  ctx.fillText(content.name, w / 2, h / 2 - px(4 * s));

  ctx.fillStyle = style.accent;
  setFont(ctx, style.bodyFont, 2.4 * s, px, 500);
  ctx.fillText(content.role.toUpperCase(), w / 2, h / 2 + px(1.5 * s));

  ctx.strokeStyle = style.accent;
  ctx.lineWidth = Math.max(1, px(0.2));
  ctx.beginPath();
  ctx.moveTo(w / 2 - px(8 * s), h / 2 + px(5 * s));
  ctx.lineTo(w / 2 + px(8 * s), h / 2 + px(5 * s));
  ctx.stroke();

  ctx.fillStyle = style.muted;
  setFont(ctx, style.bodyFont, 2.2 * s, px);
  ctx.fillText(
    [content.email, content.phone].filter(Boolean).join("   ·   "),
    w / 2,
    h / 2 + px(10 * s),
  );

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawSidebar(
  ctx: CanvasRenderingContext2D,
  { spec, content, style }: RenderOptions,
  px: Px,
  w: number,
  h: number,
) {
  const s = scaleFor(spec);
  const bar = px(spec.width * 0.16);

  // The bar runs past the trim so it survives the cut — that is what bleed is.
  ctx.fillStyle = style.accent;
  ctx.fillRect(-px(spec.bleed), -px(spec.bleed), bar + px(spec.bleed), h + px(spec.bleed * 2));

  const m = bar + px(spec.safe + 2);

  ctx.fillStyle = style.ink;
  setFont(ctx, style.displayFont, 4.4 * s, px, 700);
  ctx.fillText(content.name, m, px(spec.safe + 2) + px(4.4 * s));

  ctx.fillStyle = style.muted;
  setFont(ctx, style.bodyFont, 2.4 * s, px, 500);
  ctx.fillText(content.role, m, px(spec.safe + 2) + px(8.6 * s));

  setFont(ctx, style.bodyFont, 2.2 * s, px);
  const details = [content.email, content.phone, content.website].filter(Boolean);
  details.forEach((line, i) => {
    ctx.fillText(line, m, h - px(spec.safe + 2) - px(3.2 * s * (details.length - 1 - i)));
  });
}

function drawMinimal(
  ctx: CanvasRenderingContext2D,
  { spec, content, style }: RenderOptions,
  px: Px,
  w: number,
  h: number,
) {
  const s = scaleFor(spec);
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = style.ink;
  setFont(ctx, style.displayFont, 6 * s, px, 400);
  ctx.fillText(content.name, w / 2, h / 2);

  ctx.fillStyle = style.muted;
  setFont(ctx, style.bodyFont, 2.1 * s, px);
  ctx.fillText(content.website, w / 2, h - px(spec.safe + 3));

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

function drawBanner(
  ctx: CanvasRenderingContext2D,
  { spec, content, style }: RenderOptions,
  px: Px,
  w: number,
  h: number,
) {
  const s = scaleFor(spec);
  const band = h * 0.42;

  ctx.fillStyle = style.accent;
  ctx.fillRect(-px(spec.bleed), -px(spec.bleed), w + px(spec.bleed * 2), band + px(spec.bleed));

  const m = px(spec.safe + 2);

  ctx.fillStyle = style.surface;
  setFont(ctx, style.displayFont, 4.6 * s, px, 700);
  ctx.fillText(content.company, m, band / 2 + px(1.6 * s));

  ctx.fillStyle = style.ink;
  setFont(ctx, style.displayFont, 4 * s, px, 700);
  ctx.fillText(content.name, m, band + px(7 * s));

  ctx.fillStyle = style.muted;
  setFont(ctx, style.bodyFont, 2.2 * s, px);
  ctx.fillText(content.role, m, band + px(11 * s));

  const details = [content.email, content.phone].filter(Boolean);
  details.forEach((line, i) => {
    ctx.fillText(line, m, h - m - px(3.2 * s * (details.length - 1 - i)));
  });
}

function drawBack(
  ctx: CanvasRenderingContext2D,
  { spec, content, style }: RenderOptions,
  px: Px,
  w: number,
  h: number,
) {
  const s = scaleFor(spec);

  ctx.fillStyle = style.accent;
  ctx.fillRect(-px(spec.bleed), -px(spec.bleed), w + px(spec.bleed * 2), h + px(spec.bleed * 2));

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  ctx.fillStyle = style.surface;
  setFont(ctx, style.displayFont, 5 * s, px, 700);
  ctx.fillText(content.company, w / 2, h / 2 - px(2 * s));

  setFont(ctx, style.bodyFont, 2.1 * s, px);
  ctx.globalAlpha = 0.75;
  ctx.fillText(content.address, w / 2, h / 2 + px(4 * s));
  ctx.globalAlpha = 1;

  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
}

// --- guides --------------------------------------------------------------

function drawGuides(
  ctx: CanvasRenderingContext2D,
  { spec }: RenderOptions,
  px: Px,
  size: { width: number; height: number },
  ox: number,
  oy: number,
): void {
  const w = px(spec.width);
  const h = px(spec.height);

  ctx.save();
  ctx.lineWidth = Math.max(1, px(0.2));

  // Bleed edge — only meaningful when the bleed is actually drawn.
  if (ox > 0) {
    ctx.strokeStyle = "rgba(220, 38, 38, 0.55)";
    ctx.setLineDash([px(1.5), px(1.5)]);
    ctx.strokeRect(0.5, 0.5, size.width - 1, size.height - 1);
  }

  // Trim — where the guillotine lands.
  ctx.strokeStyle = "rgba(37, 99, 235, 0.8)";
  ctx.setLineDash([]);
  ctx.strokeRect(ox + 0.5, oy + 0.5, w - 1, h - 1);

  // Safe area — keep type inside this.
  ctx.strokeStyle = "rgba(22, 163, 74, 0.7)";
  ctx.setLineDash([px(1), px(1)]);
  ctx.strokeRect(ox + px(spec.safe), oy + px(spec.safe), w - px(spec.safe * 2), h - px(spec.safe * 2));

  ctx.restore();
}

/** PNG blob at the given DPI, guides off and bleed included. */
export async function exportPng(options: RenderOptions): Promise<Blob | null> {
  const canvas = document.createElement("canvas");
  await ensureFonts(options.style);
  render(canvas, { ...options, guides: false, includeBleed: true });
  return new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
}

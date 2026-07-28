import "server-only";

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import * as cheerio from "cheerio";

/**
 * URL-mode font identification.
 *
 * Deterministic: read the page's own CSS and report what it declares. No model,
 * no guessing. Three sources, in descending order of certainty:
 *
 *   1. A Google Fonts stylesheet URL — names the family outright.
 *   2. An @font-face rule — the page self-hosts and tells us the family name.
 *   3. A font-family declaration — tells us what is asked for, though the
 *      browser may have fallen back to something else.
 *
 * The TRD specifies Playwright for computed styles. That needs a browser binary
 * and doesn't fit a serverless function, so Phase 1 ships the static read; the
 * headless path can be added later as a queued worker without changing this
 * module's contract.
 */

const FETCH_TIMEOUT_MS = 6000;
const MAX_HTML_BYTES = 2_000_000;
const MAX_CSS_BYTES = 1_000_000;
const MAX_STYLESHEETS = 8;

const UA =
  "Mozilla/5.0 (compatible; BaselineFontID/1.0; +https://github.com/kchulyadya01-ui/baseline)";

export type Evidence = "google-fonts" | "font-face" | "declaration";

export interface Detection {
  family: string;
  confidence: number;
  evidence: Evidence[];
  /** Selectors or URLs that produced the match, for "show your working". */
  seenIn: string[];
  /** Weights the page actually requests, when we can tell. */
  weights: number[];
}

export interface IdentifyResult {
  url: string;
  finalUrl: string;
  title: string | null;
  detections: Detection[];
  stylesheetsRead: number;
  stylesheetsSkipped: number;
  durationMs: number;
}

export class IdentifyError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

// --- SSRF guard ----------------------------------------------------------

const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "localhost.localdomain",
  "metadata.google.internal",
]);

function isPrivateAddress(ip: string): boolean {
  if (isIP(ip) === 4) {
    const [a, b] = ip.split(".").map(Number);
    if (a === 10 || a === 127 || a === 0) return true;
    if (a === 169 && b === 254) return true; // link-local, incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true;
    if (a === 192 && b === 168) return true;
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
    return false;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("fc") || lower.startsWith("fd")) return true; // unique local
  if (lower.startsWith("fe80")) return true; // link-local
  if (lower.startsWith("::ffff:")) return isPrivateAddress(lower.slice(7));
  return false;
}

/**
 * The endpoint takes a URL from anyone on the internet, so it must not be
 * usable as a proxy into private networks or cloud metadata endpoints.
 */
async function assertPublicUrl(raw: string): Promise<URL> {
  const input = raw.trim();

  // Reject file:, data:, gopher: and friends before any normalising happens.
  const scheme = input.match(/^([a-z][a-z0-9+.-]*):/i)?.[1]?.toLowerCase();
  if (scheme && scheme !== "http" && scheme !== "https") {
    throw new IdentifyError("Only http and https URLs can be read.", 400);
  }

  let url: URL;
  try {
    url = new URL(scheme ? input : `https://${input}`);
  } catch {
    throw new IdentifyError("That is not a valid URL.", 400);
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new IdentifyError("Only http and https URLs can be read.", 400);
  }
  if (!url.hostname) {
    throw new IdentifyError("That is not a valid URL.", 400);
  }
  if (BLOCKED_HOSTNAMES.has(url.hostname.toLowerCase())) {
    throw new IdentifyError("That host cannot be read.", 400);
  }
  if (url.hostname.endsWith(".internal") || url.hostname.endsWith(".local")) {
    throw new IdentifyError("That host cannot be read.", 400);
  }

  if (isIP(url.hostname)) {
    if (isPrivateAddress(url.hostname)) {
      throw new IdentifyError("Private addresses cannot be read.", 400);
    }
    return url;
  }

  try {
    const records = await lookup(url.hostname, { all: true });
    if (records.some((r) => isPrivateAddress(r.address))) {
      throw new IdentifyError("That host resolves to a private address.", 400);
    }
  } catch (error) {
    if (error instanceof IdentifyError) throw error;
    throw new IdentifyError("Could not resolve that host.", 400);
  }

  return url;
}

// --- fetching ------------------------------------------------------------

async function fetchText(url: string, limit: number): Promise<string> {
  const response = await fetch(url, {
    headers: { "User-Agent": UA, Accept: "*/*" },
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new IdentifyError(
      `The page returned ${response.status}.`,
      response.status === 404 ? 404 : 502,
    );
  }

  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > limit) throw new IdentifyError("That page is too large to read.", 413);

  const text = await response.text();
  return text.slice(0, limit);
}

// --- extraction ----------------------------------------------------------

const GENERIC = new Set([
  "inherit",
  "initial",
  "unset",
  "revert",
  "serif",
  "sans-serif",
  "monospace",
  "cursive",
  "fantasy",
  "system-ui",
  "ui-sans-serif",
  "ui-serif",
  "ui-monospace",
  "ui-rounded",
  "-apple-system",
  "blinkmacsystemfont",
  "segoe ui",
  "roboto ui",
  "emoji",
  "math",
  "fangsong",
]);

function cleanFamily(raw: string): string | null {
  const name = raw
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, " ");
  if (!name) return null;
  if (name.startsWith("var(") || name.startsWith("--")) return null;
  if (GENERIC.has(name.toLowerCase())) return null;
  if (name.length > 64) return null
  // Reject anything that isn't plausibly a family name.
  if (!/^[\w\p{L}][\w\p{L}\s'&.+-]*$/u.test(name)) return null;
  return name;
}

/** Families named in a Google Fonts stylesheet URL, with requested weights. */
function familiesFromGoogleUrl(href: string): { family: string; weights: number[] }[] {
  let url: URL;
  try {
    url = new URL(href, "https://fonts.googleapis.com");
  } catch {
    return [];
  }
  if (!/fonts\.googleapis\.com$/.test(url.hostname)) return [];

  const out: { family: string; weights: number[] }[] = [];

  // css2: ?family=Inter:wght@400;700&family=Lora:ital,wght@0,400
  for (const value of url.searchParams.getAll("family")) {
    const [rawFamily, spec = ""] = value.split(":");
    const family = cleanFamily(rawFamily.replace(/\+/g, " "));
    if (!family) continue;
    const weights = [
      ...new Set(
        [...spec.matchAll(/(?:^|[,;@])(\d{3})(?=[;,]|$)/g)].map((m) =>
          Number(m[1]),
        ),
      ),
    ];
    out.push({ family, weights });
  }

  // css (v1): ?family=Open+Sans:400,700|Lora:400
  if (out.length === 0) {
    for (const group of (url.searchParams.get("family") ?? "").split("|")) {
      const [rawFamily, spec = ""] = group.split(":");
      const family = cleanFamily(rawFamily.replace(/\+/g, " "));
      if (!family) continue;
      const weights = [
        ...new Set([...spec.matchAll(/\d{3}/g)].map((m) => Number(m[0]))),
      ];
      out.push({ family, weights });
    }
  }

  return out;
}

interface Hit {
  family: string;
  evidence: Evidence;
  source: string;
  weights?: number[];
  /** Declarations on html/body/:root describe the page's actual body text. */
  primary?: boolean;
}

function hitsFromCss(css: string, source: string): Hit[] {
  const hits: Hit[] = [];

  // @font-face blocks: the page self-hosts this family.
  for (const block of css.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
    const declaration = block[1];
    const match = declaration.match(/font-family\s*:\s*([^;}]+)/i);
    if (!match) continue;
    const family = cleanFamily(match[1]);
    if (family) hits.push({ family, evidence: "font-face", source });
  }

  // font-family / font shorthand declarations, with the selector they sit under.
  for (const match of css.matchAll(
    /([^{}]{0,200}?)\{[^}]*?font-family\s*:\s*([^;}]+)/gi,
  )) {
    const selector = match[1].split("}").pop()?.trim() ?? "";
    const stack = match[2];
    const first = stack.split(",")[0];
    const family = cleanFamily(first);
    if (!family) continue;
    const primary = /(^|[\s,>])(html|body|:root|\*)([\s,{:]|$)/i.test(selector);
    hits.push({
      family,
      evidence: "declaration",
      source: selector ? selector.slice(0, 80) : source,
      primary,
    });
  }

  return hits;
}

function resolveHref(href: string, base: URL): string | null {
  try {
    const url = new URL(href, base);
    return url.protocol === "http:" || url.protocol === "https:" ? url.href : null;
  } catch {
    return null;
  }
}

export async function identifyFromUrl(input: string): Promise<IdentifyResult> {
  const started = Date.now();
  const url = await assertPublicUrl(input);

  const html = await fetchText(url.href, MAX_HTML_BYTES);
  const $ = cheerio.load(html);
  const base = new URL(url.href);

  const hits: Hit[] = [];

  // 1. Google Fonts links — the strongest signal available.
  const stylesheetUrls: string[] = [];
  $('link[rel~="stylesheet"], link[as="style"]').each((_, element) => {
    const href = $(element).attr("href");
    if (!href) return;
    const resolved = resolveHref(href, base);
    if (!resolved) return;

    const googleFamilies = familiesFromGoogleUrl(resolved);
    if (googleFamilies.length) {
      for (const entry of googleFamilies) {
        hits.push({
          family: entry.family,
          evidence: "google-fonts",
          source: "Google Fonts stylesheet",
          weights: entry.weights,
        });
      }
      return;
    }
    stylesheetUrls.push(resolved);
  });

  // Some sites inline the Google Fonts import instead of linking it.
  for (const style of $("style").toArray()) {
    const css = $(style).html() ?? "";
    for (const match of css.matchAll(/@import\s+url\(\s*["']?([^"')]+)/gi)) {
      const resolved = resolveHref(match[1], base);
      if (!resolved) continue;
      const googleFamilies = familiesFromGoogleUrl(resolved);
      if (googleFamilies.length) {
        for (const entry of googleFamilies) {
          hits.push({
            family: entry.family,
            evidence: "google-fonts",
            source: "@import of Google Fonts",
            weights: entry.weights,
          });
        }
      } else {
        stylesheetUrls.push(resolved);
      }
    }
    hits.push(...hitsFromCss(css, "inline <style>"));
  }

  // 2. Inline style attributes.
  $("[style]").each((_, element) => {
    const style = $(element).attr("style") ?? "";
    const match = style.match(/font-family\s*:\s*([^;]+)/i);
    if (!match) return;
    const family = cleanFamily(match[1].split(",")[0]);
    if (family) {
      hits.push({
        family,
        evidence: "declaration",
        source: `inline style on <${(element as { tagName?: string }).tagName ?? "element"}>`,
      });
    }
  });

  // 3. External stylesheets, capped — one slow CDN shouldn't blow the budget.
  const unique = [...new Set(stylesheetUrls)];
  const toRead = unique.slice(0, MAX_STYLESHEETS);
  const results = await Promise.allSettled(
    toRead.map(async (href) => ({
      href,
      css: await fetchText(href, MAX_CSS_BYTES),
    })),
  );

  let read = 0;
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    read += 1;
    const label = new URL(result.value.href).pathname.split("/").pop() ?? "stylesheet";
    hits.push(...hitsFromCss(result.value.css, label));
  }

  return {
    url: input,
    finalUrl: url.href,
    title: $("title").first().text().trim() || null,
    detections: rank(hits),
    stylesheetsRead: read,
    stylesheetsSkipped: unique.length - read,
    durationMs: Date.now() - started,
  };
}

/**
 * Confidence is evidence-led, not frequency-led: one @font-face rule beats
 * fifty utility-class declarations, because the former is proof the font ships
 * with the page.
 */
function rank(hits: Hit[]): Detection[] {
  const grouped = new Map<string, Hit[]>();
  for (const hit of hits) {
    const key = hit.family.toLowerCase();
    const bucket = grouped.get(key);
    if (bucket) bucket.push(hit);
    else grouped.set(key, [hit]);
  }

  const detections: Detection[] = [];

  for (const bucket of grouped.values()) {
    const evidence = [...new Set(bucket.map((h) => h.evidence))];
    const primary = bucket.some((h) => h.primary);
    const occurrences = bucket.length;

    let confidence = 0.35;
    if (evidence.includes("google-fonts")) confidence = 0.95;
    else if (evidence.includes("font-face")) confidence = 0.88;
    else if (primary) confidence = 0.7;
    else confidence = Math.min(0.62, 0.35 + occurrences * 0.04);

    if (evidence.length > 1) confidence = Math.min(0.97, confidence + 0.03);

    detections.push({
      family: bucket[0].family,
      confidence: Number(confidence.toFixed(2)),
      evidence,
      seenIn: [...new Set(bucket.map((h) => h.source))].slice(0, 4),
      weights: [...new Set(bucket.flatMap((h) => h.weights ?? []))].sort(
        (a, b) => a - b,
      ),
    });
  }

  return detections
    .sort((a, b) => b.confidence - a.confidence || a.family.localeCompare(b.family))
    .slice(0, 12);
}

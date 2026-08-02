import "server-only";

/**
 * Gemini client.
 *
 * THE RULE THIS FILE EXISTS TO ENFORCE: Gemini suggests, the catalogue decides.
 *
 * A language model will happily name a typeface that does not exist, or assert
 * that a commercial face is open-licence. Both would be worse than useless in a
 * tool whose entire premise is that its licence claims can be trusted. So every
 * caller here resolves whatever comes back against `src/data/fonts.json` and
 * drops anything that fails to resolve. Nothing invented ever reaches a user,
 * and no licence is ever sourced from the model.
 *
 * Structured output is requested via responseSchema rather than parsed out of
 * prose, so a malformed answer fails loudly instead of half-parsing.
 *
 * Plain fetch rather than an SDK: one HTTP call, no dependency to keep in step
 * with a fast-moving API surface.
 */

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

/**
 * Flash-lite rather than Pro throughout. Every task here is grounded — naming a
 * typeface from a picture, turning a phrase into filters — and the glyph index
 * independently verifies anything that matters, so latency is worth more than
 * deliberation. Measured on vision: ~3s here against ~12s for full Flash.
 *
 * An ALIAS, not a pinned version. `gemini-2.5-flash` was hardcoded first and
 * returned 404 "no longer available to new users" on a freshly issued key —
 * a pinned model is a time bomb. Override with GEMINI_MODEL if a specific
 * version is ever needed.
 */
const TEXT_MODEL = process.env.GEMINI_MODEL ?? "gemini-flash-lite-latest";

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

export class GeminiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "GeminiError";
  }
}

export interface InlineImage {
  mimeType: string;
  /** base64, no data: prefix */
  data: string;
}

interface GenerateOptions {
  prompt: string;
  image?: InlineImage;
  /** JSON Schema subset Gemini accepts. Forces parseable output. */
  schema: Record<string, unknown>;
  /** Low by default: these are extraction tasks, not creative ones. */
  temperature?: number;
  timeoutMs?: number;
}

/**
 * One structured call. Returns parsed JSON matching `schema`, or throws.
 */
export async function generateStructured<T>({
  prompt,
  image,
  schema,
  temperature = 0.2,
  timeoutMs = 20000,
}: GenerateOptions): Promise<T> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) {
    throw new GeminiError("Gemini is not configured on this deployment.", 503);
  }

  const parts: Record<string, unknown>[] = [{ text: prompt }];
  if (image) {
    parts.push({ inlineData: { mimeType: image.mimeType, data: image.data } });
  }

  let response: Response;
  try {
    response = await fetch(`${ENDPOINT}/${TEXT_MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts }],
        generationConfig: {
          temperature,
          responseMimeType: "application/json",
          responseSchema: schema,
        },
        // These tasks involve user-supplied images and free text. Keep the
        // default safety behaviour rather than loosening it.
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new GeminiError("The AI request timed out.", 504);
    }
    throw new GeminiError("Could not reach the AI service.", 502);
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    if (response.status === 429) {
      throw new GeminiError("AI rate limit reached. Try again shortly.", 429);
    }
    if (response.status === 400 && body.includes("API_KEY")) {
      throw new GeminiError("The Gemini API key is invalid.", 500);
    }
    throw new GeminiError(
      `The AI service returned ${response.status}.`,
      response.status >= 500 ? 502 : 400,
    );
  }

  const payload = (await response.json()) as {
    candidates?: {
      content?: { parts?: { text?: string }[] };
      finishReason?: string;
    }[];
  };

  const candidate = payload.candidates?.[0];
  if (!candidate) {
    throw new GeminiError("The AI returned nothing usable.", 502);
  }
  if (candidate.finishReason === "SAFETY") {
    throw new GeminiError(
      "That input was declined by the AI safety filters.",
      422,
    );
  }

  const text = candidate.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new GeminiError("The AI returned an empty response.", 502);
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    // responseSchema should make this impossible; if it happens, fail rather
    // than hand a caller something half-parsed.
    throw new GeminiError("The AI returned malformed output.", 502);
  }
}

/** Schema helpers — Gemini accepts a subset of JSON Schema with SCREAMING types. */
export const S = {
  string: (description?: string) => ({ type: "STRING", ...(description ? { description } : {}) }),
  number: (description?: string) => ({ type: "NUMBER", ...(description ? { description } : {}) }),
  boolean: (description?: string) => ({ type: "BOOLEAN", ...(description ? { description } : {}) }),
  enum: (values: string[], description?: string) => ({
    type: "STRING",
    enum: values,
    ...(description ? { description } : {}),
  }),
  array: (items: Record<string, unknown>, description?: string) => ({
    type: "ARRAY",
    items,
    ...(description ? { description } : {}),
  }),
  object: (
    properties: Record<string, unknown>,
    required: string[],
    description?: string,
  ) => ({
    type: "OBJECT",
    properties,
    required,
    ...(description ? { description } : {}),
  }),
};

"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { Input, Label } from "@/components/ui/primitives";
import { createProject, updateProject } from "@/lib/actions";
import { cn } from "@/lib/utils";

interface UploadedImage {
  url: string;
  blobPath: string;
  alt: string;
  width: number;
  height: number;
  bytes: number;
}

interface FontEntry {
  family: string;
  fontSlug: string;
  role: string;
}

interface CreditEntry {
  handle: string;
  role: string;
}

export interface ProjectFormInitial {
  id: string;
  title: string;
  description: string;
  sourceUrl: string;
  sourceCredit: string;
  tags: string[];
  fonts: FontEntry[];
  colours: string[];
  credits: CreditEntry[];
  images: UploadedImage[];
}

const MAX_IMAGES = 10;
const MAX_BYTES = 8 * 1024 * 1024;
const ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";

/** Read intrinsic dimensions before upload so the card can reserve space. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file could not be read as an image."));
    };
    img.src = url;
  });
}

export function ProjectForm({
  fontSuggestions,
  initial,
}: {
  fontSuggestions: { slug: string; family: string }[];
  /** Present when editing an existing project. */
  initial?: ProjectFormInitial;
}) {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);
  const isEdit = Boolean(initial);

  const [images, setImages] = useState<UploadedImage[]>(initial?.images ?? []);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));
  const [fonts, setFonts] = useState<FontEntry[]>(initial?.fonts ?? []);
  const [colours, setColours] = useState<string[]>(initial?.colours ?? []);
  const [credits, setCredits] = useState<CreditEntry[]>(initial?.credits ?? []);
  const [isOwnWork, setIsOwnWork] = useState(
    initial ? !(initial.sourceUrl || initial.sourceCredit) : true,
  );
  const [sourceUrl, setSourceUrl] = useState(initial?.sourceUrl ?? "");
  const [sourceCredit, setSourceCredit] = useState(initial?.sourceCredit ?? "");

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setUploadError(null);

    const room = MAX_IMAGES - images.length;
    if (room <= 0) {
      setUploadError(`${MAX_IMAGES} images maximum.`);
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > MAX_BYTES) {
          setUploadError(`${file.name} is over 8 MB.`);
          continue;
        }

        const { width, height } = await readDimensions(file);
        // Uploads go browser -> Blob directly; the route only issues the token.
        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: file.type,
        });

        setImages((prev) => [
          ...prev,
          {
            url: blob.url,
            blobPath: blob.pathname,
            alt: "",
            width,
            height,
            bytes: file.size,
          },
        ]);
      }
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "Upload failed. Try again.",
      );
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit() {
    setErrors({});
    setFormError(null);

    start(async () => {
      const payload = {
        title,
        description,
        sourceUrl: isOwnWork ? "" : sourceUrl,
        sourceCredit: isOwnWork ? "" : sourceCredit,
        tags: tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean)
          .slice(0, 8),
        fonts: fonts.filter((f) => f.family.trim()),
        colours,
        credits: credits.filter((c) => c.handle.trim()),
        images: images.map((image) => ({
          url: image.url,
          blobPath: image.blobPath,
          alt: image.alt,
          width: image.width,
          height: image.height,
          bytes: image.bytes,
        })),
      };

      const result = initial
        ? await updateProject(initial.id, payload)
        : await createProject(payload);

      if (!result.ok) {
        if (result.errors) setErrors(result.errors);
        if (result.error) setFormError(result.error);
        return;
      }

      const { slug } = result.data as { slug: string };
      router.push(`/community/${slug}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[1fr_20rem]">
      <div className="min-w-0 space-y-8">
        <section>
          <h2 className="label-mono mb-3">Images</h2>

          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFiles(e.dataTransfer.files);
            }}
            className={cn(
              "rounded-card border-2 border-dashed p-8 text-center transition-colors",
              uploading ? "border-accent bg-accent-soft" : "border-line-strong",
            )}
          >
            <p className="text-sm text-fg-muted">
              {uploading ? "Uploading…" : "Drop images here, or"}
            </p>
            <button
              type="button"
              onClick={() => fileInput.current?.click()}
              disabled={uploading || images.length >= MAX_IMAGES}
              className="mt-2 h-9 rounded-control border border-line-strong bg-bg-raised px-4 text-sm text-fg hover:bg-bg-sunken disabled:opacity-50"
            >
              Choose files
            </button>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT}
              multiple
              onChange={(e) => handleFiles(e.target.files)}
              className="sr-only"
            />
            <p className="mt-3 text-2xs text-fg-subtle">
              JPEG, PNG, WebP, AVIF or GIF · up to 8 MB each · {images.length}/
              {MAX_IMAGES} used
            </p>
          </div>

          {uploadError ? (
            <p className="mt-2 text-xs text-danger">{uploadError}</p>
          ) : null}
          {errors.images ? (
            <p className="mt-2 text-xs text-danger">{errors.images}</p>
          ) : null}

          {images.length ? (
            <ul className="mt-4 space-y-3">
              {images.map((image, index) => (
                <li
                  key={image.blobPath}
                  className="flex gap-3 rounded-card border border-line bg-bg-raised p-3"
                >
                  <img
                    src={image.url}
                    alt=""
                    className="h-20 w-20 shrink-0 rounded object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <Label htmlFor={`alt-${index}`}>
                      Alt text — what is in the image
                    </Label>
                    <Input
                      id={`alt-${index}`}
                      value={image.alt}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((img, i) =>
                            i === index ? { ...img, alt: e.target.value } : img,
                          ),
                        )
                      }
                      maxLength={200}
                      placeholder="Poster for a jazz festival, black type on ochre"
                      className="mt-1 h-8 text-xs"
                    />
                    <p className="mt-1 text-2xs text-fg-subtle">
                      {image.width}×{image.height} ·{" "}
                      {Math.round(image.bytes / 1024)} KB
                    </p>
                  </div>
                  <div className="flex flex-col gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => {
                          if (index === 0) return prev;
                          const next = [...prev];
                          [next[index - 1], next[index]] = [next[index], next[index - 1]];
                          return next;
                        })
                      }
                      disabled={index === 0}
                      aria-label="Move up"
                      className="h-6 w-6 rounded text-xs text-fg-subtle hover:text-fg disabled:opacity-30"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setImages((prev) => prev.filter((_, i) => i !== index))
                      }
                      aria-label="Remove image"
                      className="h-6 w-6 rounded text-xs text-fg-subtle hover:text-danger"
                    >
                      ×
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section className="space-y-4">
          <h2 className="label-mono">About the work</h2>

          <div>
            <Label htmlFor="title">Title</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              required
              placeholder="Identity for a jazz festival"
              className="mt-1"
            />
            {errors.title ? (
              <p className="mt-1 text-xs text-danger">{errors.title}</p>
            ) : null}
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={2000}
              rows={5}
              placeholder="What was the brief, and what did you decide?"
              className="mt-1 w-full rounded-control border border-line-strong bg-bg-raised px-3 py-2 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-2xs text-fg-subtle">
              {description.length}/2000
            </p>
          </div>

          <div>
            <Label htmlFor="tags">Tags</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="branding, editorial, poster"
              className="mt-1"
            />
            <p className="mt-1 text-2xs text-fg-subtle">
              Comma separated, up to eight.
            </p>
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="label-mono">Whose work is this?</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setIsOwnWork(true)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                isOwnWork
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong text-fg-muted",
              )}
            >
              Mine
            </button>
            <button
              type="button"
              onClick={() => setIsOwnWork(false)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs",
                !isOwnWork
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line-strong text-fg-muted",
              )}
            >
              Someone else&rsquo;s — I&rsquo;m sharing it
            </button>
          </div>

          {!isOwnWork ? (
            <div className="space-y-3 rounded-card border border-line bg-bg-sunken p-4">
              <p className="text-xs text-fg-muted">
                Sharing other people&rsquo;s work is fine here, as long as it is
                credited and links back. Posting it as your own is not.
              </p>
              <div>
                <Label htmlFor="sourceCredit">Who made it</Label>
                <Input
                  id="sourceCredit"
                  value={sourceCredit}
                  onChange={(e) => setSourceCredit(e.target.value)}
                  maxLength={200}
                  placeholder="Studio Dumbar"
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sourceUrl">Link to the original</Label>
                <Input
                  id="sourceUrl"
                  value={sourceUrl}
                  onChange={(e) => setSourceUrl(e.target.value)}
                  maxLength={500}
                  placeholder="https://…"
                  className="mt-1"
                />
                {errors.sourceUrl ? (
                  <p className="mt-1 text-xs text-danger">{errors.sourceUrl}</p>
                ) : null}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      <aside className="space-y-6 lg:sticky lg:top-32 lg:self-start">
        <section className="rounded-card border border-line bg-bg-raised p-5">
          <h2 className="label-mono mb-3">Fonts used</h2>
          <p className="mb-3 text-2xs text-fg-subtle">
            This is what makes a post useful to another designer — and it links
            back to the specimen page.
          </p>

          {fonts.map((font, index) => (
            <div key={index} className="mb-2 flex gap-1.5">
              <input
                list="font-suggestions"
                value={font.family}
                onChange={(e) => {
                  const family = e.target.value;
                  const match = fontSuggestions.find(
                    (f) => f.family.toLowerCase() === family.toLowerCase(),
                  );
                  setFonts((prev) =>
                    prev.map((f, i) =>
                      i === index
                        ? { ...f, family, fontSlug: match?.slug ?? "" }
                        : f,
                    ),
                  );
                }}
                placeholder="Family name"
                className="h-8 min-w-0 flex-1 rounded-control border border-line-strong bg-bg px-2 text-xs"
              />
              <select
                value={font.role}
                onChange={(e) =>
                  setFonts((prev) =>
                    prev.map((f, i) =>
                      i === index ? { ...f, role: e.target.value } : f,
                    ),
                  )
                }
                className="h-8 w-20 rounded-control border border-line-strong bg-bg px-1 text-xs"
              >
                <option value="">role</option>
                <option value="display">display</option>
                <option value="heading">heading</option>
                <option value="body">body</option>
                <option value="mono">mono</option>
              </select>
              <button
                type="button"
                onClick={() => setFonts((prev) => prev.filter((_, i) => i !== index))}
                aria-label="Remove font"
                className="px-1 text-fg-subtle hover:text-danger"
              >
                ×
              </button>
            </div>
          ))}

          <datalist id="font-suggestions">
            {fontSuggestions.map((font) => (
              <option key={font.slug} value={font.family} />
            ))}
          </datalist>

          {fonts.length < 8 ? (
            <button
              type="button"
              onClick={() =>
                setFonts((prev) => [...prev, { family: "", fontSlug: "", role: "" }])
              }
              className="mt-1 w-full rounded-control border border-dashed border-line-strong py-1.5 text-xs text-fg-muted hover:text-fg"
            >
              + Add font
            </button>
          ) : null}
        </section>

        <section className="rounded-card border border-line bg-bg-raised p-5">
          <h2 className="label-mono mb-3">Tag people</h2>
          <p className="mb-3 text-2xs text-fg-subtle">
            Collaborators, the client, whoever shot it. They are linked on the
            post and it appears on their profile.
          </p>

          {credits.map((credit, index) => (
            <div key={index} className="mb-2">
              <div className="flex gap-1.5">
                <div className="relative min-w-0 flex-1">
                  <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 font-mono text-2xs text-fg-subtle">
                    @
                  </span>
                  <input
                    value={credit.handle}
                    onChange={(e) =>
                      setCredits((prev) =>
                        prev.map((c, i) =>
                          i === index
                            ? { ...c, handle: e.target.value.replace(/^@/, "").toLowerCase() }
                            : c,
                        ),
                      )
                    }
                    placeholder="handle"
                    autoCapitalize="none"
                    spellCheck={false}
                    className="h-8 w-full rounded-control border border-line-strong bg-bg pl-5 pr-2 font-mono text-xs"
                  />
                </div>
                <input
                  value={credit.role}
                  onChange={(e) =>
                    setCredits((prev) =>
                      prev.map((c, i) =>
                        i === index ? { ...c, role: e.target.value } : c,
                      ),
                    )
                  }
                  placeholder="role"
                  maxLength={60}
                  className="h-8 w-24 rounded-control border border-line-strong bg-bg px-2 text-xs"
                />
                <button
                  type="button"
                  onClick={() => setCredits((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remove person"
                  className="px-1 text-fg-subtle hover:text-danger"
                >
                  ×
                </button>
              </div>
            </div>
          ))}

          {credits.length < 12 ? (
            <button
              type="button"
              onClick={() => setCredits((prev) => [...prev, { handle: "", role: "" }])}
              className="mt-1 w-full rounded-control border border-dashed border-line-strong py-1.5 text-xs text-fg-muted hover:text-fg"
            >
              + Tag someone
            </button>
          ) : null}

          <p className="mt-2 text-2xs text-fg-subtle">
            Handles that do not match an account are ignored.
          </p>
        </section>

        <section className="rounded-card border border-line bg-bg-raised p-5">
          <h2 className="label-mono mb-3">Palette</h2>
          <div className="flex flex-wrap gap-1.5">
            {colours.map((hex, index) => (
              <span key={index} className="relative">
                <input
                  type="color"
                  value={hex}
                  onChange={(e) =>
                    setColours((prev) =>
                      prev.map((c, i) => (i === index ? e.target.value : c)),
                    )
                  }
                  aria-label={`Colour ${index + 1}`}
                  className="h-9 w-9 rounded-md"
                />
                <button
                  type="button"
                  onClick={() => setColours((prev) => prev.filter((_, i) => i !== index))}
                  aria-label="Remove colour"
                  className="absolute -right-1 -top-1 h-4 w-4 rounded-full border border-line bg-bg-raised text-[9px] leading-none text-fg-subtle hover:text-danger"
                >
                  ×
                </button>
              </span>
            ))}
            {colours.length < 12 ? (
              <button
                type="button"
                onClick={() => setColours((prev) => [...prev, "#3d5afe"])}
                className="h-9 w-9 rounded-md border border-dashed border-line-strong text-fg-muted hover:text-fg"
                aria-label="Add colour"
              >
                +
              </button>
            ) : null}
          </div>
        </section>

        <div>
          {formError ? (
            <p className="mb-2 text-xs text-danger">{formError}</p>
          ) : null}
          <button
            type="button"
            onClick={submit}
            disabled={pending || uploading || images.length === 0 || title.trim().length < 3}
            className="h-11 w-full rounded-control bg-accent text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {pending
              ? isEdit
                ? "Saving…"
                : "Posting…"
              : isEdit
                ? "Save changes"
                : "Post project"}
          </button>
          <p className="mt-2 text-2xs text-fg-subtle">
            Needs at least one image and a title.
          </p>
        </div>
      </aside>
    </div>
  );
}

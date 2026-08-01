"use client";

import { upload } from "@vercel/blob/client";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { sendMessage, type OutgoingAttachment } from "@/lib/actions";
import { formatBytes } from "@/lib/font-url";

const MAX_ATTACHMENTS = 10;
const MAX_BYTES = 25 * 1024 * 1024;

const IMAGE_ACCEPT = "image/jpeg,image/png,image/webp,image/avif,image/gif";
const FILE_ACCEPT =
  ".pdf,.zip,.ai,.eps,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.rtf,.txt,.csv,.md,.otf,.ttf,.woff,.woff2";

function isImage(file: File) {
  return file.type.startsWith("image/");
}

/** Intrinsic size, so the bubble can reserve space before the image loads. */
function readDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 0, height: 0 });
    };
    img.src = url;
  });
}

export function MessageComposer({ conversationId }: { conversationId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const photoInput = useRef<HTMLInputElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [attachments, setAttachments] = useState<OutgoingAttachment[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);

    const room = MAX_ATTACHMENTS - attachments.length;
    if (room <= 0) {
      setError(`${MAX_ATTACHMENTS} attachments maximum.`);
      return;
    }

    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, room)) {
        if (file.size > MAX_BYTES) {
          setError(`${file.name} is over 25 MB.`);
          continue;
        }

        const image = isImage(file);
        const dimensions = image
          ? await readDimensions(file)
          : { width: 0, height: 0 };

        const blob = await upload(file.name, file, {
          access: "public",
          handleUploadUrl: "/api/upload",
          contentType: file.type || "application/octet-stream",
          clientPayload: JSON.stringify({ scope: "message" }),
        });

        setAttachments((prev) => [
          ...prev,
          {
            kind: image ? "IMAGE" : "FILE",
            url: blob.url,
            blobPath: blob.pathname,
            name: file.name,
            mimeType: file.type || "application/octet-stream",
            bytes: file.size,
            width: image ? dimensions.width : null,
            height: image ? dimensions.height : null,
          },
        ]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (photoInput.current) photoInput.current.value = "";
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  function submit(formData: FormData) {
    setError(null);
    start(async () => {
      const result = await sendMessage(conversationId, formData, attachments);
      if (!result.ok) {
        setError(result.errors?.body ?? result.error ?? "Could not send that.");
        return;
      }
      formRef.current?.reset();
      setAttachments([]);
      router.refresh();
    });
  }

  return (
    <form ref={formRef} action={submit} className="sticky bottom-0 bg-bg pb-8 pt-2">
      {error ? <p className="mb-2 text-xs text-danger">{error}</p> : null}

      {attachments.length ? (
        <ul className="mb-2 flex flex-wrap gap-2">
          {attachments.map((attachment, index) => (
            <li
              key={attachment.blobPath}
              className="relative flex items-center gap-2 rounded-control border border-line bg-bg-raised p-1.5 pr-7"
            >
              {attachment.kind === "IMAGE" ? (
                <img
                  src={attachment.url}
                  alt=""
                  className="h-10 w-10 rounded object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="flex h-10 w-10 items-center justify-center rounded bg-bg-inset text-xs text-fg-muted"
                >
                  ▤
                </span>
              )}
              <span className="max-w-[10rem]">
                <span className="block truncate text-2xs text-fg">
                  {attachment.name}
                </span>
                <span className="block text-2xs text-fg-subtle">
                  {formatBytes(attachment.bytes)}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  setAttachments((prev) => prev.filter((_, i) => i !== index))
                }
                aria-label={`Remove ${attachment.name}`}
                className="absolute right-1 top-1 text-xs text-fg-subtle hover:text-danger"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {uploading ? (
        <p className="mb-2 text-2xs text-fg-subtle">Uploading…</p>
      ) : null}

      <div className="flex items-end gap-2">
        <div className="flex gap-1">
          <button
            type="button"
            onClick={() => photoInput.current?.click()}
            disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach photos"
            title="Attach photos"
            className="flex h-11 w-10 items-center justify-center rounded-control border border-line-strong text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
          >
            <span aria-hidden>◨</span>
          </button>
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={uploading || attachments.length >= MAX_ATTACHMENTS}
            aria-label="Attach a file"
            title="Attach a file"
            className="flex h-11 w-10 items-center justify-center rounded-control border border-line-strong text-fg-muted transition-colors hover:text-fg disabled:opacity-50"
          >
            <span aria-hidden>⊕</span>
          </button>
        </div>

        <input
          ref={photoInput}
          type="file"
          accept={IMAGE_ACCEPT}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />
        <input
          ref={fileInput}
          type="file"
          accept={FILE_ACCEPT}
          multiple
          onChange={(e) => handleFiles(e.target.files)}
          className="sr-only"
        />

        <textarea
          name="body"
          rows={1}
          maxLength={4000}
          placeholder="Write a message…"
          onKeyDown={(e) => {
            // Enter sends, Shift+Enter breaks the line.
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              formRef.current?.requestSubmit();
            }
          }}
          className="max-h-40 min-h-[2.75rem] flex-1 resize-y rounded-control border border-line-strong bg-bg-raised px-3 py-2.5 text-sm text-fg placeholder:text-fg-subtle focus:border-accent focus:outline-none"
        />

        <button
          type="submit"
          disabled={pending || uploading}
          className="h-11 shrink-0 rounded-control bg-accent px-4 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </div>
    </form>
  );
}

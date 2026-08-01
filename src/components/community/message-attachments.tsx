import { formatBytes } from "@/lib/font-url";
import { cn } from "@/lib/utils";

export interface AttachmentView {
  id: string;
  kind: "IMAGE" | "FILE";
  url: string;
  name: string;
  mimeType: string;
  bytes: number;
  width: number | null;
  height: number | null;
}

/**
 * Attachments inside a message bubble.
 *
 * Images render inline; anything else is a download row. Blob URLs are served
 * straight from the CDN rather than through next/image, same as project images
 * — the optimiser would put attacker-supplied bytes through sharp.
 */
export function MessageAttachments({
  attachments,
  mine,
}: {
  attachments: AttachmentView[];
  mine: boolean;
}) {
  if (attachments.length === 0) return null;

  const images = attachments.filter((a) => a.kind === "IMAGE");
  const files = attachments.filter((a) => a.kind === "FILE");

  return (
    <div className="space-y-2">
      {images.length ? (
        <div
          className={cn(
            "grid gap-1.5",
            images.length === 1 ? "grid-cols-1" : "grid-cols-2",
          )}
        >
          {images.map((image) => (
            <a
              key={image.id}
              href={image.url}
              target="_blank"
              rel="noreferrer"
              className="block overflow-hidden rounded-lg"
            >
              <img
                src={image.url}
                alt={image.name}
                width={image.width ?? undefined}
                height={image.height ?? undefined}
                loading="lazy"
                decoding="async"
                className="max-h-72 w-full object-cover"
                style={
                  images.length === 1 && image.width && image.height
                    ? { aspectRatio: image.width / image.height }
                    : { aspectRatio: 1 }
                }
              />
            </a>
          ))}
        </div>
      ) : null}

      {files.map((file) => (
        <a
          key={file.id}
          href={file.url}
          target="_blank"
          rel="noreferrer"
          download={file.name}
          className={cn(
            "flex items-center gap-2.5 rounded-lg px-2.5 py-2 transition-opacity hover:opacity-80",
            mine ? "bg-black/15" : "bg-bg-sunken",
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded text-xs",
              mine ? "bg-black/15" : "bg-bg-inset text-fg-muted",
            )}
          >
            ▤
          </span>
          <span className="min-w-0">
            <span className="block truncate text-xs font-medium">{file.name}</span>
            <span
              className={cn(
                "block text-[10px]",
                mine ? "opacity-70" : "text-fg-subtle",
              )}
            >
              {formatBytes(file.bytes)}
            </span>
          </span>
        </a>
      ))}
    </div>
  );
}

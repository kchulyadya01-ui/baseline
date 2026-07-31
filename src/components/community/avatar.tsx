import { cn } from "@/lib/utils";

const SIZES = { sm: "h-7 w-7 text-2xs", md: "h-10 w-10 text-sm", lg: "h-20 w-20 text-xl" };

export function Avatar({
  name,
  handle,
  image,
  size = "md",
  className,
}: {
  name?: string | null;
  handle?: string | null;
  image?: string | null;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  const label = name ?? handle ?? "?";
  const initial = label.trim().charAt(0).toUpperCase() || "?";

  if (image) {
    return (
      <img
        src={image}
        alt=""
        width={80}
        height={80}
        loading="lazy"
        decoding="async"
        className={cn(
          "shrink-0 rounded-full border border-line object-cover",
          SIZES[size],
          className,
        )}
      />
    );
  }

  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full border border-line bg-bg-inset font-medium text-fg-muted",
        SIZES[size],
        className,
      )}
    >
      {initial}
    </span>
  );
}

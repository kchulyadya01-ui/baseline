import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "rounded-card border border-line bg-bg-raised",
        className,
      )}
      {...props}
    />
  );
}

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & {
  tone?: "neutral" | "accent" | "success" | "warning" | "danger";
}) {
  const tones = {
    neutral: "bg-bg-inset text-fg-muted",
    accent: "bg-accent-soft text-accent",
    success: "bg-success-soft text-success",
    warning: "bg-warning-soft text-warning",
    danger: "bg-danger-soft text-danger",
  } as const;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-2xs font-medium",
        tones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function Label({ className, ...props }: ComponentProps<"label">) {
  return <label className={cn("label-mono block", className)} {...props} />;
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return (
    <input
      className={cn(
        "h-10 w-full rounded-control border border-line-strong bg-bg-raised px-3",
        "text-sm text-fg placeholder:text-fg-subtle",
        "focus:border-accent focus:outline-none focus-visible:outline-none",
        className,
      )}
      {...props}
    />
  );
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select
      className={cn(
        "h-10 w-full appearance-none rounded-control border border-line-strong bg-bg-raised",
        "px-3 pr-8 text-sm text-fg focus:border-accent focus:outline-none",
        "bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 12 12%22 fill=%22none%22 stroke=%22%23888%22 stroke-width=%221.4%22><path d=%22M3 4.5 6 7.5 9 4.5%22/></svg>')] bg-[length:12px_12px] bg-[right_0.65rem_center] bg-no-repeat",
        className,
      )}
      {...props}
    >
      {children}
    </select>
  );
}

export function SectionHeading({
  index,
  title,
  children,
}: {
  index: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <div className="flex items-baseline gap-3">
        <span className="label-mono">{index}</span>
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          {title}
        </h2>
      </div>
      {children ? (
        <p className="mt-3 max-w-2xl text-sm text-fg-muted">{children}</p>
      ) : null}
    </div>
  );
}

export function Stat({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="label-mono">{label}</div>
      <div className="mt-1 text-sm text-fg">{value}</div>
    </div>
  );
}

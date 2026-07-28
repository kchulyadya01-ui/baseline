export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("en-GB", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function pluralise(count: number, singular: string, plural?: string) {
  return `${count.toLocaleString("en-GB")} ${count === 1 ? singular : (plural ?? `${singular}s`)}`;
}

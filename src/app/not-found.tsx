import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-[40rem] flex-col items-start px-5 py-32">
      <span className="label-mono">404</span>
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-tight">
        Nothing set on this line
      </h1>
      <p className="mt-4 text-base text-fg-muted">
        This page does not exist and, as far as we can tell, never did. If you
        came looking for a font, the library has all 1,934 of them.
      </p>
      <div className="mt-7 flex gap-3">
        <ButtonLink href="/fonts">Browse fonts</ButtonLink>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </div>
  );
}

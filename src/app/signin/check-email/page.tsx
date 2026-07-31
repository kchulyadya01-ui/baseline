import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Check your email",
  robots: { index: false, follow: false },
};

export default function CheckEmailPage() {
  return (
    <div className="mx-auto max-w-[26rem] px-5 py-28">
      <span className="label-mono">Almost there</span>
      <h1 className="mt-3 font-display text-2xl font-semibold tracking-tight">
        Check your email
      </h1>
      <p className="mt-4 text-sm leading-relaxed text-fg-muted">
        We sent you a sign-in link. It works once and expires in 24 hours. If it
        has not arrived in a minute, look in spam — a new sending domain often
        lands there the first time.
      </p>
    </div>
  );
}

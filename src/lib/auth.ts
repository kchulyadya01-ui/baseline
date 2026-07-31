import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth, { type DefaultSession } from "next-auth";
import Google from "next-auth/providers/google";
import Resend from "next-auth/providers/resend";
import { redirect } from "next/navigation";
import { db } from "./db";

/**
 * Auth.js v5.
 *
 * Database sessions rather than JWT: a suspended account has to lose access
 * immediately, and a JWT that is valid for another 30 days cannot be revoked.
 *
 * Providers are registered only when their credentials exist, so a deployment
 * without Google or Resend keys still builds and runs — it just offers fewer
 * ways in.
 */

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      handle: string | null;
      suspended: boolean;
    } & DefaultSession["user"];
  }
}

const providers = [];

if (process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET) {
  providers.push(
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      allowDangerousEmailAccountLinking: true,
    }),
  );
}

if (process.env.AUTH_RESEND_KEY) {
  providers.push(
    Resend({
      apiKey: process.env.AUTH_RESEND_KEY,
      from: process.env.AUTH_EMAIL_FROM ?? "Baseline <onboarding@resend.dev>",
      name: "Email",
    }),
  );
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(db),
  session: { strategy: "database" },
  providers,
  pages: {
    signIn: "/signin",
    verifyRequest: "/signin/check-email",
    error: "/signin",
  },
  callbacks: {
    async session({ session, user }) {
      // The adapter hands back the raw row; expose only what the UI needs.
      const record = await db.user.findUnique({
        where: { id: user.id },
        select: { handle: true, suspendedAt: true },
      });
      session.user.id = user.id;
      session.user.handle = record?.handle ?? null;
      session.user.suspended = Boolean(record?.suspendedAt);
      return session;
    },
  },
});

export function authProviderStatus() {
  return {
    google: Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET),
    email: Boolean(process.env.AUTH_RESEND_KEY),
    any: providers.length > 0,
  };
}

export interface CurrentUser {
  id: string;
  handle: string;
  name: string | null;
  image: string | null;
}

/**
 * The gate every write goes through.
 *
 * Three states are refused, each for a different reason:
 *   - not signed in  -> /signin
 *   - no handle yet  -> /welcome  (Auth.js created the row before they chose one)
 *   - suspended      -> /suspended
 *
 * Read paths use `auth()` directly; anything that writes calls this.
 */
export async function requireOnboarded(returnTo?: string): Promise<CurrentUser> {
  const session = await auth();

  if (!session?.user?.id) {
    redirect(returnTo ? `/signin?next=${encodeURIComponent(returnTo)}` : "/signin");
  }
  if (session.user.suspended) {
    redirect("/suspended");
  }
  if (!session.user.handle) {
    redirect(
      returnTo ? `/welcome?next=${encodeURIComponent(returnTo)}` : "/welcome",
    );
  }

  return {
    id: session.user.id,
    handle: session.user.handle,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };
}

/** Same checks, but returns null instead of redirecting. For API routes. */
export async function getOnboardedUser(): Promise<CurrentUser | null> {
  const session = await auth();
  if (!session?.user?.id || !session.user.handle || session.user.suspended) {
    return null;
  }
  return {
    id: session.user.id,
    handle: session.user.handle,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };
}

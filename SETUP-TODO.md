# Open setup items

Things the deployment needs that are not done yet. Deliberately a file in the
repo rather than a note somewhere, so it is visible next to the work.

## 1. Create the Vercel Blob store — blocks posting

`/api/upload` returns **503** in production. Nobody can post a project, which
is the point of the community section. Everything else works.

Fix: <https://vercel.com/kchulyadya01-uis-projects/~/stores> → Create → Blob →
name it `baseline-uploads`. The integration sets `BLOB_READ_WRITE_TOKEN`
automatically. Redeploy after.

## 2. Verify a Resend domain — blocks other people signing in

*(Deferred 2026-08-01 — do this later.)*

The Resend account has no verified domain, so magic links only deliver to
`k.chulyadya01@gmail.com`. Every other address is rejected by Resend, not by
the app: sign-in appears to work and the email silently never arrives.

Fix: <https://resend.com/domains> → add a domain → set the DNS records → then
change `AUTH_EMAIL_FROM` from `onboarding@resend.dev` to an address on it.

Google OAuth would sidestep this entirely — it needs no verified domain. Set
`AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET` with redirect URIs:

```
https://baseline-wheat.vercel.app/api/auth/callback/google
http://localhost:3000/api/auth/callback/google
```

## 3. Gemini key is in chat history

`GEMINI_API_KEY` was shared in plaintext during setup. Rotate at
<https://aistudio.google.com/apikey> and update it on Vercel.

Three AI surfaces have working API routes but no UI yet:
`/api/ai/brief`, `/api/ai/search`, `/api/ai/project`.

## 4. Rotate the Resend API key

It was shared in plaintext during setup. Replace it at
<https://resend.com/api-keys> and update `AUTH_RESEND_KEY` on Vercel.

---

Done: Neon Postgres provisioned and migrated (38 tables) · `AUTH_SECRET`,
`AUTH_URL`, `AUTH_EMAIL_FROM`, `AUTH_RESEND_KEY` set · community live at
<https://baseline-wheat.vercel.app/community>.

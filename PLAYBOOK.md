# YouTube Viral Analyzer — PLAYBOOK

Last updated: 2026-08-11

## What this is

A password-protected Next.js app at **yt.huntermason.com** that turns a video transcript
into publish-ready YouTube metadata: 10 title options, an SEO description, tags, a
timeline, and three thumbnail concepts. Each concept has a **Generate Thumbnail** button
that produces a finished 1280x720 image on a CDN URL.

Three channels, each with its own palette and voice: **TechTony**, **HunterMason**,
**Cheri's Closet** (Courtney's). Channel config lives in `lib/channels.ts` — that file is
the single source of truth for colors, tone, title patterns and overlay text colors. Do
not hardcode per-channel behavior anywhere else.

- Repo: `lokiverde/youtube-viral-analyzer-app`, branch `main`
- Vercel project: `anthony-selfs-projects/youtube-viral-analyzer-app`
- Source: `N8N to App/apps/youtube-viral-analyzer-app/`

## The machines

Thumbnail generation spans three places. Know which one broke before you start fixing.

| Step | Where it runs | Cost |
|---|---|---|
| Prompt crafting | OpenAI `gpt-4o` from the Vercel function | pennies |
| Image generation | **Tim** (DGX Spark, local FLUX) via the `media_jobs` queue | free |
| Resize, text overlay, headshot | Vercel function (`sharp`) | free |
| Storage | Bunny CDN, `hmnewsletter` zone, `yva/` prefix | free |

**Vercel cannot reach Tim directly** — Tim is on the tailnet. The function INSERTs a row
into the Supabase `media_jobs` table (project `hmnewsletter`, ref `wbvvtevikeghtprbestj`),
the tim-queue worker on Tim polls it, renders, uploads to Bunny, and writes back
`result_url`. The function polls for that URL. Outbound-only in both directions: nothing
reaches into the tailnet, and Tim never accepts an inbound connection. See
`Agentic Workflows/faceless-video/PLAYBOOK.md` and the Infrastructure playbook for Tim.

## NEVER

- **Never ask the image model to render the headline text.** See Gotchas. The background
  is generated text-free and the type is composited afterwards. Any prompt change that
  reintroduces words, letters, numbers or signage into the FLUX prompt breaks the output.
- **Never use `dall-e-3`.** The OpenAI account does not have it and never did. It returns
  `"The model 'dall-e-3' does not exist"`. If a paid image fallback is ever wanted, the
  account does have `gpt-image-1`.
- Never commit `.env.local`. It holds the Supabase service-role key and the Bunny key.
- Never point this app at a Bunny zone without testing an actual PUT first. A wrong key
  fails silently into the fallback path and you get an image that looks fine but is
  missing the resize, the headline and the headshot.

## ALWAYS

- Verify thumbnail changes by **generating one and looking at it**, not by reading the
  code. Text rendering, framing and branding are all visual failures that typecheck fine.
- Verify against **production**, not just the dev server, when the change touches the font
  or anything read from disk. `outputFileTracingIncludes` in `next.config.ts` is what puts
  `assets/Anton-Regular.ttf` into the serverless bundle; if that is wrong it works locally
  and fails only once deployed.
- Keep overlay colors in `lib/channels.ts` (`textFill` / `textOutline`), one entry per
  channel.

## How to do common jobs

**Generate a thumbnail from the CLI** (useful for testing without the UI): POST to
`/api/auth` with `APP_PASSWORD` to get the `yva_session` cookie, then POST to
`/api/generate-thumbnail` with `{concept, text_overlay, emotion, channel}`. Expect 16-31s.

**Change the headline font**: drop the TTF in `assets/`, update `FONT_FILE` in
`lib/thumbnail-text.ts`. Keep the OFL/license file beside it. Nothing else needs to change
— glyphs are converted to SVG paths, so no font has to be installed on the host.

**Change where thumbnails are stored**: `BUNNY_*` env vars on Vercel. Test the key with a
real PUT before deploying; Bunny storage passwords are **per zone**.

**Deploy**: `npx vercel deploy --prod` from the app directory. `vercel --prod` alone is
rejected by this CLI version.

## Gotchas

1. **FLUX garbles text past two words. Measured, not guessed.** Across six generations:
   2-word overlays rendered perfectly every time ("Rent Revolution", "Melted Money");
   3-word overlays failed every time ("Rent Control Lie" came back "Rent Contro Lie" plus
   a stray "LIE!"). Symbols like `&` come out duplicated even inside a short string.
   **Fix, already in place:** FLUX generates a text-free background with the upper-left
   third left visually quiet, and `lib/thumbnail-text.ts` burns the headline in with
   opentype.js. Overlay length is no longer a constraint.
2. **FLUX insets the scene** inside a flat grey margin unless the prompt explicitly demands
   a full-bleed, edge-to-edge frame. The instruction is in `buildFluxPrompt` and in the
   crafter system prompt. Do not remove it.
3. **The `media_jobs` tag column is `requested_by`, not `app`.** Wrong column returns
   PGRST204 and the insert 400s, which surfaces as "Could not reach the image queue".
4. **The `yva-thumbnails` Bunny key in Vercel is dead** — 401 on all nine Bunny regions.
   The app writes to the `hmnewsletter` zone under `yva/` instead. To move back, get the
   `yva-thumbnails` zone password from the Bunny dashboard; the Fresh Start key will not
   open it because Bunny passwords are per zone.
5. **`vercel env pull` writes values verbatim, including a stray trailing tab** that was
   in `BUNNY_STORAGE_ZONE`. The route calls `.trim()` on every Bunny var for this reason.
6. **Local dev only:** `APP_PASSWORD` contains `$`, and Next expands `$…` in `.env.local`.
   Escape it as `\$` or login fails locally with correct credentials. Vercel sets env vars
   directly, so production is unaffected.
7. **Preview-environment vars are not set.** Vercel CLI 54.12.1 has a broken
   non-interactive path for `env add … preview`. Production and development are correct.
   Upgrading the CLI should fix it.

## Escalate to Tony

- Anything that would put thumbnail generation back on a paid API.
- The Bunny zone question (stay on `hmnewsletter`, or get the `yva-thumbnails` password).
- Changing the uppercase treatment on headlines, or moving to templated layouts
  (Bannerbear) rather than a plain composited headline.

## Current state

**Live and working as of 2026-08-11.** Thumbnails cost nothing per image. Verified in
production with a five-word headline and a correct ampersand.

Open, non-blocking:
- Dead `yva-thumbnails` Bunny key (see Gotchas 4).
- Preview env vars unset (Gotcha 7).
- Headshot compositing exists but has not been exercised since the FLUX switch.

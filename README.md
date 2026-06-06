# PropShorts

PropShorts is an AI-powered real estate broker assistant. It helps a broker turn a client requirement into a polished property recommendation package with matched listings, a shareable PDF report, and a short narrated vertical video.

The MVP is broker-first. Client-facing access can be added later, but the current product focuses on broker authentication, package creation, generated assets, and sharing.

![PropShorts architecture](docs/architecture.svg)

## What It Does

- Captures client requirements from text, URL, or voice input.
- Uses Supabase Auth for secure broker access.
- Refines requirements and searches for public property matches through server-side functions.
- Stores recommendations, internal traces, generated PDFs, videos, and package records in Supabase.
- Generates a designed PDF report with property details, comparison table, broker profile, and next-step call-to-action.
- Creates a vertical PropShort video using a Node render worker, Sharp, FFmpeg, property images, and optional Cartesia voiceover.
- Exposes broker dashboard, PDF list, PropShort list, package detail, and public share routes.

## Stack

- **Frontend:** Next.js App Router, React, TypeScript, TailwindCSS
- **Auth / Database / Storage:** Supabase Auth, PostgreSQL, RLS, Storage
- **Backend workflow:** Supabase Edge Functions
- **PDF generation:** React-style layout logic built with `pdf-lib`
- **Video rendering:** Node render worker with Sharp and FFmpeg
- **Voiceover:** Cartesia TTS from the render worker
- **Payments:** Stripe checkout and webhook functions
- **Frontend deployment:** Netlify
- **Video worker deployment:** Render

## Product Flow

1. Broker signs in.
2. Broker enters a client requirement from text, voice, or URL.
3. Supabase Edge Functions parse, transcribe, and refine the requirement.
4. The search workflow creates property recommendations and broker-only trace data.
5. The PDF function generates a shareable report and uploads it to Supabase Storage.
6. The video function creates a `generated_videos` row and queues the Render worker.
7. The Render worker renders a vertical MP4 and uploads it to Supabase Storage.
8. The package is finalized and shown in the dashboard, package screen, PDF screen, PropShort screen, and public share route.

## Important Routes

- `/login`, `/signup`, `/forgot-password`, `/reset-password`
- `/dashboard`
- `/new-propshort`
- `/create/select`, `/create/write`, `/create/talk`, `/create/confirm`, `/create/processing/[runId]`
- `/packages/[packageId]`
- `/pdfs`, `/pdfs/[pdfId]`
- `/propshorts`, `/propshorts/[propshortId]`
- `/share/[shareSlug]`
- `/account`, `/tips`, `/plan`

## Supabase Functions

The main function folders live in `supabase/functions`:

- `submit-client-requirement`
- `parse-client-requirement`
- `transcribe-requirement-audio`
- `start-recommendation-run`
- `run-property-search`
- `generate-pdf-report`
- `generate-property-video`
- `rerender-property-video`
- `finalize-package`
- `create-checkout-session`
- `stripe-webhook`

Shared workflow and PDF/video orchestration helpers live in:

```text
supabase/functions/_shared/propshorts-pipeline.ts
```

## Data Model

Core tables include:

- `profiles`
- `client_requirements`
- `recommendation_runs`
- `property_recommendations`
- `property_internal_traces`
- `generated_pdfs`
- `generated_videos`
- `recommendation_packages`

Generated files are stored in Supabase Storage buckets such as:

- `requirement-audio`
- `generated-pdfs`
- `generated-videos`
- `property-images`

## Video Rendering

Supabase Edge Functions create the video record and enqueue the worker. The actual MP4 render is done outside Supabase because media rendering needs Node, image processing, and FFmpeg.

The worker lives at:

```text
src/render-worker/server.mjs
```

The worker:

- Loads the video row and package input from Supabase.
- Fetches property images.
- Builds vertical slide images with Sharp.
- Generates optional Cartesia narration.
- Stitches slides and audio into an MP4 with FFmpeg.
- Uploads the final MP4 to the `generated-videos` bucket.
- Marks the video row as `completed` or `failed`.

Render free instances are often not enough for reliable media rendering. A paid Render plan, Railway, Fly.io, Google Cloud Run, or Remotion Lambda is recommended for production-quality video generation.

## Local Development

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run dev
```

Run the render worker locally:

```bash
npm run render-worker
```

Run checks:

```bash
npm run lint
npm run typecheck
npm run build
```

On this Windows setup, the global `npm`/`npx` shim may be broken. Use the NVM-managed executable when needed:

```powershell
C:\nvm4w\nodejs\npm.cmd run lint
C:\nvm4w\nodejs\npm.cmd run typecheck
```

## Environment Variables

Frontend:

```text
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Supabase Edge Functions:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
OPENAI_API_KEY=
REMOTION_RENDER_WEBHOOK_URL=
REMOTION_RENDER_SECRET=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
```

Render worker:

```text
SUPABASE_URL=
SUPABASE_ANON_KEY=
SUPABASE_VIDEO_BUCKET=generated-videos
RENDER_WORKER_SECRET=
CARTESIA_API_KEY=
CARTESIA_VOICE_ID=
REMOTION_RENDER_TIMEOUT_MS=
REMOTION_IMAGE_FETCH_TIMEOUT_MS=
REMOTION_IMAGES_PER_PROPERTY=
```

Do not expose provider secrets in frontend code. Store secrets in Supabase secrets, Netlify environment variables, or Render environment variables.

## Deployment

Frontend deployment is configured for Netlify:

```text
netlify.toml
```

Render worker deployment is configured in:

```text
render.yaml
```

Supabase function deployment is handled with the Supabase CLI or Supabase Management API.

## Development Rules

- Keep AI/API provider calls server-side only.
- Keep broker data private with Supabase RLS.
- Store generated assets in Supabase Storage.
- Keep PDF/video output client-safe; broker-only trace data must never appear in public output.
- Add loading, empty, success, and error states for user-facing screens.
- Keep the UI consistent with the PropShorts visual system: white surfaces, restrained grey panels, Poppins-style typography, clean spacing, and minimal ornament.

## Current Notes

- The app currently creates one combined PropShort package video per run.
- The video worker can render without narration if Cartesia is unavailable.
- Video rendering reliability depends heavily on worker resources.
- Existing generated PDFs/videos do not automatically change after template updates; regenerate or rerender assets to see new templates.

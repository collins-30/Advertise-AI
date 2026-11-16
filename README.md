# CloseLoop — AI Marketing Assistant

Internal, single-workspace marketing assistant for CloseLoop: brand-aware content
generation, mandatory human approval, scheduled publishing to Instagram and
LinkedIn through official APIs, analytics, and the "First 30" agency validation
workspace.

> **Status: Phase 3 (content management) complete.**
> The dashboard has an editable Brand Brain, an assumption-based agency-owner
> persona and four content pillars. It generates LinkedIn and Instagram drafts,
> checks them against verified/proposed/forbidden claims, and saves them into a
> content library with versioning, human approval, media management and a
> timezone-aware calendar. Scheduling records intent only — publishing and
> analytics are **not** implemented yet; those routes remain explicitly labelled
> placeholders and contain no mocked data.

---

## Stack

| Layer | Choice |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack, Cache Components) |
| Language | TypeScript, strict |
| UI | Tailwind CSS v4, shadcn/ui (Base UI primitives), lucide icons |
| Data & auth | Supabase (Postgres, Auth, RLS, Storage) |
| Validation | Zod |
| Tests | Vitest |
| Deployment | Vercel Pro (commercial use) |

Planned for later phases: Meta Graph API (Instagram), LinkedIn API, Inngest
(scheduled jobs), PostHog (product analytics).

---

## Quick start

```bash
npm install
cp .env.example .env.local   # Windows: copy .env.example .env.local
# fill in the Supabase values
npm run dev
```

Open <http://localhost:3000>. If Supabase is not configured, the app renders a
setup screen instead of crashing. A full checklist is available at `/setup`.

### 1. Create a Supabase project

Use the free plan. From **Project Settings → API**, copy:

- Project URL → `NEXT_PUBLIC_SUPABASE_URL`
- `anon` / publishable key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` key → `SUPABASE_SERVICE_ROLE_KEY` (server only)

### 2. Apply the migrations

Run these files **in order** in the Supabase SQL Editor:

1. `supabase/migrations/20261113000000_initial_schema.sql`
2. `supabase/migrations/20261113000100_storage.sql`
3. `supabase/migrations/20261115000000_phase2_brand_brain.sql` 

Or, with the Supabase CLI:

```bash
supabase link --project-ref <project-ref>
supabase db push
```

The migration creates all tables, indexes, triggers, RLS policies, the public
`post-media` storage bucket, and one default workspace (`closeloop`). The Phase 2
migration adds the claim fields, generation fields and an editable starter brand
profile, persona and pillars. It only inserts when those records are missing, so
re-running it never overwrites edits.

### 3. Configure auth

In **Authentication → Providers**, enable Email.

In **Authentication → URL Configuration** set:

```
Site URL:        http://localhost:3000
Redirect URLs:   http://localhost:3000/auth/callback
                 http://localhost:3000/auth/confirm
```

Add your production domain equivalents before deploying.

### 4. Restrict access

Set `ALLOWED_EMAILS` to a comma-separated allowlist, and disable public
sign-ups in Supabase. The first account to sign in is attached to the workspace
as `owner`. Later accounts join the same workspace.

> `ALLOWED_EMAILS` is enforced in the app before sign-in/sign-up and again during
> workspace bootstrap. It is not a substitute for disabling sign-ups.

---

## Environment variables

| Variable | Required | Exposure | Purpose |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Browser | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Browser | Anon key; RLS still applies |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes in practice | **Server only** | Workspace bootstrap, OAuth state, encrypted tokens |
| `NEXT_PUBLIC_APP_URL` | Recommended | Browser | OAuth redirects and auth emails |
| `ALLOWED_EMAILS` | Recommended | Server only | Sign-in allowlist |
| `TOKEN_ENCRYPTION_KEY` | Phase 4 | **Server only** | AES-256-GCM key for social tokens |
| `OPENAI_API_KEY` | Optional | **Server only** | Model-written drafts; local template mode works without it |
| `OPENAI_MODEL` | Optional | **Server only** | Chat-completions model; defaults to `gpt-4o-mini` |
| `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET` | Phase 4 | Server | Meta app |
| `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET` | Phase 4 | Server | LinkedIn app |

Nothing secret is ever imported into a Client Component. The service-role client
lives in `src/lib/supabase/admin.ts`, which imports `server-only`.

> **`NEXT_PUBLIC_SUPABASE_URL` must be the project base URL**, for example
> `https://your-project.supabase.co`. Do not paste the REST endpoint
> (`.../rest/v1/`) or the auth endpoint (`.../auth/v1/`): the Supabase client
> appends those paths itself. A path in the base URL sends auth requests to
> `/rest/v1/auth/v1/...` and Supabase responds with
> `Invalid path specified in request URL`.
>
> `NEXT_PUBLIC_APP_URL` must be an absolute URL including `http://` or
> `https://`. `http://` is accepted only for localhost.

---

## Scripts

```bash
npm run dev         # local development
npm run build       # production build
npm run start       # serve the production build
npm run lint        # ESLint
npm run typecheck   # tsc --noEmit
npm test            # Vitest (unit + security guards)
npm run test:watch  # watch mode
```

---

## Project structure

```
src/
  app/
    (auth)/            # login and signup, no app shell
    (app)/             # authenticated shell: overview, generate, posts, ...
    auth/              # /auth/callback and /auth/confirm route handlers
    setup/             # public configuration guide
  components/
    app/               # shell, navigation, page header, states
    brand/             # logo and social glyphs
    generate/          # generation workspace
    ui/                # shadcn components
  lib/
    ai/                # prompts, claim checks, local + OpenAI engines
    auth/              # session context, workspace bootstrap, actions, schemas
    brand/             # brand brain queries, actions, validation, defaults
    supabase/          # browser, request-scoped server, service-role clients
    dashboard/         # overview queries
    env.public.ts      # NEXT_PUBLIC_* only
    env.server.ts      # server validation with lazy, non-fatal errors
    database.types.ts  # hand-written types until the project exists
  proxy.ts             # Next 16 proxy: session refresh + redirects
supabase/migrations/   # schema, RLS, storage
```

### Authentication flow

1. `proxy.ts` refreshes the Supabase session cookie and redirects signed-out
   users to `/login?next=…`.
2. `(app)/layout.tsx` independently calls `getWorkspaceAccess()`. It verifies the
   user with `auth.getUser()`, reads membership, and provisions the workspace on
   first login through the service role.
3. RLS policies enforce membership again on every query, so a proxy mistake
   cannot leak data.

Magic links and password auth are both supported. `/auth/callback` handles the
PKCE code exchange; `/auth/confirm` handles `token_hash` email links.

### Security model

- Every table has RLS enabled. Access is limited to members of the row's
  workspace via `is_workspace_member()`.
- `oauth_states` and `social_account_secrets` have RLS enabled, **no policies**,
  and their privileges are revoked from `anon` and `authenticated`. Only the
  service role can read them.
- `approvals`, `post_versions` and `audit_log` are append-only for clients.
- Publishing is guarded by a database CHECK constraint: a post cannot be
  `scheduled`, `publishing` or `published` unless `approved_version = version`.
- Membership writes never happen with a user session, preventing privilege
  escalation.
- Redirect targets are validated by `safeInternalPath()` to block open redirects.
- `npm test` includes guards that fail if RLS or the approval constraint is
  removed from the migration.

### Error and empty states

- Missing configuration renders `/setup` or an inline setup card, never a crash.
- Missing tables render an actionable "schema not applied" alert.
- The dashboard has explicit empty states for content and scheduling.
- Route-level `loading.tsx` and `error.tsx` cover slow and failed loads.

---

## Phase 2: Brand Brain and content generation

Phase 2 is fully editable from the dashboard. It does not wait for writing
samples or proof points: it ships a sensible, clearly labelled starting point
that the founder can replace.

### Three kinds of claim, kept separate

| Field | Meaning | How prompts use it |
| --- | --- | --- |
| **Verified facts** | Statements the business can substantiate if challenged | May be stated as fact, sparingly |
| **Proposed claims** | Working marketing hypotheses and positioning | Must be framed as a belief, question or view — never as proof |
| **Forbidden claims** | Things CloseLoop must never say | Blocked after generation and again before saving |

`claim_notes` records why a line sits where it does. The editor rejects the same
line appearing in both verified facts and proposed claims, or in both verified
facts and forbidden claims, so the AI is never given contradictory instructions.

### Editable starter profile

The migration seeds CloseLoop's profile, one agency-owner persona and four
content pillars (Owner-led growth, Content that compounds, Inside CloseLoop,
Agency operator notes). The profile is marked **ASSUMPTION-BASED STARTER
PROFILE**. Product facts are separated from market hypotheses, and the persona is
marked as unvalidated until agency-owner interviews happen. Every field — claims,
tone, emoji and hashtag policy, CTA, cadence, personas, pillars, writing
samples — can be edited at:

- `/settings/brand` — company, positioning, claims, voice, cadence
- `/settings/audience` — personas, content pillars, writing samples
- `/generate` — brief, draft editor, claim findings, history

### Generation workflow

1. Choose platform, format, pillar, persona, objective, angle, CTA mode and
   variation seed.
2. Generate. With `OPENAI_API_KEY`, the server calls OpenAI chat completions in
   JSON mode. Without a key — or if the call fails — it uses
   `local-template-v1`, a deterministic engine that composes only from the brand
   brain. The UI says plainly which engine wrote the draft; the local engine is
   **not** presented as model-written AI.
3. Edit the hook, body/caption, hashtags, CTA, alt text, image brief and carousel
   slides in place. Regenerate, copy or discard.
4. Save. Claim checks run again; a blocker prevents saving. The draft is written
   to `posts` with `status = 'draft'`, an immutable `post_versions` snapshot, and
   `generation_id` linking back to the generation record.

Saved drafts appear in the Phase 3 content library for editing, review and
scheduling.

### Honest copy by default

The local engine ends drafts with a denial such as “No guaranteed reach. No
autopilot. A human still decides what goes out.” The claim checker understands
negation and quoted objections, so those lines are not misread as promises. It
does still block affirmative guarantee, absolute percentage, autopilot and
approval-free publishing language. It is a writing aid, not a legal review.

---

## Phase 3: Content management

Phase 3 turns saved drafts into a reviewable pipeline. It reuses the Phase 1
tables (`posts`, `post_versions`, `post_media`, `approvals`) and the public
`post-media` storage bucket; the only schema change is a migration that closes
approval-integrity gaps and adds supporting indexes.

### Surfaces

- `/posts` — content library with search (title, hook, body, caption), platform,
  status, pillar and creation-date filters. Shows the current version, approved
  version, pillar, planned date, thumbnail and image count.
- `/posts/[id]` — editor for title, hook, platform copy, hashtags, CTA, alt text,
  image brief, carousel slides and pillar/persona. Live claim checks run while
  typing; a blocker disables saving.
- `/calendar` — month and week views grouped by the *workspace timezone*
  wall-clock day, with previous/next/today navigation and a quick-schedule form
  for approved posts that have no planned date yet.
- `/generate` — unchanged, but saved drafts now link into the library.

### Versions, approval and scheduling rules

- Every copy save creates a new `post_versions` row and increments `posts.version`.
- Saving an edited copy resets the post to `draft`, clears `approved_version`,
  approval metadata and `scheduled_for`. Approved copy can never silently drift.
- Adding, replacing or removing an image also starts a fresh draft version and
  clears the approval/schedule for pending, approved or scheduled posts.
- Submitting for review sets `in_review`. Approving writes an append-only
  `approvals` row for that exact version and sets `approved_version`.
- Rejecting writes a rejection row and clears the approval.
- Scheduling is only offered for an approved current version, validates a future
  wall-clock time in the workspace timezone, and stores UTC in `scheduled_for`.
- **Nothing publishes.** There are no background jobs and no social API calls in
  this phase; `publishing` and `published` remain read-only.
- Restoring a version creates a *new* draft version whose snapshot records
  `restored_from`. History is never rewritten.

### Database enforcement

`supabase/migrations/20261116000000_phase3_content_management.sql` adds:

- `posts_approved_version_not_future` — approval cannot point at a future version.
- `posts_require_approval_evidence` trigger — an approved/scheduled/publishing/
  published post must have an `approvals` row for its current version, and the
  latest decision for that version must be `approved`. This also blocks forging
  approval by writing `posts` directly.
- Indexes for library, calendar and media lookups, plus a unique index on
  `post_media.storage_path`.

### Media

Uploads accept JPEG, PNG and WebP up to 10 MB. The server checks the MIME type
and the file magic bytes before writing. Storage writes use the service role;
`post_media` rows use the user-scoped client so RLS keeps workspaces isolated.
Without `SUPABASE_SERVICE_ROLE_KEY`, existing previews and alt text still work,
but upload, replace and remove are disabled and the UI says why.

---

## What works today

**Phase 1 — foundation**

- Next.js + TypeScript + Tailwind + shadcn scaffold, cleaned of the broken `cn`
  package import that the generator produced.
- Supabase browser, server and service-role clients.
- Email/password and magic-link auth, allowlist enforcement, sign-out.
- Workspace bootstrap on first login with owner role.
- Full schema for all eight phases, with RLS and tests.
- Authenticated app shell, responsive navigation, user menu.
- Overview page with live counts, setup checklist, account status and recent
  content.
- Setup guide, 404, loading and error states.

**Phase 2 — brand brain and generation**

- Editable brand profile with verified, proposed and forbidden claim lists.
- Editable agency-owner persona, four content pillars and writing samples.
- Generation brief with platform, format, objective, angle, CTA and variation.
- OpenAI generation with transparent local fallback.
- Deterministic local template engine for zero-key development.
- Live claim findings with blockers that prevent saving.
- Editable drafts with image brief and carousel slides.
- Draft saves to `posts` + `post_versions`.

**Phase 3 — content management**

- Content library with search, platform/status/pillar/created-date filters and
  thumbnail previews.
- Post editor with carousel slides, pillar/persona, alt text and live claim checks.
- Version history with snapshot previews and restore-as-new-draft.
- Approval workflow: submit, approve, reject with feedback, append-only history.
- Calendar month/week views in the workspace timezone.
- Scheduling preparation for approved versions; no automatic publishing.
- Image upload, replace, remove and per-image alt text with magic-byte validation.
- Server-side authorization, optimistic version checks and database approval
  enforcement.

**Not implemented (by design)**

- Instagram/LinkedIn OAuth and publishing (Phase 4).
- Inngest jobs (Phase 5), analytics (Phase 6), First 30 workspace (Phase 7).
- Social accounts are read in the overview but no connection flow exists yet.

The placeholder routes state which phase they belong to. They do not show fake
metrics or pretend to be connected to an API.

---

## External dependencies you must provide

| Dependency | Needed for | Blocker |
| --- | --- | --- |
| Supabase project | Everything | None |
| OpenAI API key | Phase 2 model-written drafts | Optional: local template mode works without it; $5 cap recommended |
| Instagram professional account + Meta app | Phase 4 | Account must be Business/Creator and added as an app tester |
| LinkedIn developer app (OIDC + Share on LinkedIn) | Phase 4 | App review may be required for some permissions |
| Vercel Pro | Production | Hobby plan is non-commercial |
| Inngest | Phase 5 | Free tier is sufficient |
| PostHog | Phase 6 | Free tier is sufficient |

### Known constraints

- Instagram own-account publishing works under Standard Access **only if** the
  account is a professional account with an app role and the token actually
  carries `instagram_business_content_publish`. Login success alone is not proof;
  Phase 4 verifies capability explicitly.
- LinkedIn self-serve tokens last about 60 days and have no refresh token, so a
  reauthorisation reminder is required.
- Without `OPENAI_API_KEY`, generation uses `local-template-v1`. It is
  deterministic and useful for development, but it is not model-written copy.
  With a key, a failed request falls back to the same engine and says why.
- Media upload, replace and remove require `SUPABASE_SERVICE_ROLE_KEY`. Without
  it the media manager stays read-only (previews and alt text still work).
- Scheduling records intent only. Phase 3 has no background publisher, so a
  scheduled post stays scheduled until a later phase adds publishing.
- No automated lead scraping or unsolicited mass messaging. The First 30
  workspace is manual research plus human-approved outreach drafts.

---

## Roadmap

| Phase | Scope | Status |
| --- | --- | --- |
| 1 | Foundation, auth, schema, shell | Done |
| 2 | Brand brain, audience, AI generation | Done |
| 3 | Library, approvals, calendar, scheduling | Done |
| 4 | Instagram and LinkedIn OAuth + publishing | Planned |
| 5 | Inngest jobs, retries, duplicate protection | Planned |
| 6 | Analytics | Planned |
| 7 | First 30 validation workspace | Planned |
| 8 | Testing, security review, deployment | Planned |

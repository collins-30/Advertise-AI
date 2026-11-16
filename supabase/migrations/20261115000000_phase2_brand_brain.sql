-- ============================================================================
-- CloseLoop — Phase 2: Brand Brain
--
-- Adds the fields the generation engine needs to separate:
--   * verified facts      — statements the business can substantiate;
--   * proposed claims     — working marketing hypotheses that must be hedged;
--   * forbidden claims    — statements the prompt must never produce.
--
-- It also seeds an editable, assumption-based CloseLoop brand profile so the
-- workspace is useful before the founder supplies writing samples or proof.
-- Nothing here is presented as a verified customer outcome.
--
-- Run after `20261113000100_storage.sql`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Brand claims
-- ---------------------------------------------------------------------------

alter table public.brand_profiles
  add column if not exists verified_facts text[] not null default '{}',
  add column if not exists proposed_claims text[] not null default '{}',
  add column if not exists claim_notes text;

comment on column public.brand_profiles.verified_facts is
  'Facts the business can substantiate if challenged. Prompts may state these as fact.';

comment on column public.brand_profiles.proposed_claims is
  'Working marketing hypotheses. Prompts must frame these as positioning, never as evidence or outcomes.';

comment on column public.brand_profiles.proof_points is
  'Legacy Phase 1 field. Phase 2 writes verified facts to verified_facts and hypotheses to proposed_claims.';

-- ---------------------------------------------------------------------------
-- Post fields needed by the generation editor
-- ---------------------------------------------------------------------------

alter table public.posts
  add column if not exists image_brief text,
  add column if not exists carousel_slides jsonb not null default '[]'::jsonb,
  add column if not exists generation_id uuid
    references public.ai_generations(id) on delete set null;

comment on column public.posts.image_brief is
  'Art direction produced with the draft. Phase 4 can use it when creating media.';

comment on column public.posts.carousel_slides is
  'Ordered slide copy for carousel drafts. Empty for single-image and text posts.';

create index if not exists posts_generation_idx
  on public.posts (generation_id)
  where generation_id is not null;

-- ---------------------------------------------------------------------------
-- Starter brand profile (assumption-based, fully editable)
--
-- Product facts are kept separate from market hypotheses. The founder can move
-- any line between the two lists once evidence exists.
-- ---------------------------------------------------------------------------

insert into public.brand_profiles (
  workspace_id,
  company_name,
  one_liner,
  description,
  website_url,
  positioning,
  target_market,
  value_props,
  proof_points,
  verified_facts,
  proposed_claims,
  forbidden_claims,
  tone_keywords,
  emoji_policy,
  hashtag_policy,
  primary_cta,
  booking_url,
  posting_cadence,
  notes
)
select
  w.id,
  'CloseLoop',
  'Brand-aware content for agency owners — without handing over the keys.',
  'CloseLoop is an AI marketing assistant for owner-led agencies. It captures the agency''s positioning, audience and voice in one brand brain, drafts platform-specific content for LinkedIn and Instagram, and keeps a human in the loop before anything is published. The focus is not "more content". It is clearer, more consistent content that sounds like the agency and starts useful conversations.',
  null,
  'CloseLoop is the brand-aware marketing assistant for agency owners who need consistent content without adding a full-time content hire or handing their voice to a generic AI tool.',
  'Owner-led B2B service agencies (2–20 people) that sell expertise rather than products: SEO, paid media, web design, branding, and full-service marketing.',
  array[
    'One brand brain instead of a blank page for every post.',
    'Platform-specific drafts for LinkedIn and Instagram.',
    'A human approves every post before it can be published.',
    'Built around agency positioning, not generic marketing prompts.'
  ]::text[],
  '{}'::text[],
  array[
    'CloseLoop is an AI marketing assistant.',
    'CloseLoop is being built for owner-led agencies.',
    'CloseLoop generates content for LinkedIn and Instagram.',
    'CloseLoop requires a human to approve content before it can be published.'
  ]::text[],
  array[
    'Agency owners are usually the best salesperson in the business, but their own marketing is the first thing to slip when client work gets busy.',
    'Generic AI tools produce generic content because they do not know the agency''s positioning, voice or proof.',
    'A brand-aware system can help an agency publish consistently without adding a full-time content hire.',
    'The hardest part of agency content is not writing; it is deciding what to say, for whom, and why it matters.',
    'CloseLoop''s proposed solution is one brand brain that turns the owner''s expertise into platform-specific drafts, with a human approving every post.',
    'Agency owners want a system that protects their voice and judgement, not a tool that posts on autopilot.'
  ]::text[],
  array[
    'Guaranteed leads, revenue, growth or engagement.',
    'Save a specific number of hours per week unless we have measured it with a customer.',
    'Replace the agency owner''s judgement or run fully on autopilot.',
    'Client names, logos or testimonials without written permission.',
    'Awards, rankings, certifications or "best / fastest" claims we cannot evidence.',
    'Claims that AI-generated content is always accurate or on-brand.',
    'Claims that publishing to Instagram or LinkedIn is live before Phase 4 ships.'
  ]::text[],
  array[
    'direct',
    'practical',
    'calm',
    'specific',
    'operator-to-operator',
    'allergic to hype'
  ]::text[],
  'sparing',
  'Instagram: 3–5 specific hashtags. LinkedIn: 0–3. Do not use generic #AI #Marketing #Agency tags as the only tags. No hashtags in the middle of sentences.',
  'Book a short walkthrough',
  null,
  '{"linkedin":3,"instagram":2,"note":"Assumed starting cadence. Confirm with the founder."}'::jsonb,
  'ASSUMPTION-BASED STARTER PROFILE. Product facts are separated from market hypotheses. No customer outcomes, testimonials or time savings have been verified. Add writing samples and proof points, then move claims into "Verified facts" only when they can be substantiated.'
from public.workspaces w
where w.slug = 'closeloop'
on conflict (workspace_id) do nothing;

-- ---------------------------------------------------------------------------
-- Starter audience: one primary persona, deliberately focused on agency owners
-- ---------------------------------------------------------------------------

insert into public.audience_personas (
  workspace_id,
  name,
  role,
  company_type,
  company_size,
  pain_points,
  desires,
  objections,
  watering_holes,
  buying_triggers,
  is_primary,
  notes
)
select
  w.id,
  'Agency owner / founder',
  'Founder, owner or managing director',
  'Owner-led B2B service agency (SEO, paid media, web design, branding, or full-service)',
  '2–20 people',
  array[
    'Client work always comes before the agency''s own marketing.',
    'The owner is the main source of expertise, but has no time to write.',
    'Generic AI output sounds like everyone else and needs heavy editing.',
    'Content is inconsistent across LinkedIn and Instagram.',
    'Hiring a content person is expensive and hard to justify before growth is predictable.',
    'Past freelancers or agencies did not understand the agency''s voice.'
  ]::text[],
  array[
    'A steady pipeline of qualified conversations.',
    'A content system that does not take the owner out of delivery.',
    'Content that sounds like the agency, not a template.',
    'Visibility as the obvious expert in a niche.',
    'Proof that marketing effort is producing something.'
  ]::text[],
  array[
    'AI will make us sound generic.',
    'I do not have time to review another dashboard.',
    'We already tried a freelancer or agency and it did not stick.',
    'Publishing without approval is too risky for our brand.',
    'I need to see it work with our actual positioning.'
  ]::text[],
  array[
    'LinkedIn: founder-led posts, comments and DMs.',
    'Agency owner peer groups and Slack communities.',
    'Agency-focused podcasts and newsletters.',
    'Local and niche business events.',
    'Instagram for visual portfolio and culture work.'
  ]::text[],
  array[
    'A dry pipeline or the loss of a large client.',
    'A new service launch or repositioning.',
    'A failed content hire or freelancer.',
    'A peer recommends a tool that respects their voice.',
    'A specific event or campaign with a deadline.'
  ]::text[],
  true,
  'ASSUMPTION-BASED STARTER PERSONA. Confirm with 10–15 agency owner interviews before treating any pain point as validated.'
from public.workspaces w
where w.slug = 'closeloop'
  and not exists (
    select 1 from public.audience_personas p where p.workspace_id = w.id
  );

-- ---------------------------------------------------------------------------
-- Starter content pillars
-- ---------------------------------------------------------------------------

insert into public.content_pillars (
  workspace_id,
  name,
  description,
  percentage,
  example_topics,
  is_active
)
select
  w.id,
  v.name,
  v.description,
  v.percentage,
  v.example_topics,
  true
from public.workspaces w
cross join (
  values
    (
      'Owner-led growth',
      'Why the agency owner is both the bottleneck and the strongest asset in agency marketing.',
      30,
      array[
        'The owner is the product',
        'Why client work eats your marketing',
        'Selling expertise without sounding like a commodity',
        'The cost of staying invisible'
      ]::text[]
    ),
    (
      'Content that compounds',
      'How consistent, specific publishing creates inbound conversations over time.',
      25,
      array[
        'Why most agency content sounds the same',
        'One idea, two platforms',
        'A content system you will actually keep',
        'Quality over posting volume'
      ]::text[]
    ),
    (
      'Inside CloseLoop',
      'The problem CloseLoop is solving and the product decisions behind it.',
      25,
      array[
        'Why we start with the brand brain',
        'Human approval is a feature',
        'What "brand-aware" actually means',
        'Building for agency owners, not content teams'
      ]::text[]
    ),
    (
      'Agency operator notes',
      'Practical, opinionated lessons from running and marketing a service business.',
      20,
      array[
        'Positioning before posting',
        'What a dry pipeline teaches you',
        'The review loop that protects your voice',
        'Metrics that matter to an owner'
      ]::text[]
    )
) as v(name, description, percentage, example_topics)
where w.slug = 'closeloop'
  and not exists (
    select 1 from public.content_pillars p where p.workspace_id = w.id
  );

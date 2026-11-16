-- ============================================================================
-- Advertise-AI — Brand Brain correction: CloseLoop is a revenue-recovery product
--
-- Advertise-AI is the application. CloseLoop is the promoted brand stored in the
-- workspace-owned Brand Brain tables:
--   * public.brand_profiles      — the promoted brand's profile
--   * public.audience_personas   — the people that brand writes for
--   * public.content_pillars     — the topic territories it rotates between
--
-- Phase 2 seeded the wrong story: it described CloseLoop as an AI marketing
-- assistant for owner-led agencies. This migration corrects only rows that still
-- match the untouched Phase 2 starter seed. Any row the founder has edited is
-- left alone.
--
-- Additive and safe:
--   * no drops, deletes, column changes, or RLS changes;
--   * pillar rows are updated in place so posts.pillar_id stays valid;
--   * the fifth pillar is inserted only when it does not already exist;
--   * saved posts, versions and generation history are untouched.
--
-- Run after `20261116000000_phase3_content_management.sql`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Internal workspace name reflects the application, not the promoted brand.
--
-- The slug stays `closeloop` because earlier migrations reference it as a stable
-- identifier. Only rename a workspace that still carries the untouched default.
-- ---------------------------------------------------------------------------

update public.workspaces
set
  name = 'Advertise-AI',
  updated_at = now()
where slug = 'closeloop'
  and name = 'CloseLoop';

-- ---------------------------------------------------------------------------
-- Promoted brand profile
--
-- Product identity facts stay in verified_facts. Proposed capabilities stay in
-- proposed_claims and must be hedged by prompts. The forbidden list explicitly
-- blocks the old "marketing assistant" framing.
-- ---------------------------------------------------------------------------

update public.brand_profiles p
set
  one_liner =
    'Revenue recovery for small agencies that cannot afford to forget a follow-up.',
  description =
    'CloseLoop is an AI-powered revenue-recovery assistant for small service businesses, initially small web design and digital marketing agencies. It is being built to identify opportunities that need attention, organise follow-up activity and suggest contextual follow-up messages so fewer enquiries and proposals go quiet. The focus is not more leads. It is making sure the conversations already in the pipeline get a clear next step.',
  positioning =
    'CloseLoop is the revenue-recovery assistant for small web design and digital marketing agencies that cannot afford to let good enquiries and proposals go quiet.',
  target_market =
    'Small web design and digital marketing agencies (roughly 2–20 people) that sell projects or retainers and depend on enquiries, proposals and follow-up to win work.',
  value_props = array[
    'See which enquiries and proposals need a follow-up before they go cold.',
    'Keep lead conversations and next steps in one organised place.',
    'Get contextual follow-up suggestions instead of starting from a blank page.',
    'Protect revenue that is already in the pipeline, not just chase new leads.'
  ]::text[],
  verified_facts = array[
    'CloseLoop is an AI-powered revenue-recovery assistant for small service businesses.',
    'CloseLoop''s initial target market is small web design and digital marketing agencies.'
  ]::text[],
  proposed_claims = array[
    'Small agencies lose more revenue to follow-up that never happens than to a lack of new leads.',
    'Forgotten follow-ups are usually a side effect of disorganised lead conversations, not a lack of care.',
    'A system that surfaces opportunities needing attention can help a small team follow up consistently.',
    'Following up with stalled proposals is often cheaper than finding new prospects.',
    'Prospects who stop responding usually need a clear next step, not more pressure.',
    'CloseLoop''s proposed approach is to identify opportunities, organise follow-up activity and suggest contextual messages so prospects can move toward becoming paying customers.',
    'Business owners want a follow-up system that supports their judgement, not one that automates conversations without them.'
  ]::text[],
  forbidden_claims = array[
    'Guaranteed revenue, recovered revenue, conversions, clients or customer acquisition.',
    'A specific amount of revenue recovered or hours saved unless it has been measured with a customer.',
    'CloseLoop is a social media marketing assistant, AI content generator or brand management platform.',
    'Replace the business owner''s judgement or run fully on autopilot.',
    'Client names, logos, testimonials, revenue figures or case studies without written permission.',
    'Awards, rankings, certifications or best/fastest claims we cannot evidence.',
    'Claims that every enquiry, proposal or conversation will convert.',
    'Claims that automated sending, integrations or social publishing are live before they ship.'
  ]::text[],
  hashtag_policy =
    'Instagram: 3–5 specific hashtags. LinkedIn: 0–3. Prefer audience or problem tags over generic #AI #Marketing tags. No hashtags in the middle of sentences.',
  primary_cta = 'Book a short walkthrough',
  notes =
    'Write for owners of small web design and digital marketing agencies. Name the cost of forgotten follow-ups, then explain CloseLoop''s proposed approach. Do not describe CloseLoop as a content, social media or brand management tool. Do not invent proof or recovered revenue.',
  claim_notes =
    'ASSUMPTION-BASED STARTER PROFILE. Product identity facts are separated from market hypotheses and proposed capabilities. No revenue recovery, conversion, time saving or customer outcome has been verified. Move a capability into "Verified facts" only after it ships and can be substantiated.',
  updated_at = now()
where p.company_name = 'CloseLoop'
  and p.one_liner =
    'Brand-aware content for agency owners — without handing over the keys.'
  and p.description like
    'CloseLoop is an AI marketing assistant for owner-led agencies.%'
  and p.claim_notes like 'ASSUMPTION-BASED STARTER PROFILE.%';

-- ---------------------------------------------------------------------------
-- Starter audience: small web design and digital marketing agencies
-- ---------------------------------------------------------------------------

update public.audience_personas a
set
  role = 'Founder, owner or managing director',
  company_type = 'Small web design or digital marketing agency',
  company_size = '2–20 people',
  pain_points = array[
    'Enquiries arrive while client work is in full swing, and the follow-up waits.',
    'Proposals go out and then sit without a clear next step.',
    'Prospective clients stop responding and nobody is sure when to follow up again.',
    'Lead conversations live across inboxes, notes and memory.',
    'The owner is the main salesperson, so follow-up depends on finding time.',
    'Reconnecting with old prospects is always the first thing to slip.'
  ]::text[],
  desires = array[
    'A clear view of which opportunities need attention this week.',
    'A follow-up process the whole small team can keep to.',
    'Fewer good proposals lost to silence.',
    'More revenue from the pipeline they already have.',
    'Confidence that no interested prospect has been forgotten.'
  ]::text[],
  objections = array[
    'We already have a CRM; it just does not get updated.',
    'I do not want another dashboard to maintain.',
    'Automated follow-up could sound pushy or generic.',
    'I need to see it work with our actual enquiries and proposals.',
    'We are a small team; anything new has to be quick to use.'
  ]::text[],
  watering_holes = array[
    'LinkedIn: agency owners, web design and marketing communities.',
    'Agency peer groups, Slack communities and mastermind groups.',
    'Agency-focused podcasts and newsletters.',
    'Web design and digital marketing conferences and local meetups.',
    'Recommendations from peers and existing clients.'
  ]::text[],
  buying_triggers = array[
    'A good proposal goes quiet and the work goes elsewhere.',
    'A dry month after a busy delivery period.',
    'A new business development push or referral spike.',
    'A CRM cleanup that reveals stale opportunities.',
    'A peer recommends a follow-up system that is simple to run.'
  ]::text[],
  notes =
    'ASSUMPTION-BASED STARTER PERSONA. Confirm with 10–15 small agency owners before treating any pain point as validated.',
  updated_at = now()
where a.name = 'Agency owner / founder'
  and a.role = 'Founder, owner or managing director'
  and a.company_type =
    'Owner-led B2B service agency (SEO, paid media, web design, branding, or full-service)'
  and a.notes like 'ASSUMPTION-BASED STARTER PERSONA.%';

-- ---------------------------------------------------------------------------
-- Content pillars
--
-- Rename the untouched seeded pillars in place so existing posts and ideas keep
-- their pillar references. Skip a rename if the founder already created a pillar
-- with the target name.
-- ---------------------------------------------------------------------------

update public.content_pillars p
set
  name = 'The cost of forgotten follow-ups',
  description =
    'The revenue that quietly disappears when enquiries and proposals are not followed up.',
  percentage = 25,
  example_topics = array[
    'What a forgotten follow-up actually costs',
    'The proposal that went quiet',
    'Why busy weeks hide lost revenue',
    'Follow-up is a revenue activity, not admin'
  ]::text[],
  updated_at = now()
where p.name = 'Owner-led growth'
  and p.description =
    'Why the agency owner is both the bottleneck and the strongest asset in agency marketing.'
  and p.percentage = 30
  and not exists (
    select 1 from public.content_pillars x
    where x.workspace_id = p.workspace_id
      and x.name = 'The cost of forgotten follow-ups'
  );

update public.content_pillars p
set
  name = 'Enquiry and proposal management',
  description =
    'How small agencies can track enquiries, proposals and next steps without adding another system nobody updates.',
  percentage = 20,
  example_topics = array[
    'Where enquiries get stuck',
    'A simple next-step rule for every proposal',
    'Keeping lead conversations in one place',
    'When to follow up without sounding pushy'
  ]::text[],
  updated_at = now()
where p.name = 'Content that compounds'
  and p.description =
    'How consistent, specific publishing creates inbound conversations over time.'
  and p.percentage = 25
  and not exists (
    select 1 from public.content_pillars x
    where x.workspace_id = p.workspace_id
      and x.name = 'Enquiry and proposal management'
  );

update public.content_pillars p
set
  name = 'Revenue leakage and missed opportunities',
  description =
    'The small leaks that add up: stalled deals, silent prospects and reconnection opportunities that never happen.',
  percentage = 20,
  example_topics = array[
    'The cost of a silent pipeline',
    'Reconnecting with prospects who went quiet',
    'Missed opportunities hiding in your inbox',
    'Revenue recovery versus more lead generation'
  ]::text[],
  updated_at = now()
where p.name = 'Inside CloseLoop'
  and p.description =
    'The problem CloseLoop is solving and the product decisions behind it.'
  and p.percentage = 25
  and not exists (
    select 1 from public.content_pillars x
    where x.workspace_id = p.workspace_id
      and x.name = 'Revenue leakage and missed opportunities'
  );

update public.content_pillars p
set
  name = 'Better client communication and follow-up processes',
  description =
    'Practical follow-up habits and communication standards that help prospects feel looked after.',
  percentage = 20,
  example_topics = array[
    'A follow-up cadence a small team can keep',
    'How to write a useful check-in',
    'Setting expectations after a proposal',
    'What to do when a prospect goes silent'
  ]::text[],
  updated_at = now()
where p.name = 'Agency operator notes'
  and p.description =
    'Practical, opinionated lessons from running and marketing a service business.'
  and p.percentage = 20
  and not exists (
    select 1 from public.content_pillars x
    where x.workspace_id = p.workspace_id
      and x.name = 'Better client communication and follow-up processes'
  );

-- Fifth pillar. Only insert it into the starter workspace once the first
-- corrected pillar exists, so a workspace with unrelated custom pillars is left
-- untouched.
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
  'CloseLoop product education and demonstrations',
  'How CloseLoop is being designed to surface opportunities, organise follow-up and suggest contextual messages.',
  15,
  array[
    'What revenue recovery means in practice',
    'How CloseLoop decides what needs attention',
    'A walkthrough of the follow-up view',
    'What CloseLoop is not: not a content or social media tool'
  ]::text[],
  true
from public.workspaces w
where w.slug = 'closeloop'
  and exists (
    select 1 from public.content_pillars p
    where p.workspace_id = w.id
      and p.name = 'The cost of forgotten follow-ups'
  )
  and not exists (
    select 1 from public.content_pillars p
    where p.workspace_id = w.id
      and p.name = 'CloseLoop product education and demonstrations'
  );

-- ============================================================================
-- CloseLoop — initial schema
--
-- Single-workspace internal tool. Every row is workspace-scoped so the schema
-- can support more workspaces later without a rewrite.
--
-- Security model:
--   * RLS is enabled on every table.
--   * `authenticated` may only touch rows in a workspace they belong to.
--   * OAuth state and encrypted social tokens are service-role only.
--   * Approvals, version snapshots and the audit log are append-only.
--   * Approval is enforced by a CHECK constraint, not just in application code.
--
-- Run this file once, then `..._storage.sql`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

revoke all on function public.set_updated_at() from public;



-- ---------------------------------------------------------------------------
-- Core: workspaces and membership
-- ---------------------------------------------------------------------------

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  timezone text not null default 'UTC',
  daily_publish_cap integer not null default 25
    check (daily_publish_cap between 1 and 100),
  auto_publish boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.workspaces is
  'One row expected for the MVP. Timezone drives scheduling and calendar display.';

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);

create index workspace_members_user_idx on public.workspace_members (user_id);

-- security definer so the lookup is not itself filtered by workspace_members RLS
create or replace function public.is_workspace_member(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
  );
$$;

create or replace function public.is_workspace_admin(target_workspace_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.workspace_members wm
    where wm.workspace_id = target_workspace_id
      and wm.user_id = (select auth.uid())
      and wm.role in ('owner', 'admin')
  );
$$;

revoke all on function public.is_workspace_member(uuid) from public;
revoke all on function public.is_workspace_admin(uuid) from public;
grant execute on function public.is_workspace_member(uuid) to authenticated;
grant execute on function public.is_workspace_admin(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- Brand brain
-- ---------------------------------------------------------------------------

create table public.brand_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null unique
    references public.workspaces(id) on delete cascade,
  company_name text not null default 'CloseLoop',
  one_liner text,
  description text,
  website_url text,
  positioning text,
  target_market text,
  value_props text[] not null default '{}',
  proof_points text[] not null default '{}',
  forbidden_claims text[] not null default '{}',
  tone_keywords text[] not null default '{}',
  emoji_policy text not null default 'sparing'
    check (emoji_policy in ('none', 'sparing', 'free')),
  hashtag_policy text,
  primary_cta text,
  booking_url text,
  posting_cadence jsonb not null default '{}'::jsonb,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.brand_writing_samples (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text,
  title text,
  content text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index brand_writing_samples_workspace_idx
  on public.brand_writing_samples (workspace_id);

create table public.audience_personas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  role text,
  company_type text,
  company_size text,
  pain_points text[] not null default '{}',
  desires text[] not null default '{}',
  objections text[] not null default '{}',
  watering_holes text[] not null default '{}',
  buying_triggers text[] not null default '{}',
  is_primary boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index audience_personas_workspace_idx
  on public.audience_personas (workspace_id);

create table public.content_pillars (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  percentage integer check (percentage between 0 and 100),
  example_topics text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_pillars_workspace_idx on public.content_pillars (workspace_id);

create table public.content_ideas (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  title text not null,
  angle text,
  status text not null default 'idea'
    check (status in ('idea', 'approved', 'used', 'archived')),
  pillar_id uuid references public.content_pillars(id) on delete set null,
  persona_id uuid references public.audience_personas(id) on delete set null,
  score integer check (score between 0 and 100),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index content_ideas_workspace_idx on public.content_ideas (workspace_id);

-- ---------------------------------------------------------------------------
-- Content and approvals
-- ---------------------------------------------------------------------------

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin')),
  format text not null default 'single_image'
    check (format in ('single_image', 'carousel', 'text')),
  status text not null default 'draft'
    check (status in (
      'draft', 'in_review', 'approved', 'scheduled', 'publishing',
      'published', 'failed', 'needs_reauth', 'rejected', 'archived'
    )),
  title text,
  hook text,
  body text,
  caption text,
  hashtags text[] not null default '{}',
  cta text,
  alt_text text,
  pillar_id uuid references public.content_pillars(id) on delete set null,
  persona_id uuid references public.audience_personas(id) on delete set null,
  source text not null default 'manual' check (source in ('ai', 'manual')),

  -- Versioning: editing increments `version`; approval records the version that
  -- was approved. Publishing requires approved_version = version.
  version integer not null default 1 check (version > 0),
  approved_version integer,
  approved_at timestamptz,
  approved_by uuid references auth.users(id) on delete set null,

  scheduled_for timestamptz,
  timezone text not null default 'UTC',
  published_at timestamptz,

  external_post_id text,
  idempotency_key text not null default gen_random_uuid()::text,
  last_error_code text,
  last_error_message text,

  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint posts_approval_matches_version check (
    status not in ('scheduled', 'publishing', 'published')
    or (approved_version is not null and approved_version = version)
  ),
  constraint posts_scheduled_requires_time check (
    status <> 'scheduled' or scheduled_for is not null
  ),
  constraint posts_idempotency_key_unique unique (idempotency_key),
  constraint posts_external_post_unique unique (platform, external_post_id)
);

comment on constraint posts_approval_matches_version on public.posts is
  'Hard guarantee: nothing can reach scheduled/publishing/published without an approved matching version.';

create index posts_workspace_status_idx on public.posts (workspace_id, status);
create index posts_workspace_schedule_idx
  on public.posts (workspace_id, scheduled_for)
  where scheduled_for is not null;
create index posts_workspace_platform_idx
  on public.posts (workspace_id, platform, status);

create table public.post_versions (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  version integer not null check (version > 0),
  snapshot jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (post_id, version)
);

create index post_versions_post_idx on public.post_versions (post_id, version desc);

create table public.post_media (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  storage_path text not null,
  public_url text not null,
  mime_type text not null,
  width integer,
  height integer,
  size_bytes bigint,
  alt_text text,
  position integer not null default 0 check (position >= 0),
  created_at timestamptz not null default now(),
  unique (post_id, position)
);

create index post_media_post_idx on public.post_media (post_id, position);

create table public.approvals (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  version integer not null,
  decision text not null check (decision in ('approved', 'rejected')),
  note text,
  decided_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index approvals_post_idx on public.approvals (post_id, created_at desc);

-- ---------------------------------------------------------------------------
-- Social accounts and OAuth
-- ---------------------------------------------------------------------------

create table public.social_accounts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin')),
  external_account_id text not null,
  username text,
  display_name text,
  avatar_url text,
  account_type text,
  status text not null default 'disconnected'
    check (status in (
      'connected', 'connected_limited', 'needs_reauth',
      'error', 'revoked', 'disconnected'
    )),
  token_expires_at timestamptz,
  granted_scopes text[] not null default '{}',
  required_scopes text[] not null default '{}',
  missing_scopes text[] not null default '{}',
  publish_capable boolean not null default false,
  capability_checked_at timestamptz,
  last_verified_at timestamptz,
  last_error_code text,
  last_error_message text,
  metadata jsonb not null default '{}'::jsonb,
  connected_at timestamptz,
  disconnected_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- One account per platform keeps the MVP publish target unambiguous.
  constraint social_accounts_one_per_platform unique (workspace_id, platform)
);

create table public.social_account_secrets (
  social_account_id uuid primary key
    references public.social_accounts(id) on delete cascade,
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  access_token_ciphertext text not null,
  refresh_token_ciphertext text,
  key_version integer not null default 1,
  updated_at timestamptz not null default now()
);

comment on table public.social_account_secrets is
  'AES-256-GCM encrypted tokens. No RLS policies: service role only.';

create table public.oauth_states (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin')),
  state_hash text not null unique,
  mode text not null default 'connect' check (mode in ('connect', 'reconnect')),
  redirect_after text,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

create index oauth_states_expires_idx on public.oauth_states (expires_at);

create table public.publish_attempts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  social_account_id uuid references public.social_accounts(id) on delete set null,
  attempt_number integer not null default 1 check (attempt_number > 0),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed', 'skipped')),
  request_payload jsonb,
  response_payload jsonb,
  external_post_id text,
  error_code text,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  created_at timestamptz not null default now(),
  unique (post_id, attempt_number)
);

create index publish_attempts_post_idx
  on public.publish_attempts (post_id, created_at desc);

create table public.post_metrics (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  platform text not null check (platform in ('instagram', 'linkedin')),
  metric_date date not null,
  impressions integer,
  reach integer,
  likes integer,
  comments integer,
  shares integer,
  saves integer,
  clicks integer,
  raw jsonb not null default '{}'::jsonb,
  captured_at timestamptz not null default now(),
  unique (post_id, metric_date)
);

create index post_metrics_workspace_idx
  on public.post_metrics (workspace_id, metric_date desc);

-- ---------------------------------------------------------------------------
-- First 30 validation workspace
-- ---------------------------------------------------------------------------

create table public.icp_profiles (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  agency_size text,
  services text[] not null default '{}',
  niches text[] not null default '{}',
  signals text[] not null default '{}',
  disqualifiers text[] not null default '{}',
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.leads (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  agency_name text not null,
  contact_name text,
  role text,
  website text,
  email text,
  linkedin_url text,
  instagram_url text,
  city text,
  country text,
  source text,
  stage text not null default 'identified'
    check (stage in (
      'identified', 'researching', 'qualified', 'contacted', 'replied',
      'call_booked', 'interviewed', 'demo', 'pilot', 'customer',
      'not_fit', 'archived'
    )),
  fit_score integer check (fit_score between 0 and 100),
  willingness_to_pay text
    check (willingness_to_pay in ('unknown', 'no', 'maybe', 'yes')),
  notes text,
  next_action_at timestamptz,
  last_contacted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index leads_workspace_stage_idx on public.leads (workspace_id, stage);
create index leads_next_action_idx on public.leads (workspace_id, next_action_at)
  where next_action_at is not null;

create table public.lead_research (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  summary text,
  pain_signals text[] not null default '{}',
  opportunities text[] not null default '{}',
  personalization_hooks text[] not null default '{}',
  sources jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index lead_research_lead_idx on public.lead_research (lead_id);

create table public.lead_activities (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  type text not null
    check (type in (
      'note', 'outreach_sent', 'reply', 'call', 'interview',
      'demo', 'pilot_start', 'feedback'
    )),
  channel text,
  summary text,
  occurred_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index lead_activities_lead_idx
  on public.lead_activities (lead_id, occurred_at desc);

create table public.outreach_drafts (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  lead_id uuid not null references public.leads(id) on delete cascade,
  channel text not null
    check (channel in ('email', 'linkedin', 'instagram_dm')),
  subject text,
  body text not null,
  status text not null default 'draft'
    check (status in ('draft', 'approved', 'sent', 'discarded')),
  version integer not null default 1 check (version > 0),
  approved_version integer,
  approved_by uuid references auth.users(id) on delete set null,
  approved_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint outreach_approval_matches_version check (
    status not in ('sent')
    or (approved_version is not null and approved_version = version)
  )
);

create index outreach_drafts_lead_idx on public.outreach_drafts (lead_id);

-- ---------------------------------------------------------------------------
-- AI usage and audit
-- ---------------------------------------------------------------------------

create table public.ai_generations (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  kind text not null check (kind in ('content', 'outreach', 'research')),
  model text not null,
  prompt_version text,
  input jsonb not null default '{}'::jsonb,
  output jsonb,
  tokens_input integer,
  tokens_output integer,
  cost_usd numeric(10, 6),
  status text not null default 'pending'
    check (status in ('pending', 'succeeded', 'failed')),
  error text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create index ai_generations_workspace_idx
  on public.ai_generations (workspace_id, created_at desc);

create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  metadata jsonb not null default '{}'::jsonb,
  ip text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index audit_log_workspace_idx
  on public.audit_log (workspace_id, created_at desc);

-- ---------------------------------------------------------------------------
-- updated_at triggers
-- ---------------------------------------------------------------------------

do $$
declare
  t text;
begin
  foreach t in array array[
    'workspaces', 'brand_profiles', 'audience_personas', 'content_pillars',
    'content_ideas', 'posts', 'social_accounts', 'icp_profiles', 'leads',
    'outreach_drafts'
  ] loop
    execute format(
      'drop trigger if exists %I on public.%I',
      t || '_set_updated_at', t
    );
    execute format(
      'create trigger %I before update on public.%I
         for each row execute function public.set_updated_at()',
      t || '_set_updated_at', t
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------

alter table public.workspaces enable row level security;
alter table public.workspace_members enable row level security;
alter table public.brand_profiles enable row level security;
alter table public.brand_writing_samples enable row level security;
alter table public.audience_personas enable row level security;
alter table public.content_pillars enable row level security;
alter table public.content_ideas enable row level security;
alter table public.posts enable row level security;
alter table public.post_versions enable row level security;
alter table public.post_media enable row level security;
alter table public.approvals enable row level security;
alter table public.social_accounts enable row level security;
alter table public.social_account_secrets enable row level security;
alter table public.oauth_states enable row level security;
alter table public.publish_attempts enable row level security;
alter table public.post_metrics enable row level security;
alter table public.icp_profiles enable row level security;
alter table public.leads enable row level security;
alter table public.lead_research enable row level security;
alter table public.lead_activities enable row level security;
alter table public.outreach_drafts enable row level security;
alter table public.ai_generations enable row level security;
alter table public.audit_log enable row level security;

-- Workspaces: members may read; owners/admins may update. Creation is
-- service-role only (the app provisions the single workspace on first login).
drop policy if exists workspaces_member_select on public.workspaces;
create policy workspaces_member_select on public.workspaces
  for select to authenticated
  using (public.is_workspace_member(id));

drop policy if exists workspaces_admin_update on public.workspaces;
create policy workspaces_admin_update on public.workspaces
  for update to authenticated
  using (public.is_workspace_admin(id))
  with check (public.is_workspace_admin(id));

-- Membership: read only for clients. Writes go through the service role so a
-- user can never grant themselves access or escalate a role.
drop policy if exists workspace_members_select on public.workspace_members;
create policy workspace_members_select on public.workspace_members
  for select to authenticated
  using (
    user_id = (select auth.uid())
    or public.is_workspace_member(workspace_id)
  );

-- Standard workspace-scoped CRUD.
do $$
declare
  t text;
begin
  foreach t in array array[
    'brand_profiles', 'brand_writing_samples', 'audience_personas',
    'content_pillars', 'content_ideas', 'posts', 'post_media',
    'social_accounts', 'publish_attempts', 'post_metrics', 'icp_profiles',
    'leads', 'lead_research', 'lead_activities', 'outreach_drafts',
    'ai_generations'
  ] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_workspace_member(workspace_id))',
      t || '_member_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.is_workspace_member(workspace_id))',
      t || '_member_insert', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_member_update', t);
    execute format(
      'create policy %I on public.%I for update to authenticated
         using (public.is_workspace_member(workspace_id))
         with check (public.is_workspace_member(workspace_id))',
      t || '_member_update', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_member_delete', t);
    execute format(
      'create policy %I on public.%I for delete to authenticated
         using (public.is_workspace_member(workspace_id))',
      t || '_member_delete', t
    );
  end loop;
end;
$$;

-- Append-only: visible to members, insertable by members, never updatable or
-- deletable through the client. This protects approval evidence and version
-- snapshots.
do $$
declare
  t text;
begin
  foreach t in array array['post_versions', 'approvals', 'audit_log'] loop
    execute format('drop policy if exists %I on public.%I', t || '_member_select', t);
    execute format(
      'create policy %I on public.%I for select to authenticated
         using (public.is_workspace_member(workspace_id))',
      t || '_member_select', t
    );

    execute format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    execute format(
      'create policy %I on public.%I for insert to authenticated
         with check (public.is_workspace_member(workspace_id))',
      t || '_member_insert', t
    );
  end loop;
end;
$$;

-- Service-role only. RLS is enabled and no policy exists, so `authenticated`
-- and `anon` can never read them. The REVOKE statements after the grants below
-- remove the table privileges as well.

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant all on all tables in schema public to service_role;

-- Defence in depth: these two tables hold OAuth state and encrypted tokens, so
-- even the table privileges are removed from client roles.
revoke all on public.oauth_states from anon, authenticated;
revoke all on public.social_account_secrets from anon, authenticated;

-- ---------------------------------------------------------------------------
-- Seed the single workspace
-- ---------------------------------------------------------------------------

insert into public.workspaces (name, slug, timezone)
values ('CloseLoop', 'closeloop', 'UTC')
on conflict (slug) do nothing;

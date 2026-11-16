-- ============================================================================
-- CloseLoop — Phase 3: Content management
--
-- Phase 1 already created `posts`, `post_versions`, `post_media` and
-- `approvals` with workspace RLS. Phase 2 added the generation fields. This
-- migration only closes the remaining integrity gaps needed by the Phase 3
-- editor, approval workflow and calendar:
--
--   * approved_version can never point at a future version;
--   * an approved/scheduled/publishing/published post must have an approval
--     record for exactly its current version;
--   * approving (setting approved_version) requires approval evidence, so a
--     client cannot forge approval by updating `posts` directly;
--   * library, calendar and media lookups get the supporting indexes;
--   * a storage path can only be attached to one post media row.
--
-- Publishing itself is still out of scope. These constraints only prevent an
-- unapproved version from being treated as ready.
--
-- Run after `20261115000000_phase2_brand_brain.sql`.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Approval integrity
-- ---------------------------------------------------------------------------

alter table public.posts
  drop constraint if exists posts_approved_version_not_future;

alter table public.posts
  add constraint posts_approved_version_not_future
  check (approved_version is null or approved_version <= version);

comment on constraint posts_approved_version_not_future on public.posts is
  'An approval can only refer to a version that exists (or existed).';

-- The Phase 1 check constraint already guarantees:
--   scheduled/publishing/published => approved_version = version.
-- This trigger additionally requires an actual `approvals` row for that
-- version, so setting the columns by hand is not enough.
create or replace function public.enforce_post_approval_evidence()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  check_approval boolean := false;
  latest_decision text;
begin
  if new.approved_version is not null then
    if tg_op = 'INSERT' then
      check_approval := true;
    elsif old.approved_version is distinct from new.approved_version then
      check_approval := true;
    end if;
  end if;

  if check_approval then
    select a.decision
      into latest_decision
      from public.approvals a
     where a.post_id = new.id
       and a.workspace_id = new.workspace_id
       and a.version = new.approved_version
     order by a.created_at desc, a.id desc
     limit 1;

    if latest_decision is distinct from 'approved' then
      raise exception
        'Post % cannot reference approved version % without a current approval record',
        new.id, new.approved_version
        using errcode = 'check_violation';
    end if;
  end if;

  if new.status in ('approved', 'scheduled', 'publishing', 'published') then
    if new.approved_version is null or new.approved_version <> new.version then
      raise exception
        'Post % must be approved at its current version %',
        new.id, new.version
        using errcode = 'check_violation';
    end if;

    select a.decision
      into latest_decision
      from public.approvals a
     where a.post_id = new.id
       and a.workspace_id = new.workspace_id
       and a.version = new.version
     order by a.created_at desc, a.id desc
     limit 1;

    if latest_decision is distinct from 'approved' then
      raise exception
        'Post % has no current approval evidence for version %',
        new.id, new.version
        using errcode = 'check_violation';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists posts_require_approval_evidence on public.posts;

create trigger posts_require_approval_evidence
before insert or update on public.posts
for each row execute function public.enforce_post_approval_evidence();

-- ---------------------------------------------------------------------------
-- Indexes used by the Phase 3 library, calendar and media manager
-- ---------------------------------------------------------------------------

create index if not exists posts_workspace_updated_idx
  on public.posts (workspace_id, updated_at desc);

create index if not exists posts_workspace_created_idx
  on public.posts (workspace_id, created_at desc);

create index if not exists approvals_post_version_idx
  on public.approvals (post_id, version, created_at desc);

create index if not exists post_media_workspace_post_idx
  on public.post_media (workspace_id, post_id, position);

-- A storage object should never be attached twice. This also makes a
-- replace/remove retry safe.
create unique index if not exists post_media_storage_path_key
  on public.post_media (storage_path);

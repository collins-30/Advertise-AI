import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261113000000_initial_schema.sql"),
  "utf8",
);

const STORAGE_MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261113000100_storage.sql"),
  "utf8",
);

const PHASE2_MIGRATION = readFileSync(
  join(process.cwd(), "supabase/migrations/20261115000000_phase2_brand_brain.sql"),
  "utf8",
);

/**
 * These tests are cheap guards around security-critical SQL. They do not replace
 * integration tests against a real Postgres instance, but they fail loudly if a
 * later edit removes RLS or the approval guarantee.
 */
describe("initial schema", () => {
  const tables = [
    "workspaces",
    "workspace_members",
    "brand_profiles",
    "brand_writing_samples",
    "audience_personas",
    "content_pillars",
    "content_ideas",
    "posts",
    "post_versions",
    "post_media",
    "approvals",
    "social_accounts",
    "social_account_secrets",
    "oauth_states",
    "publish_attempts",
    "post_metrics",
    "icp_profiles",
    "leads",
    "lead_research",
    "lead_activities",
    "outreach_drafts",
    "ai_generations",
    "audit_log",
  ];

  it.each(tables)("enables row level security on %s", (table) => {
    expect(MIGRATION).toContain(
      `alter table public.${table} enable row level security;`,
    );
  });

  it("enforces approval at the database level", () => {
    expect(MIGRATION).toContain("posts_approval_matches_version");
    expect(MIGRATION).toMatch(
      /status not in \('scheduled', 'publishing', 'published'\)[\s\S]*approved_version = version/,
    );
  });

  it("requires a scheduled time before a post can be scheduled", () => {
    expect(MIGRATION).toContain("posts_scheduled_requires_time");
  });

  it("removes client table privileges from OAuth state and token secrets", () => {
    const grantIndex = MIGRATION.indexOf(
      "grant select, insert, update, delete on all tables in schema public to authenticated",
    );
    const revokeStateIndex = MIGRATION.indexOf(
      "revoke all on public.oauth_states from anon, authenticated",
    );
    const revokeSecretsIndex = MIGRATION.indexOf(
      "revoke all on public.social_account_secrets from anon, authenticated",
    );

    expect(grantIndex).toBeGreaterThan(-1);
    expect(revokeStateIndex).toBeGreaterThan(grantIndex);
    expect(revokeSecretsIndex).toBeGreaterThan(grantIndex);
  });

  it("keeps approvals, versions and the audit log append-only", () => {
    const appendOnlyBlock = MIGRATION.slice(
      MIGRATION.indexOf("-- Append-only"),
      MIGRATION.indexOf("-- Service-role only"),
    );

    expect(appendOnlyBlock).toContain("for insert to authenticated");
    expect(appendOnlyBlock).not.toContain("for update to authenticated");
    expect(appendOnlyBlock).not.toContain("for delete to authenticated");
  });

  it("never writes membership from the client", () => {
    expect(MIGRATION).not.toMatch(
      /create policy[\s\S]{0,400}?on public\.workspace_members\s+for insert/,
    );
  });

  it("uses workspace membership helpers for policies", () => {
    expect(MIGRATION).toContain("public.is_workspace_member(workspace_id)");
    expect(MIGRATION).toContain("public.is_workspace_admin(id)");
  });
});

describe("storage schema", () => {
  it("creates a public post-media bucket for Meta to fetch", () => {
    expect(STORAGE_MIGRATION).toContain("'post-media'");
    expect(STORAGE_MIGRATION).toMatch(/true,\s*10485760/);
  });

  it("does not grant client write policies", () => {
    expect(STORAGE_MIGRATION).not.toContain("to authenticated");
  });
});

describe("phase 2 brand brain migration", () => {
  it("adds the editable claim lists to the brand profile", () => {
    expect(PHASE2_MIGRATION).toContain(
      "add column if not exists verified_facts text[] not null default '{}'",
    );
    expect(PHASE2_MIGRATION).toContain(
      "add column if not exists proposed_claims text[] not null default '{}'",
    );
    expect(PHASE2_MIGRATION).toContain("add column if not exists claim_notes text");
  });

  it("adds the generation fields used by the draft editor", () => {
    expect(PHASE2_MIGRATION).toContain("add column if not exists image_brief text");
    expect(PHASE2_MIGRATION).toContain(
      "add column if not exists carousel_slides jsonb not null default '[]'::jsonb",
    );
    expect(PHASE2_MIGRATION).toMatch(
      /generation_id uuid\s+references public\.ai_generations\(id\)/,
    );
  });

  it("seeds an assumption-based profile with claims kept separate", () => {
    expect(PHASE2_MIGRATION).toContain("ASSUMPTION-BASED STARTER PROFILE");
    expect(PHASE2_MIGRATION).toMatch(
      /proof_points,\s*verified_facts,\s*proposed_claims,\s*forbidden_claims/,
    );
    expect(PHASE2_MIGRATION).toContain("on conflict (workspace_id) do nothing");
    expect(PHASE2_MIGRATION).toContain("Guaranteed leads, revenue, growth or engagement.");
  });

  it("seeds one agency-owner persona and four starter pillars", () => {
    expect(PHASE2_MIGRATION).toContain("ASSUMPTION-BASED STARTER PERSONA");
    expect(PHASE2_MIGRATION).toContain("'Agency owner / founder'");
    for (const pillar of [
      "Owner-led growth",
      "Content that compounds",
      "Inside CloseLoop",
      "Agency operator notes",
    ]) {
      expect(PHASE2_MIGRATION).toContain(`'${pillar}'`);
    }
  });

  it("only seeds the starter workspace and never overwrites edits", () => {
    expect(PHASE2_MIGRATION).toContain("where w.slug = 'closeloop'");
    expect(PHASE2_MIGRATION.match(/not exists \(/g)).toHaveLength(2);
    expect(PHASE2_MIGRATION).not.toMatch(/\bupdate public\.brand_profiles\b/i);
    expect(PHASE2_MIGRATION).not.toMatch(/\bdelete from\b/i);
  });
});

import "server-only";

import type { User } from "@supabase/supabase-js";

import { ConfigError, getServerEnv } from "@/lib/env.server";
import { APP_IDENTITY } from "@/lib/app-identity";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type WorkspaceRole = "owner" | "admin" | "member";

export type WorkspaceSummary = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  dailyPublishCap: number;
  autoPublish: boolean;
};

export type MembershipFailure =
  | { ok: false; reason: "not_allowed" }
  | { ok: false; reason: "not_configured"; missing: string[] }
  | { ok: false; reason: "error"; message: string };

export type MembershipResult =
  | { ok: true; workspace: WorkspaceSummary; role: WorkspaceRole }
  | MembershipFailure;

/**
 * Finds the user's workspace, creating the default membership on first login.
 *
 * This is the only place where a new `workspace_members` row is created. It
 * runs with the service-role key because RLS deliberately forbids clients from
 * granting themselves membership.
 */
export async function ensureWorkspaceMembership(
  user: Pick<User, "id" | "email">,
): Promise<MembershipResult> {
  const email = user.email?.toLowerCase() ?? "";
  const env = getServerEnv();

  if (env.allowedEmails.length > 0 && !env.allowedEmails.includes(email)) {
    return { ok: false, reason: "not_allowed" };
  }

  let admin: ReturnType<typeof createSupabaseAdminClient>;
  try {
    admin = createSupabaseAdminClient();
  } catch (error) {
    if (error instanceof ConfigError) {
      return {
        ok: false,
        reason: "not_configured",
        missing: ["SUPABASE_SERVICE_ROLE_KEY"],
      };
    }
    throw error;
  }

  const existing = await admin
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing.error) {
    return { ok: false, reason: "error", message: existing.error.message };
  }

  if (existing.data) {
    const workspace = await loadWorkspace(existing.data.workspace_id);
    if (!workspace) {
      return {
        ok: false,
        reason: "error",
        message: "Workspace membership points at a missing workspace.",
      };
    }
    return {
      ok: true,
      workspace,
      role: existing.data.role as WorkspaceRole,
    };
  }

  // First login: attach the user to the single internal workspace.
  const defaultWorkspace = await admin
    .from("workspaces")
    .select("id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  let workspaceId = defaultWorkspace.data?.id;

  if (!workspaceId) {
    const created = await admin
      .from("workspaces")
      .insert({
        name: APP_IDENTITY.name,
        slug: APP_IDENTITY.workspaceSlug,
        timezone: "UTC",
      })
      .select("id")
      .single();

    if (created.error || !created.data) {
      return {
        ok: false,
        reason: "error",
        message: created.error?.message ?? "Could not create the workspace.",
      };
    }

    workspaceId = created.data.id;
  }

  // First member owns the workspace; later accounts join as regular members.
  const anyMember = await admin
    .from("workspace_members")
    .select("user_id")
    .eq("workspace_id", workspaceId)
    .limit(1)
    .maybeSingle();

  if (anyMember.error) {
    return { ok: false, reason: "error", message: anyMember.error.message };
  }

  const role = anyMember.data ? "member" : "owner";

  const membership = await admin
    .from("workspace_members")
    .upsert(
      {
        workspace_id: workspaceId,
        user_id: user.id,
        role,
      },
      { onConflict: "workspace_id,user_id" },
    )
    .select("role")
    .single();

  if (membership.error) {
    return { ok: false, reason: "error", message: membership.error.message };
  }

  await admin.from("audit_log").insert({
    workspace_id: workspaceId,
    actor_id: user.id,
    action: "workspace.member_bootstrapped",
    entity_type: "workspace_member",
    entity_id: user.id,
    metadata: { email },
  });

  const workspace = await loadWorkspace(workspaceId);
  if (!workspace) {
    return {
      ok: false,
      reason: "error",
      message: "Workspace could not be loaded after creation.",
    };
  }

  return {
    ok: true,
    workspace,
    role: membership.data?.role as WorkspaceRole,
  };
}

async function loadWorkspace(
  workspaceId: string,
): Promise<WorkspaceSummary | null> {
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from("workspaces")
    .select("id, name, slug, timezone, daily_publish_cap, auto_publish")
    .eq("id", workspaceId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    name: data.name,
    slug: data.slug,
    timezone: data.timezone,
    dailyPublishCap: data.daily_publish_cap,
    autoPublish: data.auto_publish,
  };
}

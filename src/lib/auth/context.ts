import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { ConfigError, tryGetServerEnv } from "@/lib/env.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  ensureWorkspaceMembership,
  type WorkspaceRole,
  type WorkspaceSummary,
} from "@/lib/auth/workspace";

export type WorkspaceAccess =
  | {
      status: "ok";
      user: User;
      supabase: SupabaseClient<Database>;
      workspace: WorkspaceSummary;
      role: WorkspaceRole;
    }
  | { status: "unauthenticated" }
  | { status: "unconfigured"; missing: string[] }
  | { status: "forbidden"; reason: "not_allowed" | "error"; message: string };

/**
 * Resolves the current user and workspace for a request.
 *
 * Authorization is always verified here, in the data layer — never only in the
 * proxy, which is a convenience redirect rather than a security boundary.
 */
export const getWorkspaceAccess = cache(async (): Promise<WorkspaceAccess> => {
  let supabase: SupabaseClient<Database>;

  const envResult = tryGetServerEnv();
  if (!envResult.ok) {
    return { status: "unconfigured", missing: envResult.missing };
  }

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (error instanceof ConfigError) {
      return { status: "unconfigured", missing: error.missing };
    }
    throw error;
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return { status: "unauthenticated" };
  }

  // Fast path: read the membership with the user's own session (RLS).
  const membership = await supabase
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (membership.data) {
    const workspace = await supabase
      .from("workspaces")
      .select("id, name, slug, timezone, daily_publish_cap, auto_publish")
      .eq("id", membership.data.workspace_id)
      .maybeSingle();

    if (workspace.data) {
      return {
        status: "ok",
        user,
        supabase,
        workspace: toWorkspaceSummary(workspace.data),
        role: membership.data.role as WorkspaceRole,
      };
    }
  }

  // First login (or a broken membership): provision through the service role.
  const result = await ensureWorkspaceMembership(user);

  if (result.ok) {
    return {
      status: "ok",
      user,
      supabase,
      workspace: result.workspace,
      role: result.role,
    };
  }

  if (result.reason === "not_allowed") {
    return {
      status: "forbidden",
      reason: "not_allowed",
      message:
        "This account is not on the allowlist for this workspace. Ask an administrator to add your email to ALLOWED_EMAILS.",
    };
  }

  if (result.reason === "not_configured") {
    return { status: "unconfigured", missing: result.missing };
  }

  return {
    status: "forbidden",
    reason: "error",
    message: result.message,
  };
});

export function toWorkspaceSummary(row: {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  daily_publish_cap: number;
  auto_publish: boolean;
}): WorkspaceSummary {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    timezone: row.timezone,
    dailyPublishCap: row.daily_publish_cap,
    autoPublish: row.auto_publish,
  };
}

export type AuthorizedWorkspace = Extract<WorkspaceAccess, { status: "ok" }>;

/**
 * Use inside pages that are already guarded. Falls back to the login screen for
 * states the layout handles separately.
 *
 * Session reads (`auth.getUser()`) depend on the current time for token
 * expiry, and page segments can be prerendered independently of the layout.
 * `connection()` keeps those reads out of prerendering.
 *
 * Callers must render the consuming component inside a `<Suspense>` boundary.
 * Otherwise this request-time wait blocks client navigation. The app pages use
 * `AppLoading` as the fallback, which never contains workspace data.
 */
export async function requireWorkspaceAccess(): Promise<AuthorizedWorkspace> {
  await connection();

  const access = await getWorkspaceAccess();
  if (access.status !== "ok") {
    redirect("/login");
  }
  return access;
}

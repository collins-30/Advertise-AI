import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PostStatus } from "@/lib/database.types";

export type DashboardCounts = {
  draft: number;
  in_review: number;
  scheduled: number;
  published: number;
};

export type DashboardAccount = {
  id: string;
  platform: "instagram" | "linkedin";
  status: string;
  username: string | null;
  publish_capable: boolean;
  missing_scopes: string[];
};

export type DashboardPost = {
  id: string;
  title: string | null;
  platform: "instagram" | "linkedin";
  status: PostStatus;
  scheduled_for: string | null;
  updated_at: string;
};

export type DashboardData =
  | { schemaReady: false; error: string }
  | {
      schemaReady: true;
      loadError: string | null;
      counts: DashboardCounts;
      accounts: DashboardAccount[];
      brandProfile: {
        companyName: string;
        oneLiner: string | null;
        updatedAt: string;
      } | null;
      personaCount: number;
      nextScheduled: DashboardPost | null;
      recentPosts: DashboardPost[];
    };

type QueryError = { code?: string; message: string } | null;

function isSchemaMissing(error: QueryError): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache/i.test(error.message)
  );
}

/**
 * Loads everything the overview needs in parallel, using the caller's session
 * so RLS applies. Missing tables are reported instead of crashing the page.
 */
export async function getDashboardData(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<DashboardData> {
  const statuses: PostStatus[] = [
    "draft",
    "in_review",
    "scheduled",
    "published",
  ];

  const [counts, accounts, brandProfile, personas, nextScheduled, recentPosts] =
    await Promise.all([
      Promise.all(
        statuses.map((status) =>
          supabase
            .from("posts")
            .select("id", { count: "exact", head: true })
            .eq("workspace_id", workspaceId)
            .eq("status", status),
        ),
      ),
      supabase
        .from("social_accounts")
        .select("id, platform, status, username, publish_capable, missing_scopes")
        .eq("workspace_id", workspaceId)
        .order("platform", { ascending: true }),
      supabase
        .from("brand_profiles")
        .select("company_name, one_liner, updated_at")
        .eq("workspace_id", workspaceId)
        .maybeSingle(),
      supabase
        .from("audience_personas")
        .select("id", { count: "exact", head: true })
        .eq("workspace_id", workspaceId),
      supabase
        .from("posts")
        .select("id, title, platform, status, scheduled_for, updated_at")
        .eq("workspace_id", workspaceId)
        .eq("status", "scheduled")
        .not("scheduled_for", "is", null)
        .order("scheduled_for", { ascending: true })
        .limit(1)
        .maybeSingle(),
      supabase
        .from("posts")
        .select("id, title, platform, status, scheduled_for, updated_at")
        .eq("workspace_id", workspaceId)
        .order("updated_at", { ascending: false })
        .limit(5),
    ]);

  const firstError =
    counts.find((result) => result.error)?.error ??
    accounts.error ??
    brandProfile.error ??
    personas.error ??
    nextScheduled.error ??
    recentPosts.error ??
    null;

  if (isSchemaMissing(firstError)) {
    return { schemaReady: false, error: firstError!.message };
  }

  const countFor = (index: number) => counts[index]?.count ?? 0;

  return {
    schemaReady: true,
    loadError: firstError ? firstError.message : null,
    counts: {
      draft: countFor(0),
      in_review: countFor(1),
      scheduled: countFor(2),
      published: countFor(3),
    },
    accounts: (accounts.data ?? []) as DashboardAccount[],
    brandProfile: brandProfile.data
      ? {
          companyName: brandProfile.data.company_name,
          oneLiner: brandProfile.data.one_liner,
          updatedAt: brandProfile.data.updated_at,
        }
      : null,
    personaCount: personas.count ?? 0,
    nextScheduled: nextScheduled.data as DashboardPost | null,
    recentPosts: (recentPosts.data ?? []) as DashboardPost[],
  };
}

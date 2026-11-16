import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type { Database, PostStatus } from "@/lib/database.types";
import { isMissingSchemaError } from "@/lib/brand/queries";
import { addDays, isDateKey, startOfDayUtc } from "@/lib/content/calendar";
import type {
  CalendarPostView,
  PostDetailData,
  PostLibraryItem,
  PostListFilters,
} from "@/lib/content/types";

const POST_STATUSES: PostStatus[] = [
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "publishing",
  "published",
  "failed",
  "needs_reauth",
  "rejected",
  "archived",
];

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function safeSearch(value: string): string {
  return value
    .slice(0, 100)
    .replace(/[,()%*\\"']/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type PostLibraryResult =
  | { status: "ready"; posts: PostLibraryItem[]; truncated: boolean }
  | { status: "missing" | "error"; message: string };

export async function getPostLibrary(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  filters: PostListFilters,
  timezone: string,
): Promise<PostLibraryResult> {
  const limit = 100;
  let query = supabase
    .from("posts")
    .select(
      "id, title, hook, platform, format, status, pillar_id, version, approved_version, scheduled_for, timezone, created_at, updated_at",
    )
    .eq("workspace_id", workspaceId)
    .order("updated_at", { ascending: false })
    .limit(limit + 1);

  if (filters.platform === "instagram" || filters.platform === "linkedin") {
    query = query.eq("platform", filters.platform);
  }

  if (filters.status && POST_STATUSES.includes(filters.status)) {
    query = query.eq("status", filters.status);
  }

  if (UUID_PATTERN.test(filters.pillarId)) {
    query = query.eq("pillar_id", filters.pillarId);
  }

  const search = safeSearch(filters.search);
  if (search) {
    query = query.or(
      `title.ilike.%${search}%,hook.ilike.%${search}%,caption.ilike.%${search}%,body.ilike.%${search}%`,
    );
  }

  if (isDateKey(filters.from)) {
    query = query.gte("created_at", startOfDayUtc(filters.from, timezone).toISOString());
  }

  if (isDateKey(filters.to)) {
    query = query.lt(
      "created_at",
      startOfDayUtc(addDays(filters.to, 1), timezone).toISOString(),
    );
  }

  const { data, error } = await query;

  if (error) {
    return isMissingSchemaError(error)
      ? { status: "missing", message: error.message }
      : { status: "error", message: error.message };
  }

  const rows = data ?? [];
  const truncated = rows.length > limit;
  const visible = truncated ? rows.slice(0, limit) : rows;
  const ids = visible.map((row) => row.id);
  const pillarIds = Array.from(
    new Set(visible.map((row) => row.pillar_id).filter(Boolean)),
  ) as string[];

  const [mediaResult, pillarResult] = await Promise.all([
    ids.length
      ? supabase
          .from("post_media")
          .select("id, post_id, public_url, alt_text, position")
          .eq("workspace_id", workspaceId)
          .in("post_id", ids)
          .order("position", { ascending: true })
      : Promise.resolve({ data: [], error: null }),
    pillarIds.length
      ? supabase
          .from("content_pillars")
          .select("id, name")
          .eq("workspace_id", workspaceId)
          .in("id", pillarIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const mediaByPost = new Map<
    string,
    { url: string; count: number }
  >();

  for (const media of mediaResult.data ?? []) {
    const current = mediaByPost.get(media.post_id);
    if (current) {
      current.count += 1;
    } else {
      mediaByPost.set(media.post_id, { url: media.public_url, count: 1 });
    }
  }

  const pillarNames = new Map(
    (pillarResult.data ?? []).map((pillar) => [pillar.id, pillar.name]),
  );

  return {
    status: "ready",
    truncated,
    posts: visible.map((row) => {
      const media = mediaByPost.get(row.id);
      return {
        id: row.id,
        title: row.title,
        hook: row.hook,
        platform: row.platform,
        format: row.format,
        status: row.status,
        pillarId: row.pillar_id,
        pillarName: row.pillar_id ? (pillarNames.get(row.pillar_id) ?? null) : null,
        version: row.version,
        approvedVersion: row.approved_version,
        scheduledFor: row.scheduled_for,
        timezone: row.timezone,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
        thumbnailUrl: media?.url ?? null,
        mediaCount: media?.count ?? 0,
      };
    }),
  };
}

export type PostDetailResult =
  | { status: "ready"; data: PostDetailData }
  | { status: "not_found" }
  | { status: "missing" | "error"; message: string };

export async function getPostDetail(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  postId: string,
): Promise<PostDetailResult> {
  const { data: post, error } = await supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("workspace_id", workspaceId)
    .maybeSingle();

  if (error) {
    return isMissingSchemaError(error)
      ? { status: "missing", message: error.message }
      : { status: "error", message: error.message };
  }

  if (!post) return { status: "not_found" };

  const [media, versions, approvals, pillar, persona] = await Promise.all([
    supabase
      .from("post_media")
      .select(
        "id, storage_path, public_url, mime_type, width, height, size_bytes, alt_text, position, created_at",
      )
      .eq("post_id", postId)
      .eq("workspace_id", workspaceId)
      .order("position", { ascending: true }),
    supabase
      .from("post_versions")
      .select("*")
      .eq("post_id", postId)
      .eq("workspace_id", workspaceId)
      .order("version", { ascending: false })
      .limit(50),
    supabase
      .from("approvals")
      .select("*")
      .eq("post_id", postId)
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false })
      .limit(50),
    post.pillar_id
      ? supabase
          .from("content_pillars")
          .select("id, name")
          .eq("id", post.pillar_id)
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
    post.persona_id
      ? supabase
          .from("audience_personas")
          .select("id, name, is_primary")
          .eq("id", post.persona_id)
          .eq("workspace_id", workspaceId)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  const firstError =
    media.error ?? versions.error ?? approvals.error ?? pillar.error ?? persona.error;

  if (firstError) {
    return isMissingSchemaError(firstError)
      ? { status: "missing", message: firstError.message }
      : { status: "error", message: firstError.message };
  }

  return {
    status: "ready",
    data: {
      post,
      pillar: pillar.data,
      persona: persona.data,
      media: media.data ?? [],
      versions: versions.data ?? [],
      approvals: approvals.data ?? [],
    },
  };
}

export type CalendarQueryResult =
  | {
      status: "ready";
      posts: CalendarPostView[];
      approvedUnscheduled: Array<{
        id: string;
        title: string;
        platform: "instagram" | "linkedin";
        version: number;
      }>;
    }
  | { status: "missing" | "error"; message: string };

export async function getCalendarData(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  startIso: string,
  endIso: string,
): Promise<CalendarQueryResult> {
  const [scheduled, approved] = await Promise.all([
    supabase
      .from("posts")
      .select(
        "id, title, hook, platform, status, version, approved_version, scheduled_for, timezone",
      )
      .eq("workspace_id", workspaceId)
      .not("scheduled_for", "is", null)
      .gte("scheduled_for", startIso)
      .lt("scheduled_for", endIso)
      .order("scheduled_for", { ascending: true })
      .limit(200),
    supabase
      .from("posts")
      .select("id, title, hook, platform, version, approved_version")
      .eq("workspace_id", workspaceId)
      .eq("status", "approved")
      .is("scheduled_for", null)
      .order("updated_at", { ascending: false })
      .limit(25),
  ]);

  const firstError = scheduled.error ?? approved.error;
  if (firstError) {
    return isMissingSchemaError(firstError)
      ? { status: "missing", message: firstError.message }
      : { status: "error", message: firstError.message };
  }

  const rows: Array<{
    id: string;
    title: string | null;
    hook: string | null;
    platform: "instagram" | "linkedin";
    status: PostStatus;
    version: number;
    approved_version: number | null;
    scheduled_for: string;
    timezone: string;
  }> = [];

  for (const row of scheduled.data ?? []) {
    if (typeof row.scheduled_for === "string") {
      rows.push({ ...row, scheduled_for: row.scheduled_for });
    }
  }
  const ids = rows.map((row) => row.id);

  const mediaResult = ids.length
    ? await supabase
        .from("post_media")
        .select("post_id, public_url, position")
        .eq("workspace_id", workspaceId)
        .in("post_id", ids)
        .order("position", { ascending: true })
    : { data: [], error: null };

  const thumbnails = new Map<string, string>();
  for (const media of mediaResult.data ?? []) {
    if (!thumbnails.has(media.post_id)) {
      thumbnails.set(media.post_id, media.public_url);
    }
  }

  return {
    status: "ready",
    posts: rows.map((row) => ({
      id: row.id,
      title: row.title,
      hook: row.hook,
      platform: row.platform,
      status: row.status,
      version: row.version,
      approvedVersion: row.approved_version,
      scheduledFor: row.scheduled_for,
      timezone: row.timezone,
      thumbnailUrl: thumbnails.get(row.id) ?? null,
    })),
    approvedUnscheduled: (approved.data ?? [])
      .filter((row) => row.approved_version === row.version)
      .map((row) => ({
        id: row.id,
        title: row.title?.trim() || row.hook?.trim() || "Untitled post",
        platform: row.platform,
        version: row.version,
      })),
  };
}

import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import type {
  AiGenerationRow,
  AudiencePersonaRow,
  BrandProfileRow,
  BrandWritingSampleRow,
  ContentPillarRow,
  Database,
  PostRow,
} from "@/lib/database.types";

type QueryError = { code?: string; message: string } | null;

export function isMissingSchemaError(error: QueryError): boolean {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.code === "PGRST205" ||
    /does not exist|schema cache|could not find the .* column/i.test(
      error.message,
    )
  );
}

export type BrandBrainData =
  | {
      status: "ready";
      profile: BrandProfileRow | null;
      personas: AudiencePersonaRow[];
      pillars: ContentPillarRow[];
      samples: BrandWritingSampleRow[];
    }
  | { status: "missing"; message: string }
  | { status: "error"; message: string };

export async function getBrandBrain(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
): Promise<BrandBrainData> {
  const [profile, personas, pillars, samples] = await Promise.all([
    supabase
      .from("brand_profiles")
      .select("*")
      .eq("workspace_id", workspaceId)
      .maybeSingle(),
    supabase
      .from("audience_personas")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("content_pillars")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: true }),
    supabase
      .from("brand_writing_samples")
      .select("*")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false }),
  ]);

  const firstError =
    profile.error ?? personas.error ?? pillars.error ?? samples.error ?? null;

  if (firstError) {
    if (isMissingSchemaError(firstError)) {
      return {
        status: "missing",
        message: firstError.message,
      };
    }
    return { status: "error", message: firstError.message };
  }

  return {
    status: "ready",
    profile: profile.data,
    personas: personas.data ?? [],
    pillars: pillars.data ?? [],
    samples: samples.data ?? [],
  };
}

export type GenerationHistoryItem = Pick<
  AiGenerationRow,
  | "id"
  | "kind"
  | "model"
  | "prompt_version"
  | "status"
  | "error"
  | "tokens_input"
  | "tokens_output"
  | "cost_usd"
  | "created_at"
  | "input"
>;

export async function getRecentGenerations(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  limit = 6,
): Promise<GenerationHistoryItem[]> {
  const { data, error } = await supabase
    .from("ai_generations")
    .select(
      "id, kind, model, prompt_version, status, error, tokens_input, tokens_output, cost_usd, created_at, input",
    )
    .eq("workspace_id", workspaceId)
    .eq("kind", "content")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

export type SavedDraftItem = Pick<
  PostRow,
  | "id"
  | "title"
  | "platform"
  | "status"
  | "created_at"
  | "updated_at"
>;

export async function getRecentAiDrafts(
  supabase: SupabaseClient<Database>,
  workspaceId: string,
  limit = 5,
): Promise<SavedDraftItem[]> {
  const { data, error } = await supabase
    .from("posts")
    .select("id, title, platform, status, created_at, updated_at")
    .eq("workspace_id", workspaceId)
    .eq("source", "ai")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return [];
  return data ?? [];
}

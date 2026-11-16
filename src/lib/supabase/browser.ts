"use client";

import { createBrowserClient } from "@supabase/ssr";

import type { Database } from "@/lib/database.types";
import { normalizeSupabaseProjectUrl } from "@/lib/env-url";
import { getPublicEnv } from "@/lib/env.public";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;

/**
 * Browser Supabase client. Uses the anon key only — every query is still
 * constrained by Row Level Security.
 */
export function getSupabaseBrowserClient() {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
    );
  }

  let projectUrl: string;
  try {
    projectUrl = normalizeSupabaseProjectUrl(supabaseUrl);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? error.message
        : "NEXT_PUBLIC_SUPABASE_URL is invalid.",
    );
  }

  if (!client) {
    client = createBrowserClient<Database>(projectUrl, supabaseAnonKey);
  }

  return client;
}

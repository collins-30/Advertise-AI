/**
 * Client-safe environment access.
 *
 * Only `NEXT_PUBLIC_*` variables belong here. They are inlined by Next.js at
 * build time, so each one must be referenced statically.
 */

import { isValidSupabaseProjectUrl, normalizeAppUrl } from "@/lib/env-url";

export type PublicEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appUrl: string;
};

export function getPublicEnv(): PublicEnv {
  return {
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    supabaseAnonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  };
}

/**
 * True when the minimum configuration required to talk to Supabase exists.
 * Used to render a setup screen instead of crashing the whole app.
 */
export function isSupabaseConfigured(): boolean {
  const { supabaseUrl, supabaseAnonKey } = getPublicEnv();
  return Boolean(
    supabaseUrl &&
      supabaseAnonKey &&
      isValidSupabaseProjectUrl(supabaseUrl),
  );
}

/** The absolute site URL, used for OAuth redirects and auth emails. */
export function getSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (explicit) {
    try {
      return normalizeAppUrl(explicit);
    } catch {
      // `tryGetServerEnv()` reports the invalid value. Keep setup/error screens
      // renderable instead of crashing while resolving the fallback.
    }
  }

  const vercel = process.env.NEXT_PUBLIC_VERCEL_URL?.trim();
  if (vercel) {
    try {
      return normalizeAppUrl(
        /^https?:\/\//i.test(vercel) ? vercel : `https://${vercel}`,
      );
    } catch {
      // Fall through to the local default.
    }
  }

  return "http://localhost:3000";
}

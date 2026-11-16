import "server-only";

import { createClient } from "@supabase/supabase-js";

import type { Database } from "@/lib/database.types";
import { ConfigError, getServerEnv } from "@/lib/env.server";

/**
 * Service-role client. Bypasses Row Level Security.
 *
 * Only use for operations that cannot be expressed with a user session:
 * workspace bootstrap, OAuth state, encrypted token storage, and webhooks.
 * Never import this module from a Client Component.
 */
export function isAdminClientAvailable(): boolean {
  return Boolean(getServerEnvSafe()?.supabaseServiceRoleKey);
}

function getServerEnvSafe() {
  try {
    return getServerEnv();
  } catch {
    return null;
  }
}

export function createSupabaseAdminClient() {
  const env = getServerEnv();

  if (!env.supabaseServiceRoleKey) {
    throw new ConfigError(["SUPABASE_SERVICE_ROLE_KEY"]);
  }

  return createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import type { Database } from "@/lib/database.types";
import { getServerEnv } from "@/lib/env.server";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Creates a new client per request — never share it.
 */
export async function createSupabaseServerClient() {
  const cookieStore = await cookies();
  const env = getServerEnv();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot write cookies. Session refresh is handled
          // by the proxy, so this is safe to ignore here.
        }
      },
    },
  });
}

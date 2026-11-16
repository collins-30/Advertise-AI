import { NextResponse, type NextRequest } from "next/server";

import { ensureWorkspaceMembership } from "@/lib/auth/workspace";
import { ConfigError } from "@/lib/env.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/url";

/**
 * Handles the PKCE code exchange for magic links and OAuth providers.
 * Supabase redirects here after the user clicks an emailed link.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeInternalPath(url.searchParams.get("next"));
  const providerError =
    url.searchParams.get("error_description") ?? url.searchParams.get("error");

  if (providerError) {
    return NextResponse.redirect(
      new URL(`/login?error=${encodeURIComponent(providerError)}`, url.origin),
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=Missing%20authorization%20code", url.origin),
    );
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;

  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (error instanceof ConfigError) {
      return NextResponse.redirect(new URL("/setup", url.origin));
    }
    throw error;
  }

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          error?.message ?? "Could not complete sign in.",
        )}`,
        url.origin,
      ),
    );
  }

  const membership = await ensureWorkspaceMembership(data.user);

  if (!membership.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(
          membership.reason === "not_allowed"
            ? "This account is not on the workspace allowlist."
            : membership.reason === "not_configured"
              ? `Server configuration is incomplete: ${membership.missing.join(", ")}`
              : membership.message,
        )}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

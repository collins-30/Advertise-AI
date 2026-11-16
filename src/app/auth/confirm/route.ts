import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

import { ensureWorkspaceMembership } from "@/lib/auth/workspace";
import { ConfigError } from "@/lib/env.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/url";

/**
 * Verifies email token-hash links (confirmation, recovery, invite).
 * Some Supabase email templates use `token_hash` instead of a PKCE `code`.
 */
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const tokenHash = url.searchParams.get("token_hash");
  const type = url.searchParams.get("type") as EmailOtpType | null;
  const next = safeInternalPath(url.searchParams.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(
      new URL("/login?error=Invalid%20or%20expired%20link", url.origin),
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

  const { data, error } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type,
  });

  if (error || !data.user) {
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error?.message ?? "Link could not be verified.")}`,
        url.origin,
      ),
    );
  }

  const membership = await ensureWorkspaceMembership(data.user);

  if (!membership.ok) {
    await supabase.auth.signOut();
    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent("This account is not allowed to access the workspace.")}`,
        url.origin,
      ),
    );
  }

  return NextResponse.redirect(new URL(next, url.origin));
}

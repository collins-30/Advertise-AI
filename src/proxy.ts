import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { normalizeSupabaseProjectUrl } from "@/lib/env-url";

/**
 * Paths that never require a session. API routes are excluded because each
 * route handler performs its own authentication (webhooks use signatures,
 * Inngest uses its signing key).
 */
const PUBLIC_PREFIXES = ["/login", "/signup", "/auth", "/setup", "/api"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

/**
 * Refreshes the Supabase session cookie and redirects signed-out users away
 * from the app. This is a convenience layer only: every page, action and route
 * handler verifies authorization again against the database.
 */
export async function proxy(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Not configured yet: let the app render its setup screen.
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let projectUrl: string;
  try {
    projectUrl = normalizeSupabaseProjectUrl(supabaseUrl);
  } catch {
    // An invalid URL must not crash the proxy. The app's config checks render
    // the actionable setup screen instead.
    return NextResponse.next();
  }

  const { pathname } = request.nextUrl;
  let response = NextResponse.next({ request });

  const supabase = createServerClient(projectUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }

        response = NextResponse.next({ request });

        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }

        for (const [key, value] of Object.entries(headers)) {
          response.headers.set(key, value);
        }
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set(
      "next",
      `${pathname}${request.nextUrl.search}`,
    );

    const redirectResponse = NextResponse.redirect(loginUrl);
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  if (user && (pathname === "/login" || pathname === "/signup")) {
    const redirectResponse = NextResponse.redirect(
      new URL("/", request.url),
    );
    copyCookies(response, redirectResponse);
    return redirectResponse;
  }

  return response;
}

function copyCookies(from: NextResponse, to: NextResponse) {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }

  for (const [key, value] of from.headers.entries()) {
    if (key.toLowerCase() === "set-cookie") continue;
    to.headers.set(key, value);
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|avif|ico|txt|xml|woff|woff2)$).*)",
  ],
};

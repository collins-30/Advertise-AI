/**
 * Environment URL normalization.
 *
 * Supabase's client appends `/auth/v1` and `/rest/v1` itself, so the configured
 * project URL must be the bare origin. Copying the REST endpoint from the
 * Supabase dashboard is a common mistake and produces gateway errors such as
 * "Invalid path specified in request URL".
 */

const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);

export class EnvUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "EnvUrlError";
  }
}

function isLocalHostname(hostname: string): boolean {
  const value = hostname.toLocaleLowerCase().replace(/^\[|\]$/g, "");
  return LOCAL_HOSTNAMES.has(value) || value.endsWith(".localhost");
}

function parseAbsoluteUrl(value: string, label: string): URL {
  try {
    return new URL(value);
  } catch {
    throw new EnvUrlError(
      `${label} must be an absolute URL including its protocol, for example https://your-project.supabase.co.`,
    );
  }
}

function assertSafeProtocol(url: URL, label: string): void {
  if (url.protocol === "https:") return;
  if (url.protocol === "http:" && isLocalHostname(url.hostname)) return;

  throw new EnvUrlError(
    `${label} must use https:// (http:// is only allowed for localhost).`,
  );
}

export function normalizeSupabaseProjectUrl(raw: string): string {
  const value = raw.trim();
  if (!value) {
    throw new EnvUrlError("NEXT_PUBLIC_SUPABASE_URL is not set.");
  }

  const url = parseAbsoluteUrl(value, "NEXT_PUBLIC_SUPABASE_URL");
  assertSafeProtocol(url, "NEXT_PUBLIC_SUPABASE_URL");

  if (url.username || url.password) {
    throw new EnvUrlError(
      "NEXT_PUBLIC_SUPABASE_URL must not include credentials.",
    );
  }

  // The project URL is always the origin. Drop `/rest/v1/`, `/auth/v1/`, a
  // trailing slash, or any other path copied from the dashboard.
  return url.origin;
}

export function isValidSupabaseProjectUrl(raw: string): boolean {
  try {
    normalizeSupabaseProjectUrl(raw);
    return true;
  } catch {
    return false;
  }
}

export function normalizeAppUrl(
  raw: string | undefined,
  fallback = "http://localhost:3000",
): string {
  const value = raw?.trim() || fallback.trim();
  if (!value) {
    throw new EnvUrlError("NEXT_PUBLIC_APP_URL is not set.");
  }

  const url = parseAbsoluteUrl(value, "NEXT_PUBLIC_APP_URL");
  assertSafeProtocol(url, "NEXT_PUBLIC_APP_URL");

  if (url.username || url.password) {
    throw new EnvUrlError("NEXT_PUBLIC_APP_URL must not include credentials.");
  }

  const path = url.pathname.replace(/\/+$/, "");
  return `${url.origin}${path}`;
}

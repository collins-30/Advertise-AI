/**
 * URL helpers for redirect targets.
 *
 * Any value that comes from a query string or form field is untrusted: an
 * attacker can attempt `//evil.example` or `https://evil.example` to turn a
 * login redirect into an open redirect.
 */

export function safeInternalPath(value: unknown, fallback = "/"): string {
  if (typeof value !== "string") return fallback;
  if (value.length === 0) return fallback;
  if (!value.startsWith("/")) return fallback;
  if (value.startsWith("//")) return fallback;
  // Backslashes are treated as slashes by some browsers.
  if (value.includes("\\")) return fallback;
  // Control characters can break out of header values.
  if (/[\u0000-\u001f\u007f]/.test(value)) return fallback;

  return value;
}

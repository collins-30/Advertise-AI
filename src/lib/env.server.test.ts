import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const ANON_KEY = "test-anon-key-that-is-long-enough";

beforeEach(() => {
  vi.resetModules();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("tryGetServerEnv", () => {
  it("normalizes a REST URL to the project origin", async () => {
    vi.stubEnv(
      "NEXT_PUBLIC_SUPABASE_URL",
      "https://example.supabase.co/rest/v1/",
    );
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://closeloop.example/");

    const { tryGetServerEnv } = await import("@/lib/env.server");
    const result = tryGetServerEnv();

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.env.supabaseUrl).toBe("https://example.supabase.co");
    expect(result.env.appUrl).toBe("https://closeloop.example");
  });

  it("reports a clear error for a relative Supabase URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "/rest/v1/");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);

    const { tryGetServerEnv } = await import("@/lib/env.server");
    const result = tryGetServerEnv();

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.missing).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(result.details.join(" ")).toMatch(/absolute URL/);
  });

  it("rejects an app URL without a protocol", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://example.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", ANON_KEY);
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "closeloop.example");

    const { tryGetServerEnv } = await import("@/lib/env.server");
    const result = tryGetServerEnv();

    expect(result.ok).toBe(false);
    if (result.ok) return;

    expect(result.missing).toContain("NEXT_PUBLIC_APP_URL");
    expect(result.details.join(" ")).toMatch(/absolute URL/);
  });
});

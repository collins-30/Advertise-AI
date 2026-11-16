import { beforeEach, describe, expect, it, vi } from "vitest";

const adminClient = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createSupabaseAdminClient: () => adminClient(),
}));

vi.mock("@/lib/env.server", async () => {
  const actual = await vi.importActual<typeof import("@/lib/env.server")>(
    "@/lib/env.server",
  );

  return {
    ...actual,
    getServerEnv: () => ({
      supabaseUrl: "https://example.supabase.co",
      supabaseAnonKey: "anon-key",
      supabaseServiceRoleKey: "service-role-key",
      tokenEncryptionKey: null,
      openAiApiKey: null,
      allowedEmails: ["allowed@closeloop.test"],
      appUrl: "http://localhost:3000",
      isProduction: false,
    }),
  };
});

const { ensureWorkspaceMembership } = await import("@/lib/auth/workspace");

describe("ensureWorkspaceMembership", () => {
  beforeEach(() => {
    adminClient.mockReset();
  });

  it("rejects an email outside the allowlist before touching the database", async () => {
    const result = await ensureWorkspaceMembership({
      id: "user-1",
      email: "intruder@example.com",
    });

    expect(result).toEqual({ ok: false, reason: "not_allowed" });
    expect(adminClient).not.toHaveBeenCalled();
  });

  it("reports a configuration error when the service-role client is unavailable", async () => {
    const { ConfigError } = await import("@/lib/env.server");

    adminClient.mockImplementation(() => {
      throw new ConfigError(["SUPABASE_SERVICE_ROLE_KEY"]);
    });

    const result = await ensureWorkspaceMembership({
      id: "user-1",
      email: "allowed@closeloop.test",
    });

    expect(result).toEqual({
      ok: false,
      reason: "not_configured",
      missing: ["SUPABASE_SERVICE_ROLE_KEY"],
    });
  });

  it("propagates unexpected client errors instead of hiding them", async () => {
    adminClient.mockImplementation(() => {
      throw new Error("unexpected failure");
    });

    await expect(
      ensureWorkspaceMembership({
        id: "user-1",
        email: "allowed@closeloop.test",
      }),
    ).rejects.toThrow("unexpected failure");
  });

  it("does not allow an empty email to bypass the allowlist", async () => {
    const result = await ensureWorkspaceMembership({
      id: "user-1",
      email: null,
    } as unknown as Parameters<typeof ensureWorkspaceMembership>[0]);

    expect(result).toEqual({ ok: false, reason: "not_allowed" });
    expect(adminClient).not.toHaveBeenCalled();
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  isValidSupabaseProjectUrl,
  normalizeAppUrl,
  normalizeSupabaseProjectUrl,
} from "@/lib/env-url";
import { getSiteUrl } from "@/lib/env.public";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("normalizeSupabaseProjectUrl", () => {
  it("keeps a bare project origin unchanged", () => {
    expect(
      normalizeSupabaseProjectUrl("https://example.supabase.co"),
    ).toBe("https://example.supabase.co");
  });

  it("strips the REST path copied from the dashboard", () => {
    expect(
      normalizeSupabaseProjectUrl("https://example.supabase.co/rest/v1/"),
    ).toBe("https://example.supabase.co");
  });

  it("strips auth paths, queries and trailing slashes", () => {
    expect(
      normalizeSupabaseProjectUrl(
        "https://example.supabase.co/auth/v1/?apikey=ignored",
      ),
    ).toBe("https://example.supabase.co");
  });

  it("allows http only for local Supabase", () => {
    expect(normalizeSupabaseProjectUrl("http://127.0.0.1:54321")).toBe(
      "http://127.0.0.1:54321",
    );

    expect(() =>
      normalizeSupabaseProjectUrl("http://example.supabase.co"),
    ).toThrow(/must use https/);
  });

  it("rejects relative URLs, credentials and empty values", () => {
    expect(() => normalizeSupabaseProjectUrl("/rest/v1/")).toThrow(
      /absolute URL/,
    );
    expect(() =>
      normalizeSupabaseProjectUrl("https://user:pass@example.supabase.co"),
    ).toThrow(/must not include credentials/);
    expect(() => normalizeSupabaseProjectUrl(" ")).toThrow(/not set/);
  });

  it("validates without throwing", () => {
    expect(isValidSupabaseProjectUrl("https://example.supabase.co")).toBe(true);
    expect(isValidSupabaseProjectUrl("example.supabase.co")).toBe(false);
  });
});

describe("normalizeAppUrl", () => {
  it("removes trailing slashes and keeps the protocol", () => {
    expect(normalizeAppUrl("https://closeloop.example/")).toBe(
      "https://closeloop.example",
    );
    expect(normalizeAppUrl("http://localhost:3000/")).toBe(
      "http://localhost:3000",
    );
  });

  it("preserves an application base path", () => {
    expect(normalizeAppUrl("https://closeloop.example/app/")).toBe(
      "https://closeloop.example/app",
    );
  });

  it("rejects URLs without a protocol or with http outside localhost", () => {
    expect(() => normalizeAppUrl("closeloop.example")).toThrow(/absolute URL/);
    expect(() => normalizeAppUrl("http://closeloop.example")).toThrow(
      /must use https/,
    );
  });

  it("uses localhost when the value is blank", () => {
    expect(normalizeAppUrl(undefined)).toBe("http://localhost:3000");
  });
});

describe("getSiteUrl", () => {
  it("normalizes the configured app URL", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "https://closeloop.example/");
    expect(getSiteUrl()).toBe("https://closeloop.example");
  });

  it("falls back safely when the configured URL is invalid", () => {
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "closeloop.example");
    vi.stubEnv("NEXT_PUBLIC_VERCEL_URL", "");
    expect(getSiteUrl()).toBe("http://localhost:3000");
  });
});

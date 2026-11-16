import { describe, expect, it } from "vitest";

import { safeInternalPath } from "@/lib/url";

describe("safeInternalPath", () => {
  it("keeps internal paths", () => {
    expect(safeInternalPath("/")).toBe("/");
    expect(safeInternalPath("/posts")).toBe("/posts");
    expect(safeInternalPath("/posts/abc?tab=preview")).toBe(
      "/posts/abc?tab=preview",
    );
  });

  it("rejects absolute URLs and protocol-relative URLs", () => {
    expect(safeInternalPath("https://evil.example")).toBe("/");
    expect(safeInternalPath("//evil.example/path")).toBe("/");
    expect(safeInternalPath("javascript:alert(1)")).toBe("/");
  });

  it("rejects path traversal and backslash tricks", () => {
    expect(safeInternalPath("/\\evil.example")).toBe("/");
    expect(safeInternalPath("\\\\evil.example")).toBe("/");
  });

  it("rejects control characters", () => {
    expect(safeInternalPath("/ok\nSet-Cookie: x=1")).toBe("/");
  });

  it("handles non-string input", () => {
    expect(safeInternalPath(null)).toBe("/");
    expect(safeInternalPath(undefined)).toBe("/");
    expect(safeInternalPath(42)).toBe("/");
    expect(safeInternalPath("")).toBe("/");
  });

  it("uses a caller-provided fallback", () => {
    expect(safeInternalPath("https://evil.example", "/dashboard")).toBe(
      "/dashboard",
    );
  });
});

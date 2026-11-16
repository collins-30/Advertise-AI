import { describe, expect, it } from "vitest";

import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "@/lib/format";

describe("formatDateTime", () => {
  it("formats in the requested timezone", () => {
    const formatted = formatDateTime("2026-11-13T09:30:00.000Z", "UTC");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("09:30");
  });

  it("returns a safe label for invalid input", () => {
    expect(formatDateTime("not-a-date")).toBe("Unknown date");
  });
});

describe("formatDate", () => {
  it("omits the time", () => {
    const formatted = formatDate("2026-11-13T09:30:00.000Z", "UTC");
    expect(formatted).toContain("2026");
    expect(formatted).not.toContain("09:30");
  });
});

describe("formatNumber", () => {
  it("handles empty values", () => {
    expect(formatNumber(null)).toBe("—");
    expect(formatNumber(undefined)).toBe("—");
  });

  it("formats large numbers compactly", () => {
    expect(formatNumber(1200)).toMatch(/1\.2K|1K|1\.2k/i);
  });
});

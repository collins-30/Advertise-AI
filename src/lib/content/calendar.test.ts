import { describe, expect, it } from "vitest";

import {
  addDays,
  calendarRange,
  dateKeyInTimeZone,
  dayNumber,
  isInMonth,
  localDateTimeValueFromIso,
  monthGridKeys,
  monthLabel,
  startOfDayUtc,
  weekKeys,
  weekLabel,
  weekdayIndexMondayFirst,
  zonedDateTimeToUtc,
} from "@/lib/content/calendar";

describe("dateKeyInTimeZone", () => {
  it("uses the workspace wall-clock day rather than UTC", () => {
    const instant = new Date("2026-11-16T23:30:00Z");

    expect(dateKeyInTimeZone(instant, "Europe/London")).toBe("2026-11-16");
    expect(dateKeyInTimeZone(instant, "Asia/Tokyo")).toBe("2026-11-17");
  });
});

describe("monthGridKeys", () => {
  it("returns six weeks starting on the Monday before the 1st", () => {
    const keys = monthGridKeys("2026-11-01");

    expect(keys).toHaveLength(42);
    expect(keys[0]).toBe("2026-10-26");
    expect(keys[41]).toBe("2026-12-06");
    expect(weekdayIndexMondayFirst(keys[0])).toBe(0);
  });

  it("keeps the anchor month intact across a year boundary", () => {
    expect(monthGridKeys("2027-01-15")[0]).toBe("2026-12-28");
    expect(monthLabel("2027-01-15")).toBe("January 2027");
  });
});

describe("weekKeys", () => {
  it("returns the Monday-to-Sunday week containing the anchor", () => {
    expect(weekKeys("2026-11-18")).toEqual([
      "2026-11-16",
      "2026-11-17",
      "2026-11-18",
      "2026-11-19",
      "2026-11-20",
      "2026-11-21",
      "2026-11-22",
    ]);
  });
});

describe("zonedDateTimeToUtc", () => {
  it("handles winter time", () => {
    expect(
      zonedDateTimeToUtc("2026-11-16T09:30", "Europe/London")?.toISOString(),
    ).toBe("2026-11-16T09:30:00.000Z");
  });

  it("handles British summer time", () => {
    expect(
      zonedDateTimeToUtc("2026-07-01T09:30", "Europe/London")?.toISOString(),
    ).toBe("2026-07-01T08:30:00.000Z");
  });

  it("handles negative offsets", () => {
    expect(
      zonedDateTimeToUtc("2026-11-16T09:30", "America/New_York")?.toISOString(),
    ).toBe("2026-11-16T14:30:00.000Z");
  });

  it("handles positive offsets", () => {
    expect(
      zonedDateTimeToUtc("2026-11-16T09:30", "Asia/Tokyo")?.toISOString(),
    ).toBe("2026-11-16T00:30:00.000Z");
  });

  it("rejects malformed input", () => {
    expect(zonedDateTimeToUtc("16/11/2026 09:30", "UTC")).toBeNull();
    expect(zonedDateTimeToUtc("2026-02-31T09:30", "UTC")).toBeNull();
  });
});

describe("startOfDayUtc", () => {
  it("returns midnight in the workspace timezone", () => {
    expect(startOfDayUtc("2026-11-16", "Europe/London").toISOString()).toBe(
      "2026-11-16T00:00:00.000Z",
    );
    expect(startOfDayUtc("2026-11-16", "Asia/Tokyo").toISOString()).toBe(
      "2026-11-15T15:00:00.000Z",
    );
  });
});

describe("localDateTimeValueFromIso", () => {
  it("formats a stored instant for a datetime-local input", () => {
    expect(
      localDateTimeValueFromIso("2026-11-16T14:30:00Z", "America/New_York"),
    ).toBe("2026-11-16T09:30");
  });
});

describe("calendarRange", () => {
  it("covers the whole first day through the end of the last day", () => {
    const range = calendarRange(["2026-11-16", "2026-11-22"], "Europe/London");

    expect(range.start).toBe("2026-11-16T00:00:00.000Z");
    expect(range.end).toBe("2026-11-23T00:00:00.000Z");
  });
});

describe("date helpers", () => {
  it("adds days without drifting through timezones", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("keeps month labels and membership stable", () => {
    expect(dayNumber("2026-11-16")).toBe(16);
    expect(isInMonth("2026-11-30", "2026-11-01")).toBe(true);
    expect(isInMonth("2026-12-01", "2026-11-01")).toBe(false);
    expect(weekLabel("2026-11-18")).toBe("16 Nov 2026 – 22 Nov 2026");
  });
});

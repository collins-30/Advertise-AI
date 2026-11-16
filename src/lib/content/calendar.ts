/**
 * Calendar helpers.
 *
 * Posts store `scheduled_for` as timestamptz plus the workspace timezone. The
 * UI groups posts by the *wall-clock day in the workspace timezone*, not by the
 * server's local day, so all conversions live here and are unit tested.
 */

const DATE_KEY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const LOCAL_DATE_TIME_PATTERN =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

type DateParts = { year: number; month: number; day: number };

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function partsFromKey(key: string): DateParts | null {
  const match = DATE_KEY_PATTERN.exec(key);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  return { year, month, day };
}

export function isDateKey(value: string): boolean {
  return partsFromKey(value) !== null;
}

function keyFromParts(parts: DateParts): string {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}

function keyFromUtcDate(date: Date): string {
  return keyFromParts({
    year: date.getUTCFullYear(),
    month: date.getUTCMonth() + 1,
    day: date.getUTCDate(),
  });
}

export function dateKeyInTimeZone(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}`;
}

export function todayKeyInTimeZone(
  timeZone: string,
  now: Date = new Date(),
): string {
  return dateKeyInTimeZone(now, timeZone);
}

export function addDays(dateKey: string, days: number): string {
  const parts = partsFromKey(dateKey);
  if (!parts) throw new Error(`Invalid date key: ${dateKey}`);

  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days));
  return keyFromUtcDate(date);
}

export function startOfMonthKey(dateKey: string): string {
  const parts = partsFromKey(dateKey);
  if (!parts) throw new Error(`Invalid date key: ${dateKey}`);
  return `${parts.year}-${pad(parts.month)}-01`;
}

export function shiftMonthKey(dateKey: string, offset: number): string {
  const parts = partsFromKey(dateKey);
  if (!parts) throw new Error(`Invalid date key: ${dateKey}`);

  const date = new Date(Date.UTC(parts.year, parts.month - 1 + offset, 1));
  return keyFromUtcDate(date);
}

export function weekdayIndexMondayFirst(dateKey: string): number {
  const parts = partsFromKey(dateKey);
  if (!parts) throw new Error(`Invalid date key: ${dateKey}`);

  const day = new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day),
  ).getUTCDay();
  return (day + 6) % 7;
}

/** Six weeks of keys starting on the Monday on/before the 1st of the month. */
export function monthGridKeys(anchorKey: string): string[] {
  const first = startOfMonthKey(anchorKey);
  const start = addDays(first, -weekdayIndexMondayFirst(first));
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
}

export function weekKeys(anchorKey: string): string[] {
  const start = addDays(anchorKey, -weekdayIndexMondayFirst(anchorKey));
  return Array.from({ length: 7 }, (_, index) => addDays(start, index));
}

export function dayNumber(dateKey: string): number {
  const parts = partsFromKey(dateKey);
  if (!parts) throw new Error(`Invalid date key: ${dateKey}`);
  return parts.day;
}

export function isInMonth(dateKey: string, anchorKey: string): boolean {
  return startOfMonthKey(dateKey) === startOfMonthKey(anchorKey);
}

export function monthLabel(anchorKey: string): string {
  const parts = partsFromKey(anchorKey);
  if (!parts) throw new Error(`Invalid date key: ${anchorKey}`);

  return new Intl.DateTimeFormat("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, 1)));
}

function shortDayLabel(dateKey: string): string {
  const parts = partsFromKey(dateKey);
  if (!parts) throw new Error(`Invalid date key: ${dateKey}`);

  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(parts.year, parts.month - 1, parts.day)));
}

export function weekLabel(anchorKey: string): string {
  const keys = weekKeys(anchorKey);
  return `${shortDayLabel(keys[0])} – ${shortDayLabel(keys[6])}`;
}

/** Offset of a timezone at a given instant: wall-clock time minus UTC. */
function timeZoneOffsetMs(date: Date, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(date);

  const values: Record<string, number> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = Number(part.value);
  }

  const asUtc = Date.UTC(
    values.year,
    values.month - 1,
    values.day,
    values.hour,
    values.minute,
    values.second,
  );

  return asUtc - Math.floor(date.getTime() / 1000) * 1000;
}

/**
 * Convert a `<input type="datetime-local">` value (wall clock in `timeZone`)
 * to the matching UTC instant. Returns null for malformed input.
 */
export function zonedDateTimeToUtc(
  localValue: string,
  timeZone: string,
): Date | null {
  const match = LOCAL_DATE_TIME_PATTERN.exec(localValue);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;

  if (
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31 ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }

  const probe = new Date(Date.UTC(year, month - 1, day));
  if (
    probe.getUTCFullYear() !== year ||
    probe.getUTCMonth() !== month - 1 ||
    probe.getUTCDate() !== day
  ) {
    return null;
  }

  const naiveUtc = Date.UTC(year, month - 1, day, hour, minute, second);

  // Two passes so dates around a DST boundary resolve with the offset that is
  // actually in effect at the resulting instant.
  const firstOffset = timeZoneOffsetMs(new Date(naiveUtc), timeZone);
  const firstCandidate = naiveUtc - firstOffset;
  const secondOffset = timeZoneOffsetMs(new Date(firstCandidate), timeZone);

  return new Date(naiveUtc - secondOffset);
}

export function startOfDayUtc(dateKey: string, timeZone: string): Date {
  const date = zonedDateTimeToUtc(`${dateKey}T00:00`, timeZone);
  if (!date) throw new Error(`Invalid date key: ${dateKey}`);
  return date;
}

export function localDateTimeValueFromIso(
  iso: string,
  timeZone: string,
): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";

  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const values: Record<string, string> = {};
  for (const part of parts) {
    if (part.type !== "literal") values[part.type] = part.value;
  }

  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`;
}

export function formatTimeInTimeZone(iso: string, timeZone: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown time";

  return new Intl.DateTimeFormat("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

export function calendarRange(
  keys: string[],
  timeZone: string,
): { start: string; end: string } {
  const first = keys[0];
  const last = keys[keys.length - 1];
  if (!first || !last) {
    throw new Error("A calendar range needs at least one day");
  }

  return {
    start: startOfDayUtc(first, timeZone).toISOString(),
    end: startOfDayUtc(addDays(last, 1), timeZone).toISOString(),
  };
}

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

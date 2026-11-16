const DEFAULT_TIME_ZONE = "UTC";

export function formatDateTime(
  value: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(date);
}

export function formatDate(
  value: string,
  timeZone: string = DEFAULT_TIME_ZONE,
): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeZone,
  }).format(date);
}

export function formatNumber(value: number | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return new Intl.NumberFormat("en-GB", { notation: "compact" }).format(value);
}

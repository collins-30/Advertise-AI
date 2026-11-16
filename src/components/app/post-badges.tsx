import { formatDateTime } from "@/lib/format";

const POST_STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  in_review: "In review",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  needs_reauth: "Needs reconnect",
  rejected: "Rejected",
  archived: "Archived",
};

const POST_STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground",
  in_review: "bg-amber-100 text-amber-900",
  approved: "bg-sky-100 text-sky-900",
  scheduled: "bg-indigo-100 text-indigo-900",
  publishing: "bg-indigo-100 text-indigo-900",
  published: "bg-emerald-100 text-emerald-900",
  failed: "bg-destructive/10 text-destructive",
  needs_reauth: "bg-destructive/10 text-destructive",
  rejected: "bg-destructive/10 text-destructive",
  archived: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={`inline-flex h-5 items-center rounded-full px-2 text-xs font-medium ${
        POST_STATUS_STYLES[status] ?? "bg-muted text-muted-foreground"
      }`}
    >
      {POST_STATUS_LABELS[status] ?? status}
    </span>
  );
}

export function PlatformBadge({ platform }: { platform: string }) {
  return (
    <span className="inline-flex h-5 items-center rounded-full border px-2 text-xs font-medium text-muted-foreground">
      {platform === "instagram" ? "Instagram" : "LinkedIn"}
    </span>
  );
}

export function PostMeta({
  platform,
  status,
  date,
}: {
  platform: string;
  status: string;
  date?: string | null;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      <PlatformBadge platform={platform} />
      <StatusBadge status={status} />
      {date ? <span>{formatDateTime(date)}</span> : null}
    </div>
  );
}

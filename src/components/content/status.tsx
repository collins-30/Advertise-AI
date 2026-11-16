import { Badge } from "@/components/ui/badge";
import type { PostStatus } from "@/lib/database.types";
import type { Platform, PostFormat } from "@/lib/content/types";

export const PLATFORM_LABEL: Record<Platform, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
};

export const FORMAT_LABEL: Record<PostFormat, string> = {
  single_image: "Single image",
  carousel: "Carousel",
  text: "Text only",
};

export const POST_STATUS_LABEL: Record<PostStatus, string> = {
  draft: "Draft",
  in_review: "Pending approval",
  approved: "Approved",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  needs_reauth: "Needs reauth",
  rejected: "Rejected",
  archived: "Archived",
};

const STATUS_CLASS: Record<PostStatus, string> = {
  draft: "border-border text-muted-foreground",
  in_review:
    "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
  approved:
    "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  scheduled:
    "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-300",
  publishing:
    "border-blue-600/30 bg-blue-600/10 text-blue-700 dark:text-blue-300",
  published:
    "border-emerald-600/30 bg-emerald-600/10 text-emerald-700 dark:text-emerald-300",
  failed: "border-destructive/30 bg-destructive/10 text-destructive",
  needs_reauth: "border-destructive/30 bg-destructive/10 text-destructive",
  rejected: "border-destructive/30 bg-destructive/10 text-destructive",
  archived: "border-border text-muted-foreground",
};

export function PostStatusBadge({
  status,
  className,
}: {
  status: PostStatus;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={className ?? STATUS_CLASS[status]}>
      {POST_STATUS_LABEL[status]}
    </Badge>
  );
}

export function statusDotClass(status: PostStatus): string {
  switch (status) {
    case "approved":
    case "published":
      return "bg-emerald-500";
    case "scheduled":
    case "publishing":
      return "bg-blue-500";
    case "in_review":
      return "bg-amber-500";
    case "failed":
    case "needs_reauth":
    case "rejected":
      return "bg-destructive";
    default:
      return "bg-muted-foreground/50";
  }
}

export function isApprovedCurrentVersion(
  status: PostStatus,
  version: number,
  approvedVersion: number | null,
): boolean {
  return (
    approvedVersion === version &&
    ["approved", "scheduled", "publishing", "published"].includes(status)
  );
}

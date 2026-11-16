import type {
  ApprovalRow,
  AudiencePersonaRow,
  ContentPillarRow,
  Json,
  PostMediaRow,
  PostRow,
  PostStatus,
  PostVersionRow,
} from "@/lib/database.types";

export type Platform = PostRow["platform"];
export type PostFormat = PostRow["format"];

/**
 * Copy fields captured in a version snapshot. Media is intentionally excluded:
 * media rows are edited in place and are not reverted by restoring copy.
 */
export type PostSnapshot = {
  platform: Platform;
  format: PostFormat;
  title: string | null;
  hook: string | null;
  body: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  alt_text: string | null;
  image_brief: string | null;
  carousel_slides: string[];
  pillar_id: string | null;
  persona_id: string | null;
  source: "ai" | "manual";
  restored_from?: number;
};

export type PostMediaView = Pick<
  PostMediaRow,
  | "id"
  | "storage_path"
  | "public_url"
  | "mime_type"
  | "width"
  | "height"
  | "size_bytes"
  | "alt_text"
  | "position"
  | "created_at"
>;

export type PostLibraryItem = {
  id: string;
  title: string | null;
  hook: string | null;
  platform: Platform;
  format: PostFormat;
  status: PostStatus;
  pillarId: string | null;
  pillarName: string | null;
  version: number;
  approvedVersion: number | null;
  scheduledFor: string | null;
  timezone: string;
  createdAt: string;
  updatedAt: string;
  thumbnailUrl: string | null;
  mediaCount: number;
};

export type PostListFilters = {
  search: string;
  platform: "" | Platform;
  status: "" | PostStatus;
  pillarId: string;
  from: string;
  to: string;
};

export const emptyPostFilters: PostListFilters = {
  search: "",
  platform: "",
  status: "",
  pillarId: "",
  from: "",
  to: "",
};

export type PostDetailData = {
  post: PostRow;
  pillar: Pick<ContentPillarRow, "id" | "name"> | null;
  persona: Pick<AudiencePersonaRow, "id" | "name" | "is_primary"> | null;
  media: PostMediaView[];
  versions: PostVersionRow[];
  approvals: ApprovalRow[];
};

export type PostEditorOptions = {
  pillars: Pick<ContentPillarRow, "id" | "name" | "is_active">[];
  personas: Pick<AudiencePersonaRow, "id" | "name" | "is_primary">[];
  timezone: string;
};

export type ClaimContext = {
  forbiddenClaims: string[];
  proposedClaims: string[];
  verifiedFacts: string[];
};

export type CalendarPostView = {
  id: string;
  title: string | null;
  hook: string | null;
  platform: Platform;
  status: PostStatus;
  version: number;
  approvedVersion: number | null;
  scheduledFor: string;
  timezone: string;
  thumbnailUrl: string | null;
};

export type CalendarDay = {
  key: string;
  dayNumber: number;
  inCurrentMonth: boolean;
  posts: Array<{
    id: string;
    title: string;
    platform: Platform;
    status: PostStatus;
    timeLabel: string;
  }>;
};

export type CalendarMode = "month" | "week";

export type CalendarData =
  | {
      status: "ready";
      mode: CalendarMode;
      anchorKey: string;
      label: string;
      days: CalendarDay[];
      previousHref: string;
      nextHref: string;
      todayHref: string;
      monthHref: string;
      weekHref: string;
      timezone: string;
      approvedUnscheduled: Array<{
        id: string;
        title: string;
        platform: Platform;
        version: number;
      }>;
    }
  | { status: "missing" | "error"; message: string };

export type JsonObject = { [key: string]: Json | undefined };

import type { Json, PostRow } from "@/lib/database.types";
import type { PostSnapshot } from "@/lib/content/types";

function stringOrNull(value: Json | string | null | undefined): string | null {
  return typeof value === "string" && value.length > 0 ? value : null;
}

function stringArray(value: Json | null | undefined): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/** `posts.carousel_slides` is jsonb, so normalise it before rendering. */
export function carouselSlidesFromJson(value: Json | null | undefined): string[] {
  return stringArray(value).map((slide) => slide.trim()).filter(Boolean);
}

export function snapshotFromPost(post: PostRow): PostSnapshot {
  return {
    platform: post.platform,
    format: post.format,
    title: post.title,
    hook: post.hook,
    body: post.body,
    caption: post.caption,
    hashtags: post.hashtags,
    cta: post.cta,
    alt_text: post.alt_text,
    image_brief: post.image_brief,
    carousel_slides: carouselSlidesFromJson(post.carousel_slides),
    pillar_id: post.pillar_id,
    persona_id: post.persona_id,
    source: post.source,
  };
}

/**
 * Snapshots are appended by earlier phases and by the editor. Treat stored JSON
 * as untrusted input: a malformed snapshot must never crash version history.
 */
export function parseSnapshot(value: Json): PostSnapshot | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;

  const record = value as Record<string, Json | undefined>;
  const platform = record.platform;
  const format = record.format;
  const source = record.source;

  if (platform !== "instagram" && platform !== "linkedin") return null;
  if (format !== "single_image" && format !== "carousel" && format !== "text") {
    return null;
  }

  return {
    platform,
    format,
    title: stringOrNull(record.title),
    hook: stringOrNull(record.hook),
    body: stringOrNull(record.body),
    caption: stringOrNull(record.caption),
    hashtags: stringArray(record.hashtags),
    cta: stringOrNull(record.cta),
    alt_text: stringOrNull(record.alt_text),
    image_brief: stringOrNull(record.image_brief),
    carousel_slides: carouselSlidesFromJson(record.carousel_slides),
    pillar_id: stringOrNull(record.pillar_id),
    persona_id: stringOrNull(record.persona_id),
    source: source === "ai" ? "ai" : "manual",
    restored_from:
      typeof record.restored_from === "number" ? record.restored_from : undefined,
  };
}

/**
 * A snapshot does not carry status/approval/schedule fields on purpose.
 * Restoring copy always produces a fresh draft version that needs approval.
 */
export function editableFieldsFromSnapshot(snapshot: PostSnapshot) {
  return {
    platform: snapshot.platform,
    format: snapshot.format,
    title: snapshot.title,
    hook: snapshot.hook,
    body: snapshot.body,
    caption: snapshot.caption,
    hashtags: snapshot.hashtags,
    cta: snapshot.cta,
    alt_text: snapshot.alt_text,
    image_brief: snapshot.image_brief,
    carousel_slides: snapshot.carousel_slides,
    pillar_id: snapshot.pillar_id,
    persona_id: snapshot.persona_id,
    source: snapshot.source,
  };
}

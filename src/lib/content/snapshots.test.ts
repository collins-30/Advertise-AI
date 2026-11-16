import { describe, expect, it } from "vitest";

import {
  carouselSlidesFromJson,
  editableFieldsFromSnapshot,
  parseSnapshot,
  snapshotFromPost,
} from "@/lib/content/snapshots";
import type { PostRow } from "@/lib/database.types";

const post: PostRow = {
  id: "11111111-1111-4111-8111-111111111111",
  workspace_id: "22222222-2222-4222-8222-222222222222",
  platform: "instagram",
  format: "carousel",
  status: "approved",
  title: "Title",
  hook: "Hook",
  body: null,
  caption: "Caption",
  hashtags: ["#One", "#Two"],
  cta: "Call to action",
  alt_text: "Alt text",
  image_brief: "Brief",
  carousel_slides: ["Slide one", "Slide two"],
  generation_id: null,
  pillar_id: null,
  persona_id: null,
  source: "ai",
  version: 4,
  approved_version: 4,
  approved_at: "2026-11-16T10:00:00Z",
  approved_by: null,
  scheduled_for: null,
  timezone: "Europe/London",
  published_at: null,
  external_post_id: null,
  idempotency_key: "key",
  last_error_code: null,
  last_error_message: null,
  created_by: null,
  created_at: "2026-11-16T09:00:00Z",
  updated_at: "2026-11-16T10:00:00Z",
};

describe("snapshotFromPost", () => {
  it("captures copy fields and ignores workflow fields", () => {
    const snapshot = snapshotFromPost(post);

    expect(snapshot).toMatchObject({
      platform: "instagram",
      format: "carousel",
      caption: "Caption",
      hashtags: ["#One", "#Two"],
      carousel_slides: ["Slide one", "Slide two"],
      source: "ai",
    });
    expect(snapshot).not.toHaveProperty("status");
    expect(snapshot).not.toHaveProperty("approved_version");
    expect(snapshot).not.toHaveProperty("scheduled_for");
  });
});

describe("parseSnapshot", () => {
  it("round-trips a snapshot", () => {
    const parsed = parseSnapshot(snapshotFromPost(post));

    expect(parsed).not.toBeNull();
    expect(editableFieldsFromSnapshot(parsed!)).toMatchObject({
      platform: "instagram",
      caption: "Caption",
      carousel_slides: ["Slide one", "Slide two"],
    });
  });

  it("rejects malformed snapshots instead of throwing", () => {
    expect(parseSnapshot(null)).toBeNull();
    expect(parseSnapshot([])).toBeNull();
    expect(parseSnapshot({ platform: "tiktok", format: "carousel" })).toBeNull();
    expect(parseSnapshot({ platform: "instagram", format: "video" })).toBeNull();
  });

  it("tolerates missing optional fields", () => {
    const parsed = parseSnapshot({
      platform: "linkedin",
      format: "text",
      body: "Copy",
      hashtags: ["#One", 42],
      carousel_slides: "not an array",
    });

    expect(parsed).toMatchObject({
      platform: "linkedin",
      format: "text",
      body: "Copy",
      hashtags: ["#One"],
      carousel_slides: [],
      source: "manual",
    });
  });
});

describe("carouselSlidesFromJson", () => {
  it("drops non-string entries and trims slides", () => {
    expect(carouselSlidesFromJson([" One ", 3, "Two"])).toEqual(["One", "Two"]);
    expect(carouselSlidesFromJson(null)).toEqual([]);
  });
});

import { describe, expect, it } from "vitest";

import {
  ALLOWED_MEDIA_TYPES,
  MAX_MEDIA_BYTES,
  mediaUploadSchema,
  postEditSchema,
  scheduleSchema,
} from "@/lib/content/schemas";

const POST_ID = "11111111-1111-4111-8111-111111111111";

function validPost(overrides: Record<string, unknown> = {}) {
  return {
    postId: POST_ID,
    expectedVersion: "3",
    title: "A useful title",
    hook: "A specific hook",
    body: "LinkedIn body copy.",
    caption: "",
    hashtags: "#Growth, #Agency #growth",
    cta: "Book a walkthrough",
    altText: "A laptop on a desk",
    imageBrief: "Calm editorial photo",
    carouselSlides: "First slide\n\nSecond slide",
    pillarId: "",
    personaId: "",
    ...overrides,
  };
}

describe("postEditSchema", () => {
  it("normalises hashtags and splits carousel slides", () => {
    const parsed = postEditSchema.parse(validPost());

    expect(parsed.expectedVersion).toBe(3);
    expect(parsed.hashtags).toEqual(["#Growth", "#Agency"]);
    expect(parsed.carouselSlides).toEqual(["First slide", "Second slide"]);
    expect(parsed.pillarId).toBeNull();
  });

  it("accepts JSON-encoded slides so a slide can contain newlines", () => {
    const parsed = postEditSchema.parse(
      validPost({
        carouselSlides: JSON.stringify(["Line one\ncontinued", "Slide two"]),
      }),
    );

    expect(parsed.carouselSlides).toEqual(["Line one\ncontinued", "Slide two"]);
  });

  it("requires body or caption copy", () => {
    const result = postEditSchema.safeParse(
      validPost({ body: "", caption: "" }),
    );

    expect(result.success).toBe(false);
  });

  it("rejects more than ten carousel slides", () => {
    const result = postEditSchema.safeParse(
      validPost({
        carouselSlides: Array.from({ length: 11 }, (_, index) => `Slide ${index}`),
      }),
    );

    expect(result.success).toBe(false);
  });
});

describe("scheduleSchema", () => {
  it("accepts datetime-local values", () => {
    const result = scheduleSchema.safeParse({
      postId: POST_ID,
      expectedVersion: "2",
      scheduledFor: "2026-11-20T09:30",
    });

    expect(result.success).toBe(true);
  });

  it("rejects an ISO string with a timezone offset", () => {
    const result = scheduleSchema.safeParse({
      postId: POST_ID,
      expectedVersion: "2",
      scheduledFor: "2026-11-20T09:30:00Z",
    });

    expect(result.success).toBe(false);
  });
});

describe("mediaUploadSchema", () => {
  it("treats an empty replace id as no replacement", () => {
    const result = mediaUploadSchema.parse({
      postId: POST_ID,
      altText: "Alt",
      replaceMediaId: "",
    });

    expect(result.replaceMediaId).toBeNull();
  });
});

describe("media policy constants", () => {
  it("matches the storage bucket limits", () => {
    expect(MAX_MEDIA_BYTES).toBe(10 * 1024 * 1024);
    expect(ALLOWED_MEDIA_TYPES).toEqual([
      "image/jpeg",
      "image/png",
      "image/webp",
    ]);
  });
});

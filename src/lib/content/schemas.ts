import { z } from "zod";

import { hashtagListSchema } from "@/lib/brand/schemas";

const MAX_LIST_ITEMS = 10;
const MAX_SLIDE_LENGTH = 600;

const optionalUuid = z.preprocess(
  (value) =>
    value === "" || value === null || value === undefined ? null : value,
  z.string().uuid("Choose a valid option").nullable(),
);

function splitSlides(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value !== "string") return [];

  if (value.trimStart().startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch {
      // Fall through to newline parsing for malformed JSON.
    }
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
    .filter(Boolean);
}

const text = (max: number) => z.string().trim().max(max).default("");

export const postEditSchema = z
  .object({
    postId: z.string().uuid(),
    expectedVersion: z.coerce.number().int().positive(),
    title: text(160),
    hook: text(300),
    body: text(5000),
    caption: text(5000),
    hashtags: hashtagListSchema,
    cta: text(300),
    altText: text(1200),
    imageBrief: text(1200),
    carouselSlides: z.preprocess(
      splitSlides,
      z.array(z.string().min(1).max(MAX_SLIDE_LENGTH)).max(MAX_LIST_ITEMS),
    ),
    pillarId: optionalUuid,
    personaId: optionalUuid,
  })
  .refine((value) => Boolean(value.body || value.caption), {
    message: "Add body copy (LinkedIn) or a caption (Instagram) before saving.",
    path: ["body"],
  });

export const postActionSchema = z.object({
  postId: z.string().uuid(),
  expectedVersion: z.coerce.number().int().positive(),
});

export const decisionSchema = postActionSchema.extend({
  note: text(1000),
});

export const scheduleSchema = postActionSchema.extend({
  scheduledFor: z
    .string()
    .trim()
    .regex(
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/,
      "Choose a valid date and time",
    ),
});

export const restoreVersionSchema = postActionSchema.extend({
  version: z.coerce.number().int().positive(),
});

export const mediaUploadSchema = z.object({
  postId: z.string().uuid(),
  altText: text(300),
  replaceMediaId: optionalUuid,
});

export const mediaAltSchema = z.object({
  postId: z.string().uuid(),
  mediaId: z.string().uuid(),
  altText: text(300),
});

export const mediaRemoveSchema = z.object({
  postId: z.string().uuid(),
  mediaId: z.string().uuid(),
});

export const MAX_MEDIA_BYTES = 10 * 1024 * 1024;
export const MAX_MEDIA_PER_POST = 10;

export const ALLOWED_MEDIA_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type AllowedMediaType = (typeof ALLOWED_MEDIA_TYPES)[number];

export type PostEditInput = z.infer<typeof postEditSchema>;
export type DecisionInput = z.infer<typeof decisionSchema>;
export type ScheduleInput = z.infer<typeof scheduleSchema>;
export type RestoreVersionInput = z.infer<typeof restoreVersionSchema>;
export type MediaUploadInput = z.infer<typeof mediaUploadSchema>;

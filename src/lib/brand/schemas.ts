import { z } from "zod";

/**
 * Form parsing helpers.
 *
 * Multi-line textareas are the most reliable way to edit short lists in a
 * dashboard, so the schemas convert between newline text and string arrays.
 */

const MAX_LIST_ITEMS = 40;
const MAX_LIST_ITEM_LENGTH = 600;

function uniqueCaseInsensitive(items: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const item of items) {
    const key = item.toLocaleLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function splitLines(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.map((item) => String(item))
    : typeof value === "string"
      ? value.split(/\r?\n/)
      : [];

  return uniqueCaseInsensitive(
    raw
      .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean),
  );
}

export function splitCommaList(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(/[,\n]/))
    : typeof value === "string"
      ? value.split(/[,\n]/)
      : [];

  return uniqueCaseInsensitive(
    raw
      .map((item) => item.replace(/^\s*[-*•]\s*/, "").trim())
      .filter(Boolean),
  );
}

export function normalizeHashtags(value: unknown): string[] {
  const raw = Array.isArray(value)
    ? value.flatMap((item) => String(item).split(/[,\s]+/))
    : typeof value === "string"
      ? value.split(/[,\s]+/)
      : [];

  const tags = raw
    .map((tag) =>
      tag
        .trim()
        .replace(/^#+/, "")
        .replace(/[^a-zA-Z0-9_]/g, ""),
    )
    .filter(Boolean)
    .slice(0, 10)
    .map((tag) => `#${tag}`);

  return uniqueCaseInsensitive(tags);
}

export function arrayToLines(items: string[] | null | undefined): string {
  return (items ?? []).join("\n");
}

export function arrayToCommaList(items: string[] | null | undefined): string {
  return (items ?? []).join(", ");
}

export function hashtagsToInput(items: string[] | null | undefined): string {
  return (items ?? []).join(" ");
}

const lineItem = z.string().trim().min(1).max(MAX_LIST_ITEM_LENGTH);

export const lineListSchema = z
  .preprocess(splitLines, z.array(lineItem).max(MAX_LIST_ITEMS))
  .transform(uniqueCaseInsensitive);

export const commaListSchema = z
  .preprocess(splitCommaList, z.array(lineItem).max(MAX_LIST_ITEMS))
  .transform(uniqueCaseInsensitive);

export const hashtagListSchema = z
  .preprocess(normalizeHashtags, z.array(z.string().max(80)).max(10))
  .transform(uniqueCaseInsensitive);

const optionalUrl = z
  .string()
  .trim()
  .max(500)
  .refine(
    (value) => value === "" || /^https?:\/\/\S+$/i.test(value),
    "Use a full URL starting with http:// or https://",
  )
  .transform((value) => value || null);

const optionalUuid = z.preprocess(
  (value) => (value === "" || value === null || value === undefined ? null : value),
  z.string().uuid("Choose a valid option").nullable(),
);

const text = (max: number) => z.string().trim().max(max).default("");

export const brandProfileSchema = z
  .object({
    companyName: z
      .string()
      .trim()
      .min(1, "Company name is required")
      .max(120),
    oneLiner: text(240),
    description: text(4000),
    websiteUrl: optionalUrl,
    positioning: text(2000),
    targetMarket: text(1000),
    valueProps: lineListSchema,
    verifiedFacts: lineListSchema,
    proposedClaims: lineListSchema,
    forbiddenClaims: lineListSchema,
    claimNotes: text(2000),
    toneKeywords: commaListSchema,
    emojiPolicy: z.enum(["none", "sparing", "free"]),
    hashtagPolicy: text(1000),
    primaryCta: text(300),
    bookingUrl: optionalUrl,
    linkedinPerWeek: z.coerce.number().int().min(0).max(21),
    instagramPerWeek: z.coerce.number().int().min(0).max(21),
    cadenceNote: text(500),
    notes: text(4000),
  })
  .superRefine((values, context) => {
    const verified = new Set(
      values.verifiedFacts.map((item) => item.toLocaleLowerCase()),
    );
    const forbidden = new Set(
      values.forbiddenClaims.map((item) => item.toLocaleLowerCase()),
    );

    for (const claim of values.proposedClaims) {
      if (verified.has(claim.toLocaleLowerCase())) {
        context.addIssue({
          code: "custom",
          path: ["proposedClaims"],
          message:
            "This item is in both verified facts and proposed claims. Keep it in one place.",
        });
      }
    }

    for (const claim of values.verifiedFacts) {
      if (forbidden.has(claim.toLocaleLowerCase())) {
        context.addIssue({
          code: "custom",
          path: ["verifiedFacts"],
          message:
            "This item is also forbidden. Remove it from one of the lists.",
        });
      }
    }
  });

export const personaSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Persona name is required").max(120),
  role: text(200),
  companyType: text(300),
  companySize: text(120),
  painPoints: lineListSchema,
  desires: lineListSchema,
  objections: lineListSchema,
  wateringHoles: lineListSchema,
  buyingTriggers: lineListSchema,
  isPrimary: z.boolean(),
  notes: text(3000),
});

export const pillarSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1, "Pillar name is required").max(120),
  description: text(1000),
  percentage: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined
        ? null
        : Number(value),
    z.number().int().min(0).max(100).nullable(),
  ),
  exampleTopics: lineListSchema,
  isActive: z.boolean(),
});

export const writingSampleSchema = z.object({
  id: z.string().uuid().optional(),
  platform: z.preprocess(
    (value) => (value === "" || value === null ? null : value),
    z.enum(["linkedin", "instagram", "other"]).nullable(),
  ),
  title: text(160),
  content: z
    .string()
    .trim()
    .min(20, "Paste at least a short paragraph of sample writing")
    .max(20000),
  notes: text(1000),
});

export const generationBriefSchema = z.object({
  platform: z.enum(["linkedin", "instagram"]),
  format: z.enum(["single_image", "carousel", "text"]),
  pillarId: optionalUuid,
  personaId: optionalUuid,
  objective: z.enum([
    "attract_agency_owners",
    "problem",
    "solution",
    "education",
    "proof",
    "offer",
  ]),
  angle: text(500),
  notes: text(1500),
  ctaMode: z.enum(["brand", "none", "custom"]),
  customCta: text(300),
  variantSeed: z.preprocess(
    (value) =>
      value === "" || value === null || value === undefined ? 0 : Number(value),
    z.number().int().min(0).max(1_000_000),
  ),
});

/**
 * The shape requested from the model. `copy` is mapped to `body` for LinkedIn
 * and `caption` for Instagram after validation.
 */
export const modelDraftSchema = z.object({
  title: z.string().trim().min(1).max(160),
  hook: z.string().trim().min(1).max(300),
  hooks: z.array(z.string().trim().min(1).max(300)).min(1).max(6),
  copy: z.string().trim().min(1).max(5000),
  hashtags: hashtagListSchema,
  cta: z.string().trim().max(300).default(""),
  altText: z.string().trim().max(1200).default(""),
  imageBrief: z.string().trim().max(1200).default(""),
  carouselSlides: z.array(z.string().trim().min(1).max(600)).max(10).default([]),
});

export const generatedPostSchema = z
  .object({
    platform: z.enum(["linkedin", "instagram"]),
    format: z.enum(["single_image", "carousel", "text"]),
    title: z.string().trim().max(160).default(""),
    hook: z.string().trim().max(300).default(""),
    body: z.string().trim().max(5000).default(""),
    caption: z.string().trim().max(5000).default(""),
    hashtags: hashtagListSchema,
    cta: z.string().trim().max(300).default(""),
    altText: z.string().trim().max(1200).default(""),
    imageBrief: z.string().trim().max(1200).default(""),
    carouselSlides: z.array(z.string().trim().max(600)).max(10).default([]),
    pillarId: optionalUuid,
    personaId: optionalUuid,
    generationId: optionalUuid,
  })
  .refine((value) => Boolean(value.body || value.caption), {
    message: "The draft needs body or caption copy before it can be saved.",
    path: ["body"],
  });

export type BrandProfileInput = z.infer<typeof brandProfileSchema>;
export type PersonaInput = z.infer<typeof personaSchema>;
export type PillarInput = z.infer<typeof pillarSchema>;
export type WritingSampleInput = z.infer<typeof writingSampleSchema>;
export type GenerationBriefInput = z.infer<typeof generationBriefSchema>;
export type ModelDraft = z.infer<typeof modelDraftSchema>;
export type GeneratedPostInput = z.infer<typeof generatedPostSchema>;

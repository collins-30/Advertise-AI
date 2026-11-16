import { describe, expect, it } from "vitest";

import {
  brandProfileSchema,
  generationBriefSchema,
  generatedPostSchema,
  normalizeHashtags,
  splitCommaList,
  splitLines,
  writingSampleSchema,
} from "@/lib/brand/schemas";

describe("splitLines", () => {
  it("strips bullets, blank lines and duplicates", () => {
    expect(
      splitLines("- One\n* Two\n• one\n\n  Two  \n"),
    ).toEqual(["One", "Two"]);
  });

  it("accepts arrays and ignores other input types", () => {
    expect(splitLines(["One", "One", "Two"])).toEqual(["One", "Two"]);
    expect(splitLines(undefined)).toEqual([]);
    expect(splitLines(42)).toEqual([]);
  });
});

describe("splitCommaList", () => {
  it("splits on commas and newlines and dedupes case-insensitively", () => {
    expect(splitCommaList("direct, practical\nCalm, DIRECT")).toEqual([
      "direct",
      "practical",
      "Calm",
    ]);
  });
});

describe("normalizeHashtags", () => {
  it("normalizes prefixes, strips punctuation and dedupes", () => {
    expect(normalizeHashtags("##Marketing!, ai, #AI, bad tag")).toEqual([
      "#Marketing",
      "#ai",
      "#bad",
      "#tag",
    ]);
  });

  it("caps the list at ten tags", () => {
    const tags = normalizeHashtags(
      Array.from({ length: 15 }, (_, index) => `tag${index}`).join(" "),
    );
    expect(tags).toHaveLength(10);
  });
});

const baseBrandProfile = {
  companyName: "CloseLoop",
  oneLiner: "Brand-aware content for agency owners.",
  description: "An AI marketing assistant for owner-led agencies.",
  websiteUrl: "https://closeloop.example",
  positioning: "For agencies that refuse to sound generic.",
  targetMarket: "Owner-led B2B service agencies.",
  valueProps: ["One brand brain", "Human approval"],
  verifiedFacts: ["CloseLoop requires human approval before publishing."],
  proposedClaims: ["Agency owners are the best salesperson in the business."],
  forbiddenClaims: ["Guaranteed leads, revenue or growth."],
  claimNotes: "Assumption-based starter profile.",
  toneKeywords: "direct, practical, calm",
  emojiPolicy: "sparing" as const,
  hashtagPolicy: "Three to five specific hashtags.",
  primaryCta: "Book a short walkthrough",
  bookingUrl: "",
  linkedinPerWeek: 3,
  instagramPerWeek: 2,
  cadenceNote: "Assumed starting cadence.",
  notes: "",
};

describe("brandProfileSchema", () => {
  it("parses the editable brand brain", () => {
    const parsed = brandProfileSchema.parse(baseBrandProfile);

    expect(parsed.companyName).toBe("CloseLoop");
    expect(parsed.websiteUrl).toBe("https://closeloop.example");
    expect(parsed.bookingUrl).toBeNull();
    expect(parsed.toneKeywords).toEqual(["direct", "practical", "calm"]);
    expect(parsed.linkedinPerWeek).toBe(3);
  });

  it("rejects a claim that appears in verified facts", () => {
    const result = brandProfileSchema.safeParse({
      ...baseBrandProfile,
      proposedClaims: ["closeloop requires human approval before publishing."],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a verified fact that is also forbidden", () => {
    const result = brandProfileSchema.safeParse({
      ...baseBrandProfile,
      verifiedFacts: ["Guaranteed leads, revenue or growth."],
    });

    expect(result.success).toBe(false);
  });

  it("rejects a website without a protocol", () => {
    const result = brandProfileSchema.safeParse({
      ...baseBrandProfile,
      websiteUrl: "closeloop.example",
    });

    expect(result.success).toBe(false);
  });
});

describe("generationBriefSchema", () => {
  it("converts blank selections and seeds into safe defaults", () => {
    const parsed = generationBriefSchema.parse({
      platform: "linkedin",
      format: "text",
      pillarId: "",
      personaId: "",
      objective: "problem",
      angle: "",
      notes: "",
      ctaMode: "brand",
      customCta: "",
      variantSeed: "",
    });

    expect(parsed.pillarId).toBeNull();
    expect(parsed.personaId).toBeNull();
    expect(parsed.variantSeed).toBe(0);
  });

  it("rejects an unknown objective", () => {
    const result = generationBriefSchema.safeParse({
      platform: "linkedin",
      format: "text",
      objective: "go_viral",
      ctaMode: "brand",
    });

    expect(result.success).toBe(false);
  });
});

describe("generatedPostSchema", () => {
  it("requires body or caption copy", () => {
    const result = generatedPostSchema.safeParse({
      platform: "linkedin",
      format: "text",
      body: "",
      caption: "",
    });

    expect(result.success).toBe(false);
  });

  it("accepts a saved LinkedIn draft and normalizes hashtags", () => {
    const parsed = generatedPostSchema.parse({
      platform: "linkedin",
      format: "text",
      body: "A draft about agency content.",
      hashtags: ["AgencyOwners", "#AgencyGrowth"],
    });

    expect(parsed.hashtags).toEqual(["#AgencyOwners", "#AgencyGrowth"]);
  });
});

describe("writingSampleSchema", () => {
  it("requires a meaningful sample", () => {
    const result = writingSampleSchema.safeParse({
      platform: "linkedin",
      title: "Sample",
      content: "Too short",
      notes: "",
    });

    expect(result.success).toBe(false);
  });
});

import { describe, expect, it } from "vitest";

import { checkClaims } from "@/lib/ai/claims";
import { finalCopyForContent } from "@/lib/ai/compose";
import { generateLocalContent } from "@/lib/ai/local";
import type { ContentBrief } from "@/lib/ai/types";
import { makeBrandContext, makeBrief } from "@/test/brand-fixtures";

const objectives: ContentBrief["objective"][] = [
  "attract_agency_owners",
  "problem",
  "solution",
  "education",
  "proof",
  "offer",
];

describe("generateLocalContent", () => {
  it("is deterministic for the same brief", () => {
    const context = makeBrandContext();
    const brief = makeBrief({ variantSeed: 7 });

    expect(generateLocalContent(context, brief)).toEqual(
      generateLocalContent(context, brief),
    );
  });

  it("produces different hooks for different seeds", () => {
    const context = makeBrandContext();

    const first = generateLocalContent(context, makeBrief({ variantSeed: 0 }));
    const second = generateLocalContent(context, makeBrief({ variantSeed: 1 }));

    expect(first.hook).not.toBe(second.hook);
  });

  it("writes body copy for LinkedIn and caption copy for Instagram", () => {
    const context = makeBrandContext();
    const linkedin = generateLocalContent(context, makeBrief());
    const instagram = generateLocalContent(
      context,
      makeBrief({ platform: "instagram" }),
    );

    expect(linkedin.body?.length).toBeGreaterThan(100);
    expect(linkedin.caption).toBeNull();
    expect(finalCopyForContent(linkedin, "linkedin")).toContain(linkedin.hook);
    expect(instagram.caption?.length).toBeGreaterThan(100);
    expect(instagram.body).toBeNull();
    expect(finalCopyForContent(instagram, "instagram")).toContain(
      instagram.hook,
    );
  });

  it("uses the brand CTA unless the brief overrides it", () => {
    const context = makeBrandContext();

    const brand = generateLocalContent(context, makeBrief());
    const custom = generateLocalContent(
      context,
      makeBrief({ ctaMode: "custom", customCta: "Reply with “system”" }),
    );
    const none = generateLocalContent(context, makeBrief({ ctaMode: "none" }));

    expect(brand.cta).toBe("Book a short walkthrough.");
    expect(custom.cta).toBe("Reply with “system”");
    expect(none.cta).toBeNull();
  });

  it("includes the CTA only once in the composed copy", () => {
    const context = makeBrandContext();
    const content = generateLocalContent(context, makeBrief());
    const finalCopy = finalCopyForContent(content, "linkedin");

    expect(content.cta).toBeTruthy();
    expect(finalCopy.split(content.cta as string)).toHaveLength(2);
  });

  it("adds carousel slides only for the carousel format", () => {
    const context = makeBrandContext();

    const carousel = generateLocalContent(
      context,
      makeBrief({ format: "carousel" }),
    );
    const text = generateLocalContent(context, makeBrief({ format: "text" }));

    expect(carousel.carouselSlides).toHaveLength(5);
    expect(carousel.carouselSlides[0]).toBe(carousel.hook);
    expect(text.carouselSlides).toEqual([]);
  });

  it("keeps hashtags within the platform limits", () => {
    const context = makeBrandContext();

    expect(
      generateLocalContent(context, makeBrief({ platform: "linkedin" })).hashtags,
    ).toHaveLength(3);
    expect(
      generateLocalContent(context, makeBrief({ platform: "instagram" }))
        .hashtags,
    ).toHaveLength(5);
  });

  it("never blocks itself with claim language", () => {
    const context = makeBrandContext();

    for (const objective of objectives) {
      for (const platform of ["linkedin", "instagram"] as const) {
        for (const format of ["single_image", "carousel", "text"] as const) {
          const content = generateLocalContent(
            context,
            makeBrief({ objective, platform, format }),
          );
          const copy = finalCopyForContent(content, platform);
          const findings = checkClaims({
            text: copy,
            forbiddenClaims: context.profile.forbidden_claims,
            proposedClaims: context.profile.proposed_claims,
            verifiedFacts: context.profile.verified_facts,
          });

          expect(
            findings.filter((finding) => finding.level === "blocker"),
            `${objective}/${platform}/${format}`,
          ).toEqual([]);
          expect(copy, `${objective}/${platform}/${format}`).not.toContain(
            "closeLoop",
          );
        }
      }
    }
  });
});

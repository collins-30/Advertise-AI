import { describe, expect, it } from "vitest";

import {
  buildContextPayload,
  buildUserPrompt,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/lib/ai/prompt";
import {
  makeBrandContext,
  makeBrief,
  personaFixture,
  pillarFixture,
  writingSampleFixture,
} from "@/test/brand-fixtures";

describe("buildContextPayload", () => {
  it("serializes the brand brain with claims kept separate", () => {
    const payload = buildContextPayload(makeBrandContext());

    expect(payload.company.name).toBe("CloseLoop");
    expect(payload.claims.verifiedFacts).toEqual(
      expect.arrayContaining(["CloseLoop is an AI marketing assistant."]),
    );
    expect(payload.claims.proposedClaims).toEqual(
      expect.arrayContaining([
        "Agency owners are usually the best salesperson in the business.",
      ]),
    );
    expect(payload.claims.forbiddenClaims).toEqual(
      expect.arrayContaining([
        "Guaranteed leads, revenue, growth or engagement.",
      ]),
    );
  });

  it("includes the selected persona and pillar once", () => {
    const payload = buildContextPayload(makeBrandContext());

    expect(payload.selectedPersona).toMatchObject({
      name: personaFixture.name,
      painPoints: personaFixture.pain_points,
    });
    expect(payload.selectedPillar).toMatchObject({
      name: pillarFixture.name,
      exampleTopics: pillarFixture.example_topics,
    });
    expect(payload.otherPersonas).toEqual([]);
    expect(payload.otherPillars).toEqual([]);
  });

  it("lists the other personas and pillars when one is selected", () => {
    const context = makeBrandContext({
      personas: [
        personaFixture,
        { ...personaFixture, id: "other-persona", name: "Agency operator" },
      ],
      pillars: [
        pillarFixture,
        { ...pillarFixture, id: "other-pillar", name: "Content that compounds" },
      ],
    });

    const payload = buildContextPayload(context);

    expect(payload.otherPersonas).toEqual(["Agency operator"]);
    expect(payload.otherPillars).toEqual(["Content that compounds"]);
  });

  it("trims writing samples to the three most recent inputs", () => {
    const samples = Array.from({ length: 5 }, (_, index) => ({
      ...writingSampleFixture,
      id: `sample-${index}`,
      title: `Sample ${index}`,
    }));

    const payload = buildContextPayload(makeBrandContext({ samples }));

    expect(payload.writingSamples).toHaveLength(3);
    expect(payload.writingSamples[0]?.title).toBe("Sample 0");
  });

  it("handles a context with no persona or pillar", () => {
    const payload = buildContextPayload(
      makeBrandContext({ persona: null, pillar: null }),
    );

    expect(payload.selectedPersona).toBeNull();
    expect(payload.selectedPillar).toBeNull();
  });
});

describe("buildUserPrompt", () => {
  it("includes the brief, platform rules and brand context", () => {
    const prompt = buildUserPrompt(
      makeBrief({ platform: "instagram", format: "carousel", angle: "Ownership" }),
      makeBrandContext(),
    );

    expect(prompt).toContain("Platform: instagram");
    expect(prompt).toContain("Format: carousel");
    expect(prompt).toContain("Requested angle: Ownership");
    expect(prompt).toContain("Provide 5–7 carousel slides");
    expect(prompt).toContain("BRAND BRAIN");
    expect(prompt).toContain("Guaranteed leads, revenue, growth or engagement.");
    expect(prompt).toContain("Do not manufacture proof.");
    expect(prompt).toContain("WRITING TASK");
  });

  it("uses the single-image and text format rules", () => {
    const singleImage = buildUserPrompt(
      makeBrief({ format: "single_image" }),
      makeBrandContext(),
    );
    const text = buildUserPrompt(
      makeBrief({ format: "text" }),
      makeBrandContext(),
    );

    expect(singleImage).toContain("Format: single image");
    expect(text).toContain("Format: text only");
  });
});

describe("system prompt", () => {
  it("keeps the product promise human-in-the-loop", () => {
    expect(SYSTEM_PROMPT).toContain("human");
    expect(SYSTEM_PROMPT).toContain("forbidden claim");
    expect(SYSTEM_PROMPT).toContain("Return one valid JSON object only");
    expect(PROMPT_VERSION).toBe("content-v1");
  });
});

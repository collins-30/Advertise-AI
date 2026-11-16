import { afterEach, describe, expect, it, vi } from "vitest";

import { LOCAL_MODEL, runGeneration } from "@/lib/ai/generate";
import { makeBrandContext, makeBrief } from "@/test/brand-fixtures";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("runGeneration", () => {
  it("uses the local engine when no API key is configured", async () => {
    const result = await runGeneration({
      context: makeBrandContext(),
      brief: makeBrief(),
      apiKey: null,
    });

    expect(result.provider).toBe("local");
    expect(result.model).toBe(LOCAL_MODEL);
    expect(result.engineNote).toContain("Local template engine");
    expect(result.usage.estimatedCostUsd).toBe(0);
    expect(result.content.body).toBeTruthy();
    expect(result.claimFindings.some((item) => item.level === "blocker")).toBe(
      false,
    );
  });

  it("falls back transparently when OpenAI fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ error: { message: "Billing issue" } }), {
          status: 429,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    const result = await runGeneration({
      context: makeBrandContext(),
      brief: makeBrief(),
      apiKey: "sk-test",
    });

    expect(result.provider).toBe("local");
    expect(result.model).toBe(LOCAL_MODEL);
    expect(result.engineNote).toContain("Billing issue");
    expect(result.engineNote).toContain("local template draft was generated");
  });

  it("checks the final copy, not only the body", async () => {
    const context = makeBrandContext({
      profile: {
        ...makeBrandContext().profile,
        forbidden_claims: [
          "No guaranteed reach. No autopilot. A human still decides what goes out.",
        ],
      },
    });

    const result = await runGeneration({
      context,
      brief: makeBrief(),
      apiKey: null,
    });

    expect(
      result.claimFindings.some((finding) => finding.level === "blocker"),
    ).toBe(true);
  });
});

import { afterEach, describe, expect, it, vi } from "vitest";

import {
  DEFAULT_OPENAI_MODEL,
  estimateCostUsd,
  generateWithOpenAI,
  OpenAIError,
  parseModelJson,
  toGeneratedContent,
} from "@/lib/ai/openai";
import { makeBrandContext, makeBrief } from "@/test/brand-fixtures";

const modelDraft = {
  title: "Owner-led growth: the real bottleneck",
  hook: "Your agency's marketing is not a discipline problem.",
  hooks: [
    "Your agency's marketing is not a discipline problem.",
    "The person with the best ideas has the least time.",
  ],
  copy: "Client work gets the best hours. The agency's own marketing gets what is left.",
  hashtags: ["#AgencyOwners", "#AgencyGrowth"],
  cta: "Book a short walkthrough.",
  altText: "Text-led graphic with a short headline.",
  imageBrief: "Off-white background, oversized headline, one accent rule.",
  carouselSlides: [],
};

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("parseModelJson", () => {
  it("accepts plain JSON, fenced JSON and surrounding prose", () => {
    expect(parseModelJson('{"title":"Draft"}')).toEqual({ title: "Draft" });
    expect(parseModelJson('```json\n{"title":"Draft"}\n```')).toEqual({
      title: "Draft",
    });
    expect(parseModelJson('Here you go:\n{"title":"Draft"}\nDone.')).toEqual({
      title: "Draft",
    });
  });

  it("rejects responses without a JSON object", () => {
    expect(() => parseModelJson("No JSON here")).toThrow(OpenAIError);
    expect(() => parseModelJson("{not valid json}")).toThrow(OpenAIError);
  });
});

describe("toGeneratedContent", () => {
  it("maps copy to the platform field and dedupes hooks", () => {
    const linkedin = toGeneratedContent(modelDraft, "linkedin");

    expect(linkedin.body).toBe(modelDraft.copy);
    expect(linkedin.caption).toBeNull();
    expect(linkedin.hooks).toEqual([
      modelDraft.hook,
      "The person with the best ideas has the least time.",
    ]);
  });

  it("uses caption for Instagram and turns empty optional fields into null", () => {
    const instagram = toGeneratedContent(
      { ...modelDraft, cta: "", altText: "" },
      "instagram",
    );

    expect(instagram.caption).toBe(modelDraft.copy);
    expect(instagram.body).toBeNull();
    expect(instagram.cta).toBeNull();
    expect(instagram.altText).toBeNull();
  });
});

describe("estimateCostUsd", () => {
  it("estimates a known model from token usage", () => {
    expect(estimateCostUsd("gpt-4o-mini", 1_000_000, 1_000_000)).toBeCloseTo(
      0.75,
    );
  });

  it("returns null for unknown models or missing usage", () => {
    expect(estimateCostUsd("unknown-model", 100, 100)).toBeNull();
    expect(estimateCostUsd("gpt-4o-mini", null, 100)).toBeNull();
  });
});

describe("generateWithOpenAI", () => {
  it("sends a guarded prompt and parses a valid draft", async () => {
    const fetchMock = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            choices: [{ message: { content: JSON.stringify(modelDraft) } }],
            usage: { prompt_tokens: 1200, completion_tokens: 400 },
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await generateWithOpenAI({
      apiKey: "sk-test",
      context: makeBrandContext(),
      brief: makeBrief(),
    });

    expect(result.content.title).toBe(modelDraft.title);
    expect(result.model).toBe(DEFAULT_OPENAI_MODEL);
    expect(result.promptVersion).toBe("content-v1");
    expect(result.usage.inputTokens).toBe(1200);
    expect(result.usage.outputTokens).toBe(400);
    expect(result.usage.estimatedCostUsd).toBeGreaterThan(0);

    const init = fetchMock.mock.calls[0]?.[1];
    const payload = JSON.parse(String(init?.body));
    expect(payload.model).toBe(DEFAULT_OPENAI_MODEL);
    expect(payload.response_format).toEqual({ type: "json_object" });
    expect(payload.messages[0].role).toBe("system");
    expect(payload.messages[0].content).toContain("forbidden claim");
    expect(payload.messages[1].content).toContain("Brand-aware");
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer sk-test",
    });
  });

  it("surfaces API errors with the upstream message and status", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({ error: { message: "Incorrect API key provided" } }),
          { status: 401, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      generateWithOpenAI({
        apiKey: "sk-bad",
        context: makeBrandContext(),
        brief: makeBrief(),
      }),
    ).rejects.toMatchObject({
      name: "OpenAIError",
      message: "Incorrect API key provided",
      status: 401,
    });
  });

  it("rejects a response that does not match the draft schema", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({ title: "Missing everything else" }),
                },
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(
      generateWithOpenAI({
        apiKey: "sk-test",
        context: makeBrandContext(),
        brief: makeBrief(),
      }),
    ).rejects.toThrow(/did not match the expected format/);
  });

  it("rejects an empty completion", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        new Response(JSON.stringify({ choices: [] }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    );

    await expect(
      generateWithOpenAI({
        apiKey: "sk-test",
        context: makeBrandContext(),
        brief: makeBrief(),
      }),
    ).rejects.toThrow(/empty response/);
  });

  it("explains network failures", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("fetch failed");
      }),
    );

    await expect(
      generateWithOpenAI({
        apiKey: "sk-test",
        context: makeBrandContext(),
        brief: makeBrief(),
      }),
    ).rejects.toThrow(/Could not reach OpenAI/);
  });
});

import { modelDraftSchema, type ModelDraft } from "@/lib/brand/schemas";
import type {
  BrandContext,
  ContentBrief,
  GeneratedContent,
  GenerationUsage,
} from "@/lib/ai/types";
import {
  buildUserPrompt,
  PROMPT_VERSION,
  SYSTEM_PROMPT,
} from "@/lib/ai/prompt";

export const DEFAULT_OPENAI_MODEL = "gpt-4o-mini";

const PRICING_PER_MILLION: Record<
  string,
  { input: number; output: number }
> = {
  "gpt-4o-mini": { input: 0.15, output: 0.6 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1": { input: 2, output: 8 },
};

export class OpenAIError extends Error {
  readonly status: number | null;

  constructor(message: string, status: number | null = null) {
    super(message);
    this.name = "OpenAIError";
    this.status = status;
  }
}

export function estimateCostUsd(
  model: string,
  inputTokens: number | null,
  outputTokens: number | null,
): number | null {
  const pricing = PRICING_PER_MILLION[model];
  if (!pricing || inputTokens === null || outputTokens === null) return null;

  return (
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000
  );
}

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim();
  const withoutFence = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new OpenAIError("The model did not return a JSON object.");
  }

  try {
    return JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    throw new OpenAIError("The model returned JSON that could not be parsed.");
  }
}

export function toGeneratedContent(
  draft: ModelDraft,
  platform: ContentBrief["platform"],
): GeneratedContent {
  const hooks = Array.from(
    new Set([draft.hook, ...draft.hooks].map((hook) => hook.trim()).filter(Boolean)),
  ).slice(0, 4);

  return {
    title: draft.title,
    hook: draft.hook,
    hooks,
    body: platform === "linkedin" ? draft.copy : null,
    caption: platform === "instagram" ? draft.copy : null,
    hashtags: draft.hashtags,
    cta: draft.cta || null,
    altText: draft.altText || null,
    imageBrief: draft.imageBrief || null,
    carouselSlides: draft.carouselSlides,
  };
}

type ChatCompletionResponse = {
  choices?: Array<{
    message?: { content?: string | null };
  }>;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string };
};

export async function generateWithOpenAI({
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
  context,
  brief,
}: {
  apiKey: string;
  model?: string;
  context: BrandContext;
  brief: ContentBrief;
}): Promise<{
  content: GeneratedContent;
  usage: GenerationUsage;
  model: string;
  promptVersion: string;
}> {
  let response: Response;

  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 1600,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: buildUserPrompt(brief, context) },
        ],
      }),
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") {
      throw new OpenAIError(
        "OpenAI took too long to respond. Try again, or use the local draft engine.",
      );
    }
    throw new OpenAIError(
      "Could not reach OpenAI. Check the server's network connection and API key.",
    );
  }

  const payload = (await response.json().catch(() => null)) as
    | ChatCompletionResponse
    | null;

  if (!response.ok) {
    const message =
      payload?.error?.message ??
      `OpenAI returned HTTP ${response.status}. Check the API key, model and billing.`;
    throw new OpenAIError(message, response.status);
  }

  const rawContent = payload?.choices?.[0]?.message?.content;
  if (!rawContent) {
    throw new OpenAIError("OpenAI returned an empty response.");
  }

  const parsed = modelDraftSchema.safeParse(parseModelJson(rawContent));
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message;
    throw new OpenAIError(
      firstIssue
        ? `The generated draft did not match the expected format: ${firstIssue}`
        : "The generated draft did not match the expected format.",
    );
  }

  const inputTokens = payload?.usage?.prompt_tokens ?? null;
  const outputTokens = payload?.usage?.completion_tokens ?? null;

  return {
    content: toGeneratedContent(parsed.data, brief.platform),
    usage: {
      inputTokens,
      outputTokens,
      estimatedCostUsd: estimateCostUsd(model, inputTokens, outputTokens),
    },
    model,
    promptVersion: PROMPT_VERSION,
  };
}

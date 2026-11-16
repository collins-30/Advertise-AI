import { checkClaims } from "@/lib/ai/claims";
import { finalCopyForContent } from "@/lib/ai/compose";
import { generateLocalContent } from "@/lib/ai/local";
import {
  DEFAULT_OPENAI_MODEL,
  generateWithOpenAI,
  OpenAIError,
} from "@/lib/ai/openai";
import { PROMPT_VERSION } from "@/lib/ai/prompt";
import type {
  BrandContext,
  ClaimFinding,
  ContentBrief,
  GeneratedContent,
  GenerationUsage,
} from "@/lib/ai/types";

export const LOCAL_MODEL = "local-template-v1";

export type GenerationRun = {
  provider: "openai" | "local";
  model: string;
  promptVersion: string;
  content: GeneratedContent;
  usage: GenerationUsage;
  claimFindings: ClaimFinding[];
  engineNote: string;
};

export async function runGeneration({
  context,
  brief,
  apiKey,
  model = DEFAULT_OPENAI_MODEL,
}: {
  context: BrandContext;
  brief: ContentBrief;
  apiKey: string | null;
  model?: string;
}): Promise<GenerationRun> {
  let content: GeneratedContent;
  let provider: GenerationRun["provider"];
  let usedModel: string;
  let usage: GenerationUsage;
  let engineNote: string;

  if (apiKey) {
    try {
      const result = await generateWithOpenAI({
        apiKey,
        model,
        context,
        brief,
      });

      content = result.content;
      provider = "openai";
      usedModel = result.model;
      usage = result.usage;
      engineNote = "Model-written draft from OpenAI.";
    } catch (error) {
      const reason =
        error instanceof OpenAIError
          ? error.message
          : "The OpenAI request failed.";
      content = generateLocalContent(context, brief);
      provider = "local";
      usedModel = LOCAL_MODEL;
      usage = { inputTokens: null, outputTokens: null, estimatedCostUsd: 0 };
      engineNote = `${reason} A local template draft was generated instead.`;
    }
  } else {
    content = generateLocalContent(context, brief);
    provider = "local";
    usedModel = LOCAL_MODEL;
    usage = { inputTokens: null, outputTokens: null, estimatedCostUsd: 0 };
    engineNote =
      "Local template engine. Add OPENAI_API_KEY for model-written drafts.";
  }

  const claimFindings = checkClaims({
    text: finalCopyForContent(content, brief.platform),
    forbiddenClaims: context.profile.forbidden_claims,
    proposedClaims: context.profile.proposed_claims,
    verifiedFacts: context.profile.verified_facts,
  });

  return {
    provider,
    model: usedModel,
    promptVersion: PROMPT_VERSION,
    content,
    usage,
    claimFindings,
    engineNote,
  };
}

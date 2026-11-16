import type {
  AudiencePersonaRow,
  BrandProfileRow,
  BrandWritingSampleRow,
  ContentPillarRow,
} from "@/lib/database.types";
import type { GenerationBriefInput } from "@/lib/brand/schemas";

export type ContentBrief = GenerationBriefInput;

export type BrandContext = {
  profile: BrandProfileRow;
  personas: AudiencePersonaRow[];
  pillars: ContentPillarRow[];
  samples: BrandWritingSampleRow[];
  persona: AudiencePersonaRow | null;
  pillar: ContentPillarRow | null;
};

export type GeneratedContent = {
  title: string;
  hook: string;
  hooks: string[];
  body: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  altText: string | null;
  imageBrief: string | null;
  carouselSlides: string[];
};

export type ClaimFindingLevel = "blocker" | "warning" | "info";

export type ClaimFinding = {
  level: ClaimFindingLevel;
  message: string;
  excerpt?: string;
};

export type GenerationUsage = {
  inputTokens: number | null;
  outputTokens: number | null;
  estimatedCostUsd: number | null;
};

export type GenerationResult = {
  generationId: string;
  provider: "openai" | "local";
  model: string;
  promptVersion: string;
  brief: ContentBrief;
  personaId: string | null;
  pillarId: string | null;
  content: GeneratedContent;
  usage: GenerationUsage;
  claimFindings: ClaimFinding[];
  engineNote: string;
};

export type GenerationState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[]>;
  result?: GenerationResult;
};

export const initialGenerationState: GenerationState = { status: "idle" };

export type SaveDraftResult =
  | { ok: true; postId: string }
  | { ok: false; error: string; claimFindings?: ClaimFinding[] };

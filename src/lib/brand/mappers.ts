import type {
  AudiencePersonaRow,
  BrandProfileRow,
  BrandWritingSampleRow,
  ContentPillarRow,
  Json,
} from "@/lib/database.types";
import {
  emptyBrandProfile,
  starterBrandProfile,
} from "@/lib/brand/defaults";
import type {
  BrandProfileFormValues,
  PersonaFormValues,
  PillarFormValues,
  WritingSampleFormValues,
} from "@/lib/brand/types";

function cadenceValue(
  cadence: Json,
  key: "linkedin" | "instagram",
  fallback: number,
): number {
  if (
    cadence &&
    typeof cadence === "object" &&
    !Array.isArray(cadence) &&
    typeof cadence[key] === "number"
  ) {
    return cadence[key] as number;
  }
  return fallback;
}

function cadenceNote(cadence: Json, fallback: string): string {
  if (
    cadence &&
    typeof cadence === "object" &&
    !Array.isArray(cadence) &&
    typeof cadence.note === "string"
  ) {
    return cadence.note;
  }
  return fallback;
}

export function toBrandProfileFormValues(
  row: BrandProfileRow | null,
  options: { useStarterWhenMissing?: boolean } = {},
): BrandProfileFormValues {
  if (!row) {
    return options.useStarterWhenMissing
      ? structuredClone(starterBrandProfile)
      : structuredClone(emptyBrandProfile);
  }

  return {
    companyName: row.company_name,
    oneLiner: row.one_liner ?? "",
    description: row.description ?? "",
    websiteUrl: row.website_url ?? "",
    positioning: row.positioning ?? "",
    targetMarket: row.target_market ?? "",
    valueProps: row.value_props ?? [],
    verifiedFacts: row.verified_facts ?? [],
    proposedClaims: row.proposed_claims ?? [],
    forbiddenClaims: row.forbidden_claims ?? [],
    claimNotes: row.claim_notes ?? "",
    toneKeywords: row.tone_keywords ?? [],
    emojiPolicy: row.emoji_policy,
    hashtagPolicy: row.hashtag_policy ?? "",
    primaryCta: row.primary_cta ?? "",
    bookingUrl: row.booking_url ?? "",
    linkedinPerWeek: cadenceValue(row.posting_cadence, "linkedin", 3),
    instagramPerWeek: cadenceValue(row.posting_cadence, "instagram", 2),
    cadenceNote: cadenceNote(row.posting_cadence, ""),
    notes: row.notes ?? "",
  };
}

export function toPersonaFormValues(
  row: AudiencePersonaRow,
): PersonaFormValues {
  return {
    id: row.id,
    name: row.name,
    role: row.role ?? "",
    companyType: row.company_type ?? "",
    companySize: row.company_size ?? "",
    painPoints: row.pain_points ?? [],
    desires: row.desires ?? [],
    objections: row.objections ?? [],
    wateringHoles: row.watering_holes ?? [],
    buyingTriggers: row.buying_triggers ?? [],
    isPrimary: row.is_primary,
    notes: row.notes ?? "",
  };
}

export function toPillarFormValues(row: ContentPillarRow): PillarFormValues {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? "",
    percentage: row.percentage,
    exampleTopics: row.example_topics ?? [],
    isActive: row.is_active,
  };
}

export function toWritingSampleFormValues(
  row: BrandWritingSampleRow,
): WritingSampleFormValues {
  const platform =
    row.platform === "linkedin" ||
    row.platform === "instagram" ||
    row.platform === "other"
      ? row.platform
      : "";

  return {
    id: row.id,
    platform,
    title: row.title ?? "",
    content: row.content,
    notes: row.notes ?? "",
  };
}

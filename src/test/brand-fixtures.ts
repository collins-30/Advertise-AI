import type { BrandContext, ContentBrief } from "@/lib/ai/types";
import type {
  AudiencePersonaRow,
  BrandProfileRow,
  BrandWritingSampleRow,
  ContentPillarRow,
} from "@/lib/database.types";

const WORKSPACE_ID = "00000000-0000-4000-8000-000000000001";

export const brandProfileFixture: BrandProfileRow = {
  id: "00000000-0000-4000-8000-000000000010",
  workspace_id: WORKSPACE_ID,
  company_name: "CloseLoop",
  one_liner:
    "Brand-aware content for agency owners — without handing over the keys.",
  description:
    "CloseLoop captures an agency's positioning, audience and voice, then drafts platform-specific content with a human approving every post.",
  website_url: null,
  positioning:
    "The brand-aware marketing assistant for owner-led agencies that refuse to sound generic.",
  target_market:
    "Owner-led B2B service agencies with 2–20 people that sell expertise rather than products.",
  value_props: [
    "One brand brain instead of a blank page.",
    "Platform-specific drafts for LinkedIn and Instagram.",
  ],
  proof_points: [],
  verified_facts: [
    "CloseLoop is an AI marketing assistant.",
    "CloseLoop requires a human to approve content before it can be published.",
  ],
  proposed_claims: [
    "Agency owners are usually the best salesperson in the business.",
    "The hardest part of agency content is deciding what to say.",
  ],
  claim_notes:
    "Assumption-based starter profile. No customer outcomes have been verified.",
  forbidden_claims: [
    "Guaranteed leads, revenue, growth or engagement.",
    "Replace the agency owner's judgement or run fully on autopilot.",
  ],
  tone_keywords: ["direct", "practical", "calm"],
  emoji_policy: "sparing",
  hashtag_policy: "LinkedIn: 0–3 hashtags. Instagram: 3–5 specific hashtags.",
  primary_cta: "Book a short walkthrough",
  booking_url: null,
  posting_cadence: { linkedin: 3, instagram: 2 },
  notes: null,
  created_at: "2026-11-15T00:00:00.000Z",
  updated_at: "2026-11-15T00:00:00.000Z",
};

export const personaFixture: AudiencePersonaRow = {
  id: "00000000-0000-4000-8000-000000000020",
  workspace_id: WORKSPACE_ID,
  name: "Agency owner / founder",
  role: "Founder or managing director",
  company_type: "Owner-led B2B service agency",
  company_size: "2–20 people",
  pain_points: [
    "Client work always comes before the agency's own marketing.",
    "Generic AI output sounds like everyone else and needs heavy editing.",
  ],
  desires: [
    "A steady pipeline of qualified conversations.",
    "A content system that does not take the owner out of delivery.",
  ],
  objections: [
    "Publishing without approval is too risky for our brand.",
    "I do not have time to review another dashboard.",
  ],
  watering_holes: [
    "LinkedIn founder-led posts and comments.",
    "Agency owner peer groups.",
  ],
  buying_triggers: [
    "A dry pipeline.",
    "A failed content hire or freelancer.",
  ],
  is_primary: true,
  notes: "Assumption-based starter persona.",
  created_at: "2026-11-15T00:00:00.000Z",
  updated_at: "2026-11-15T00:00:00.000Z",
};

export const pillarFixture: ContentPillarRow = {
  id: "00000000-0000-4000-8000-000000000030",
  workspace_id: WORKSPACE_ID,
  name: "Owner-led growth",
  description:
    "Why the agency owner is both the bottleneck and the strongest asset in agency marketing.",
  percentage: 30,
  example_topics: ["The owner is the product", "Why client work eats your marketing"],
  is_active: true,
  created_at: "2026-11-15T00:00:00.000Z",
  updated_at: "2026-11-15T00:00:00.000Z",
};

export const writingSampleFixture: BrandWritingSampleRow = {
  id: "00000000-0000-4000-8000-000000000040",
  workspace_id: WORKSPACE_ID,
  platform: "linkedin",
  title: "Founder-led post",
  content:
    "Most agency owners do not have a content problem. They have an ownership problem. Client work gets the best hours and the agency's own marketing gets what is left.",
  notes: null,
  created_at: "2026-11-15T00:00:00.000Z",
};

export function makeBrandContext(
  overrides: Partial<BrandContext> = {},
): BrandContext {
  return {
    profile: brandProfileFixture,
    personas: [personaFixture],
    pillars: [pillarFixture],
    samples: [writingSampleFixture],
    persona: personaFixture,
    pillar: pillarFixture,
    ...overrides,
  };
}

export function makeBrief(
  overrides: Partial<ContentBrief> = {},
): ContentBrief {
  return {
    platform: "linkedin",
    format: "text",
    pillarId: pillarFixture.id,
    personaId: personaFixture.id,
    objective: "attract_agency_owners",
    angle: "",
    notes: "",
    ctaMode: "brand",
    customCta: "",
    variantSeed: 0,
    ...overrides,
  };
}

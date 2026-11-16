export type EmojiPolicy = "none" | "sparing" | "free";

export type BrandProfileFormValues = {
  companyName: string;
  oneLiner: string;
  description: string;
  websiteUrl: string;
  positioning: string;
  targetMarket: string;
  valueProps: string[];
  verifiedFacts: string[];
  proposedClaims: string[];
  forbiddenClaims: string[];
  claimNotes: string;
  toneKeywords: string[];
  emojiPolicy: EmojiPolicy;
  hashtagPolicy: string;
  primaryCta: string;
  bookingUrl: string;
  linkedinPerWeek: number;
  instagramPerWeek: number;
  cadenceNote: string;
  notes: string;
};

export type PersonaFormValues = {
  id?: string;
  name: string;
  role: string;
  companyType: string;
  companySize: string;
  painPoints: string[];
  desires: string[];
  objections: string[];
  wateringHoles: string[];
  buyingTriggers: string[];
  isPrimary: boolean;
  notes: string;
};

export type PillarFormValues = {
  id?: string;
  name: string;
  description: string;
  percentage: number | null;
  exampleTopics: string[];
  isActive: boolean;
};

export type WritingSampleFormValues = {
  id?: string;
  platform: "" | "linkedin" | "instagram" | "other";
  title: string;
  content: string;
  notes: string;
};

export type GenerationBriefFormValues = {
  platform: "linkedin" | "instagram";
  format: "single_image" | "carousel" | "text";
  pillarId: string;
  personaId: string;
  objective:
    | "attract_agency_owners"
    | "problem"
    | "solution"
    | "education"
    | "proof"
    | "offer";
  angle: string;
  notes: string;
  ctaMode: "brand" | "none" | "custom";
  customCta: string;
  variantSeed: number;
};

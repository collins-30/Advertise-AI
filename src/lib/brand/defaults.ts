import type {
  BrandProfileFormValues,
  PersonaFormValues,
  PillarFormValues,
} from "@/lib/brand/types";

/**
 * Assumption-based starter content for the promoted brand.
 *
 * Advertise-AI is the application. This file describes the brand Advertise-AI
 * markets — currently CloseLoop, a revenue-recovery product for small web
 * design and digital marketing agencies. The migration seeds the same shape for
 * the existing workspace. This copy is used when the table exists but the
 * profile has been removed, so the dashboard never presents an unexplained
 * blank page.
 *
 * Product identity facts stay in verifiedFacts. Proposed capabilities stay in
 * proposedClaims and must be hedged. Nothing here claims recovered revenue,
 * conversions or customer acquisition.
 */
export const starterBrandProfile: BrandProfileFormValues = {
  companyName: "CloseLoop",
  oneLiner:
    "Revenue recovery for small agencies that cannot afford to forget a follow-up.",
  description:
    "CloseLoop is an AI-powered revenue-recovery assistant for small service businesses, initially small web design and digital marketing agencies. It is being built to identify opportunities that need attention, organise follow-up activity and suggest contextual follow-up messages so fewer enquiries and proposals go quiet. The focus is not more leads. It is making sure the conversations already in the pipeline get a clear next step.",
  websiteUrl: "",
  positioning:
    "CloseLoop is the revenue-recovery assistant for small web design and digital marketing agencies that cannot afford to let good enquiries and proposals go quiet.",
  targetMarket:
    "Small web design and digital marketing agencies (roughly 2–20 people) that sell projects or retainers and depend on enquiries, proposals and follow-up to win work.",
  valueProps: [
    "See which enquiries and proposals need a follow-up before they go cold.",
    "Keep lead conversations and next steps in one organised place.",
    "Get contextual follow-up suggestions instead of starting from a blank page.",
    "Protect revenue that is already in the pipeline, not just chase new leads.",
  ],
  verifiedFacts: [
    "CloseLoop is an AI-powered revenue-recovery assistant for small service businesses.",
    "CloseLoop's initial target market is small web design and digital marketing agencies.",
  ],
  proposedClaims: [
    "Small agencies lose more revenue to follow-up that never happens than to a lack of new leads.",
    "Forgotten follow-ups are usually a side effect of disorganised lead conversations, not a lack of care.",
    "A system that surfaces opportunities needing attention can help a small team follow up consistently.",
    "Following up with stalled proposals is often cheaper than finding new prospects.",
    "Prospects who stop responding usually need a clear next step, not more pressure.",
    "CloseLoop's proposed approach is to identify opportunities, organise follow-up activity and suggest contextual messages so prospects can move toward becoming paying customers.",
    "Business owners want a follow-up system that supports their judgement, not one that automates conversations without them.",
  ],
  forbiddenClaims: [
    "Guaranteed revenue, recovered revenue, conversions, clients or customer acquisition.",
    "A specific amount of revenue recovered or hours saved unless it has been measured with a customer.",
    "CloseLoop is a social media marketing assistant, AI content generator or brand management platform.",
    "Replace the business owner's judgement or run fully on autopilot.",
    "Client names, logos, testimonials, revenue figures or case studies without written permission.",
    "Awards, rankings, certifications or best/fastest claims we cannot evidence.",
    "Claims that every enquiry, proposal or conversation will convert.",
    "Claims that automated sending, integrations or social publishing are live before they ship.",
  ],
  claimNotes:
    'ASSUMPTION-BASED STARTER PROFILE. Product identity facts are separated from market hypotheses and proposed capabilities. No revenue recovery, conversion, time saving or customer outcome has been verified. Move a capability into "Verified facts" only after it ships and can be substantiated.',
  toneKeywords: [
    "direct",
    "practical",
    "calm",
    "specific",
    "operator-to-operator",
    "allergic to hype",
  ],
  emojiPolicy: "sparing",
  hashtagPolicy:
    "Instagram: 3–5 specific hashtags. LinkedIn: 0–3. Prefer audience or problem tags over generic #AI #Marketing tags. No hashtags in the middle of sentences.",
  primaryCta: "Book a short walkthrough",
  bookingUrl: "",
  linkedinPerWeek: 3,
  instagramPerWeek: 2,
  cadenceNote: "Assumed starting cadence. Confirm with the founder.",
  notes:
    "Write for owners of small web design and digital marketing agencies. Name the cost of forgotten follow-ups, then explain CloseLoop's proposed approach. Do not describe CloseLoop as a content, social media or brand management tool. Do not invent proof or recovered revenue.",
};

export const emptyBrandProfile: BrandProfileFormValues = {
  companyName: "CloseLoop",
  oneLiner: "",
  description: "",
  websiteUrl: "",
  positioning: "",
  targetMarket: "",
  valueProps: [],
  verifiedFacts: [],
  proposedClaims: [],
  forbiddenClaims: [],
  claimNotes: "",
  toneKeywords: [],
  emojiPolicy: "sparing",
  hashtagPolicy: "",
  primaryCta: "",
  bookingUrl: "",
  linkedinPerWeek: 3,
  instagramPerWeek: 2,
  cadenceNote: "",
  notes: "",
};

export const starterPersona: PersonaFormValues = {
  name: "Agency owner / founder",
  role: "Founder, owner or managing director",
  companyType: "Small web design or digital marketing agency",
  companySize: "2–20 people",
  painPoints: [
    "Enquiries arrive while client work is in full swing, and the follow-up waits.",
    "Proposals go out and then sit without a clear next step.",
    "Prospective clients stop responding and nobody is sure when to follow up again.",
    "Lead conversations live across inboxes, notes and memory.",
    "The owner is the main salesperson, so follow-up depends on finding time.",
    "Reconnecting with old prospects is always the first thing to slip.",
  ],
  desires: [
    "A clear view of which opportunities need attention this week.",
    "A follow-up process the whole small team can keep to.",
    "Fewer good proposals lost to silence.",
    "More revenue from the pipeline they already have.",
    "Confidence that no interested prospect has been forgotten.",
  ],
  objections: [
    "We already have a CRM; it just does not get updated.",
    "I do not want another dashboard to maintain.",
    "Automated follow-up could sound pushy or generic.",
    "I need to see it work with our actual enquiries and proposals.",
    "We are a small team; anything new has to be quick to use.",
  ],
  wateringHoles: [
    "LinkedIn: agency owners, web design and marketing communities.",
    "Agency peer groups, Slack communities and mastermind groups.",
    "Agency-focused podcasts and newsletters.",
    "Web design and digital marketing conferences and local meetups.",
    "Recommendations from peers and existing clients.",
  ],
  buyingTriggers: [
    "A good proposal goes quiet and the work goes elsewhere.",
    "A dry month after a busy delivery period.",
    "A new business development push or referral spike.",
    "A CRM cleanup that reveals stale opportunities.",
    "A peer recommends a follow-up system that is simple to run.",
  ],
  isPrimary: true,
  notes:
    "ASSUMPTION-BASED STARTER PERSONA. Confirm with 10–15 small agency owners before treating any pain point as validated.",
};

export const emptyPersona: PersonaFormValues = {
  name: "",
  role: "",
  companyType: "",
  companySize: "",
  painPoints: [],
  desires: [],
  objections: [],
  wateringHoles: [],
  buyingTriggers: [],
  isPrimary: false,
  notes: "",
};

export const starterPillars: PillarFormValues[] = [
  {
    name: "The cost of forgotten follow-ups",
    description:
      "The revenue that quietly disappears when enquiries and proposals are not followed up.",
    percentage: 25,
    exampleTopics: [
      "What a forgotten follow-up actually costs",
      "The proposal that went quiet",
      "Why busy weeks hide lost revenue",
      "Follow-up is a revenue activity, not admin",
    ],
    isActive: true,
  },
  {
    name: "Enquiry and proposal management",
    description:
      "How small agencies can track enquiries, proposals and next steps without adding another system nobody updates.",
    percentage: 20,
    exampleTopics: [
      "Where enquiries get stuck",
      "A simple next-step rule for every proposal",
      "Keeping lead conversations in one place",
      "When to follow up without sounding pushy",
    ],
    isActive: true,
  },
  {
    name: "Revenue leakage and missed opportunities",
    description:
      "The small leaks that add up: stalled deals, silent prospects and reconnection opportunities that never happen.",
    percentage: 20,
    exampleTopics: [
      "The cost of a silent pipeline",
      "Reconnecting with prospects who went quiet",
      "Missed opportunities hiding in your inbox",
      "Revenue recovery versus more lead generation",
    ],
    isActive: true,
  },
  {
    name: "Better client communication and follow-up processes",
    description:
      "Practical follow-up habits and communication standards that help prospects feel looked after.",
    percentage: 20,
    exampleTopics: [
      "A follow-up cadence a small team can keep",
      "How to write a useful check-in",
      "Setting expectations after a proposal",
      "What to do when a prospect goes silent",
    ],
    isActive: true,
  },
  {
    name: "CloseLoop product education and demonstrations",
    description:
      "How CloseLoop is being designed to surface opportunities, organise follow-up and suggest contextual messages.",
    percentage: 15,
    exampleTopics: [
      "What revenue recovery means in practice",
      "How CloseLoop decides what needs attention",
      "A walkthrough of the follow-up view",
      "What CloseLoop is not: not a content or social media tool",
    ],
    isActive: true,
  },
];

export const emptyPillar: PillarFormValues = {
  name: "",
  description: "",
  percentage: null,
  exampleTopics: [],
  isActive: true,
};

export const OBJECTIVE_LABELS = {
  attract_agency_owners: "Attract agency owners",
  problem: "Name the problem",
  solution: "Explain the proposed solution",
  education: "Teach one useful idea",
  proof: "Show the standard / approach",
  offer: "Invite a conversation",
} as const;

export const OBJECTIVE_HINTS = {
  attract_agency_owners:
    "Lead with the agency owner's world. Make the cost of a forgotten follow-up concrete without inventing proof.",
  problem:
    "Describe the problem in the owner's language: stalled proposals, silent prospects, follow-up that never happens.",
  solution:
    "Explain the proposed approach — surface opportunities, organise follow-up, suggest contextual messages — as a direction, not a proven outcome.",
  education:
    "Give one practical follow-up idea an agency owner can use even without CloseLoop.",
  proof:
    "Talk about the standard or product decisions behind CloseLoop. Do not invent recovered revenue, metrics, logos or testimonials.",
  offer:
    "Make a calm invitation to a conversation. No urgency tricks, guarantees or fake scarcity.",
} as const;

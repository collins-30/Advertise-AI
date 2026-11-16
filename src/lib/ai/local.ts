import type {
  BrandContext,
  ContentBrief,
  GeneratedContent,
} from "@/lib/ai/types";

/**
 * Deterministic local draft engine.
 *
 * This is not presented as AI. It exists so the product can be exercised and
 * tested before an OPENAI_API_KEY is configured, and so a failed model call
 * still leaves the dashboard useful. It composes only from the Brand Brain.
 *
 * The engine is intentionally brand-aware: it takes the promoted brand's name,
 * positioning, claims, persona and pillar from the context. Advertise-AI is the
 * tool that runs it and is never named in the output.
 */

function hash(value: string): number {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
}

function pick<T>(items: T[], seed: number, offset = 0): T | null {
  if (items.length === 0) return null;
  return items[(seed + offset) % items.length] ?? null;
}

function lowerFirst(value: string): string {
  if (!value) return value;
  const firstWord = value.split(/\s/, 1)[0] ?? "";
  // Keep proper nouns such as "CloseLoop" and acronyms such as "AI" intact.
  if (firstWord === "I" || /[A-Z]/.test(firstWord.slice(1))) return value;
  return value.charAt(0).toLocaleLowerCase() + value.slice(1);
}

function stripPeriod(value: string): string {
  return value.trim().replace(/[.]+$/, "");
}

function sentence(value: string): string {
  const trimmed = value.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function truncate(value: string, max: number): string {
  if (value.length <= max) return value;

  const slice = value.slice(0, max - 1);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > max * 0.6 ? slice.slice(0, lastSpace) : slice;
  return `${cut.trimEnd()}…`;
}

function brandName(context: BrandContext): string {
  return context.profile.company_name.trim() || "the brand";
}

const HOOKS: Record<ContentBrief["objective"], string[]> = {
  attract_agency_owners: [
    "Most small agencies do not lose work because they are bad at sales. They lose it because follow-up slips.",
    "The proposal was good. The follow-up never happened.",
    "The most expensive lead in your business is the one you forgot to reply to.",
  ],
  problem: [
    "A lead goes quiet, client work takes over, and the follow-up waits until it is awkward.",
    "Forgotten follow-ups rarely look like a crisis. They look like a busy week.",
    "Every stalled proposal has a story. Most of them start with 'I meant to reply'.",
  ],
  solution: [
    "The fix is not more leads. It is a system that tells you which conversation needs attention.",
    "What would change if every enquiry had a clear next step and an owner?",
    "Revenue recovery starts with one habit: nothing stays in the maybe pile without a follow-up date.",
  ],
  education: [
    "A quick follow-up audit: list every proposal you sent in the last 30 days that has no next step.",
    "One useful question for your pipeline: which conversations have gone quiet without a decision?",
    "The cheapest new client is often a prospect you already spoke to.",
  ],
  proof: [
    "The standard we are building {brand} against: no opportunity should go quiet because nobody had time to follow up.",
    "We are not building a tool that sends messages for you. We are building one that helps you see what needs a reply.",
    "The product test is simple: does it make the next follow-up obvious?",
  ],
  offer: [
    "If follow-up keeps slipping, start with a small audit of the conversations already in your pipeline.",
    "You do not need more leads to recover more revenue. You need a clearer view of the ones you already have.",
    "If the bottleneck is knowing who to follow up with, a short walkthrough is probably enough to see whether {brand} fits.",
  ],
};

function buildHooks(
  brief: ContentBrief,
  seed: number,
  brand: string,
): string[] {
  const pool = HOOKS[brief.objective];
  const ordered = [
    pool[seed % pool.length],
    pool[(seed + 1) % pool.length],
    pool[(seed + 2) % pool.length],
  ];

  return Array.from(new Set(ordered)).map((hook) =>
    truncate(hook.replaceAll("{brand}", brand), 300),
  );
}

function ctaFor(brief: ContentBrief, context: BrandContext): string | null {
  if (brief.ctaMode === "none") return null;
  if (brief.ctaMode === "custom") return brief.customCta.trim() || null;

  const primary = context.profile.primary_cta?.trim();
  if (!primary) return null;
  return primary.endsWith(".") ? primary : `${primary}.`;
}

function toHashtag(value: string): string {
  const words = value
    .replace(/[^a-zA-Z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1));

  return `#${words.join("")}`;
}

function hashtagsFor(
  brief: ContentBrief,
  context: BrandContext,
): string[] {
  const pillarTag = context.pillar?.name ? toHashtag(context.pillar.name) : null;
  const brandTag = toHashtag(brandName(context));

  const base =
    brief.platform === "linkedin"
      ? ["#AgencyOperations", "#ClientFollowUp"]
      : ["#AgencyOperations", "#ClientFollowUp", "#RevenueOperations"];

  const tags = [
    ...base,
    pillarTag,
    brief.platform === "instagram" ? brandTag : null,
  ]
    .filter((tag): tag is string => Boolean(tag))
    .slice(0, brief.platform === "linkedin" ? 3 : 5);

  return Array.from(new Set(tags));
}

function buildBody(
  brief: ContentBrief,
  context: BrandContext,
  seed: number,
): string {
  const { profile, persona, pillar } = context;
  const brand = brandName(context);
  const pain = pick(persona?.pain_points ?? [], seed);
  const desire = pick(persona?.desires ?? [], seed, 1);
  const objection = pick(persona?.objections ?? [], seed, 2);
  const proposed = pick(profile.proposed_claims, seed, 1);
  const verificationFact = pick(profile.verified_facts, seed);
  const positioning = profile.positioning?.trim();
  const oneLiner = profile.one_liner?.trim();

  const paragraphs: string[] = [];

  if (pain) {
    paragraphs.push(
      `If you run a small agency, the pattern is familiar: ${lowerFirst(stripPeriod(pain))}.`,
    );
  } else {
    paragraphs.push(
      "If you run a small agency, the pattern is familiar: a lead goes quiet, client work takes over, and the follow-up waits until it is awkward.",
    );
  }

  if (proposed) {
    paragraphs.push(
      `Our working view is that ${lowerFirst(stripPeriod(proposed))}. That is a hypothesis, not a promise — but it is the one ${brand} is being built around.`,
    );
  } else if (pillar?.description) {
    paragraphs.push(`${stripPeriod(pillar.description)}.`);
  }

  if (brief.objective === "education") {
    paragraphs.push(
      "A practical place to start: list every enquiry and proposal from the last 30 days, mark the ones with no clear next step, and give each one a follow-up date. You do not need a new tool to do that once.",
    );
  } else if (brief.objective === "proof") {
    paragraphs.push(
      `The standard is straightforward: every live conversation should have a next action, a date and an owner. ${brand} is being built to make that visible rather than add another dashboard to check.`,
    );
  } else if (brief.objective === "offer") {
    paragraphs.push(
      "Before adding more leads, it helps to see what is already sitting in the pipeline. A short review often surfaces proposals that are worth one more honest follow-up.",
    );
  } else {
    paragraphs.push(
      `The proposed approach is to identify opportunities that need attention, organise follow-up activity and suggest contextual follow-up messages${pillar ? `, starting with ${lowerFirst(pillar.name)}` : ""} — so fewer conversations stall simply because nobody had time.`,
    );
  }

  if (
    verificationFact &&
    (brief.objective === "proof" || brief.objective === "solution")
  ) {
    paragraphs.push(
      `The product fact is simple: ${lowerFirst(stripPeriod(verificationFact))}. The rest is a direction, not a proven outcome.`,
    );
  }

  if (objection) {
    paragraphs.push(
      `The reasonable objection is simple: “${sentence(objection)}” That is exactly why ${brand} is designed to keep a human in control.`,
    );
  }

  if (desire) {
    paragraphs.push(
      `The goal is not more noise. It is ${lowerFirst(stripPeriod(desire))} — without adding another system nobody maintains.`,
    );
  }

  paragraphs.push(
    "No guaranteed revenue. No autopilot. A human still decides who to contact and what to say.",
  );

  const copy = paragraphs.join("\n\n");
  return truncate(
    copy ||
      `${oneLiner ?? positioning ?? `${brand} helps small service businesses stop revenue slipping through forgotten follow-ups.`}`,
    5000,
  );
}

function buildCarouselSlides(
  brief: ContentBrief,
  hook: string,
  copy: string,
  cta: string | null,
): string[] {
  if (brief.format !== "carousel") return [];

  const sentences = copy
    .split(/\n\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);

  return [
    hook,
    sentences[0] ?? "A lead goes quiet and the follow-up waits.",
    sentences[1] ?? "Forgotten follow-ups are a revenue problem, not an admin problem.",
    sentences[2] ?? "A clear next step makes the follow-up easier to keep.",
    cta ?? "Review the pipeline. Keep the conversation moving.",
  ]
    .map((slide) => truncate(slide, 600))
    .slice(0, 5);
}

export function generateLocalContent(
  context: BrandContext,
  brief: ContentBrief,
): GeneratedContent {
  const brand = brandName(context);
  const seed =
    hash(`${brief.objective}:${brief.pillarId ?? ""}:${brief.personaId ?? ""}:${brief.angle}:${brief.variantSeed}`) +
    brief.variantSeed;
  const hooks = buildHooks(brief, seed, brand);
  const hook = hooks[0] ?? "A clearer way to keep good conversations moving.";
  const copy = buildBody(brief, context, seed);
  const cta = ctaFor(brief, context);
  const hashtags = hashtagsFor(brief, context);
  const pillarName = context.pillar?.name ?? "Revenue recovery";
  const title = truncate(
    `${pillarName}: ${hook.replace(/[.?!]+$/, "")}`,
    160,
  );
  const carouselSlides = buildCarouselSlides(brief, hook, copy, cta);

  const imageBrief = truncate(
    `Clean, text-led graphic on an off-white background. Oversized headline: “${truncate(hook, 90)}”. One thin accent rule, small ${brand} wordmark in a lower corner. No stock photography, no busy collage. Keep the lower third clear for platform interface elements.`,
    1200,
  );

  return {
    title,
    hook,
    hooks,
    body: brief.platform === "linkedin" ? copy : null,
    caption: brief.platform === "instagram" ? copy : null,
    hashtags,
    cta,
    altText: truncate(
      `Text-led graphic with the headline: “${truncate(hook, 120)}”. ${brand} wordmark visible.`,
      1200,
    ),
    imageBrief,
    carouselSlides,
  };
}

import type { ClaimFinding } from "@/lib/ai/types";

export type ClaimCheckInput = {
  text: string;
  forbiddenClaims: string[];
  proposedClaims?: string[];
  verifiedFacts?: string[];
};

function normalize(value: string): string {
  return value
    .toLocaleLowerCase()
    .replace(/[“”‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

function excerptFor(text: string, index: number, length: number): string {
  const start = Math.max(0, index - 45);
  const end = Math.min(text.length, index + length + 45);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

function uniqueFindings(findings: ClaimFinding[]): ClaimFinding[] {
  const seen = new Set<string>();
  return findings.filter((finding) => {
    const key = `${finding.level}:${finding.message}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function comparable(value: string): string {
  return normalize(value).replace(/[.!?,;:]+$/, "");
}

function isCoveredByVerifiedFact(excerpt: string, verifiedFacts: string[]): boolean {
  const normalizedExcerpt = comparable(excerpt);
  return verifiedFacts.some((fact) => {
    const normalizedFact = comparable(fact);
    return (
      normalizedFact.length > 10 &&
      (normalizedExcerpt.includes(normalizedFact) ||
        normalizedFact.includes(normalizedExcerpt))
    );
  });
}

const NEGATION =
  /\b(?:no|not|never|without|cannot|can't|don't|doesn't|didn't|isn't|aren't|won't|avoid|avoids|avoided|avoiding|zero|free of)\b[^.!?\n]{0,50}$/i;

/**
 * "No guaranteed reach" and "we never run on autopilot" are the opposite of a
 * claim. Check the run-up to the match before flagging it.
 */
function isNegated(text: string, index: number): boolean {
  const before = text.slice(Math.max(0, index - 80), index);
  return NEGATION.test(before);
}

/**
 * An objection such as "publishing without approval is too risky" is attributed
 * speech, not a promise made by the brand. Heuristic rules ignore quoted spans;
 * exact forbidden claims are still checked against the full text.
 */
function blankQuotedSpans(text: string): string {
  return text.replace(/"[^"\n]*"|“[^”\n]*”/g, (match) =>
    " ".repeat(match.length),
  );
}

const RISK_RULES: Array<{
  pattern: RegExp;
  level: ClaimFinding["level"];
  message: string;
}> = [
  {
    pattern: /\bguarantee(?:d|s|ing)?\b/i,
    level: "blocker",
    message:
      "Guarantee language is forbidden. Remove the guarantee or say what is actually being offered.",
  },
  {
    pattern: /\b100\s?%/i,
    level: "blocker",
    message:
      "Absolute percentage claims are forbidden unless a verified source is added.",
  },
  {
    pattern: /\b(?:double|triple|\d+(?:\.\d+)?x)\b/i,
    level: "warning",
    message:
      "Multiplier claim detected. Only keep it if a verified result supports it.",
  },
  {
    pattern: /\b(?:autopilot|fully automated|auto-publish|without approval)\b/i,
    level: "blocker",
    message:
      "Keep a human in the loop. Do not claim autopilot or approval-free sending.",
  },
  {
    pattern: /\b(?:testimonial|case study|client logo|our client|worked with)\b/i,
    level: "warning",
    message:
      "Client proof detected. Confirm written permission before naming or quoting a client.",
  },
  {
    pattern: /\b(?:award-winning|ranked|#1|number one|world-class|unmatched)\b/i,
    level: "warning",
    message:
      "Ranking or superlative claim detected. Only keep it with evidence.",
  },
  {
    pattern: /\b(?:best|fastest|leading)\b/i,
    level: "info",
    message:
      "Superlative language can read like a claim. Prefer a concrete, defensible description.",
  },
];

const NUMBER_CLAIM =
  /(?:\b\d+(?:\.\d+)?\s?%|\$\s?\d[\d,]*|\b\d+\s?(?:hours?|days?|weeks?|months?)\b)/gi;

/**
 * A writing aid, not a legal review. It catches the patterns the brand profile
 * explicitly forbids and the most common unsubstantiated marketing claims.
 */
export function checkClaims({
  text,
  forbiddenClaims,
  verifiedFacts = [],
}: ClaimCheckInput): ClaimFinding[] {
  if (!text.trim()) return [];

  const findings: ClaimFinding[] = [];
  const normalizedText = normalize(text);

  for (const forbidden of forbiddenClaims) {
    const normalizedForbidden = normalize(forbidden);
    if (normalizedForbidden.length < 8) continue;

    let index = normalizedText.indexOf(normalizedForbidden);
    while (index !== -1) {
      if (!isNegated(normalizedText, index)) {
        findings.push({
          level: "blocker",
          message: `Matches a forbidden claim: “${forbidden}”`,
        });
        break;
      }
      index = normalizedText.indexOf(normalizedForbidden, index + 1);
    }
  }

  const riskText = blankQuotedSpans(text);

  for (const rule of RISK_RULES) {
    const match = rule.pattern.exec(riskText);
    if (!match || match.index === undefined) continue;
    if (isNegated(riskText, match.index)) continue;

    const excerpt = excerptFor(text, match.index, match[0].length);
    if (isCoveredByVerifiedFact(excerpt, verifiedFacts)) continue;

    findings.push({
      level: rule.level,
      message: rule.message,
      excerpt,
    });
  }

  NUMBER_CLAIM.lastIndex = 0;
  let numberMatch: RegExpExecArray | null;
  while ((numberMatch = NUMBER_CLAIM.exec(riskText)) !== null) {
    if (isNegated(riskText, numberMatch.index)) continue;

    const excerpt = excerptFor(text, numberMatch.index, numberMatch[0].length);
    if (isCoveredByVerifiedFact(excerpt, verifiedFacts)) continue;

    findings.push({
      level: "warning",
      message:
        "Specific number or time-saving claim detected. Verify it before publishing, or remove the number.",
      excerpt,
    });
    break;
  }

  return uniqueFindings(findings).slice(0, 12);
}

export function hasClaimBlockers(findings: ClaimFinding[]): boolean {
  return findings.some((finding) => finding.level === "blocker");
}

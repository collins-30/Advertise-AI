import { describe, expect, it } from "vitest";

import { checkClaims, hasClaimBlockers } from "@/lib/ai/claims";

const forbidden = ["Guaranteed leads, revenue, growth or engagement."];

describe("checkClaims", () => {
  it("returns nothing for empty copy", () => {
    expect(checkClaims({ text: "   ", forbiddenClaims: forbidden })).toEqual([]);
  });

  it("blocks a forbidden claim", () => {
    const findings = checkClaims({
      text: "We offer guaranteed leads, revenue, growth or engagement.",
      forbiddenClaims: forbidden,
    });

    expect(findings).toHaveLength(2);
    expect(
      findings.some((finding) =>
        finding.message.startsWith("Matches a forbidden claim"),
      ),
    ).toBe(true);
    expect(hasClaimBlockers(findings)).toBe(true);
  });

  it("does not flag a forbidden claim that is being denied", () => {
    const findings = checkClaims({
      text: "We do not offer guaranteed leads, revenue, growth or engagement.",
      forbiddenClaims: forbidden,
    });

    expect(findings).toEqual([]);
  });

  it("ignores very short forbidden phrases that would match by accident", () => {
    expect(
      checkClaims({ text: "We help agencies win.", forbiddenClaims: ["win"] }),
    ).toEqual([]);
  });

  it("blocks guarantee language", () => {
    const findings = checkClaims({
      text: "Our system guarantees more inbound leads.",
      forbiddenClaims: [],
    });

    expect(hasClaimBlockers(findings)).toBe(true);
  });

  it("allows a negated guarantee", () => {
    const findings = checkClaims({
      text: "No guaranteed reach. A human still decides what goes out.",
      forbiddenClaims: [],
    });

    expect(hasClaimBlockers(findings)).toBe(false);
  });

  it("blocks autopilot claims but not a denial", () => {
    expect(
      hasClaimBlockers(
        checkClaims({ text: "CloseLoop runs on autopilot.", forbiddenClaims: [] }),
      ),
    ).toBe(true);
    expect(
      hasClaimBlockers(
        checkClaims({
          text: "No autopilot. You approve every post.",
          forbiddenClaims: [],
        }),
      ),
    ).toBe(false);
  });

  it("does not treat a quoted objection as a brand claim", () => {
    const findings = checkClaims({
      text: 'The reasonable objection is: “Publishing without approval is too risky for our brand.” That is why approval exists.',
      forbiddenClaims: [],
    });

    expect(hasClaimBlockers(findings)).toBe(false);
  });

  it("warns about multipliers and specific numbers", () => {
    const findings = checkClaims({
      text: "This doubled our reach and saved 12 hours per week.",
      forbiddenClaims: [],
    });

    expect(findings.some((finding) => finding.level === "warning")).toBe(true);
  });

  it("suppresses a number covered by a verified fact", () => {
    const findings = checkClaims({
      text: "CloseLoop requires an approval step on 100% of posts.",
      forbiddenClaims: [],
      verifiedFacts: [
        "CloseLoop requires an approval step on 100% of posts before publishing.",
      ],
    });

    expect(findings).toEqual([]);
  });

  it("blocks absolute percentage claims", () => {
    const findings = checkClaims({
      text: "Our process is 100% reliable.",
      forbiddenClaims: [],
    });

    expect(findings.some((finding) => finding.level === "blocker")).toBe(true);
  });

  it("caps the number of findings", () => {
    const findings = checkClaims({
      text: Array.from(
        { length: 20 },
        (_, index) => `Guaranteed result ${index + 1} is 100% certain.`,
      ).join(" "),
      forbiddenClaims: [],
    });

    expect(findings.length).toBeLessThanOrEqual(12);
  });
});

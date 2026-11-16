import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/app/phase-placeholder";

export const metadata: Metadata = { title: "Publishing settings" };

export default function PublishingSettingsPage() {
  return (
    <PhasePlaceholder
      title="Publishing rules"
      phase="Phases 3 and 5"
      description="Cadence, limits and the guardrails that decide whether a post may go out."
      planned={[
        "Workspace timezone and preferred posting windows.",
        "Conservative per-platform daily cap.",
        "Explicit approval requirement with no bypass switch.",
        "Duplicate-publish protection and idempotency keys.",
        "Retry policy for transient failures; reauthorisation for auth failures.",
        "Publishing log with the exact error returned by the provider.",
      ]}
    />
  );
}

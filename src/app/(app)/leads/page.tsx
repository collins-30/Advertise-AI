import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/app/phase-placeholder";

export const metadata: Metadata = { title: "First 30" };

export default function LeadsPage() {
  return (
    <PhasePlaceholder
      title="First 30 agencies"
      phase="Phase 7"
      description="A manual-research workspace for validating CloseLoop with 30 agency owners."
      planned={[
        "Ideal customer profile with signals and disqualifiers.",
        "Agency prospect table with stage, fit score and next action.",
        "CSV import from your own research — no scraping or automated mass messaging.",
        "AI research briefs from public information you provide.",
        "Personalised outreach drafts that require your approval before sending.",
        "Conversation log covering calls, interviews, demos, pilots and willingness to pay.",
      ]}
    />
  );
}

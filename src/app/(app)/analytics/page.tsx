import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/app/phase-placeholder";

export const metadata: Metadata = { title: "Analytics" };

export default function AnalyticsPage() {
  return (
    <PhasePlaceholder
      title="Analytics"
      phase="Phase 6"
      description="Engagement by post, format and topic — using only metrics the official APIs actually return."
      planned={[
        "Instagram insights where the account grants the insights permission.",
        "LinkedIn metrics where available; otherwise a clearly labelled manual entry fallback.",
        "Comparison of hooks, formats and pillars across published posts.",
        "Best-performing topics to feed the next generation brief.",
        "Daily snapshot job that stores metrics without duplicating rows.",
      ]}
    />
  );
}

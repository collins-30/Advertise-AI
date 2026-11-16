import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";

import { BrandProfileForm } from "@/components/brand/brand-profile-form";
import { WritingSamplesPanel } from "@/components/brand/writing-samples-panel";
import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireWorkspaceAccess } from "@/lib/auth/context";
import { toBrandProfileFormValues, toWritingSampleFormValues } from "@/lib/brand/mappers";
import { getBrandBrain } from "@/lib/brand/queries";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Brand settings" };

export default function BrandSettingsPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <BrandSettingsContent />
    </Suspense>
  );
}

async function BrandSettingsContent() {
  const { supabase, workspace } = await requireWorkspaceAccess();
  const brain = await getBrandBrain(supabase, workspace.id);

  if (brain.status !== "ready") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Brand Brain"
          description="The context every draft starts from."
          eyebrow="Phase 2"
        />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {brain.status === "missing"
              ? "Phase 2 migration has not been applied"
              : "The Brand Brain could not be loaded"}
          </AlertTitle>
          <AlertDescription>
            {brain.status === "missing" ? (
              <>
                Run{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  supabase/migrations/20261115000000_phase2_brand_brain.sql
                </code>{" "}
                against your Supabase project, then reload this page.
              </>
            ) : (
              "Reload the page to try again. The database returned an unexpected error."
            )}
            <span className="mt-2 block text-xs opacity-80">
              Postgres said: {brain.message}
            </span>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const profileValues = toBrandProfileFormValues(brain.profile, {
    useStarterWhenMissing: true,
  });
  const sampleValues = brain.samples.map(toWritingSampleFormValues);
  const isStarter = Boolean(
    brain.profile?.claim_notes?.toLocaleUpperCase().includes("ASSUMPTION"),
  );

  const stats = [
    {
      label: "Verified facts",
      value: profileValues.verifiedFacts.length,
      hint: "Can be stated as fact",
    },
    {
      label: "Proposed claims",
      value: profileValues.proposedClaims.length,
      hint: "Must be hedged",
    },
    {
      label: "Forbidden claims",
      value: profileValues.forbiddenClaims.length,
      hint: "Hard stops",
    },
    {
      label: "Writing samples",
      value: sampleValues.length,
      hint: "Optional voice anchors",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Brand Brain"
        description="What CloseLoop sells, who it helps, what it may claim and what it must never say. Everything here is editable."
        eyebrow="Phase 2"
        actions={
          <ButtonLink href="/generate">
            <Sparkles className="size-4" />
            Generate with this
          </ButtonLink>
        }
      />

      {isStarter ? (
        <Alert>
          <AlertTriangle className="text-amber-600" />
          <AlertTitle>Starter assumptions, clearly labelled</AlertTitle>
          <AlertDescription>
            <p>
              The seeded profile separates product facts from market hypotheses.
              Nothing here claims a customer outcome, time saving, testimonial or
              metric. Replace the hypotheses with your own language, add writing
              samples, and move a claim into{" "}
              <strong className="font-medium text-foreground">
                Verified facts
              </strong>{" "}
              only when you can substantiate it.
            </p>
            {brain.profile?.updated_at ? (
              <p className="mt-2 text-xs opacity-80">
                Last saved{" "}
                {formatDateTime(brain.profile.updated_at, workspace.timezone)}.
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="gap-1">
              <CardDescription>{stat.label}</CardDescription>
              <CardTitle className="text-2xl tabular-nums">{stat.value}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground">{stat.hint}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <BrandProfileForm defaultValues={profileValues} />

      <WritingSamplesPanel samples={sampleValues} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">How the AI uses this</CardTitle>
          <CardDescription>
            Generation sends verified facts, proposed claims, forbidden claims,
            the selected persona and the selected pillar in one prompt.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="font-medium text-foreground">
              Verified facts
            </strong>{" "}
            are the only statements the writer may present as fact.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              Proposed claims
            </strong>{" "}
            are framed as a working view or hypothesis. They are never turned
            into proof.
          </p>
          <p>
            <strong className="font-medium text-foreground">
              Forbidden claims
            </strong>{" "}
            are checked again after generation. A draft with a blocker cannot be
            saved until the copy is fixed.
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-2">
            <Badge variant="outline">Prompt version content-v1</Badge>
            <ButtonLink
              variant="link"
              size="sm"
              className="h-auto px-0"
              href="/settings/audience"
            >
              Edit personas and pillars
              <ArrowRight className="size-3" />
            </ButtonLink>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

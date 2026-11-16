import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AlertTriangle, Sparkles } from "lucide-react";

import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import { PersonasPanel } from "@/components/audience/personas-panel";
import { PillarsPanel } from "@/components/audience/pillars-panel";
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
import { emptyPersona, emptyPillar, starterPersona } from "@/lib/brand/defaults";
import { toPersonaFormValues, toPillarFormValues } from "@/lib/brand/mappers";
import { getBrandBrain } from "@/lib/brand/queries";

export const metadata: Metadata = { title: "Audience settings" };

export default function AudienceSettingsPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <AudienceSettingsContent />
    </Suspense>
  );
}

async function AudienceSettingsContent() {
  const { supabase, workspace } = await requireWorkspaceAccess();
  const brain = await getBrandBrain(supabase, workspace.id);

  if (brain.status !== "ready") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Audience and pillars"
          description="Personas, pain points and content pillars that keep generation on-brief."
          eyebrow="Phase 2"
        />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {brain.status === "missing"
              ? "Phase 2 migration has not been applied"
              : "Audience data could not be loaded"}
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

  const personas = brain.personas.map(toPersonaFormValues);
  const pillars = brain.pillars.map(toPillarFormValues);
  const primary = personas.find((persona) => persona.isPrimary) ?? personas[0];
  const activePillars = pillars.filter((pillar) => pillar.isActive);
  const activeShare = activePillars.reduce(
    (sum, pillar) => sum + (pillar.percentage ?? 0),
    0,
  );
  const newPersonaDefaults =
    personas.length === 0 ? starterPersona : emptyPersona;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Audience and pillars"
        description="Who CloseLoop writes for and which topic territories it rotates between. Everything here is editable."
        eyebrow="Phase 2"
        actions={
          <ButtonLink href="/generate">
            <Sparkles className="size-4" />
            Generate content
          </ButtonLink>
        }
      />

      <Alert>
        <AlertTitle>Deliberately narrow audience</AlertTitle>
        <AlertDescription>
          The assistant is tuned to attract agency owners, not every marketer.
          Keep the primary persona specific: a founder or owner of a 2–20 person
          B2B service agency. Add more personas only if they share that buying
          context.
        </AlertDescription>
      </Alert>

      <div className="grid gap-3 sm:grid-cols-3">
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Primary persona</CardDescription>
            <CardTitle className="text-base">
              {primary?.name ?? "Not set"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {primary?.role || "Add a persona to focus generation."}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Personas</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {personas.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              {primary ? "One is marked primary" : "No primary persona"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="gap-1">
            <CardDescription>Active pillars</CardDescription>
            <CardTitle className="text-2xl tabular-nums">
              {activePillars.length}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <p className="text-xs text-muted-foreground">
                {activeShare}% target share
              </p>
              {activeShare > 100 ? (
                <Badge variant="destructive">Over 100%</Badge>
              ) : null}
            </div>
          </CardContent>
        </Card>
      </div>

      <PersonasPanel
        personas={personas}
        newPersonaDefaults={newPersonaDefaults}
      />

      <PillarsPanel pillars={pillars} newPillarDefaults={emptyPillar} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Why this stays agency-owner focused
          </CardTitle>
          <CardDescription>
            The prompt uses the selected persona and pillar, but the system rules
            keep the writer on CloseLoop&apos;s problem and proposed solution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Personas supply the language: what the owner is worried about, what
            they have already tried and what would make them sceptical.
          </p>
          <p>
            Pillars supply the territory: owner-led growth, content that
            compounds, inside CloseLoop, and agency operator notes.
          </p>
          <p>
            Neither field can override the claim rules in{" "}
            <Link
              href="/settings/brand"
              className="font-medium text-foreground underline underline-offset-4"
            >
              Brand settings
            </Link>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

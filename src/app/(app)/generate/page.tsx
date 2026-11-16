import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, ArrowRight, Sparkles } from "lucide-react";

import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import {
  GenerateWorkspace,
  type GenerationHistoryView,
  type SavedDraftView,
} from "@/components/generate/generate-workspace";
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
import {
  getBrandBrain,
  getRecentAiDrafts,
  getRecentGenerations,
} from "@/lib/brand/queries";
import { tryGetServerEnv } from "@/lib/env.server";
import { formatDateTime } from "@/lib/format";
import type { Json } from "@/lib/database.types";

export const metadata: Metadata = { title: "Generate" };

function readBrief(input: Json): {
  platform: string | null;
  objective: string | null;
} {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    return { platform: null, objective: null };
  }

  const brief = (input as Record<string, Json>).brief;
  if (!brief || typeof brief !== "object" || Array.isArray(brief)) {
    return { platform: null, objective: null };
  }

  return {
    platform:
      typeof brief.platform === "string" ? brief.platform : null,
    objective:
      typeof brief.objective === "string" ? brief.objective : null,
  };
}

function SetupCard({
  title,
  description,
  href,
  cta,
}: {
  title: string;
  description: string;
  href: string;
  cta: string;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ButtonLink variant="outline" size="sm" href={href}>
        {cta}
        <ArrowRight className="size-3.5" />
      </ButtonLink>
    </div>
  );
}

export default function GeneratePage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <GenerateContent />
    </Suspense>
  );
}

async function GenerateContent() {
  const { supabase, workspace } = await requireWorkspaceAccess();

  const [brain, recentGenerations, recentDrafts] = await Promise.all([
    getBrandBrain(supabase, workspace.id),
    getRecentGenerations(supabase, workspace.id),
    getRecentAiDrafts(supabase, workspace.id),
  ]);

  if (brain.status !== "ready") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Generate content"
          description="Brand-aware generation for LinkedIn and Instagram."
          eyebrow="Phase 2"
        />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {brain.status === "missing"
              ? "Phase 2 migration has not been applied"
              : "The generation workspace could not be loaded"}
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

  const primaryPersona =
    brain.personas.find((persona) => persona.is_primary) ?? brain.personas[0];
  const firstActivePillar =
    brain.pillars.find((pillar) => pillar.is_active) ?? brain.pillars[0];

  const history: GenerationHistoryView[] = recentGenerations.map(
    (generation) => {
      const brief = readBrief(generation.input);
      return {
        id: generation.id,
        model: generation.model,
        status: generation.status,
        platform: brief.platform,
        objective: brief.objective,
        createdAt: formatDateTime(generation.created_at, workspace.timezone),
        error: generation.error,
        tokensInput: generation.tokens_input,
        tokensOutput: generation.tokens_output,
        costUsd: generation.cost_usd,
      };
    },
  );

  const drafts: SavedDraftView[] = recentDrafts.map((draft) => ({
    id: draft.id,
    title: draft.title,
    platform: draft.platform,
    status: draft.status,
    createdAt: formatDateTime(draft.created_at, workspace.timezone),
  }));

  const env = tryGetServerEnv();
  const hasOpenAiKey = env.ok ? Boolean(env.env.openAiApiKey) : false;
  const openAiModel = env.ok ? env.env.openAiModel : "gpt-4o-mini";

  const missingSetup = [
    !brain.profile
      ? {
          title: "Brand profile missing",
          description:
            "Add the positioning, claim rules and voice rules before generating.",
          href: "/settings/brand",
          cta: "Open Brand Brain",
        }
      : null,
    brain.personas.length === 0
      ? {
          title: "No audience persona",
          description:
            "Generation needs a specific reader. Add the agency owner persona.",
          href: "/settings/audience",
          cta: "Add persona",
        }
      : null,
    brain.pillars.filter((pillar) => pillar.is_active).length === 0
      ? {
          title: "No active content pillar",
          description:
            "Add or reactivate a pillar so drafts have a topic territory.",
          href: "/settings/audience",
          cta: "Open pillars",
        }
      : null,
  ].filter(
    (
      item,
    ): item is {
      title: string;
      description: string;
      href: string;
      cta: string;
    } => Boolean(item),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Generate content"
        description="Turn the Brand Brain into a platform-specific draft, then edit and save it. Nothing is published from this page."
        eyebrow="Phase 2"
        actions={
          <Badge variant={hasOpenAiKey ? "secondary" : "outline"}>
            {hasOpenAiKey ? "OpenAI ready" : "Local engine"}
          </Badge>
        }
      />

      {hasOpenAiKey ? (
        <Alert>
          <Sparkles className="text-emerald-600" />
          <AlertTitle>Model-written drafts are enabled</AlertTitle>
          <AlertDescription>
            New generations call OpenAI with the brand context and claim rules.
            Model: <span className="font-medium text-foreground">{openAiModel}</span>.
            Every result is still checked against the forbidden-claim list and
            saved as a draft only.
          </AlertDescription>
        </Alert>
      ) : (
        <Alert>
          <AlertTitle>Local template engine active</AlertTitle>
          <AlertDescription>
            <p>
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                OPENAI_API_KEY
              </code>{" "}
              is not set, so drafts are composed from the Brand Brain with a
              deterministic template engine. This is not model-written AI, and
              the UI labels it that way. Add the key and restart to enable
              OpenAI.
            </p>
            <p className="mt-2 text-xs opacity-80">
              The rest of the workflow — briefs, claim checks, editing and saving
              drafts — works exactly the same way.
            </p>
          </AlertDescription>
        </Alert>
      )}

      {missingSetup.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Finish the setup first</CardTitle>
            <CardDescription>
              Generation needs a brand profile, one persona and one active
              pillar.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {missingSetup.map((item) => (
              <SetupCard key={item.title} {...item} />
            ))}
          </CardContent>
        </Card>
      ) : (
        <GenerateWorkspace
          personas={brain.personas.map((persona) => ({
            id: persona.id,
            name: persona.name,
            role: persona.role,
            isPrimary: persona.is_primary,
          }))}
          pillars={brain.pillars.map((pillar) => ({
            id: pillar.id,
            name: pillar.name,
            percentage: pillar.percentage,
            isActive: pillar.is_active,
          }))}
          claims={{
            verifiedFacts: brain.profile?.verified_facts ?? [],
            proposedClaims: brain.profile?.proposed_claims ?? [],
            forbiddenClaims: brain.profile?.forbidden_claims ?? [],
          }}
          hasOpenAiKey={hasOpenAiKey}
          openAiModel={openAiModel}
          defaultPersonaId={primaryPersona?.id ?? ""}
          defaultPillarId={firstActivePillar?.id ?? ""}
          history={history}
          drafts={drafts}
        />
      )}
    </div>
  );
}

"use client";

import {
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Clipboard,
  Info,
  LoaderCircle,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldAlert,
  Sparkles,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { checkClaims, hasClaimBlockers } from "@/lib/ai/claims";
import { finalCopyForContent } from "@/lib/ai/compose";
import type {
  ClaimFinding,
  GeneratedContent,
  GenerationResult,
} from "@/lib/ai/types";
import { initialGenerationState } from "@/lib/ai/types";
import type { PostStatus } from "@/lib/database.types";
import {
  generateContentAction,
  saveGeneratedPostAction,
} from "@/lib/brand/actions";
import { OBJECTIVE_HINTS, OBJECTIVE_LABELS } from "@/lib/brand/defaults";
import { normalizeHashtags, splitLines } from "@/lib/brand/schemas";
import type { GenerationBriefFormValues } from "@/lib/brand/types";

export type GenerationHistoryView = {
  id: string;
  model: string;
  status: "pending" | "succeeded" | "failed";
  platform: string | null;
  objective: string | null;
  createdAt: string;
  error: string | null;
  tokensInput: number | null;
  tokensOutput: number | null;
  costUsd: number | null;
};

export type SavedDraftView = {
  id: string;
  title: string | null;
  platform: "instagram" | "linkedin";
  status: PostStatus;
  createdAt: string;
};

type Objective = GenerationBriefFormValues["objective"];
type CtaMode = GenerationBriefFormValues["ctaMode"];

const PLATFORM_LABEL = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
} as const;

function formatCost(value: number | null): string | null {
  if (value === null) return null;
  if (value === 0) return "no API cost";
  return `$${value.toFixed(4)}`;
}

function ClaimFindings({ findings }: { findings: ClaimFinding[] }) {
  if (findings.length === 0) {
    return (
      <div className="flex items-start gap-2 rounded-lg border border-emerald-600/20 bg-emerald-50/60 p-3 text-sm text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300">
        <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
        <p>No forbidden-claim patterns detected in the current copy.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {findings.map((finding, index) => {
        const Icon =
          finding.level === "blocker"
            ? ShieldAlert
            : finding.level === "warning"
              ? AlertTriangle
              : Info;

        return (
          <div
            key={`${finding.level}-${index}`}
            className="rounded-lg border p-3 text-sm"
          >
            <div className="flex items-start gap-2">
              <Icon
                className={
                  finding.level === "blocker"
                    ? "mt-0.5 size-4 shrink-0 text-destructive"
                    : finding.level === "warning"
                      ? "mt-0.5 size-4 shrink-0 text-amber-600"
                      : "mt-0.5 size-4 shrink-0 text-muted-foreground"
                }
              />
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge
                    variant={
                      finding.level === "blocker" ? "destructive" : "outline"
                    }
                  >
                    {finding.level}
                  </Badge>
                  <p>{finding.message}</p>
                </div>
                {finding.excerpt ? (
                  <p className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                    “{finding.excerpt}”
                  </p>
                ) : null}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function statusBadgeVariant(
  status: GenerationHistoryView["status"],
): "secondary" | "destructive" | "outline" {
  if (status === "succeeded") return "secondary";
  if (status === "failed") return "destructive";
  return "outline";
}

function DraftEditor({
  result,
  claims,
  onRegenerate,
}: {
  result: GenerationResult;
  claims: {
    verifiedFacts: string[];
    proposedClaims: string[];
    forbiddenClaims: string[];
  };
  onRegenerate: () => void;
}) {
  const router = useRouter();
  const [draft, setDraft] = useState<GeneratedContent>(result.content);
  const [hashtagText, setHashtagText] = useState(
    result.content.hashtags.join(" "),
  );
  const [slidesText, setSlidesText] = useState(
    result.content.carouselSlides.join("\n"),
  );
  const [saving, setSaving] = useState(false);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);

  const platform = result.brief.platform;
  const liveDraft = useMemo(
    () => ({ ...draft, hashtags: normalizeHashtags(hashtagText) }),
    [draft, hashtagText],
  );
  const finalText = finalCopyForContent(liveDraft, platform);
  const liveFindings = useMemo(
    () =>
      checkClaims({
        text: finalText,
        forbiddenClaims: claims.forbiddenClaims,
        proposedClaims: claims.proposedClaims,
        verifiedFacts: claims.verifiedFacts,
      }),
    [claims, finalText],
  );
  const blocked = hasClaimBlockers(liveFindings);
  const characterLimit = platform === "instagram" ? 2200 : 3000;
  const overLimit = finalText.length > characterLimit;

  function updateDraft<K extends keyof GeneratedContent>(
    key: K,
    value: GeneratedContent[K],
  ) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function handleReset() {
    setDraft(result.content);
    setHashtagText(result.content.hashtags.join(" "));
    setSlidesText(result.content.carouselSlides.join("\n"));
    setSavedPostId(null);
  }

  async function handleCopy() {
    if (!finalText) return;
    try {
      await navigator.clipboard.writeText(finalText);
      toast.success("Final copy copied.");
    } catch {
      toast.error("Could not copy to the clipboard.");
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const response = await saveGeneratedPostAction({
        platform: result.brief.platform,
        format: result.brief.format,
        title: draft.title,
        hook: draft.hook,
        body: draft.body ?? "",
        caption: draft.caption ?? "",
        hashtags: normalizeHashtags(hashtagText),
        cta: draft.cta ?? "",
        altText: draft.altText ?? "",
        imageBrief: draft.imageBrief ?? "",
        carouselSlides: splitLines(slidesText),
        pillarId: result.pillarId,
        personaId: result.personaId,
        generationId: result.generationId,
      });

      if (response.ok) {
        setSavedPostId(response.postId);
        toast.success("Draft saved to the content library.");
        router.refresh();
      } else {
        toast.error(response.error);
      }
    } catch {
      toast.error("Could not save the draft. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const usageParts = [
    result.usage.inputTokens !== null
      ? `${result.usage.inputTokens} in`
      : null,
    result.usage.outputTokens !== null
      ? `${result.usage.outputTokens} out`
      : null,
    formatCost(result.usage.estimatedCostUsd),
  ].filter(Boolean);

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">
                {draft.title || "Generated draft"}
              </CardTitle>
              <CardDescription>
                {PLATFORM_LABEL[platform]} ·{" "}
                {result.brief.format.replace("_", " ")}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge
                variant={result.provider === "openai" ? "secondary" : "outline"}
              >
                {result.provider === "openai" ? "OpenAI" : "Local template"}
              </Badge>
              <Badge variant="outline">{result.model}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="rounded-lg border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p>{result.engineNote}</p>
            {usageParts.length > 0 ? (
              <p className="mt-1">
                Usage: {usageParts.join(" · ")} · prompt {result.promptVersion}
              </p>
            ) : null}
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-sm font-medium">Claim check</p>
              {blocked ? (
                <Badge variant="destructive">Blocked</Badge>
              ) : (
                <Badge variant="outline">Review</Badge>
              )}
            </div>
            <ClaimFindings findings={liveFindings} />
          </div>

          <p className="text-xs text-muted-foreground">
            Claim checks are a writing aid, not legal review. The save action
            blocks only the patterns explicitly listed as forbidden in the Brand
            Brain.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Edit the draft</CardTitle>
          <CardDescription>
            The hook is stored separately from the copy. The preview below shows
            what a reader would see.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-medium">Hook variants</p>
            <div className="grid gap-2">
              {draft.hooks.map((hook) => (
                <button
                  key={hook}
                  type="button"
                  onClick={() => updateDraft("hook", hook)}
                  className={
                    draft.hook === hook
                      ? "rounded-lg border bg-secondary p-2.5 text-left text-sm"
                      : "rounded-lg border p-2.5 text-left text-sm hover:bg-muted"
                  }
                >
                  {hook}
                </button>
              ))}
            </div>
          </div>

          <FormField id="draft-title" label="Internal title">
            <Input
              id="draft-title"
              value={draft.title}
              onChange={(event) => updateDraft("title", event.target.value)}
            />
          </FormField>

          <FormField
            id="draft-hook"
            label="Hook"
            description="First line the reader sees"
          >
            <Textarea
              id="draft-hook"
              rows={2}
              value={draft.hook}
              onChange={(event) => updateDraft("hook", event.target.value)}
            />
          </FormField>

          <FormField
            id="draft-copy"
            label={
              platform === "linkedin" ? "LinkedIn body" : "Instagram caption"
            }
            description="Hook is not repeated here"
          >
            <Textarea
              id="draft-copy"
              rows={10}
              value={
                (platform === "linkedin" ? draft.body : draft.caption) ?? ""
              }
              onChange={(event) =>
                updateDraft(
                  platform === "linkedin" ? "body" : "caption",
                  event.target.value,
                )
              }
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField id="draft-cta" label="CTA">
              <Input
                id="draft-cta"
                value={draft.cta ?? ""}
                onChange={(event) =>
                  updateDraft("cta", event.target.value || null)
                }
              />
            </FormField>

            <FormField
              id="draft-hashtags"
              label="Hashtags"
              description="Space or comma separated"
            >
              <Input
                id="draft-hashtags"
                value={hashtagText}
                onChange={(event) => setHashtagText(event.target.value)}
                onBlur={() =>
                  setHashtagText(normalizeHashtags(hashtagText).join(" "))
                }
              />
            </FormField>
          </div>

          <FormField id="draft-alt-text" label="Alt text">
            <Textarea
              id="draft-alt-text"
              rows={2}
              value={draft.altText ?? ""}
              onChange={(event) =>
                updateDraft("altText", event.target.value || null)
              }
            />
          </FormField>

          <FormField
            id="draft-image-brief"
            label="Image brief"
            description="Art direction for Phase 4"
          >
            <Textarea
              id="draft-image-brief"
              rows={3}
              value={draft.imageBrief ?? ""}
              onChange={(event) =>
                updateDraft("imageBrief", event.target.value || null)
              }
            />
          </FormField>

          {result.brief.format === "carousel" ? (
            <FormField
              id="draft-slides"
              label="Carousel slides"
              description="One slide per line"
            >
              <Textarea
                id="draft-slides"
                rows={6}
                value={slidesText}
                onChange={(event) => setSlidesText(event.target.value)}
              />
            </FormField>
          ) : null}

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-medium">Final copy preview</p>
              <span
                className={
                  overLimit
                    ? "text-xs font-medium text-destructive"
                    : "text-xs text-muted-foreground"
                }
              >
                {finalText.length.toLocaleString()} /{" "}
                {characterLimit.toLocaleString()} characters
              </span>
            </div>
            <div className="rounded-lg border bg-muted/20 p-3">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">
                {finalText || "Nothing to preview yet."}
              </p>
            </div>
            {overLimit ? (
              <p className="text-xs text-destructive">
                This is over the platform guide for {platform}. Trim it before
                publishing in Phase 4.
              </p>
            ) : null}
          </div>

          {blocked ? (
            <Alert variant="destructive">
              <ShieldAlert />
              <AlertTitle>Forbidden claim detected</AlertTitle>
              <AlertDescription>
                Edit the copy until the claim check has no blockers, then save.
                The server checks again on save.
              </AlertDescription>
            </Alert>
          ) : null}

          {savedPostId ? (
            <Alert>
              <CheckCircle2 className="text-emerald-600" />
              <AlertTitle>Draft saved</AlertTitle>
              <AlertDescription>
                The draft is in the content library. Approval and scheduling
                arrive in Phase 3.
              </AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-wrap items-center gap-2 border-t pt-4">
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving || blocked}
            >
              {saving ? (
                <>
                  <LoaderCircle className="size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save as draft
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={onRegenerate}
              disabled={saving}
            >
              <RefreshCw className="size-4" />
              Regenerate
            </Button>
            <Button type="button" variant="ghost" onClick={handleReset}>
              <RotateCcw className="size-4" />
              Reset edits
            </Button>
            <Button type="button" variant="ghost" onClick={handleCopy}>
              <Clipboard className="size-4" />
              Copy final text
            </Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}

export function GenerateWorkspace({
  personas,
  pillars,
  claims,
  hasOpenAiKey,
  openAiModel,
  defaultPersonaId,
  defaultPillarId,
  history,
  drafts,
}: {
  personas: Array<{
    id: string;
    name: string;
    role: string | null;
    isPrimary: boolean;
  }>;
  pillars: Array<{
    id: string;
    name: string;
    percentage: number | null;
    isActive: boolean;
  }>;
  claims: {
    verifiedFacts: string[];
    proposedClaims: string[];
    forbiddenClaims: string[];
  };
  hasOpenAiKey: boolean;
  openAiModel: string;
  defaultPersonaId: string;
  defaultPillarId: string;
  history: GenerationHistoryView[];
  drafts: SavedDraftView[];
}) {
  const [state, formAction, pending] = useActionState(
    generateContentAction,
    initialGenerationState,
  );
  const [objective, setObjective] = useState<Objective>("attract_agency_owners");
  const [ctaMode, setCtaMode] = useState<CtaMode>("brand");

  const formRef = useRef<HTMLFormElement>(null);
  const variantRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const result = state.result;

  useEffect(() => {
    if (state.status !== "success" || !state.result) return;
    resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [state.status, state.result]);

  function handleRegenerate() {
    const input = variantRef.current;
    if (input) {
      input.value = String(Number(input.value || 0) + 1);
    }
    formRef.current?.requestSubmit();
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:items-start">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Brief</CardTitle>
            <CardDescription>
              A focused brief produces a better draft. The writer still gets the
              full Brand Brain and claim rules.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form ref={formRef} action={formAction} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="generate-platform"
                  label="Platform"
                  error={state.fieldErrors?.platform}
                >
                  <Select
                    id="generate-platform"
                    name="platform"
                    defaultValue="linkedin"
                  >
                    <option value="linkedin">LinkedIn</option>
                    <option value="instagram">Instagram</option>
                  </Select>
                </FormField>

                <FormField
                  id="generate-format"
                  label="Format"
                  error={state.fieldErrors?.format}
                >
                  <Select
                    id="generate-format"
                    name="format"
                    defaultValue="single_image"
                  >
                    <option value="single_image">Single image</option>
                    <option value="carousel">Carousel</option>
                    <option value="text">Text only</option>
                  </Select>
                </FormField>
              </div>

              <FormField
                id="generate-objective"
                label="Objective"
                description={OBJECTIVE_HINTS[objective]}
                error={state.fieldErrors?.objective}
              >
                <Select
                  id="generate-objective"
                  name="objective"
                  value={objective}
                  onChange={(event) =>
                    setObjective(event.target.value as Objective)
                  }
                >
                  {Object.entries(OBJECTIVE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </Select>
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="generate-persona"
                  label="Persona"
                  error={state.fieldErrors?.personaId}
                >
                  <Select
                    id="generate-persona"
                    name="personaId"
                    defaultValue={defaultPersonaId}
                  >
                    {personas.map((persona) => (
                      <option key={persona.id} value={persona.id}>
                        {persona.name}
                        {persona.isPrimary ? " (primary)" : ""}
                      </option>
                    ))}
                  </Select>
                </FormField>

                <FormField
                  id="generate-pillar"
                  label="Pillar"
                  error={state.fieldErrors?.pillarId}
                >
                  <Select
                    id="generate-pillar"
                    name="pillarId"
                    defaultValue={defaultPillarId}
                  >
                    {pillars.map((pillar) => (
                      <option key={pillar.id} value={pillar.id}>
                        {pillar.name}
                        {pillar.isActive ? "" : " (paused)"}
                      </option>
                    ))}
                  </Select>
                </FormField>
              </div>

              <FormField
                id="generate-angle"
                label="Angle"
                description="Optional"
                error={state.fieldErrors?.angle}
              >
                <Input
                  id="generate-angle"
                  name="angle"
                  placeholder="e.g. The cost of inconsistent content"
                />
              </FormField>

              <FormField
                id="generate-notes"
                label="Extra direction"
                description="Not published verbatim"
                error={state.fieldErrors?.notes}
              >
                <Textarea
                  id="generate-notes"
                  name="notes"
                  rows={3}
                  placeholder="Anything the writer must include or avoid."
                />
              </FormField>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField
                  id="generate-cta-mode"
                  label="CTA"
                  error={state.fieldErrors?.ctaMode}
                >
                  <Select
                    id="generate-cta-mode"
                    name="ctaMode"
                    value={ctaMode}
                    onChange={(event) =>
                      setCtaMode(event.target.value as CtaMode)
                    }
                  >
                    <option value="brand">Use brand CTA</option>
                    <option value="none">No CTA</option>
                    <option value="custom">Custom CTA</option>
                  </Select>
                </FormField>

                {ctaMode === "custom" ? (
                  <FormField
                    id="generate-custom-cta"
                    label="Custom CTA"
                    error={state.fieldErrors?.customCta}
                  >
                    <Input
                      id="generate-custom-cta"
                      name="customCta"
                      placeholder="Reply with the part you are stuck on."
                    />
                  </FormField>
                ) : (
                  <div className="hidden sm:block" />
                )}
              </div>

              <input
                type="hidden"
                name="variantSeed"
                defaultValue={0}
                ref={variantRef}
              />

              {state.status === "error" && state.message ? (
                <Alert variant="destructive">
                  <AlertTitle>Generation failed</AlertTitle>
                  <AlertDescription>{state.message}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <Button type="submit" disabled={pending}>
                  {pending ? (
                    <>
                      <LoaderCircle className="size-4 animate-spin" />
                      Generating…
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate draft
                    </>
                  )}
                </Button>
                <span className="text-xs text-muted-foreground">
                  {hasOpenAiKey
                    ? `Uses ${openAiModel}`
                    : "Local template engine"}
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        <div ref={resultRef} className="space-y-4">
          {pending ? (
            <Card>
              <CardContent className="flex items-center gap-3 py-8">
                <LoaderCircle className="size-5 animate-spin text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Writing a draft…</p>
                  <p className="text-xs text-muted-foreground">
                    The brand context and claim rules are being applied.
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : null}

          {!pending && !result ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Sparkles className="mx-auto size-5 text-muted-foreground" />
                <p className="mt-2 text-sm font-medium">No draft yet</p>
                <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">
                  Choose a platform, persona and pillar, then generate. The draft
                  stays editable and is saved only when you press save.
                </p>
              </CardContent>
            </Card>
          ) : null}

          {result ? (
            <DraftEditor
              key={result.generationId}
              result={result}
              claims={claims}
              onRegenerate={handleRegenerate}
            />
          ) : null}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent generations</CardTitle>
            <CardDescription>
              Token counts and cost are recorded per run. Failed runs stay
              visible instead of disappearing.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {history.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No generations yet.
              </p>
            ) : (
              <ul className="divide-y">
                {history.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={statusBadgeVariant(item.status)}>
                        {item.status}
                      </Badge>
                      <span className="text-sm font-medium">{item.model}</span>
                      {item.platform ? (
                        <span className="text-xs text-muted-foreground">
                          {PLATFORM_LABEL[
                            item.platform as keyof typeof PLATFORM_LABEL
                          ] ?? item.platform}
                        </span>
                      ) : null}
                      {item.objective ? (
                        <span className="text-xs text-muted-foreground">
                          {OBJECTIVE_LABELS[
                            item.objective as keyof typeof OBJECTIVE_LABELS
                          ] ?? item.objective}
                        </span>
                      ) : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                      <span>{item.createdAt}</span>
                      {item.tokensInput !== null ||
                      item.tokensOutput !== null ? (
                        <span>
                          {item.tokensInput ?? 0} in /{" "}
                          {item.tokensOutput ?? 0} out
                        </span>
                      ) : null}
                      {formatCost(item.costUsd) ? (
                        <span>{formatCost(item.costUsd)}</span>
                      ) : null}
                    </div>
                    {item.error ? (
                      <p className="text-xs text-destructive">{item.error}</p>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recently saved drafts</CardTitle>
            <CardDescription>
              Drafts created here. The library, approvals and scheduling are
              Phase 3.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {drafts.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                No saved drafts yet. Generate a draft and press save.
              </p>
            ) : (
              <ul className="divide-y">
                {drafts.map((item) => (
                  <li
                    key={item.id}
                    className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="min-w-0 truncate text-sm font-medium">
                        {item.title || "Untitled draft"}
                      </p>
                      <Badge variant="outline">{item.status}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {PLATFORM_LABEL[item.platform]} · {item.createdAt}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            <ButtonLink
              variant="link"
              size="sm"
              className="mt-2 h-auto px-0"
              href="/posts"
            >
              Open content library
              <ArrowRight className="size-3.5" />
            </ButtonLink>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

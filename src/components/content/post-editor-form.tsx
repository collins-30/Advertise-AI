"use client";

import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  LoaderCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";

import { PostStatusBadge } from "@/components/content/status";
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
import { composeFinalCopy } from "@/lib/ai/compose";
import { normalizeHashtags } from "@/lib/brand/schemas";
import { savePostAction } from "@/lib/content/actions";
import type {
  ClaimContext,
  Platform,
  PostEditorOptions,
  PostFormat,
} from "@/lib/content/types";
import type { PostStatus } from "@/lib/database.types";
import { initialFormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export type PostEditorPost = {
  id: string;
  platform: Platform;
  format: PostFormat;
  status: PostStatus;
  version: number;
  title: string;
  hook: string;
  body: string;
  caption: string;
  hashtags: string[];
  cta: string;
  altText: string;
  imageBrief: string;
  carouselSlides: string[];
  pillarId: string;
  personaId: string;
};

const PLATFORM_COPY_LIMIT: Record<Platform, number> = {
  linkedin: 3000,
  instagram: 2200,
};

const MAX_SLIDES = 10;

function CarouselSlidesEditor({
  slides,
  onChange,
}: {
  slides: string[];
  onChange: (slides: string[]) => void;
}) {
  function update(index: number, value: string) {
    onChange(slides.map((slide, i) => (i === index ? value : slide)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= slides.length) return;
    const next = [...slides];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-sm font-medium">Carousel slides</span>
        <span className="text-xs text-muted-foreground">
          {slides.length} / {MAX_SLIDES} slides
        </span>
      </div>

      <div className="space-y-2">
        {slides.map((slide, index) => (
          <div
            key={index}
            className="rounded-lg border border-border/70 bg-muted/20 p-2.5"
          >
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Slide {index + 1}
              </span>
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move slide ${index + 1} up`}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  <ChevronUp />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Move slide ${index + 1} down`}
                  disabled={index === slides.length - 1}
                  onClick={() => move(index, 1)}
                >
                  <ChevronDown />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-xs"
                  aria-label={`Remove slide ${index + 1}`}
                  onClick={() =>
                    onChange(
                      slides.length === 1
                        ? [""]
                        : slides.filter((_, i) => i !== index),
                    )
                  }
                >
                  <Trash2 />
                </Button>
              </div>
            </div>
            <Textarea
              value={slide}
              maxLength={600}
              rows={2}
              placeholder={`Copy for slide ${index + 1}`}
              onChange={(event) => update(index, event.target.value)}
            />
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={slides.length >= MAX_SLIDES}
        onClick={() => onChange([...slides, ""])}
      >
        <Plus />
        Add slide
      </Button>
    </div>
  );
}

export function PostEditorForm({
  post,
  options,
  claims,
  readOnly = false,
}: {
  post: PostEditorPost;
  options: PostEditorOptions;
  claims: ClaimContext;
  readOnly?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    savePostAction,
    initialFormState,
  );

  const [title, setTitle] = useState(post.title);
  const [hook, setHook] = useState(post.hook);
  const [body, setBody] = useState(post.body);
  const [caption, setCaption] = useState(post.caption);
  const [hashtagsText, setHashtagsText] = useState(post.hashtags.join(" "));
  const [cta, setCta] = useState(post.cta);
  const [altText, setAltText] = useState(post.altText);
  const [imageBrief, setImageBrief] = useState(post.imageBrief);
  const [slides, setSlides] = useState(
    post.carouselSlides.length > 0 ? post.carouselSlides : [""],
  );
  const [pillarId, setPillarId] = useState(post.pillarId);
  const [personaId, setPersonaId] = useState(post.personaId);

  const syncedVersion = useRef(post.version);

  useEffect(() => {
    if (syncedVersion.current === post.version) return;
    syncedVersion.current = post.version;

    setTitle(post.title);
    setHook(post.hook);
    setBody(post.body);
    setCaption(post.caption);
    setHashtagsText(post.hashtags.join(" "));
    setCta(post.cta);
    setAltText(post.altText);
    setImageBrief(post.imageBrief);
    setSlides(post.carouselSlides.length > 0 ? post.carouselSlides : [""]);
    setPillarId(post.pillarId);
    setPersonaId(post.personaId);
  }, [post]);

  const hashtags = useMemo(() => normalizeHashtags(hashtagsText), [hashtagsText]);
  const copy = post.platform === "linkedin" ? body : caption;
  const finalText = composeFinalCopy({ hook, copy, cta, hashtags });
  const liveFindings = useMemo(
    () =>
      checkClaims({
        text: [finalText, slides.join("\n")].filter(Boolean).join("\n\n"),
        forbiddenClaims: claims.forbiddenClaims,
        proposedClaims: claims.proposedClaims,
        verifiedFacts: claims.verifiedFacts,
      }),
    [finalText, slides, claims],
  );
  const blocked = hasClaimBlockers(liveFindings);
  const copyLimit = PLATFORM_COPY_LIMIT[post.platform];
  const overLimit = copy.length > copyLimit;

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Copy</CardTitle>
            <CardDescription>
              Saving always creates a new version. Editing an approved or
              scheduled post resets it to draft so the approved copy can never
              drift.
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">
              {post.platform === "linkedin" ? "LinkedIn" : "Instagram"}
            </Badge>
            <PostStatusBadge status={post.status} />
            <Badge variant="secondary">v{post.version}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <form action={formAction}>
          <fieldset disabled={readOnly} className="space-y-5">
          <input type="hidden" name="postId" value={post.id} />
          <input
            type="hidden"
            name="expectedVersion"
            value={String(post.version)}
          />
          <input
            type="hidden"
            name="carouselSlides"
            value={JSON.stringify(slides)}
          />

          {state.status !== "idle" && state.message ? (
            <Alert variant={state.status === "error" ? "destructive" : "default"}>
              {state.status === "error" ? (
                <AlertTriangle />
              ) : (
                <CheckCircle2 className="text-emerald-600" />
              )}
              <AlertTitle>
                {state.status === "error" ? "Not saved" : "Saved"}
              </AlertTitle>
              <AlertDescription>{state.message}</AlertDescription>
            </Alert>
          ) : null}

          <FormField
            id="post-title"
            label="Internal title"
            description="Used in the library and calendar. Not published."
            error={state.fieldErrors?.title}
          >
            <Input
              id="post-title"
              name="title"
              value={title}
              maxLength={160}
              onChange={(event) => setTitle(event.target.value)}
            />
          </FormField>

          <FormField
            id="post-hook"
            label="Hook"
            description={`${hook.length} / 300`}
            error={state.fieldErrors?.hook}
          >
            <Textarea
              id="post-hook"
              name="hook"
              value={hook}
              maxLength={300}
              rows={2}
              onChange={(event) => setHook(event.target.value)}
            />
          </FormField>

          {post.platform === "linkedin" ? (
            <FormField
              id="post-body"
              label="Body copy"
              description={`${body.length} / ${copyLimit} for LinkedIn`}
              error={state.fieldErrors?.body}
            >
              <Textarea
                id="post-body"
                name="body"
                value={body}
                maxLength={5000}
                rows={10}
                onChange={(event) => setBody(event.target.value)}
              />
            </FormField>
          ) : (
            <FormField
              id="post-caption"
              label="Caption"
              description={`${caption.length} / ${copyLimit} for Instagram`}
              error={state.fieldErrors?.caption}
            >
              <Textarea
                id="post-caption"
                name="caption"
                value={caption}
                maxLength={5000}
                rows={10}
                onChange={(event) => setCaption(event.target.value)}
              />
            </FormField>
          )}

          {overLimit ? (
            <p className="text-xs text-amber-700 dark:text-amber-300">
              This copy is longer than the platform guidance ({copyLimit}
              characters). It can still be saved, but consider tightening it.
            </p>
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="post-hashtags"
              label="Hashtags"
              description={`${hashtags.length} / 10`}
              error={state.fieldErrors?.hashtags}
            >
              <Input
                id="post-hashtags"
                name="hashtags"
                value={hashtagsText}
                onChange={(event) => setHashtagsText(event.target.value)}
              />
            </FormField>

            <FormField
              id="post-cta"
              label="Call to action"
              description={`${cta.length} / 300`}
              error={state.fieldErrors?.cta}
            >
              <Input
                id="post-cta"
                name="cta"
                value={cta}
                maxLength={300}
                onChange={(event) => setCta(event.target.value)}
              />
            </FormField>
          </div>

          {post.format === "carousel" ? (
            <CarouselSlidesEditor slides={slides} onChange={setSlides} />
          ) : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="post-pillar"
              label="Content pillar"
              error={state.fieldErrors?.pillarId}
            >
              <Select
                id="post-pillar"
                name="pillarId"
                value={pillarId}
                onChange={(event) => setPillarId(event.target.value)}
              >
                <option value="">No pillar</option>
                {options.pillars.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.name}
                    {pillar.is_active ? "" : " (inactive)"}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField
              id="post-persona"
              label="Audience persona"
              error={state.fieldErrors?.personaId}
            >
              <Select
                id="post-persona"
                name="personaId"
                value={personaId}
                onChange={(event) => setPersonaId(event.target.value)}
              >
                <option value="">No persona</option>
                {options.personas.map((persona) => (
                  <option key={persona.id} value={persona.id}>
                    {persona.name}
                    {persona.is_primary ? " (primary)" : ""}
                  </option>
                ))}
              </Select>
            </FormField>
          </div>

          <FormField
            id="post-alt-text"
            label="Alt text"
            description="Describe the image for screen readers."
            error={state.fieldErrors?.altText}
          >
            <Textarea
              id="post-alt-text"
              name="altText"
              value={altText}
              maxLength={1200}
              rows={2}
              onChange={(event) => setAltText(event.target.value)}
            />
          </FormField>

          <FormField
            id="post-image-brief"
            label="Image brief"
            description="Art direction for the image or carousel cover."
            error={state.fieldErrors?.imageBrief}
          >
            <Textarea
              id="post-image-brief"
              name="imageBrief"
              value={imageBrief}
              maxLength={1200}
              rows={3}
              onChange={(event) => setImageBrief(event.target.value)}
            />
          </FormField>

          <div
            className={cn(
              "rounded-lg border p-3 text-sm",
              blocked
                ? "border-destructive/30 bg-destructive/5 text-destructive"
                : "border-emerald-600/20 bg-emerald-50/50 text-emerald-800 dark:bg-emerald-950/20 dark:text-emerald-300",
            )}
          >
            <div className="flex items-start gap-2">
              {blocked ? (
                <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              ) : (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
              )}
              <div className="space-y-1">
                <p className="font-medium">
                  {blocked
                    ? "Forbidden claim detected — saving is blocked"
                    : "No forbidden-claim patterns detected"}
                </p>
                {liveFindings.length > 0 ? (
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {liveFindings.map((finding, index) => (
                      <li key={`${finding.level}-${index}`}>
                        {finding.message}
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" disabled={pending || blocked || readOnly}>
              {pending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Save />
              )}
              {pending ? "Saving…" : "Save changes"}
            </Button>
            <ButtonLink href="/posts" variant="outline">
              Back to library
            </ButtonLink>
            <span className="text-xs text-muted-foreground">
              {readOnly
                ? "This post is published and read-only in this phase."
                : `Times are shown in ${options.timezone}.`}
            </span>
          </div>
          </fieldset>
        </form>
      </CardContent>
    </Card>
  );
}

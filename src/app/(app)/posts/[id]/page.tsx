import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  ShieldX,
} from "lucide-react";

import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import { ApprovalPanel } from "@/components/content/approval-panel";
import { MediaManager } from "@/components/content/media-manager";
import { PostEditorForm } from "@/components/content/post-editor-form";
import {
  FORMAT_LABEL,
  PLATFORM_LABEL,
  PostStatusBadge,
} from "@/components/content/status";
import { VersionHistory } from "@/components/content/version-history";
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
import { getBrandBrain } from "@/lib/brand/queries";
import {
  addDays,
  localDateTimeValueFromIso,
  todayKeyInTimeZone,
} from "@/lib/content/calendar";
import { getPostDetail } from "@/lib/content/queries";
import {
  carouselSlidesFromJson,
  parseSnapshot,
} from "@/lib/content/snapshots";
import type { ClaimContext, PostEditorOptions } from "@/lib/content/types";
import { formatDate, formatDateTime } from "@/lib/format";
import { isAdminClientAvailable } from "@/lib/supabase/admin";

export const metadata: Metadata = { title: "Post editor" };

const EMPTY_CLAIMS: ClaimContext = {
  forbiddenClaims: [],
  proposedClaims: [],
  verifiedFacts: [],
};

const EMPTY_OPTIONS: PostEditorOptions = {
  pillars: [],
  personas: [],
  timezone: "UTC",
};

export default function PostEditorPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense fallback={<AppLoading />}>
      <PostEditorContent params={params} />
    </Suspense>
  );
}

async function PostEditorContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    notFound();
  }

  const { supabase, workspace, user } = await requireWorkspaceAccess();

  const [detail, brain] = await Promise.all([
    getPostDetail(supabase, workspace.id, id),
    getBrandBrain(supabase, workspace.id),
  ]);

  if (detail.status === "not_found") notFound();

  if (detail.status !== "ready") {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Post editor"
          description="The post could not be loaded."
          eyebrow="Phase 3"
          actions={
            <ButtonLink href="/posts" variant="outline">
              <ArrowLeft />
              Back to library
            </ButtonLink>
          }
        />
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {detail.status === "missing"
              ? "The Phase 3 migration has not been applied"
              : "The post could not be loaded"}
          </AlertTitle>
          <AlertDescription>
            {detail.status === "missing" ? (
              <p>
                Apply{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  supabase/migrations/20261116000000_phase3_content_management.sql
                </code>{" "}
                to your Supabase project.
              </p>
            ) : (
              <p>{detail.message}</p>
            )}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const { post, media, versions, approvals, pillar, persona } = detail.data;
  const brandReady = brain.status === "ready" && Boolean(brain.profile);

  const options: PostEditorOptions =
    brain.status === "ready"
      ? {
          pillars: brain.pillars,
          personas: brain.personas,
          timezone: workspace.timezone,
        }
      : { ...EMPTY_OPTIONS, timezone: workspace.timezone };

  const claims: ClaimContext =
    brain.status === "ready" && brain.profile
      ? {
          forbiddenClaims: brain.profile.forbidden_claims,
          proposedClaims: brain.profile.proposed_claims,
          verifiedFacts: brain.profile.verified_facts,
        }
      : EMPTY_CLAIMS;

  const defaultScheduleValue = post.scheduled_for
    ? localDateTimeValueFromIso(post.scheduled_for, workspace.timezone)
    : `${addDays(todayKeyInTimeZone(workspace.timezone), 1)}T09:00`;

  const versionItems = versions.map((version) => {
    const snapshot = parseSnapshot(version.snapshot);
    return {
      version: version.version,
      createdAt: version.created_at,
      title: snapshot?.title ?? null,
      hook: snapshot?.hook ?? null,
      restoredFrom: snapshot?.restored_from ?? null,
      readable: Boolean(snapshot),
    };
  });

  const isPublished = post.status === "publishing" || post.status === "published";

  return (
    <div className="space-y-6">
      <PageHeader
        title={post.title || post.hook || "Untitled post"}
        description={`${PLATFORM_LABEL[post.platform]} · ${FORMAT_LABEL[post.format]} · created ${formatDate(post.created_at, workspace.timezone)}`}
        eyebrow="Post editor"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {post.status === "scheduled" && post.scheduled_for ? (
              <Badge variant="outline">
                <CalendarDays />
                {formatDateTime(post.scheduled_for, workspace.timezone)}
              </Badge>
            ) : null}
            <ButtonLink href="/calendar" variant="outline" size="sm">
              <CalendarDays />
              Calendar
            </ButtonLink>
            <ButtonLink href="/posts" variant="outline" size="sm">
              <ArrowLeft />
              Library
            </ButtonLink>
          </div>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <PostStatusBadge status={post.status} />
        <Badge variant="secondary">v{post.version}</Badge>
        {post.approved_version ? (
          <Badge variant="outline">Approved v{post.approved_version}</Badge>
        ) : null}
        {pillar ? <Badge variant="outline">{pillar.name}</Badge> : null}
        {persona ? <Badge variant="outline">{persona.name}</Badge> : null}
        {post.source === "ai" ? (
          <Badge variant="outline">Generated draft</Badge>
        ) : (
          <Badge variant="outline">Manual</Badge>
        )}
      </div>

      {isPublished ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>Published content is read-only in this phase</AlertTitle>
          <AlertDescription>
            This build prepares scheduling but does not publish. Editing a
            published post would detach it from the version that went live, so
            saves and restores are blocked.
          </AlertDescription>
        </Alert>
      ) : null}

      {!brandReady ? (
        <Alert>
          <AlertTriangle />
          <AlertTitle>Brand Brain is unavailable</AlertTitle>
          <AlertDescription>
            Claim checking and pillar/persona options are limited until{" "}
            <Link href="/settings/brand" className="underline underline-offset-4">
              Brand Brain
            </Link>{" "}
            is available.
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="space-y-6">
          <PostEditorForm
            post={{
              id: post.id,
              platform: post.platform,
              format: post.format,
              status: post.status,
              version: post.version,
              title: post.title ?? "",
              hook: post.hook ?? "",
              body: post.body ?? "",
              caption: post.caption ?? "",
              hashtags: post.hashtags,
              cta: post.cta ?? "",
              altText: post.alt_text ?? "",
              imageBrief: post.image_brief ?? "",
              carouselSlides: carouselSlidesFromJson(post.carousel_slides),
              pillarId: post.pillar_id ?? "",
              personaId: post.persona_id ?? "",
            }}
            options={options}
            claims={claims}
            readOnly={isPublished}
          />

          <MediaManager
            postId={post.id}
            media={media}
            canUpload={isAdminClientAvailable() && !isPublished}
            readOnly={isPublished}
          />

          <Card>
            <CardHeader className="border-b">
              <CardTitle className="text-base">Approval history</CardTitle>
              <CardDescription>
                Append-only decisions. Each entry names the exact version it
                refers to.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {approvals.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No approval decisions recorded yet.
                </p>
              ) : (
                <ul className="space-y-3">
                  {approvals.map((approval) => (
                    <li
                      key={approval.id}
                      className="flex items-start gap-3 rounded-lg border border-border/70 p-3"
                    >
                      {approval.decision === "approved" ? (
                        <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-emerald-600" />
                      ) : (
                        <ShieldX className="mt-0.5 size-4 shrink-0 text-destructive" />
                      )}
                      <div className="min-w-0 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-sm font-medium capitalize">
                            {approval.decision}
                          </span>
                          <Badge variant="secondary">v{approval.version}</Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDateTime(approval.created_at, workspace.timezone)}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {approval.decided_by === user.id
                              ? "You"
                              : "Team member"}
                          </span>
                        </div>
                        {approval.note ? (
                          <p className="text-sm text-muted-foreground">
                            {approval.note}
                          </p>
                        ) : (
                          <p className="text-xs text-muted-foreground">
                            No feedback left.
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        <aside className="space-y-6">
          <ApprovalPanel
            post={{
              id: post.id,
              status: post.status,
              version: post.version,
              approvedVersion: post.approved_version,
              approvedAt: post.approved_at,
              scheduledFor: post.scheduled_for,
            }}
            workspaceTimezone={workspace.timezone}
            defaultScheduleValue={defaultScheduleValue}
          />

          <VersionHistory
            postId={post.id}
            currentVersion={post.version}
            timezone={workspace.timezone}
            versions={versionItems}
          />

          <Card size="sm">
            <CardHeader>
              <CardTitle className="text-sm">Record</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1.5 text-xs text-muted-foreground">
              <p className="flex items-center gap-1.5">
                <Clock className="size-3" />
                Created {formatDateTime(post.created_at, workspace.timezone)}
              </p>
              <p className="flex items-center gap-1.5">
                <Clock className="size-3" />
                Updated {formatDateTime(post.updated_at, workspace.timezone)}
              </p>
              <p>Source: {post.source === "ai" ? "Generated draft" : "Manual"}</p>
              {post.generation_id ? (
                <p>Generation record: {post.generation_id.slice(0, 8)}…</p>
              ) : null}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

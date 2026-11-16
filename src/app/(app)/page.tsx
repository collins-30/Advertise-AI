import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Plus, Sparkles } from "lucide-react";

import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import { PostMeta } from "@/components/app/post-badges";
import { SetupChecklist, type ChecklistItem } from "@/components/app/setup-checklist";
import { InstagramIcon, LinkedInIcon } from "@/components/brand/social-icons";
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
import { getDashboardData } from "@/lib/dashboard/queries";
import { formatDate, formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Overview" };

const PLATFORM_LABEL = { instagram: "Instagram", linkedin: "LinkedIn" } as const;

export default function OverviewPage() {
  return (
    <Suspense fallback={<AppLoading />}>
      <OverviewContent />
    </Suspense>
  );
}

async function OverviewContent() {
  const { supabase, workspace, user } = await requireWorkspaceAccess();
  const data = await getDashboardData(supabase, workspace.id);

  const firstName = (user.email ?? "").split("@")[0] ?? "there";

  if (!data.schemaReady) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Overview"
          description="The database is connected but the schema has not been applied yet."
        />
        <Alert variant="destructive">
          <AlertTitle>Database schema missing</AlertTitle>
          <AlertDescription>
            <p>
              Run the SQL migrations in{" "}
              <code className="rounded bg-muted px-1 py-0.5 text-xs">
                supabase/migrations
              </code>{" "}
              against your Supabase project, then reload this page.
            </p>
            <p className="mt-2 text-xs opacity-80">
              Postgres said: {data.error}
            </p>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const connectedPlatforms = new Set(
    data.accounts
      .filter((account) => account.publish_capable && account.status === "connected")
      .map((account) => account.platform),
  );

  const checklist: ChecklistItem[] = [
    {
      id: "brand",
      title: "Brand profile",
      description: "Positioning, proof points and claims to avoid.",
      href: "/settings/brand",
      cta: "Set up",
      done: Boolean(data.brandProfile),
    },
    {
      id: "audience",
      title: "Audience persona",
      description: "Who the content is written for and what they care about.",
      href: "/settings/audience",
      cta: "Add persona",
      done: data.personaCount > 0,
    },
    {
      id: "instagram",
      title: "Connect Instagram",
      description: "Official Instagram Login with publishing permission.",
      href: "/settings/accounts",
      cta: "Connect",
      done: connectedPlatforms.has("instagram"),
    },
    {
      id: "linkedin",
      title: "Connect LinkedIn",
      description: "Member posting via the official LinkedIn API.",
      href: "/settings/accounts",
      cta: "Connect",
      done: connectedPlatforms.has("linkedin"),
    },
    {
      id: "content",
      title: "Create the first post",
      description: "Generate a draft, review it, then approve it.",
      href: "/generate",
      cta: "Generate",
      done:
        data.counts.draft +
          data.counts.in_review +
          data.counts.scheduled +
          data.counts.published >
        0,
    },
  ];

  const stats = [
    {
      label: "Drafts",
      value: data.counts.draft,
      hint: "Not submitted for review",
      href: "/posts",
    },
    {
      label: "In review",
      value: data.counts.in_review,
      hint: "Waiting for your approval",
      href: "/posts",
    },
    {
      label: "Scheduled",
      value: data.counts.scheduled,
      hint: "Approved and queued",
      href: "/calendar",
    },
    {
      label: "Published",
      value: data.counts.published,
      hint: "Live on a connected account",
      href: "/posts",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Welcome back, ${firstName}`}
        description={`${formatDate(new Date().toISOString(), workspace.timezone)} · Human approval is required before anything is scheduled. Publishing arrives in a later phase.`}
        actions={
          <ButtonLink href="/generate">
            <Sparkles className="size-4" />
            Generate content
          </ButtonLink>
        }
      />

      <SetupChecklist items={checklist} />

      {data.loadError ? (
        <Alert variant="destructive">
          <AlertTitle>Some workspace data could not be loaded</AlertTitle>
          <AlertDescription>
            Counts and lists below may be incomplete. Reload to try again.
            <span className="mt-1 block text-xs opacity-80">
              {data.loadError}
            </span>
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href} className="group">
            <Card className="h-full transition-colors group-hover:border-foreground/20">
              <CardHeader className="gap-1">
                <CardDescription>{stat.label}</CardDescription>
                <CardTitle className="text-2xl tabular-nums">
                  {stat.value}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground">{stat.hint}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Publishing accounts</CardTitle>
            <CardDescription>
              Publishing stays disabled until a provider confirms the required
              permission.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {(["instagram", "linkedin"] as const).map((platform) => {
              const account = data.accounts.find(
                (item) => item.platform === platform,
              );
              const Icon =
                platform === "instagram" ? InstagramIcon : LinkedInIcon;

              return (
                <div
                  key={platform}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
                      <Icon className="size-4" />
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {PLATFORM_LABEL[platform]}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {account?.username
                          ? `@${account.username}`
                          : "Not connected"}
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      variant={
                        account?.publish_capable && account.status === "connected"
                          ? "secondary"
                          : "outline"
                      }
                    >
                      {account?.publish_capable && account.status === "connected"
                        ? "Publishing ready"
                        : account
                          ? "Limited"
                          : "Not connected"}
                    </Badge>
                    <ButtonLink
                      variant="ghost"
                      size="sm"
                      href="/settings/accounts"
                    >
                      Manage
                    </ButtonLink>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Next planned post</CardTitle>
            <CardDescription>
              Planned slots from the content calendar. Nothing publishes
              automatically in this phase; scheduled publishing arrives later.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.nextScheduled ? (
              <div className="space-y-2">
                <p className="text-sm font-medium">
                  {data.nextScheduled.title ?? "Untitled post"}
                </p>
                <PostMeta
                  platform={data.nextScheduled.platform}
                  status={data.nextScheduled.status}
                  date={data.nextScheduled.scheduled_for}
                />
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-6 text-center">
                <p className="text-sm font-medium">Nothing scheduled</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Approve a draft to schedule it.
                </p>
                <ButtonLink
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  href="/calendar"
                >
                  Open calendar
                </ButtonLink>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">Recent content</CardTitle>
              <CardDescription>
                The last five posts you touched, newest first.
              </CardDescription>
            </div>
            <ButtonLink variant="outline" size="sm" href="/posts">
              View all
            </ButtonLink>
          </div>
        </CardHeader>
        <CardContent>
          {data.recentPosts.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center">
              <p className="text-sm font-medium">No content yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Generate a brand-aware draft to get started.
              </p>
              <ButtonLink className="mt-3" size="sm" href="/generate">
                <Plus className="size-4" />
                Create the first post
              </ButtonLink>
            </div>
          ) : (
            <ul className="divide-y">
              {data.recentPosts.map((post) => (
                <li
                  key={post.id}
                  className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {post.title ?? "Untitled post"}
                    </p>
                    <PostMeta platform={post.platform} status={post.status} />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Updated {formatDateTime(post.updated_at, workspace.timezone)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, Library, Sparkles } from "lucide-react";

import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import { PostLibraryList } from "@/components/content/post-library-list";
import { POST_STATUS_LABEL } from "@/components/content/status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { requireWorkspaceAccess } from "@/lib/auth/context";
import { getBrandBrain } from "@/lib/brand/queries";
import { isDateKey } from "@/lib/content/calendar";
import { getPostLibrary } from "@/lib/content/queries";
import {
  emptyPostFilters,
  type PostListFilters,
} from "@/lib/content/types";
import type { PostStatus } from "@/lib/database.types";

export const metadata: Metadata = { title: "Content library" };

const FILTER_STATUSES: PostStatus[] = [
  "draft",
  "in_review",
  "approved",
  "scheduled",
  "published",
  "rejected",
  "failed",
  "needs_reauth",
  "archived",
];

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function parseFilters(params: SearchParams): PostListFilters {
  const platform = single(params.platform);
  const status = single(params.status);
  const pillarId = single(params.pillarId);
  const from = single(params.from);
  const to = single(params.to);

  return {
    ...emptyPostFilters,
    search: single(params.q).slice(0, 100),
    platform:
      platform === "instagram" || platform === "linkedin" ? platform : "",
    status: FILTER_STATUSES.includes(status as PostStatus)
      ? (status as PostStatus)
      : "",
    pillarId: /^[0-9a-f-]{36}$/i.test(pillarId) ? pillarId : "",
    from: isDateKey(from) ? from : "",
    to: isDateKey(to) ? to : "",
  };
}

export default function PostsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<AppLoading />}>
      <PostsContent searchParams={searchParams} />
    </Suspense>
  );
}

async function PostsContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase, workspace } = await requireWorkspaceAccess();
  const filters = parseFilters(await searchParams);

  const [library, brain] = await Promise.all([
    getPostLibrary(supabase, workspace.id, filters, workspace.timezone),
    getBrandBrain(supabase, workspace.id),
  ]);

  const pillars = brain.status === "ready" ? brain.pillars : [];
  const filtered = Object.entries(filters).some(([, value]) => value !== "");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content library"
        description="Every saved draft, review item and planned post in one place. Edits create versions; approvals are recorded against the exact version."
        eyebrow="Phase 3"
        actions={
          <ButtonLink href="/generate">
            <Sparkles />
            Generate content
          </ButtonLink>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
          <CardDescription>
            Search the copy, then narrow by platform, status, pillar or creation
            date.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            method="get"
            action="/posts"
            className="grid gap-3 md:grid-cols-2 lg:grid-cols-3"
          >
            <FormField id="filter-search" label="Search" className="lg:col-span-2">
              <Input
                id="filter-search"
                name="q"
                defaultValue={filters.search}
                placeholder="Title, hook or copy"
              />
            </FormField>

            <FormField id="filter-platform" label="Platform">
              <Select
                id="filter-platform"
                name="platform"
                defaultValue={filters.platform}
              >
                <option value="">All platforms</option>
                <option value="linkedin">LinkedIn</option>
                <option value="instagram">Instagram</option>
              </Select>
            </FormField>

            <FormField id="filter-status" label="Status">
              <Select id="filter-status" name="status" defaultValue={filters.status}>
                <option value="">All statuses</option>
                {FILTER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {POST_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </FormField>

            <FormField id="filter-pillar" label="Content pillar">
              <Select
                id="filter-pillar"
                name="pillarId"
                defaultValue={filters.pillarId}
              >
                <option value="">All pillars</option>
                {pillars.map((pillar) => (
                  <option key={pillar.id} value={pillar.id}>
                    {pillar.name}
                  </option>
                ))}
              </Select>
            </FormField>

            <div className="grid grid-cols-2 gap-2">
              <FormField id="filter-from" label="Created from">
                <Input
                  id="filter-from"
                  name="from"
                  type="date"
                  defaultValue={filters.from}
                />
              </FormField>
              <FormField id="filter-to" label="Created to">
                <Input
                  id="filter-to"
                  name="to"
                  type="date"
                  defaultValue={filters.to}
                />
              </FormField>
            </div>

            <div className="flex flex-wrap items-end gap-2 md:col-span-2 lg:col-span-3">
              <Button type="submit">Apply filters</Button>
              {filtered ? (
                <ButtonLink href="/posts" variant="outline">
                  Clear filters
                </ButtonLink>
              ) : null}
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <Library className="size-3" />
                Dates use {workspace.timezone}
              </span>
            </div>
          </form>
        </CardContent>
      </Card>

      {library.status !== "ready" ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {library.status === "missing"
              ? "The content tables are not available yet"
              : "The content library could not be loaded"}
          </AlertTitle>
          <AlertDescription>
            {library.status === "missing" ? (
              <p>
                Apply{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  supabase/migrations/20261116000000_phase3_content_management.sql
                </code>{" "}
                (and the earlier migrations) to your Supabase project.
              </p>
            ) : (
              <p>{library.message}</p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <PostLibraryList
          posts={library.posts}
          timezone={workspace.timezone}
          truncated={library.truncated}
          filtered={filtered}
        />
      )}
    </div>
  );
}

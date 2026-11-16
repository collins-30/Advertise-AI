import Link from "next/link";
import { ArrowRight, CalendarDays, FileText, Image as ImageIcon } from "lucide-react";

import {
  FORMAT_LABEL,
  PLATFORM_LABEL,
  PostStatusBadge,
} from "@/components/content/status";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { PostLibraryItem } from "@/lib/content/types";
import { formatDate, formatDateTime } from "@/lib/format";

export function PostLibraryList({
  posts,
  timezone,
  truncated,
  filtered,
}: {
  posts: PostLibraryItem[];
  timezone: string;
  truncated: boolean;
  filtered: boolean;
}) {
  if (posts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {filtered ? "No posts match these filters" : "No content yet"}
          </CardTitle>
          <CardDescription>
            {filtered
              ? "Clear the filters or widen the date range."
              : "Generate a brand-aware draft, then edit, review and schedule it here."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ButtonLink href={filtered ? "/posts" : "/generate"}>
            {filtered ? "Clear filters" : "Generate content"}
          </ButtonLink>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {truncated ? (
        <p className="text-xs text-muted-foreground">
          Showing the 100 most recently updated posts. Narrow the filters to see
          older content.
        </p>
      ) : null}

      {posts.map((post) => (
        <Card key={post.id} size="sm">
          <CardContent className="flex flex-col gap-3 sm:flex-row sm:items-start">
            <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-lg border bg-muted/30">
              {post.thumbnailUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={post.thumbnailUrl}
                  alt=""
                  className="size-full object-cover"
                />
              ) : (
                <ImageIcon className="size-5 text-muted-foreground" />
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {PLATFORM_LABEL[post.platform]}
                </Badge>
                <PostStatusBadge status={post.status} />
                <Badge variant="secondary">v{post.version}</Badge>
                {post.pillarName ? (
                  <Badge variant="outline">{post.pillarName}</Badge>
                ) : null}
              </div>

              <Link
                href={`/posts/${post.id}`}
                className="block truncate text-sm font-medium underline-offset-4 hover:underline"
              >
                {post.title || post.hook || "Untitled post"}
              </Link>

              <p className="line-clamp-1 text-sm text-muted-foreground">
                {post.hook || FORMAT_LABEL[post.format]}
              </p>

              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1">
                  <FileText className="size-3" />
                  Created {formatDate(post.createdAt, timezone)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <CalendarDays className="size-3" />
                  Updated {formatDateTime(post.updatedAt, timezone)}
                </span>
                {post.scheduledFor ? (
                  <span className="inline-flex items-center gap-1 text-blue-700 dark:text-blue-300">
                    <CalendarDays className="size-3" />
                    Planned {formatDateTime(post.scheduledFor, timezone)}
                  </span>
                ) : null}
                {post.mediaCount > 0 ? (
                  <span>
                    {post.mediaCount} image{post.mediaCount === 1 ? "" : "s"}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="shrink-0">
              <ButtonLink
                href={`/posts/${post.id}`}
                variant="outline"
                size="sm"
              >
                Open
                <ArrowRight />
              </ButtonLink>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

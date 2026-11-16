import Link from "next/link";
import { CalendarClock, ChevronLeft, ChevronRight, CircleDot } from "lucide-react";

import { CalendarQuickSchedule } from "@/components/content/calendar-quick-schedule";
import { statusDotClass } from "@/components/content/status";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WEEKDAY_LABELS } from "@/lib/content/calendar";
import type { CalendarDay, CalendarMode, Platform } from "@/lib/content/types";
import { cn } from "@/lib/utils";

export function CalendarBoard({
  mode,
  label,
  days,
  previousHref,
  nextHref,
  todayHref,
  monthHref,
  weekHref,
  timezone,
  todayKey,
  approvedUnscheduled,
  defaultScheduleValue,
}: {
  mode: CalendarMode;
  label: string;
  days: CalendarDay[];
  previousHref: string;
  nextHref: string;
  todayHref: string;
  monthHref: string;
  weekHref: string;
  timezone: string;
  todayKey: string;
  approvedUnscheduled: Array<{
    id: string;
    title: string;
    platform: Platform;
    version: number;
  }>;
  defaultScheduleValue: string;
}) {
  const scheduledCount = days.reduce((sum, day) => sum + day.posts.length, 0);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="border-b">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1">
              <CardTitle className="text-base">{label}</CardTitle>
              <CardDescription>
                {scheduledCount} planned{" "}
                {scheduledCount === 1 ? "post" : "posts"} · times in {timezone}
              </CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <ButtonLink
                href={previousHref}
                variant="outline"
                size="icon-sm"
                aria-label="Previous period"
              >
                <ChevronLeft />
              </ButtonLink>
              <ButtonLink href={todayHref} variant="outline" size="sm">
                Today
              </ButtonLink>
              <ButtonLink
                href={nextHref}
                variant="outline"
                size="icon-sm"
                aria-label="Next period"
              >
                <ChevronRight />
              </ButtonLink>
              <div className="ml-1 flex items-center rounded-lg border p-0.5">
                <ButtonLink
                  href={monthHref}
                  variant={mode === "month" ? "secondary" : "ghost"}
                  size="sm"
                >
                  Month
                </ButtonLink>
                <ButtonLink
                  href={weekHref}
                  variant={mode === "week" ? "secondary" : "ghost"}
                  size="sm"
                >
                  Week
                </ButtonLink>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {mode === "month" ? (
            <div className="overflow-hidden rounded-xl ring-1 ring-foreground/10">
              <div className="grid grid-cols-7 bg-muted/40 text-xs font-medium text-muted-foreground">
                {WEEKDAY_LABELS.map((weekday) => (
                  <div key={weekday} className="px-2 py-1.5 text-center">
                    {weekday}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7">
                {days.map((day) => (
                  <div
                    key={day.key}
                    className={cn(
                      "min-h-28 border-t border-r p-1.5 last:border-r-0",
                      !day.inCurrentMonth && "bg-muted/25 text-muted-foreground",
                    )}
                  >
                    <div className="mb-1 flex items-center justify-between">
                      <span
                        className={cn(
                          "grid size-6 place-items-center rounded-full text-xs",
                          day.key === todayKey
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "",
                        )}
                      >
                        {day.dayNumber}
                      </span>
                      {day.posts.length > 2 ? (
                        <span className="text-[0.65rem] text-muted-foreground">
                          {day.posts.length}
                        </span>
                      ) : null}
                    </div>
                    <div className="space-y-1">
                      {day.posts.slice(0, 2).map((post) => (
                        <Link
                          key={post.id}
                          href={`/posts/${post.id}`}
                          title={post.title}
                          className="flex items-center gap-1 rounded-md border border-border/60 bg-background px-1.5 py-1 text-[0.7rem] leading-tight hover:bg-muted"
                        >
                          <span
                            className={cn(
                              "size-1.5 shrink-0 rounded-full",
                              statusDotClass(post.status),
                            )}
                          />
                          <span className="truncate">{post.title}</span>
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-7">
              {days.map((day, index) => (
                <div
                  key={day.key}
                  className={cn(
                    "min-h-36 rounded-lg border p-2",
                    day.key === todayKey && "border-primary/40 bg-primary/5",
                  )}
                >
                  <div className="mb-2 flex items-baseline justify-between gap-1">
                    <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {WEEKDAY_LABELS[index]}
                    </span>
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-full text-xs",
                        day.key === todayKey
                          ? "bg-primary font-semibold text-primary-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      {day.dayNumber}
                    </span>
                  </div>
                  <div className="space-y-2">
                    {day.posts.length === 0 ? (
                      <p className="text-[0.7rem] text-muted-foreground">
                        No planned posts.
                      </p>
                    ) : (
                      day.posts.map((post) => (
                        <Link
                          key={post.id}
                          href={`/posts/${post.id}`}
                          className="block rounded-md border border-border/60 bg-background p-1.5 text-xs hover:bg-muted"
                        >
                          <div className="flex items-center gap-1 text-[0.65rem] text-muted-foreground">
                            <span
                              className={cn(
                                "size-1.5 rounded-full",
                                statusDotClass(post.status),
                              )}
                            />
                            {post.timeLabel}
                          </div>
                          <p className="mt-0.5 line-clamp-2 font-medium">
                            {post.title}
                          </p>
                        </Link>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
            <CircleDot className="size-3" />
            Posts appear on the day of their planned slot. Nothing is published
            automatically in this phase.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <CardTitle className="text-base">Approved, no date yet</CardTitle>
          </div>
          <CardDescription>
            Assign a planned slot here or open the editor for full scheduling.
            This records intent only; it does not publish.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {approvedUnscheduled.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Every approved version already has a planned date, or there is
              nothing approved yet.
            </p>
          ) : (
            <div className="space-y-3">
              {approvedUnscheduled.map((post) => (
                <div
                  key={post.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border/70 p-3"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline">
                        {post.platform === "linkedin" ? "LinkedIn" : "Instagram"}
                      </Badge>
                      <Badge variant="secondary">v{post.version}</Badge>
                    </div>
                    <p className="truncate text-sm font-medium">{post.title}</p>
                    <Link
                      href={`/posts/${post.id}`}
                      className="text-xs text-primary underline-offset-4 hover:underline"
                    >
                      Open editor
                    </Link>
                  </div>
                  <CalendarQuickSchedule
                    postId={post.id}
                    version={post.version}
                    timezone={timezone}
                    defaultScheduleValue={defaultScheduleValue}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

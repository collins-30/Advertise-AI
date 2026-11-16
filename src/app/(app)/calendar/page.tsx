import type { Metadata } from "next";
import { Suspense } from "react";
import { AlertTriangle, Library } from "lucide-react";

import { AppLoading } from "@/components/app/app-loading";
import { PageHeader } from "@/components/app/page-header";
import { CalendarBoard } from "@/components/content/calendar-board";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ButtonLink } from "@/components/ui/button";
import { requireWorkspaceAccess } from "@/lib/auth/context";
import {
  addDays,
  calendarRange,
  dateKeyInTimeZone,
  formatTimeInTimeZone,
  isDateKey,
  isInMonth,
  monthGridKeys,
  monthLabel,
  shiftMonthKey,
  todayKeyInTimeZone,
  weekKeys,
  weekLabel,
} from "@/lib/content/calendar";
import { getCalendarData } from "@/lib/content/queries";
import type {
  CalendarDay,
  CalendarMode,
  CalendarPostView,
} from "@/lib/content/types";

export const metadata: Metadata = { title: "Content calendar" };

type SearchParams = Record<string, string | string[] | undefined>;

function single(value: string | string[] | undefined): string {
  return typeof value === "string" ? value : "";
}

function calendarHref(mode: CalendarMode, dateKey: string): string {
  return `/calendar?view=${mode}&date=${dateKey}`;
}

function buildDays({
  keys,
  posts,
  anchorKey,
  mode,
  timezone,
}: {
  keys: string[];
  posts: CalendarPostView[];
  anchorKey: string;
  mode: CalendarMode;
  timezone: string;
}): CalendarDay[] {
  const byDay = new Map<string, CalendarPostView[]>();

  for (const post of posts) {
    const key = dateKeyInTimeZone(new Date(post.scheduledFor), timezone);
    const list = byDay.get(key) ?? [];
    list.push(post);
    byDay.set(key, list);
  }

  return keys.map((key) => ({
    key,
    dayNumber: Number(key.slice(8, 10)),
    inCurrentMonth: mode === "month" ? isInMonth(key, anchorKey) : true,
    posts: (byDay.get(key) ?? []).map((post) => ({
      id: post.id,
      title: post.title?.trim() || post.hook?.trim() || "Untitled post",
      platform: post.platform,
      status: post.status,
      timeLabel: formatTimeInTimeZone(post.scheduledFor, timezone),
    })),
  }));
}

export default function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <Suspense fallback={<AppLoading />}>
      <CalendarContent searchParams={searchParams} />
    </Suspense>
  );
}

async function CalendarContent({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { supabase, workspace } = await requireWorkspaceAccess();
  const params = await searchParams;

  const timezone = workspace.timezone;
  const todayKey = todayKeyInTimeZone(timezone);
  const requestedDate = single(params.date);
  const anchorKey = isDateKey(requestedDate) ? requestedDate : todayKey;
  const mode: CalendarMode = single(params.view) === "week" ? "week" : "month";

  const keys = mode === "month" ? monthGridKeys(anchorKey) : weekKeys(anchorKey);
  const range = calendarRange(keys, timezone);

  const data = await getCalendarData(
    supabase,
    workspace.id,
    range.start,
    range.end,
  );

  const previousKey =
    mode === "month" ? shiftMonthKey(anchorKey, -1) : addDays(anchorKey, -7);
  const nextKey =
    mode === "month" ? shiftMonthKey(anchorKey, 1) : addDays(anchorKey, 7);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Content calendar"
        description="Planned slots for approved versions, in the workspace timezone. Scheduling records intent only — nothing publishes automatically in this phase."
        eyebrow="Phase 3"
        actions={
          <ButtonLink href="/posts" variant="outline">
            <Library />
            Content library
          </ButtonLink>
        }
      />

      {data.status !== "ready" ? (
        <Alert variant="destructive">
          <AlertTriangle />
          <AlertTitle>
            {data.status === "missing"
              ? "The content tables are not available yet"
              : "The calendar could not be loaded"}
          </AlertTitle>
          <AlertDescription>
            {data.status === "missing" ? (
              <p>
                Apply{" "}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">
                  supabase/migrations/20261116000000_phase3_content_management.sql
                </code>{" "}
                (and the earlier migrations) to your Supabase project.
              </p>
            ) : (
              <p>{data.message}</p>
            )}
          </AlertDescription>
        </Alert>
      ) : (
        <CalendarBoard
          mode={mode}
          label={mode === "month" ? monthLabel(anchorKey) : weekLabel(anchorKey)}
          days={buildDays({
            keys,
            posts: data.posts,
            anchorKey,
            mode,
            timezone,
          })}
          previousHref={calendarHref(mode, previousKey)}
          nextHref={calendarHref(mode, nextKey)}
          todayHref={calendarHref(mode, todayKey)}
          monthHref={calendarHref("month", anchorKey)}
          weekHref={calendarHref("week", anchorKey)}
          timezone={timezone}
          todayKey={todayKey}
          approvedUnscheduled={data.approvedUnscheduled}
          defaultScheduleValue={`${addDays(todayKey, 1)}T09:00`}
        />
      )}
    </div>
  );
}

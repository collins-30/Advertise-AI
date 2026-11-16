"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarClock, CheckCircle2, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { schedulePostAction } from "@/lib/content/actions";
import { initialFormState } from "@/lib/form-state";

export function CalendarQuickSchedule({
  postId,
  version,
  timezone,
  defaultScheduleValue,
}: {
  postId: string;
  version: number;
  timezone: string;
  defaultScheduleValue: string;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    schedulePostAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state.status, router]);

  return (
    <form action={formAction} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <input type="hidden" name="expectedVersion" value={String(version)} />
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="datetime-local"
          name="scheduledFor"
          defaultValue={defaultScheduleValue}
          required
          className="max-w-[14rem]"
          aria-label={`Scheduled date and time (${timezone})`}
        />
        <Button type="submit" size="sm" variant="outline" disabled={pending}>
          {pending ? (
            <LoaderCircle className="animate-spin" />
          ) : (
            <CalendarClock />
          )}
          {pending ? "Scheduling…" : "Schedule"}
        </Button>
      </div>
      {state.status !== "idle" && state.message ? (
        <p
          className={
            state.status === "error"
              ? "flex items-start gap-1 text-xs text-destructive"
              : "flex items-start gap-1 text-xs text-emerald-700 dark:text-emerald-300"
          }
        >
          {state.status === "error" ? (
            <AlertTriangle className="mt-0.5 size-3 shrink-0" />
          ) : (
            <CheckCircle2 className="mt-0.5 size-3 shrink-0" />
          )}
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

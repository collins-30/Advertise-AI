"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  LoaderCircle,
  RotateCcw,
  ShieldCheck,
  ShieldX,
  Send,
} from "lucide-react";

import { PostStatusBadge } from "@/components/content/status";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  approvePostAction,
  rejectPostAction,
  schedulePostAction,
  submitForReviewAction,
  unschedulePostAction,
} from "@/lib/content/actions";
import type { PostStatus } from "@/lib/database.types";
import { formatDateTime } from "@/lib/format";
import { initialFormState, type FormState } from "@/lib/form-state";

function ActionFeedback({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <Alert variant={state.status === "error" ? "destructive" : "default"}>
      {state.status === "error" ? (
        <AlertTriangle />
      ) : (
        <CheckCircle2 className="text-emerald-600" />
      )}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

export type ApprovalPanelPost = {
  id: string;
  status: PostStatus;
  version: number;
  approvedVersion: number | null;
  approvedAt: string | null;
  scheduledFor: string | null;
};

export function ApprovalPanel({
  post,
  workspaceTimezone,
  defaultScheduleValue,
}: {
  post: ApprovalPanelPost;
  workspaceTimezone: string;
  defaultScheduleValue: string;
}) {
  const router = useRouter();

  const [submitState, submitAction, submitPending] = useActionState(
    submitForReviewAction,
    initialFormState,
  );
  const [approveState, approveAction, approvePending] = useActionState(
    approvePostAction,
    initialFormState,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectPostAction,
    initialFormState,
  );
  const [scheduleState, scheduleAction, schedulePending] = useActionState(
    schedulePostAction,
    initialFormState,
  );
  const [unscheduleState, unscheduleAction, unschedulePending] = useActionState(
    unschedulePostAction,
    initialFormState,
  );

  const anySuccess = [
    submitState,
    approveState,
    rejectState,
    scheduleState,
    unscheduleState,
  ].some((state) => state.status === "success");

  useEffect(() => {
    if (anySuccess) router.refresh();
  }, [anySuccess, router]);

  const canSubmit = post.status === "draft" || post.status === "rejected";
  const canDecide = post.status === "in_review";
  const isApproved = post.approvedVersion === post.version;
  const canSchedule =
    isApproved && (post.status === "approved" || post.status === "scheduled");
  const canReject =
    post.status === "in_review" ||
    post.status === "approved" ||
    post.status === "scheduled";

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="space-y-1">
            <CardTitle className="text-base">Approval</CardTitle>
            <CardDescription>
              A human approves every version. Scheduling never publishes
              anything by itself.
            </CardDescription>
          </div>
          <PostStatusBadge status={post.status} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <dl className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Current version
            </dt>
            <dd className="font-medium">v{post.version}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-muted-foreground">
              Approved version
            </dt>
            <dd className="font-medium">
              {post.approvedVersion ? `v${post.approvedVersion}` : "—"}
            </dd>
          </div>
          {post.approvedAt ? (
            <div className="col-span-2">
              <dt className="text-xs uppercase tracking-wide text-muted-foreground">
                Approved at
              </dt>
              <dd>{formatDateTime(post.approvedAt, workspaceTimezone)}</dd>
            </div>
          ) : null}
        </dl>

        {canSubmit ? (
          <form action={submitAction} className="space-y-2">
            <input type="hidden" name="postId" value={post.id} />
            <input
              type="hidden"
              name="expectedVersion"
              value={String(post.version)}
            />
            <Button type="submit" variant="outline" disabled={submitPending}>
              {submitPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Send />
              )}
              {submitPending ? "Submitting…" : "Submit for review"}
            </Button>
            <ActionFeedback state={submitState} />
          </form>
        ) : null}

        {canDecide ? (
          <div className="space-y-4 rounded-lg border border-amber-500/25 bg-amber-500/5 p-3">
            <p className="text-sm font-medium">
              Version {post.version} is waiting for a decision.
            </p>

            <form action={approveAction} className="space-y-2">
              <input type="hidden" name="postId" value={post.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={String(post.version)}
              />
              <FormField
                id="approve-note"
                label="Approval feedback (optional)"
                description="Stored with the approval record."
                error={approveState.fieldErrors?.note}
              >
                <Textarea
                  id="approve-note"
                  name="note"
                  rows={2}
                  maxLength={1000}
                  placeholder="Why this version is ready."
                />
              </FormField>
              <Button type="submit" disabled={approvePending}>
                {approvePending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ShieldCheck />
                )}
                {approvePending ? "Approving…" : "Approve version"}
              </Button>
              <ActionFeedback state={approveState} />
            </form>

            <form action={rejectAction} className="space-y-2">
              <input type="hidden" name="postId" value={post.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={String(post.version)}
              />
              <FormField
                id="reject-note"
                label="Rejection feedback (optional)"
                description="Assignments stay append-only, so the reason is kept."
                error={rejectState.fieldErrors?.note}
              >
                <Textarea
                  id="reject-note"
                  name="note"
                  rows={2}
                  maxLength={1000}
                  placeholder="What should change before the next version?"
                />
              </FormField>
              <Button
                type="submit"
                variant="destructive"
                disabled={rejectPending}
              >
                {rejectPending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <ShieldX />
                )}
                {rejectPending ? "Rejecting…" : "Reject version"}
              </Button>
              <ActionFeedback state={rejectState} />
            </form>
          </div>
        ) : null}

        {isApproved && !canDecide ? (
          <p className="rounded-lg border border-emerald-600/25 bg-emerald-600/5 p-3 text-sm text-emerald-800 dark:text-emerald-300">
            Version {post.version} is approved. Editing the copy creates a new
            draft and clears this approval.
          </p>
        ) : null}

        {(post.status === "approved" || post.status === "scheduled") &&
        !isApproved ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Approval does not match the current version</AlertTitle>
            <AlertDescription>
              The copy changed after approval. Edit and approve the current
              version before scheduling it.
            </AlertDescription>
          </Alert>
        ) : null}

        {(post.status === "approved" || post.status === "scheduled") &&
        canReject ? (
          <form action={rejectAction} className="space-y-2 border-t pt-4">
            <input type="hidden" name="postId" value={post.id} />
            <input
              type="hidden"
              name="expectedVersion"
              value={String(post.version)}
            />
            <FormField
              id="reject-approved-note"
              label="Withdraw approval / request changes"
              description="Clears the schedule and any future readiness."
              error={rejectState.fieldErrors?.note}
            >
              <Textarea
                id="reject-approved-note"
                name="note"
                rows={2}
                maxLength={1000}
                placeholder="What needs to change?"
              />
            </FormField>
            <Button type="submit" variant="destructive" disabled={rejectPending}>
              {rejectPending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <ShieldX />
              )}
              {rejectPending ? "Rejecting…" : "Reject / request changes"}
            </Button>
            <ActionFeedback state={rejectState} />
          </form>
        ) : null}

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center gap-2">
            <CalendarClock className="size-4 text-muted-foreground" />
            <h3 className="text-sm font-medium">Planned slot</h3>
          </div>

          {post.scheduledFor ? (
            <p className="text-sm">
              Scheduled for{" "}
              <span className="font-medium">
                {formatDateTime(post.scheduledFor, workspaceTimezone)}
              </span>{" "}
              <span className="text-muted-foreground">
                ({workspaceTimezone})
              </span>
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              No scheduled date. Scheduling records intent only; it does not
              publish.
            </p>
          )}

          {canSchedule ? (
            <form action={scheduleAction} className="space-y-2">
              <input type="hidden" name="postId" value={post.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={String(post.version)}
              />
              <FormField
                id="schedule-for"
                label={post.status === "scheduled" ? "Change date" : "Assign date"}
                description={`Wall-clock time in ${workspaceTimezone}`}
                error={scheduleState.fieldErrors?.scheduledFor}
              >
                <Input
                  id="schedule-for"
                  name="scheduledFor"
                  type="datetime-local"
                  defaultValue={defaultScheduleValue}
                  required
                />
              </FormField>
              <Button type="submit" disabled={schedulePending}>
                {schedulePending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <CalendarClock />
                )}
                {schedulePending
                  ? "Scheduling…"
                  : post.status === "scheduled"
                    ? "Update schedule"
                    : "Schedule approved version"}
              </Button>
              <ActionFeedback state={scheduleState} />
            </form>
          ) : null}

          {post.status === "scheduled" ? (
            <form action={unscheduleAction}>
              <input type="hidden" name="postId" value={post.id} />
              <input
                type="hidden"
                name="expectedVersion"
                value={String(post.version)}
              />
              <Button
                type="submit"
                variant="outline"
                size="sm"
                disabled={unschedulePending}
              >
                {unschedulePending ? (
                  <LoaderCircle className="animate-spin" />
                ) : (
                  <RotateCcw />
                )}
                {unschedulePending ? "Clearing…" : "Clear schedule"}
              </Button>
              <ActionFeedback state={unscheduleState} />
            </form>
          ) : null}

          {!canSchedule && post.status !== "scheduled" ? (
            <p className="text-xs text-muted-foreground">
              Scheduling becomes available once the current version is approved.
            </p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

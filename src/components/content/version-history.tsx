"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  CheckCircle2,
  History,
  LoaderCircle,
  RotateCcw,
} from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { restoreVersionAction } from "@/lib/content/actions";
import { formatDateTime } from "@/lib/format";
import { initialFormState } from "@/lib/form-state";

export type VersionHistoryItem = {
  version: number;
  createdAt: string;
  title: string | null;
  hook: string | null;
  restoredFrom: number | null;
  readable: boolean;
};

export function VersionHistory({
  postId,
  currentVersion,
  timezone,
  versions,
}: {
  postId: string;
  currentVersion: number;
  timezone: string;
  versions: VersionHistoryItem[];
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(
    restoreVersionAction,
    initialFormState,
  );

  useEffect(() => {
    if (state.status === "success") router.refresh();
  }, [state.status, router]);

  return (
    <Card>
      <CardHeader className="border-b">
        <div className="flex items-center gap-2">
          <History className="size-4 text-muted-foreground" />
          <CardTitle className="text-base">Version history</CardTitle>
        </div>
        <CardDescription>
          Snapshots are append-only. Restoring a version creates a new draft
          version; it never rewrites the audit trail.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {state.status !== "idle" && state.message ? (
          <Alert variant={state.status === "error" ? "destructive" : "default"}>
            {state.status === "error" ? (
              <AlertTriangle />
            ) : (
              <CheckCircle2 className="text-emerald-600" />
            )}
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        {versions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No snapshots recorded yet.
          </p>
        ) : (
          <form action={formAction} className="space-y-2">
            <input type="hidden" name="postId" value={postId} />
            <input
              type="hidden"
              name="expectedVersion"
              value={String(currentVersion)}
            />

            {versions.map((item) => (
              <div
                key={item.version}
                className="flex flex-wrap items-start justify-between gap-3 rounded-lg border border-border/70 p-3"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">v{item.version}</Badge>
                    {item.version === currentVersion ? (
                      <Badge variant="outline">Current</Badge>
                    ) : null}
                    {item.restoredFrom ? (
                      <Badge variant="outline">
                        Restored from v{item.restoredFrom}
                      </Badge>
                    ) : null}
                  </div>
                  <p className="truncate text-sm font-medium">
                    {item.readable
                      ? item.title || item.hook || "Untitled snapshot"
                      : "Snapshot could not be read"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(item.createdAt, timezone)}
                  </p>
                </div>

                <Button
                  type="submit"
                  name="version"
                  value={String(item.version)}
                  variant="outline"
                  size="sm"
                  disabled={pending || item.version === currentVersion || !item.readable}
                >
                  {pending ? (
                    <LoaderCircle className="animate-spin" />
                  ) : (
                    <RotateCcw />
                  )}
                  {pending ? "Restoring…" : "Restore as draft"}
                </Button>
              </div>
            ))}
          </form>
        )}
      </CardContent>
    </Card>
  );
}

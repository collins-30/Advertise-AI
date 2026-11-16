"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus, Trash2 } from "lucide-react";

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
import { FormField } from "@/components/ui/form-field";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteWritingSampleAction,
  saveWritingSampleAction,
} from "@/lib/brand/actions";
import type { WritingSampleFormValues } from "@/lib/brand/types";
import { initialFormState } from "@/lib/form-state";

const PLATFORM_LABEL: Record<string, string> = {
  linkedin: "LinkedIn",
  instagram: "Instagram",
  other: "Other",
};

function SampleForm({
  sample,
  defaultOpen,
}: {
  sample: WritingSampleFormValues;
  defaultOpen?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    saveWritingSampleAction,
    initialFormState,
  );

  return (
    <details
      open={defaultOpen}
      className="rounded-lg border bg-card open:ring-1 open:ring-foreground/10"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-2.5">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium">
            {sample.title || "Untitled sample"}
          </p>
          <p className="text-xs text-muted-foreground">
            {sample.platform
              ? PLATFORM_LABEL[sample.platform] ?? sample.platform
              : "Platform not set"}{" "}
            · {sample.content.length.toLocaleString()} characters
          </p>
        </div>
        <Badge variant="outline">Edit</Badge>
      </summary>

      <form action={formAction} className="space-y-3 border-t p-3">
        <input type="hidden" name="id" value={sample.id ?? ""} />
        <div className="grid gap-3 sm:grid-cols-[10rem_minmax(0,1fr)]">
          <FormField
            id={`sample-platform-${sample.id ?? "new"}`}
            label="Platform"
            error={state.fieldErrors?.platform}
          >
            <Select
              id={`sample-platform-${sample.id ?? "new"}`}
              name="platform"
              defaultValue={sample.platform}
            >
              <option value="">Not set</option>
              <option value="linkedin">LinkedIn</option>
              <option value="instagram">Instagram</option>
              <option value="other">Other</option>
            </Select>
          </FormField>

          <FormField
            id={`sample-title-${sample.id ?? "new"}`}
            label="Title"
            description="Optional"
            error={state.fieldErrors?.title}
          >
            <Input
              id={`sample-title-${sample.id ?? "new"}`}
              name="title"
              defaultValue={sample.title}
            />
          </FormField>
        </div>

        <FormField
          id={`sample-content-${sample.id ?? "new"}`}
          label="Sample writing"
          description="A post, email or page you are happy with"
          error={state.fieldErrors?.content}
        >
          <Textarea
            id={`sample-content-${sample.id ?? "new"}`}
            name="content"
            rows={6}
            defaultValue={sample.content}
            aria-invalid={Boolean(state.fieldErrors?.content)}
          />
        </FormField>

        <FormField
          id={`sample-notes-${sample.id ?? "new"}`}
          label="Notes"
          description="What you like about it"
          error={state.fieldErrors?.notes}
        >
          <Input
            id={`sample-notes-${sample.id ?? "new"}`}
            name="notes"
            defaultValue={sample.notes}
          />
        </FormField>

        {state.status === "error" && state.message ? (
          <Alert variant="destructive">
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}
        {state.status === "success" && state.message ? (
          <Alert>
            <AlertDescription>{state.message}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex items-center justify-between gap-2">
          <Button type="submit" size="sm" disabled={pending}>
            {pending ? (
              <>
                <LoaderCircle className="size-4 animate-spin" />
                Saving…
              </>
            ) : (
              "Save sample"
            )}
          </Button>
          {sample.id ? (
            <Button
              type="submit"
              form={`delete-sample-${sample.id}`}
              variant="ghost"
              size="sm"
              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            >
              <Trash2 className="size-4" />
              Delete
            </Button>
          ) : null}
        </div>
      </form>

      {sample.id ? (
        <form
          id={`delete-sample-${sample.id}`}
          action={deleteWritingSampleAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this writing sample?")) {
              event.preventDefault();
            }
          }}
        >
          <input type="hidden" name="id" value={sample.id} />
        </form>
      ) : null}
    </details>
  );
}

export function WritingSamplesPanel({
  samples,
}: {
  samples: WritingSampleFormValues[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Writing samples</CardTitle>
        <CardDescription>
          Optional, but the fastest way to improve voice matching. Without
          samples, generation follows the tone keywords and claim rules above.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {samples.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No samples yet. Paste one or two pieces of writing you would be happy
            to publish under the agency&apos;s name.
          </div>
        ) : (
          samples.map((sample) => (
            <SampleForm key={sample.id} sample={sample} />
          ))
        )}

        <details className="rounded-lg border border-dashed">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium">
            <Plus className="size-4" />
            Add a writing sample
          </summary>
          <div className="border-t p-3">
            <SampleForm
              sample={{
                platform: "",
                title: "",
                content: "",
                notes: "",
              }}
              defaultOpen
            />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState } from "react";
import { Layers, LoaderCircle, Plus, Trash2 } from "lucide-react";

import { ConfirmSubmitButton } from "@/components/app/confirm-submit-button";
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
import { Textarea } from "@/components/ui/textarea";
import {
  deletePillarAction,
  savePillarAction,
} from "@/lib/brand/actions";
import { arrayToLines } from "@/lib/brand/schemas";
import type { PillarFormValues } from "@/lib/brand/types";
import { initialFormState } from "@/lib/form-state";

function PillarForm({
  pillar,
  defaultOpen,
}: {
  pillar: PillarFormValues;
  defaultOpen?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    savePillarAction,
    initialFormState,
  );
  const key = pillar.id ?? "new";

  return (
    <details
      open={defaultOpen}
      className="rounded-lg border bg-card open:ring-1 open:ring-foreground/10"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
            <Layers className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {pillar.name || "New pillar"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {pillar.percentage !== null
                ? `${pillar.percentage}% target share`
                : "No share target"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {pillar.isActive ? null : <Badge variant="outline">Paused</Badge>}
          <Badge variant="outline">Edit</Badge>
        </div>
      </summary>

      <form action={formAction} className="space-y-4 border-t p-3">
        <input type="hidden" name="id" value={pillar.id ?? ""} />

        <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_8rem]">
          <FormField
            id={`pillar-name-${key}`}
            label="Pillar name"
            error={state.fieldErrors?.name}
          >
            <Input
              id={`pillar-name-${key}`}
              name="name"
              defaultValue={pillar.name}
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
          </FormField>

          <FormField
            id={`pillar-percentage-${key}`}
            label="Share %"
            description="Optional"
            error={state.fieldErrors?.percentage}
          >
            <Input
              id={`pillar-percentage-${key}`}
              name="percentage"
              type="number"
              min={0}
              max={100}
              defaultValue={pillar.percentage ?? ""}
              aria-invalid={Boolean(state.fieldErrors?.percentage)}
            />
          </FormField>
        </div>

        <FormField
          id={`pillar-description-${key}`}
          label="Description"
          description="What this pillar is for"
          error={state.fieldErrors?.description}
        >
          <Textarea
            id={`pillar-description-${key}`}
            name="description"
            rows={3}
            defaultValue={pillar.description}
          />
        </FormField>

        <FormField
          id={`pillar-topics-${key}`}
          label="Example topics"
          description="One per line"
          error={state.fieldErrors?.exampleTopics}
        >
          <Textarea
            id={`pillar-topics-${key}`}
            name="exampleTopics"
            rows={4}
            defaultValue={arrayToLines(pillar.exampleTopics)}
          />
        </FormField>

        <label className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
          <input
            type="checkbox"
            name="isActive"
            defaultChecked={pillar.isActive}
            className="mt-0.5 size-4 accent-foreground"
          />
          <span>
            <span className="font-medium">Active</span>
            <span className="block text-xs text-muted-foreground">
              Inactive pillars stay editable but are not offered as a generation
              default.
            </span>
          </span>
        </label>

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

        <Button type="submit" size="sm" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save pillar"
          )}
        </Button>
      </form>

      {pillar.id ? (
        <form
          action={deletePillarAction}
          onSubmit={(event) => {
            if (!window.confirm("Delete this pillar?")) {
              event.preventDefault();
            }
          }}
          className="border-t p-3"
        >
          <input type="hidden" name="id" value={pillar.id} />
          <ConfirmSubmitButton message="Delete this pillar?">
            <Trash2 className="size-4" />
            Delete pillar
          </ConfirmSubmitButton>
        </form>
      ) : null}
    </details>
  );
}

export function PillarsPanel({
  pillars,
  newPillarDefaults,
}: {
  pillars: PillarFormValues[];
  newPillarDefaults: PillarFormValues;
}) {
  const total = pillars
    .filter((pillar) => pillar.isActive)
    .reduce((sum, pillar) => sum + (pillar.percentage ?? 0), 0);

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle className="text-base">Content pillars</CardTitle>
            <CardDescription>
              The rotation generation draws from. Pillars are topic territories,
              not formats.
            </CardDescription>
          </div>
          <Badge variant={total > 100 ? "destructive" : "outline"}>
            {total}% active share
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {total > 100 ? (
          <Alert variant="destructive">
            <AlertDescription>
              Active pillar percentages add up to {total}%. Reduce them to 100%
              or less so the rotation stays intentional.
            </AlertDescription>
          </Alert>
        ) : null}

        {pillars.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No pillars yet. Add three to five topic territories so drafts do not
            collapse into one repeated idea.
          </div>
        ) : (
          pillars.map((pillar) => (
            <PillarForm key={pillar.id} pillar={pillar} />
          ))
        )}

        <details className="rounded-lg border border-dashed">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium">
            <Plus className="size-4" />
            Add pillar
          </summary>
          <div className="border-t p-3">
            <PillarForm pillar={newPillarDefaults} defaultOpen />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

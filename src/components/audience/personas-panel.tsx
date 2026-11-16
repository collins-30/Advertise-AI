"use client";

import { useActionState } from "react";
import { LoaderCircle, Plus, Trash2, UserRound } from "lucide-react";

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
  deletePersonaAction,
  savePersonaAction,
} from "@/lib/brand/actions";
import { arrayToLines } from "@/lib/brand/schemas";
import type { PersonaFormValues } from "@/lib/brand/types";
import { initialFormState } from "@/lib/form-state";

function PersonaForm({
  persona,
  defaultOpen,
}: {
  persona: PersonaFormValues;
  defaultOpen?: boolean;
}) {
  const [state, formAction, pending] = useActionState(
    savePersonaAction,
    initialFormState,
  );
  const key = persona.id ?? "new";

  return (
    <details
      open={defaultOpen}
      className="rounded-lg border bg-card open:ring-1 open:ring-foreground/10"
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-3 py-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-md bg-muted">
            <UserRound className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">
              {persona.name || "New persona"}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {persona.role || persona.companyType || "Add the basics"}
            </p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {persona.isPrimary ? <Badge>Primary</Badge> : null}
          <Badge variant="outline">Edit</Badge>
        </div>
      </summary>

      <form action={formAction} className="space-y-4 border-t p-3">
        <input type="hidden" name="id" value={persona.id ?? ""} />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`persona-name-${key}`}
            label="Name"
            error={state.fieldErrors?.name}
          >
            <Input
              id={`persona-name-${key}`}
              name="name"
              defaultValue={persona.name}
              required
              aria-invalid={Boolean(state.fieldErrors?.name)}
            />
          </FormField>

          <FormField
            id={`persona-role-${key}`}
            label="Role"
            error={state.fieldErrors?.role}
          >
            <Input
              id={`persona-role-${key}`}
              name="role"
              defaultValue={persona.role}
            />
          </FormField>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            id={`persona-company-type-${key}`}
            label="Company type"
            error={state.fieldErrors?.companyType}
          >
            <Input
              id={`persona-company-type-${key}`}
              name="companyType"
              defaultValue={persona.companyType}
            />
          </FormField>

          <FormField
            id={`persona-company-size-${key}`}
            label="Company size"
            error={state.fieldErrors?.companySize}
          >
            <Input
              id={`persona-company-size-${key}`}
              name="companySize"
              defaultValue={persona.companySize}
            />
          </FormField>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <FormField
            id={`persona-pains-${key}`}
            label="Pain points"
            description="One per line"
            error={state.fieldErrors?.painPoints}
          >
            <Textarea
              id={`persona-pains-${key}`}
              name="painPoints"
              rows={5}
              defaultValue={arrayToLines(persona.painPoints)}
            />
          </FormField>

          <FormField
            id={`persona-desires-${key}`}
            label="Desires"
            description="One per line"
            error={state.fieldErrors?.desires}
          >
            <Textarea
              id={`persona-desires-${key}`}
              name="desires"
              rows={5}
              defaultValue={arrayToLines(persona.desires)}
            />
          </FormField>

          <FormField
            id={`persona-objections-${key}`}
            label="Objections"
            description="One per line"
            error={state.fieldErrors?.objections}
          >
            <Textarea
              id={`persona-objections-${key}`}
              name="objections"
              rows={5}
              defaultValue={arrayToLines(persona.objections)}
            />
          </FormField>

          <FormField
            id={`persona-watering-holes-${key}`}
            label="Where they spend time"
            description="One per line"
            error={state.fieldErrors?.wateringHoles}
          >
            <Textarea
              id={`persona-watering-holes-${key}`}
              name="wateringHoles"
              rows={5}
              defaultValue={arrayToLines(persona.wateringHoles)}
            />
          </FormField>
        </div>

        <FormField
          id={`persona-triggers-${key}`}
          label="Buying triggers"
          description="One per line"
          error={state.fieldErrors?.buyingTriggers}
        >
          <Textarea
            id={`persona-triggers-${key}`}
            name="buyingTriggers"
            rows={4}
            defaultValue={arrayToLines(persona.buyingTriggers)}
          />
        </FormField>

        <FormField
          id={`persona-notes-${key}`}
          label="Notes"
          description="Internal only"
          error={state.fieldErrors?.notes}
        >
          <Textarea
            id={`persona-notes-${key}`}
            name="notes"
            rows={3}
            defaultValue={persona.notes}
          />
        </FormField>

        <label className="flex items-start gap-2.5 rounded-lg border bg-muted/30 p-3 text-sm">
          <input
            type="checkbox"
            name="isPrimary"
            defaultChecked={persona.isPrimary}
            className="mt-0.5 size-4 accent-foreground"
          />
          <span>
            <span className="font-medium">Primary persona</span>
            <span className="block text-xs text-muted-foreground">
              Generation uses the primary persona when no other persona is
              selected. Keep this pointed at agency owners.
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
            "Save persona"
          )}
        </Button>
      </form>

      {persona.id ? (
        <form
          action={deletePersonaAction}
          onSubmit={(event) => {
            if (
              !window.confirm(
                "Delete this persona? Existing posts keep their reference as null.",
              )
            ) {
              event.preventDefault();
            }
          }}
          className="border-t p-3"
        >
          <input type="hidden" name="id" value={persona.id} />
          <ConfirmSubmitButton message="Delete this persona?">
            <Trash2 className="size-4" />
            Delete persona
          </ConfirmSubmitButton>
        </form>
      ) : null}
    </details>
  );
}

export function PersonasPanel({
  personas,
  newPersonaDefaults,
}: {
  personas: PersonaFormValues[];
  newPersonaDefaults: PersonaFormValues;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Audience personas</CardTitle>
        <CardDescription>
          The writer uses the selected persona&apos;s pains, desires and
          objections. Keep one primary persona focused on agency owners rather
          than building a broad audience list.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {personas.length === 0 ? (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No personas yet. Add the agency owner persona so generation has a
            specific reader.
          </div>
        ) : (
          personas.map((persona) => (
            <PersonaForm
              key={persona.id}
              persona={persona}
              defaultOpen={persona.isPrimary && personas.length === 1}
            />
          ))
        )}

        <details className="rounded-lg border border-dashed">
          <summary className="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-sm font-medium">
            <Plus className="size-4" />
            Add persona
          </summary>
          <div className="border-t p-3">
            <PersonaForm persona={newPersonaDefaults} defaultOpen />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}

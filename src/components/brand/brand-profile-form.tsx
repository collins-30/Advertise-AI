"use client";

import { useActionState } from "react";
import {
  Ban,
  CheckCircle2,
  Lightbulb,
  LoaderCircle,
  ShieldCheck,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { saveBrandProfileAction } from "@/lib/brand/actions";
import { arrayToCommaList, arrayToLines } from "@/lib/brand/schemas";
import type { BrandProfileFormValues } from "@/lib/brand/types";
import { initialFormState } from "@/lib/form-state";

function ClaimLabel({
  icon: Icon,
  title,
  status,
}: {
  icon: typeof ShieldCheck;
  title: string;
  status: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid size-7 place-items-center rounded-md bg-muted">
        <Icon className="size-4" />
      </span>
      <div>
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{status}</p>
      </div>
    </div>
  );
}

export function BrandProfileForm({
  defaultValues,
}: {
  defaultValues: BrandProfileFormValues;
}) {
  const [state, formAction, pending] = useActionState(
    saveBrandProfileAction,
    initialFormState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.status === "success" && state.message ? (
        <Alert>
          <CheckCircle2 className="text-emerald-600" />
          <AlertTitle>Saved</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertTitle>Could not save the Brand Brain</AlertTitle>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company and positioning</CardTitle>
          <CardDescription>
            The context every draft starts from. Keep this focused on agency
            owners and CloseLoop&apos;s problem and proposed solution.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="brand-company-name"
              label="Company name"
              error={state.fieldErrors?.companyName}
            >
              <Input
                id="brand-company-name"
                name="companyName"
                defaultValue={defaultValues.companyName}
                required
                aria-invalid={Boolean(state.fieldErrors?.companyName)}
              />
            </FormField>

            <FormField
              id="brand-website"
              label="Website"
              description="Optional"
              error={state.fieldErrors?.websiteUrl}
            >
              <Input
                id="brand-website"
                name="websiteUrl"
                type="url"
                placeholder="https://closeloop.example"
                defaultValue={defaultValues.websiteUrl}
                aria-invalid={Boolean(state.fieldErrors?.websiteUrl)}
              />
            </FormField>
          </div>

          <FormField
            id="brand-one-liner"
            label="One-liner"
            description="What it is, in one sentence"
            error={state.fieldErrors?.oneLiner}
          >
            <Input
              id="brand-one-liner"
              name="oneLiner"
              defaultValue={defaultValues.oneLiner}
              aria-invalid={Boolean(state.fieldErrors?.oneLiner)}
            />
          </FormField>

          <FormField
            id="brand-description"
            label="Description"
            description="The problem and the proposed solution"
            error={state.fieldErrors?.description}
          >
            <Textarea
              id="brand-description"
              name="description"
              rows={5}
              defaultValue={defaultValues.description}
              aria-invalid={Boolean(state.fieldErrors?.description)}
            />
          </FormField>

          <FormField
            id="brand-positioning"
            label="Positioning"
            description="How CloseLoop wants to be understood"
            error={state.fieldErrors?.positioning}
          >
            <Textarea
              id="brand-positioning"
              name="positioning"
              rows={3}
              defaultValue={defaultValues.positioning}
              aria-invalid={Boolean(state.fieldErrors?.positioning)}
            />
          </FormField>

          <FormField
            id="brand-target-market"
            label="Target market"
            description="Who the content is for"
            error={state.fieldErrors?.targetMarket}
          >
            <Textarea
              id="brand-target-market"
              name="targetMarket"
              rows={2}
              defaultValue={defaultValues.targetMarket}
              aria-invalid={Boolean(state.fieldErrors?.targetMarket)}
            />
          </FormField>

          <FormField
            id="brand-value-props"
            label="Value propositions"
            description="One per line"
            error={state.fieldErrors?.valueProps}
          >
            <Textarea
              id="brand-value-props"
              name="valueProps"
              rows={4}
              defaultValue={arrayToLines(defaultValues.valueProps)}
              aria-invalid={Boolean(state.fieldErrors?.valueProps)}
            />
          </FormField>

          <FormField
            id="brand-notes"
            label="Internal notes"
            description="Direction for the writer; not published"
            error={state.fieldErrors?.notes}
          >
            <Textarea
              id="brand-notes"
              name="notes"
              rows={3}
              defaultValue={defaultValues.notes}
              aria-invalid={Boolean(state.fieldErrors?.notes)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Claims: verified, proposed and forbidden
          </CardTitle>
          <CardDescription>
            This separation is the guardrail. Verified facts may be stated as
            fact. Proposed claims must be framed as a view, never as proof.
            Forbidden claims are hard stops.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="grid gap-3 rounded-lg border bg-muted/30 p-3 sm:grid-cols-3">
            <ClaimLabel
              icon={ShieldCheck}
              title="Verified facts"
              status="Can be stated as fact"
            />
            <ClaimLabel
              icon={Lightbulb}
              title="Proposed claims"
              status="Must be hedged as a hypothesis"
            />
            <ClaimLabel
              icon={Ban}
              title="Forbidden claims"
              status="Must never appear"
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <FormField
              id="brand-verified-facts"
              label="Verified facts"
              description="One per line"
              error={state.fieldErrors?.verifiedFacts}
            >
              <Textarea
                id="brand-verified-facts"
                name="verifiedFacts"
                rows={7}
                defaultValue={arrayToLines(defaultValues.verifiedFacts)}
                aria-invalid={Boolean(state.fieldErrors?.verifiedFacts)}
              />
            </FormField>

            <FormField
              id="brand-proposed-claims"
              label="Proposed marketing claims"
              description="One per line"
              error={state.fieldErrors?.proposedClaims}
            >
              <Textarea
                id="brand-proposed-claims"
                name="proposedClaims"
                rows={7}
                defaultValue={arrayToLines(defaultValues.proposedClaims)}
                aria-invalid={Boolean(state.fieldErrors?.proposedClaims)}
              />
            </FormField>
          </div>

          <FormField
            id="brand-forbidden-claims"
            label="Forbidden claims"
            description="One per line"
            error={state.fieldErrors?.forbiddenClaims}
          >
            <Textarea
              id="brand-forbidden-claims"
              name="forbiddenClaims"
              rows={6}
              defaultValue={arrayToLines(defaultValues.forbiddenClaims)}
              aria-invalid={Boolean(state.fieldErrors?.forbiddenClaims)}
            />
          </FormField>

          <FormField
            id="brand-claim-notes"
            label="Claim notes"
            description="What still needs evidence"
            error={state.fieldErrors?.claimNotes}
          >
            <Textarea
              id="brand-claim-notes"
              name="claimNotes"
              rows={3}
              defaultValue={defaultValues.claimNotes}
              aria-invalid={Boolean(state.fieldErrors?.claimNotes)}
            />
          </FormField>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Voice, CTA and cadence</CardTitle>
          <CardDescription>
            Rules the writer applies to every platform. Cadence is a planning
            default, not a publishing limit.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="brand-tone-keywords"
              label="Tone keywords"
              description="Comma separated"
              error={state.fieldErrors?.toneKeywords}
            >
              <Input
                id="brand-tone-keywords"
                name="toneKeywords"
                defaultValue={arrayToCommaList(defaultValues.toneKeywords)}
                aria-invalid={Boolean(state.fieldErrors?.toneKeywords)}
              />
            </FormField>

            <FormField
              id="brand-emoji-policy"
              label="Emoji policy"
              error={state.fieldErrors?.emojiPolicy}
            >
              <Select
                id="brand-emoji-policy"
                name="emojiPolicy"
                defaultValue={defaultValues.emojiPolicy}
              >
                <option value="none">No emoji</option>
                <option value="sparing">Sparing</option>
                <option value="free">Free</option>
              </Select>
            </FormField>
          </div>

          <FormField
            id="brand-hashtag-policy"
            label="Hashtag policy"
            description="Platform-specific rules"
            error={state.fieldErrors?.hashtagPolicy}
          >
            <Textarea
              id="brand-hashtag-policy"
              name="hashtagPolicy"
              rows={3}
              defaultValue={defaultValues.hashtagPolicy}
              aria-invalid={Boolean(state.fieldErrors?.hashtagPolicy)}
            />
          </FormField>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              id="brand-primary-cta"
              label="Primary CTA"
              description="Used when the brief says 'brand CTA'"
              error={state.fieldErrors?.primaryCta}
            >
              <Input
                id="brand-primary-cta"
                name="primaryCta"
                defaultValue={defaultValues.primaryCta}
                aria-invalid={Boolean(state.fieldErrors?.primaryCta)}
              />
            </FormField>

            <FormField
              id="brand-booking-url"
              label="Booking URL"
              description="Optional"
              error={state.fieldErrors?.bookingUrl}
            >
              <Input
                id="brand-booking-url"
                name="bookingUrl"
                type="url"
                placeholder="https://cal.com/..."
                defaultValue={defaultValues.bookingUrl}
                aria-invalid={Boolean(state.fieldErrors?.bookingUrl)}
              />
            </FormField>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <FormField
              id="brand-linkedin-cadence"
              label="LinkedIn posts / week"
              error={state.fieldErrors?.linkedinPerWeek}
            >
              <Input
                id="brand-linkedin-cadence"
                name="linkedinPerWeek"
                type="number"
                min={0}
                max={21}
                defaultValue={defaultValues.linkedinPerWeek}
                aria-invalid={Boolean(state.fieldErrors?.linkedinPerWeek)}
              />
            </FormField>

            <FormField
              id="brand-instagram-cadence"
              label="Instagram posts / week"
              error={state.fieldErrors?.instagramPerWeek}
            >
              <Input
                id="brand-instagram-cadence"
                name="instagramPerWeek"
                type="number"
                min={0}
                max={21}
                defaultValue={defaultValues.instagramPerWeek}
                aria-invalid={Boolean(state.fieldErrors?.instagramPerWeek)}
              />
            </FormField>

            <FormField
              id="brand-cadence-note"
              label="Cadence note"
              description="Optional"
              error={state.fieldErrors?.cadenceNote}
            >
              <Input
                id="brand-cadence-note"
                name="cadenceNote"
                defaultValue={defaultValues.cadenceNote}
                aria-invalid={Boolean(state.fieldErrors?.cadenceNote)}
              />
            </FormField>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-3 rounded-xl border bg-muted/40 p-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <Badge variant="outline">Brand Brain</Badge>
          Saving updates the context used by every future draft.
        </div>
        <Button type="submit" disabled={pending}>
          {pending ? (
            <>
              <LoaderCircle className="size-4 animate-spin" />
              Saving…
            </>
          ) : (
            "Save Brand Brain"
          )}
        </Button>
      </div>
    </form>
  );
}

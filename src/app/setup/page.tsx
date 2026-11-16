import type { Metadata } from "next";

import { Logo } from "@/components/brand/logo";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { getSiteUrl } from "@/lib/env.public";
import { tryGetServerEnv } from "@/lib/env.server";

export const metadata: Metadata = { title: "Setup" };

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-4">
      <span className="grid size-7 shrink-0 place-items-center rounded-full border text-xs font-semibold">
        {number}
      </span>
      <div className="min-w-0 flex-1 space-y-2 pb-6">
        <p className="text-sm font-medium">{title}</p>
        <div className="space-y-2 text-sm text-muted-foreground">{children}</div>
      </div>
    </li>
  );
}

function Code({ children }: { children: React.ReactNode }) {
  return (
    <code className="block overflow-x-auto rounded-md border bg-muted/50 px-3 py-2 text-xs text-foreground">
      {children}
    </code>
  );
}

export default function SetupPage() {
  const result = tryGetServerEnv();
  const configured = result.ok;
  const missing = result.ok ? [] : result.missing;
  const configurationDetails = result.ok ? [] : result.details;
  const serviceRoleSet = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const siteUrl = getSiteUrl();

  const envRows = [
    { key: "NEXT_PUBLIC_SUPABASE_URL", set: !missing.includes("NEXT_PUBLIC_SUPABASE_URL") },
    {
      key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      set: !missing.includes("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    },
    { key: "SUPABASE_SERVICE_ROLE_KEY", set: serviceRoleSet },
    { key: "NEXT_PUBLIC_APP_URL", set: Boolean(process.env.NEXT_PUBLIC_APP_URL) },
    { key: "ALLOWED_EMAILS", set: Boolean(process.env.ALLOWED_EMAILS) },
  ];

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6">
      <div className="mb-8 flex items-center justify-between gap-4">
        <Logo href={null} />
        <ButtonLink variant="outline" size="sm" href="/login">
          Go to sign in
        </ButtonLink>
      </div>

      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Setup guide</h1>
        <p className="text-sm text-muted-foreground">
          Everything the app needs before it can store data or publish content.
          This page never displays secret values.
        </p>
      </div>

      <div className="mt-6 space-y-4">
        <Alert variant={configured ? "default" : "destructive"}>
          <AlertTitle>
            {configured
              ? "Supabase configuration detected"
              : "Configuration incomplete"}
          </AlertTitle>
          <AlertDescription>
            {configured
              ? "The app can reach Supabase. Continue with the migrations and auth settings below."
              : configurationDetails.length > 0
                ? `${configurationDetails.join(" ")} Fix the value in .env.local and restart the server.`
                : `Missing: ${missing.join(", ") || "none detected"}. Add these to .env.local and restart the server.`}
          </AlertDescription>
        </Alert>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Environment variables</CardTitle>
            <CardDescription>
              Copy <code className="text-xs">.env.example</code> to{" "}
              <code className="text-xs">.env.local</code> and fill it in.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {envRows.map((row) => (
              <div
                key={row.key}
                className="flex items-center justify-between gap-3 rounded-md border px-3 py-2"
              >
                <code className="truncate text-xs">{row.key}</code>
                <Badge variant={row.set ? "secondary" : "destructive"}>
                  {row.set ? "Set" : "Missing"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">First-run checklist</CardTitle>
            <CardDescription>
              Roughly ten minutes once you have a Supabase account.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="space-y-0">
              <Step number={1} title="Create a Supabase project">
                <p>
                  Choose the free plan and the region closest to you. Wait for
                  provisioning to finish.
                </p>
              </Step>

              <Step number={2} title="Add the API keys">
                <p>
                  In Supabase, open Project Settings → API. Copy the project URL,
                  the anon key and the service-role key into{" "}
                  <code className="text-xs">.env.local</code>.
                </p>
                <p>
                  The service-role key is server-only. Never expose it with a{" "}
                  <code className="text-xs">NEXT_PUBLIC_</code> prefix.
                </p>
              </Step>

              <Step number={3} title="Apply the database migrations">
                <p>
                  Open the SQL Editor and run, in order, every file in{" "}
                  <code className="text-xs">supabase/migrations</code>. This
                  creates the schema, Row Level Security policies, the media
                  bucket and the default workspace.
                </p>
                <p>
                  With the Supabase CLI you can instead run{" "}
                  <code className="text-xs">supabase db push</code>.
                </p>
              </Step>

              <Step number={4} title="Configure authentication">
                <p>
                  Enable the Email provider under Authentication → Providers.
                  Then open Authentication → URL Configuration and set:
                </p>
                <Code>{`Site URL: ${siteUrl}`}</Code>
                <Code>{`Redirect URLs:\n${siteUrl}/auth/callback\n${siteUrl}/auth/confirm`}</Code>
                <p>
                  For local development use{" "}
                  <code className="text-xs">http://localhost:3000</code>. Add the
                  production domain as an additional redirect URL when you deploy.
                </p>
              </Step>

              <Step number={5} title="Restrict sign-ups (recommended)">
                <p>
                  This is a single-workspace internal tool. Set{" "}
                  <code className="text-xs">ALLOWED_EMAILS</code> to a
                  comma-separated list of permitted addresses, and disable public
                  sign-ups in Supabase.
                </p>
                <p>
                  The first account that signs in becomes the workspace owner.
                  Later accounts are attached to the same workspace.
                </p>
              </Step>

              <Step number={6} title="Restart and sign in">
                <p>
                  Restart the dev server, create your account, and the overview
                  page will show the remaining setup steps.
                </p>
              </Step>
            </ol>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Not needed yet</CardTitle>
            <CardDescription>
              These are required in later phases and are intentionally absent from
              this build.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2">
            <p>Meta app + Instagram professional account (Phase 4)</p>
            <p>LinkedIn developer app (Phase 4)</p>
            <p>OpenAI API key (Phase 2)</p>
            <p>Inngest keys (Phase 5)</p>
            <p>PostHog project key (Phase 6)</p>
            <p>Vercel Pro project (Phase 8)</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

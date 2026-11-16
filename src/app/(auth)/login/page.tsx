import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env.public";
import { safeInternalPath } from "@/lib/url";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Sign in" };

// Reads searchParams for error and redirect messages; blocking is fine here.
export const instant = false;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : undefined;
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
        <p className="text-sm text-muted-foreground">
          Sign in to the Advertise-AI marketing workspace.
        </p>
      </div>

      {!configured ? (
        <Alert variant="destructive">
          <AlertTitle>Supabase is not configured</AlertTitle>
          <AlertDescription>
            Add your Supabase environment variables before signing in.{" "}
            <Link href="/setup" className="underline underline-offset-2">
              Open the setup guide
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {configured ? (
        <LoginForm
          next={safeInternalPath(
            Array.isArray(params.next) ? params.next[0] : params.next,
          )}
        />
      ) : null}

      <div className="space-y-2 border-t pt-4 text-sm text-muted-foreground">
        <p>
          No account yet?{" "}
          <Link
            href="/signup"
            className="font-medium text-foreground underline-offset-4 hover:underline"
          >
            Create the workspace owner account
          </Link>
        </p>
        <p className="text-xs">
          Access is limited to email addresses on the workspace allowlist.
        </p>
      </div>
    </div>
  );
}

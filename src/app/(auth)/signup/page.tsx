import type { Metadata } from "next";
import Link from "next/link";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { isSupabaseConfigured } from "@/lib/env.public";

import { SignupForm } from "./signup-form";

export const metadata: Metadata = { title: "Create account" };

export default function SignupPage() {
  const configured = isSupabaseConfigured();

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-semibold tracking-tight">
          Create your workspace account
        </h1>
        <p className="text-sm text-muted-foreground">
          This is a single-workspace internal tool. The first account becomes the
          workspace owner.
        </p>
      </div>

      {!configured ? (
        <Alert variant="destructive">
          <AlertTitle>Supabase is not configured</AlertTitle>
          <AlertDescription>
            Add your Supabase environment variables before creating an account.{" "}
            <Link href="/setup" className="underline underline-offset-2">
              Open the setup guide
            </Link>
            .
          </AlertDescription>
        </Alert>
      ) : (
        <SignupForm />
      )}

      <p className="border-t pt-4 text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-foreground underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}

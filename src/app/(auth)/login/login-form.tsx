"use client";

import { useActionState, useState } from "react";
import { LoaderCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  sendMagicLinkAction,
  signInAction,
} from "@/lib/auth/actions";
import { initialAuthState } from "@/lib/auth/types";
import { cn } from "@/lib/utils";

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="text-xs text-destructive">{messages[0]}</p>;
}

function PasswordForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    signInAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@agency.com"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          aria-invalid={Boolean(state.fieldErrors?.password)}
        />
        <FieldError messages={state.fieldErrors?.password} />
      </div>

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Signing in…
          </>
        ) : (
          "Sign in"
        )}
      </Button>
    </form>
  );
}

function MagicLinkForm({ next }: { next: string }) {
  const [state, formAction, pending] = useActionState(
    sendMagicLinkAction,
    initialAuthState,
  );

  return (
    <form action={formAction} className="space-y-4">
      <input type="hidden" name="next" value={next} />
      <div className="space-y-1.5">
        <Label htmlFor="magic-email">Email</Label>
        <Input
          id="magic-email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@agency.com"
          required
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        <FieldError messages={state.fieldErrors?.email} />
      </div>

      {state.status === "success" && state.message ? (
        <Alert>
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" && state.message ? (
        <Alert variant="destructive">
          <AlertDescription>{state.message}</AlertDescription>
        </Alert>
      ) : null}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? (
          <>
            <LoaderCircle className="size-4 animate-spin" />
            Sending link…
          </>
        ) : (
          "Email me a sign-in link"
        )}
      </Button>
    </form>
  );
}

export function LoginForm({ next }: { next: string }) {
  const [mode, setMode] = useState<"password" | "magic-link">("password");

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
        {(
          [
            { id: "password", label: "Password" },
            { id: "magic-link", label: "Email link" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setMode(option.id)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm transition-colors",
              mode === option.id
                ? "bg-background font-medium shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {mode === "password" ? (
        <PasswordForm next={next} />
      ) : (
        <MagicLinkForm next={next} />
      )}
    </div>
  );
}

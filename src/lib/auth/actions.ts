"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { z } from "zod";

import {
  magicLinkSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schemas";
import type { AuthFormState } from "@/lib/auth/types";
import { ensureWorkspaceMembership } from "@/lib/auth/workspace";
import { ConfigError, getServerEnv, tryGetServerEnv } from "@/lib/env.server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { safeInternalPath } from "@/lib/url";

function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};

  for (const issue of error.issues) {
    const key = issue.path.length > 0 ? String(issue.path[0]) : "_form";
    (result[key] ??= []).push(issue.message);
  }

  return result;
}

function friendlyAuthError(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Confirm your email address before signing in.";
  }
  if (normalized.includes("user already registered")) {
    return "An account with that email already exists. Sign in instead.";
  }
  if (normalized.includes("rate limit") || normalized.includes("too many")) {
    return "Too many attempts. Wait a minute and try again.";
  }
  if (normalized.includes("signups not allowed")) {
    return "Sign-ups are disabled for this project. Ask an administrator to create your account.";
  }

  return message;
}

function allowlistError(email: string): string | null {
  const result = tryGetServerEnv();
  if (!result.ok) {
    return `Server configuration is incomplete: ${result.details[0] ?? result.missing.join(", ")}`;
  }

  const env = result.env;
  if (env.allowedEmails.length === 0) return null;
  if (env.allowedEmails.includes(email.toLowerCase())) return null;

  return "This email is not on the workspace allowlist. Ask an administrator to add it to ALLOWED_EMAILS.";
}

function emailRedirectUrl(appUrl: string): string {
  return `${appUrl.replace(/\/+$/, "")}/auth/callback?next=${encodeURIComponent("/")}`;
}

function membershipError(
  membership:
    | { ok: false; reason: "not_allowed" }
    | { ok: false; reason: "not_configured"; missing: string[] }
    | { ok: false; reason: "error"; message: string },
): string {
  if (membership.reason === "not_allowed") {
    return "This account is not on the workspace allowlist. Ask an administrator to add your email to ALLOWED_EMAILS.";
  }
  if (membership.reason === "not_configured") {
    return `Server configuration is incomplete: ${membership.missing.join(", ")}`;
  }
  return membership.message;
}

export async function signInAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  let supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  try {
    supabase = await createSupabaseServerClient();
  } catch (error) {
    if (error instanceof ConfigError) {
      return { status: "error", message: error.message };
    }
    throw error;
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });

  if (error || !data.user) {
    return {
      status: "error",
      message: friendlyAuthError(error?.message ?? "Could not sign in."),
    };
  }

  const membership = await ensureWorkspaceMembership(data.user);

  if (!membership.ok) {
    await supabase.auth.signOut();
    return { status: "error", message: membershipError(membership) };
  }

  revalidatePath("/", "layout");
  redirect(safeInternalPath(formData.get("next")));
}

export async function signUpAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const blocked = allowlistError(parsed.data.email);
  if (blocked) return { status: "error", message: blocked };

  const env = getServerEnv();
  const supabase = await createSupabaseServerClient();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: emailRedirectUrl(env.appUrl),
    },
  });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }

  // Email confirmation disabled: a session is returned immediately.
  if (data.session && data.user) {
    const membership = await ensureWorkspaceMembership(data.user);

    if (!membership.ok) {
      await supabase.auth.signOut();
      return { status: "error", message: membershipError(membership) };
    }

    revalidatePath("/", "layout");
    redirect("/");
  }

  return {
    status: "success",
    message:
      "Account created. Check your email and follow the confirmation link to finish signing in.",
  };
}

export async function sendMagicLinkAction(
  _previous: AuthFormState,
  formData: FormData,
): Promise<AuthFormState> {
  const parsed = magicLinkSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Enter a valid email address.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const blocked = allowlistError(parsed.data.email);
  if (blocked) return { status: "error", message: blocked };

  const env = getServerEnv();
  const supabase = await createSupabaseServerClient();

  const { error } = await supabase.auth.signInWithOtp({
    email: parsed.data.email,
    options: {
      emailRedirectTo: emailRedirectUrl(env.appUrl),
    },
  });

  if (error) {
    return { status: "error", message: friendlyAuthError(error.message) };
  }

  return {
    status: "success",
    message:
      "Sign-in link sent. Open it on this device to finish signing in. Check spam if it does not arrive within a minute.",
  };
}

export async function signOutAction() {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
  } catch (error) {
    if (!(error instanceof ConfigError)) throw error;
  }

  revalidatePath("/", "layout");
  redirect("/login");
}

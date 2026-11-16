import "server-only";

import { z } from "zod";

import { getPublicEnv, getSiteUrl } from "@/lib/env.public";
import {
  normalizeAppUrl,
  normalizeSupabaseProjectUrl,
} from "@/lib/env-url";

/**
 * Server-only environment.
 *
 * Validation is lazy: the app never crashes at import time in an environment
 * that has not been configured yet. Callers either use `tryGetServerEnv()`
 * (to render a setup screen) or `getServerEnv()` (to fail loudly inside an
 * operation that genuinely needs configuration).
 */

const requiredString = (label: string) =>
  z.string().trim().min(1, `${label} is required`);

const supabaseUrl = z
  .string()
  .trim()
  .min(1, "Supabase URL is required")
  .transform((value, context) => {
    try {
      return normalizeSupabaseProjectUrl(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "NEXT_PUBLIC_SUPABASE_URL is invalid.",
      });
      return z.NEVER;
    }
  });

const appUrl = z
  .string()
  .trim()
  .optional()
  .transform((value, context) => {
    if (!value) return undefined;

    try {
      return normalizeAppUrl(value);
    } catch (error) {
      context.addIssue({
        code: "custom",
        message:
          error instanceof Error
            ? error.message
            : "NEXT_PUBLIC_APP_URL is invalid.",
      });
      return z.NEVER;
    }
  });

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: requiredString("Supabase anon key").min(
    20,
    "Supabase anon key looks too short",
  ),
  NEXT_PUBLIC_APP_URL: appUrl,
  SUPABASE_SERVICE_ROLE_KEY: z.string().trim().min(20).optional(),
  TOKEN_ENCRYPTION_KEY: z.string().trim().min(1).optional(),
  OPENAI_API_KEY: z.string().trim().min(1).optional(),
  OPENAI_MODEL: z.string().trim().min(1).optional(),
  ALLOWED_EMAILS: z.string().trim().optional(),
});

export class ConfigError extends Error {
  readonly missing: string[];
  readonly details: string[];

  constructor(missing: string[], details: string[] = []) {
    super(
      details.length > 0
        ? `Invalid server configuration: ${details.join(" ")}`
        : missing.length > 0
          ? `Missing or invalid configuration: ${missing.join(", ")}`
          : "Invalid configuration",
    );
    this.name = "ConfigError";
    this.missing = missing;
    this.details = details;
  }
}

export type ServerEnv = {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string | null;
  tokenEncryptionKey: string | null;
  openAiApiKey: string | null;
  openAiModel: string;
  allowedEmails: string[];
  appUrl: string;
  isProduction: boolean;
};

export type ServerEnvResult =
  | { ok: true; env: ServerEnv }
  | { ok: false; missing: string[]; details: string[] };

let cached: ServerEnvResult | null = null;

function parseAllowedEmails(raw: string | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/[,;\s]+/)
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function tryGetServerEnv(): ServerEnvResult {
  if (cached) return cached;

  const publicEnv = getPublicEnv();

  const raw = {
    NEXT_PUBLIC_SUPABASE_URL: publicEnv.supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: publicEnv.supabaseAnonKey,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    OPENAI_MODEL: process.env.OPENAI_MODEL,
    ALLOWED_EMAILS: process.env.ALLOWED_EMAILS,
  };

  const parsed = schema.safeParse(raw);

  if (!parsed.success) {
    const missing = Array.from(
      new Set(
        parsed.error.issues.map((issue) =>
          String(issue.path[0] ?? "configuration"),
        ),
      ),
    );
    const details = Array.from(
      new Set(
        parsed.error.issues.map(
          (issue) =>
            `${String(issue.path[0] ?? "configuration")}: ${issue.message}`,
        ),
      ),
    );
    cached = { ok: false, missing, details };
    return cached;
  }

  cached = {
    ok: true,
    env: {
      supabaseUrl: parsed.data.NEXT_PUBLIC_SUPABASE_URL,
      supabaseAnonKey: parsed.data.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseServiceRoleKey: parsed.data.SUPABASE_SERVICE_ROLE_KEY ?? null,
      tokenEncryptionKey: parsed.data.TOKEN_ENCRYPTION_KEY ?? null,
      openAiApiKey: parsed.data.OPENAI_API_KEY ?? null,
      openAiModel: parsed.data.OPENAI_MODEL ?? "gpt-4o-mini",
      allowedEmails: parseAllowedEmails(parsed.data.ALLOWED_EMAILS),
      appUrl: parsed.data.NEXT_PUBLIC_APP_URL ?? getSiteUrl(),
      isProduction: process.env.NODE_ENV === "production",
    },
  };

  return cached;
}

export function getServerEnv(): ServerEnv {
  const result = tryGetServerEnv();
  if (!result.ok) throw new ConfigError(result.missing, result.details);
  return result.env;
}

"use server";

import { revalidatePath } from "next/cache";

import { checkClaims, hasClaimBlockers } from "@/lib/ai/claims";
import { composeFinalCopy } from "@/lib/ai/compose";
import { LOCAL_MODEL, runGeneration } from "@/lib/ai/generate";
import { DEFAULT_OPENAI_MODEL } from "@/lib/ai/openai";
import { PROMPT_VERSION } from "@/lib/ai/prompt";
import type {
  BrandContext,
  GenerationState,
  SaveDraftResult,
} from "@/lib/ai/types";
import { getWorkspaceAccess, type AuthorizedWorkspace } from "@/lib/auth/context";
import {
  brandProfileSchema,
  generatedPostSchema,
  generationBriefSchema,
  personaSchema,
  pillarSchema,
  writingSampleSchema,
} from "@/lib/brand/schemas";
import { getBrandBrain } from "@/lib/brand/queries";
import { getServerEnv } from "@/lib/env.server";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import type { Json } from "@/lib/database.types";

function stringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
}

function booleanValue(formData: FormData, key: string): boolean {
  return formData.get(key) === "on" || formData.get(key) === "true";
}

async function authorize(): Promise<
  { ok: true; access: AuthorizedWorkspace } | { ok: false; state: FormState }
> {
  const access = await getWorkspaceAccess();
  if (access.status !== "ok") {
    return {
      ok: false,
      state: {
        status: "error",
        message:
          access.status === "unauthenticated"
            ? "Your session has expired. Sign in again."
            : "The workspace is not available. Check the server configuration.",
      },
    };
  }
  return { ok: true, access };
}

async function audit(
  access: AuthorizedWorkspace,
  action: string,
  entityType: string,
  entityId: string | null,
  metadata: Json = {},
): Promise<void> {
  await access.supabase.from("audit_log").insert({
    workspace_id: access.workspace.id,
    actor_id: access.user.id,
    action,
    entity_type: entityType,
    entity_id: entityId,
    metadata,
  });
}

function revalidateBrandSurfaces() {
  revalidatePath("/settings/brand");
  revalidatePath("/settings/audience");
  revalidatePath("/generate");
  revalidatePath("/");
}

export async function saveBrandProfileAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = brandProfileSchema.safeParse({
    companyName: stringValue(formData, "companyName"),
    oneLiner: stringValue(formData, "oneLiner"),
    description: stringValue(formData, "description"),
    websiteUrl: stringValue(formData, "websiteUrl"),
    positioning: stringValue(formData, "positioning"),
    targetMarket: stringValue(formData, "targetMarket"),
    valueProps: stringValue(formData, "valueProps"),
    verifiedFacts: stringValue(formData, "verifiedFacts"),
    proposedClaims: stringValue(formData, "proposedClaims"),
    forbiddenClaims: stringValue(formData, "forbiddenClaims"),
    claimNotes: stringValue(formData, "claimNotes"),
    toneKeywords: stringValue(formData, "toneKeywords"),
    emojiPolicy: stringValue(formData, "emojiPolicy"),
    hashtagPolicy: stringValue(formData, "hashtagPolicy"),
    primaryCta: stringValue(formData, "primaryCta"),
    bookingUrl: stringValue(formData, "bookingUrl"),
    linkedinPerWeek: stringValue(formData, "linkedinPerWeek"),
    instagramPerWeek: stringValue(formData, "instagramPerWeek"),
    cadenceNote: stringValue(formData, "cadenceNote"),
    notes: stringValue(formData, "notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const values = parsed.data;
  const { data, error } = await auth.access.supabase
    .from("brand_profiles")
    .upsert(
      {
        workspace_id: auth.access.workspace.id,
        company_name: values.companyName,
        one_liner: values.oneLiner || null,
        description: values.description || null,
        website_url: values.websiteUrl,
        positioning: values.positioning || null,
        target_market: values.targetMarket || null,
        value_props: values.valueProps,
        verified_facts: values.verifiedFacts,
        proposed_claims: values.proposedClaims,
        forbidden_claims: values.forbiddenClaims,
        claim_notes: values.claimNotes || null,
        tone_keywords: values.toneKeywords,
        emoji_policy: values.emojiPolicy,
        hashtag_policy: values.hashtagPolicy || null,
        primary_cta: values.primaryCta || null,
        booking_url: values.bookingUrl,
        posting_cadence: {
          linkedin: values.linkedinPerWeek,
          instagram: values.instagramPerWeek,
          note: values.cadenceNote,
        },
        notes: values.notes || null,
      },
      { onConflict: "workspace_id" },
    )
    .select("id")
    .single();

  if (error) {
    return {
      status: "error",
      message: `Could not save the brand profile: ${error.message}`,
    };
  }

  await audit(auth.access, "brand_profile.updated", "brand_profile", data.id, {
    verifiedFacts: values.verifiedFacts.length,
    proposedClaims: values.proposedClaims.length,
    forbiddenClaims: values.forbiddenClaims.length,
  });
  revalidateBrandSurfaces();

  return {
    status: "success",
    message:
      "Brand Brain saved. New drafts will use these claims, voice rules and CTAs.",
  };
}

export async function savePersonaAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = personaSchema.safeParse({
    id: stringValue(formData, "id") || undefined,
    name: stringValue(formData, "name"),
    role: stringValue(formData, "role"),
    companyType: stringValue(formData, "companyType"),
    companySize: stringValue(formData, "companySize"),
    painPoints: stringValue(formData, "painPoints"),
    desires: stringValue(formData, "desires"),
    objections: stringValue(formData, "objections"),
    wateringHoles: stringValue(formData, "wateringHoles"),
    buyingTriggers: stringValue(formData, "buyingTriggers"),
    isPrimary: booleanValue(formData, "isPrimary"),
    notes: stringValue(formData, "notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const values = parsed.data;
  const workspaceId = auth.access.workspace.id;

  if (values.isPrimary) {
    await auth.access.supabase
      .from("audience_personas")
      .update({ is_primary: false })
      .eq("workspace_id", workspaceId)
      .eq("is_primary", true);
  }

  const payload = {
    workspace_id: workspaceId,
    name: values.name,
    role: values.role || null,
    company_type: values.companyType || null,
    company_size: values.companySize || null,
    pain_points: values.painPoints,
    desires: values.desires,
    objections: values.objections,
    watering_holes: values.wateringHoles,
    buying_triggers: values.buyingTriggers,
    is_primary: values.isPrimary,
    notes: values.notes || null,
  };

  const query = values.id
    ? auth.access.supabase
        .from("audience_personas")
        .update(payload)
        .eq("id", values.id)
        .eq("workspace_id", workspaceId)
        .select("id")
        .single()
    : auth.access.supabase
        .from("audience_personas")
        .insert(payload)
        .select("id")
        .single();

  const { data, error } = await query;
  if (error) {
    return {
      status: "error",
      message: `Could not save the persona: ${error.message}`,
    };
  }

  await audit(
    auth.access,
    values.id ? "persona.updated" : "persona.created",
    "audience_persona",
    data.id,
    { name: values.name, isPrimary: values.isPrimary },
  );
  revalidateBrandSurfaces();

  return {
    status: "success",
    message: values.id ? "Persona saved." : "Persona added.",
  };
}

export async function deletePersonaAction(formData: FormData): Promise<void> {
  const auth = await authorize();
  if (!auth.ok) return;

  const id = stringValue(formData, "id");
  if (!id) return;

  await auth.access.supabase
    .from("audience_personas")
    .delete()
    .eq("id", id)
    .eq("workspace_id", auth.access.workspace.id);

  await audit(auth.access, "persona.deleted", "audience_persona", id);
  revalidateBrandSurfaces();
}

export async function savePillarAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = pillarSchema.safeParse({
    id: stringValue(formData, "id") || undefined,
    name: stringValue(formData, "name"),
    description: stringValue(formData, "description"),
    percentage: stringValue(formData, "percentage"),
    exampleTopics: stringValue(formData, "exampleTopics"),
    isActive: booleanValue(formData, "isActive"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const values = parsed.data;
  const workspaceId = auth.access.workspace.id;
  const payload = {
    workspace_id: workspaceId,
    name: values.name,
    description: values.description || null,
    percentage: values.percentage,
    example_topics: values.exampleTopics,
    is_active: values.isActive,
  };

  const query = values.id
    ? auth.access.supabase
        .from("content_pillars")
        .update(payload)
        .eq("id", values.id)
        .eq("workspace_id", workspaceId)
        .select("id")
        .single()
    : auth.access.supabase
        .from("content_pillars")
        .insert(payload)
        .select("id")
        .single();

  const { data, error } = await query;
  if (error) {
    return {
      status: "error",
      message: `Could not save the pillar: ${error.message}`,
    };
  }

  await audit(
    auth.access,
    values.id ? "pillar.updated" : "pillar.created",
    "content_pillar",
    data.id,
    { name: values.name, percentage: values.percentage },
  );
  revalidateBrandSurfaces();

  return {
    status: "success",
    message: values.id ? "Pillar saved." : "Pillar added.",
  };
}

export async function deletePillarAction(formData: FormData): Promise<void> {
  const auth = await authorize();
  if (!auth.ok) return;

  const id = stringValue(formData, "id");
  if (!id) return;

  await auth.access.supabase
    .from("content_pillars")
    .delete()
    .eq("id", id)
    .eq("workspace_id", auth.access.workspace.id);

  await audit(auth.access, "pillar.deleted", "content_pillar", id);
  revalidateBrandSurfaces();
}

export async function saveWritingSampleAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = writingSampleSchema.safeParse({
    id: stringValue(formData, "id") || undefined,
    platform: stringValue(formData, "platform"),
    title: stringValue(formData, "title"),
    content: stringValue(formData, "content"),
    notes: stringValue(formData, "notes"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const values = parsed.data;
  const workspaceId = auth.access.workspace.id;
  const payload = {
    workspace_id: workspaceId,
    platform: values.platform,
    title: values.title || null,
    content: values.content,
    notes: values.notes || null,
  };

  const query = values.id
    ? auth.access.supabase
        .from("brand_writing_samples")
        .update(payload)
        .eq("id", values.id)
        .eq("workspace_id", workspaceId)
        .select("id")
        .single()
    : auth.access.supabase
        .from("brand_writing_samples")
        .insert(payload)
        .select("id")
        .single();

  const { data, error } = await query;
  if (error) {
    return {
      status: "error",
      message: `Could not save the writing sample: ${error.message}`,
    };
  }

  await audit(
    auth.access,
    values.id ? "writing_sample.updated" : "writing_sample.created",
    "brand_writing_sample",
    data.id,
    { platform: values.platform, title: values.title },
  );
  revalidateBrandSurfaces();

  return {
    status: "success",
    message: values.id ? "Writing sample saved." : "Writing sample added.",
  };
}

export async function deleteWritingSampleAction(
  formData: FormData,
): Promise<void> {
  const auth = await authorize();
  if (!auth.ok) return;

  const id = stringValue(formData, "id");
  if (!id) return;

  await auth.access.supabase
    .from("brand_writing_samples")
    .delete()
    .eq("id", id)
    .eq("workspace_id", auth.access.workspace.id);

  await audit(auth.access, "writing_sample.deleted", "brand_writing_sample", id);
  revalidateBrandSurfaces();
}

async function generationAuthError(): Promise<GenerationState> {
  const access = await getWorkspaceAccess();
  if (access.status === "ok") {
    return { status: "error", message: "Unexpected authorization state." };
  }

  return {
    status: "error",
    message:
      access.status === "unauthenticated"
        ? "Your session has expired. Sign in again."
        : "The workspace is not available. Check the server configuration.",
  };
}

export async function generateContentAction(
  _previous: GenerationState,
  formData: FormData,
): Promise<GenerationState> {
  const access = await getWorkspaceAccess();
  if (access.status !== "ok") return generationAuthError();

  const parsed = generationBriefSchema.safeParse({
    platform: stringValue(formData, "platform"),
    format: stringValue(formData, "format"),
    pillarId: stringValue(formData, "pillarId"),
    personaId: stringValue(formData, "personaId"),
    objective: stringValue(formData, "objective"),
    angle: stringValue(formData, "angle"),
    notes: stringValue(formData, "notes"),
    ctaMode: stringValue(formData, "ctaMode"),
    customCta: stringValue(formData, "customCta"),
    variantSeed: stringValue(formData, "variantSeed"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the brief fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const brain = await getBrandBrain(access.supabase, access.workspace.id);

  if (brain.status === "missing") {
    return {
      status: "error",
      message:
        "The Phase 2 migration has not been applied. Run supabase/migrations/20261115000000_phase2_brand_brain.sql, then reload.",
    };
  }
  if (brain.status === "error") {
    return {
      status: "error",
      message: `Could not load the Brand Brain: ${brain.message}`,
    };
  }
  if (!brain.profile) {
    return {
      status: "error",
      message:
        "Add a brand profile first. Generation needs your positioning, claims and voice rules.",
    };
  }

  const brief = parsed.data;
  const persona =
    (brief.personaId
      ? brain.personas.find((item) => item.id === brief.personaId)
      : null) ??
    brain.personas.find((item) => item.is_primary) ??
    brain.personas[0] ??
    null;
  const pillar =
    (brief.pillarId
      ? brain.pillars.find((item) => item.id === brief.pillarId)
      : null) ??
    brain.pillars.find((item) => item.is_active) ??
    brain.pillars[0] ??
    null;

  const context: BrandContext = {
    profile: brain.profile,
    personas: brain.personas,
    pillars: brain.pillars,
    samples: brain.samples,
    persona,
    pillar,
  };

  const env = getServerEnv();
  const apiKey = env.openAiApiKey;
  const model = env.openAiModel || DEFAULT_OPENAI_MODEL;

  const { data: generation, error: generationError } = await access.supabase
    .from("ai_generations")
    .insert({
      workspace_id: access.workspace.id,
      kind: "content",
      model: apiKey ? model : LOCAL_MODEL,
      prompt_version: PROMPT_VERSION,
      input: {
        brief,
        personaId: persona?.id ?? null,
        pillarId: pillar?.id ?? null,
      },
      status: "pending",
      created_by: access.user.id,
    })
    .select("id")
    .single();

  if (generationError) {
    return {
      status: "error",
      message: `Could not start the generation: ${generationError.message}`,
    };
  }

  try {
    const run = await runGeneration({
      context,
      brief,
      apiKey,
      model,
    });

    await access.supabase
      .from("ai_generations")
      .update({
        model: run.model,
        output: {
          content: run.content,
          provider: run.provider,
          engineNote: run.engineNote,
          claimFindings: run.claimFindings,
        },
        tokens_input: run.usage.inputTokens,
        tokens_output: run.usage.outputTokens,
        cost_usd: run.usage.estimatedCostUsd,
        status: "succeeded",
        error: null,
      })
      .eq("id", generation.id)
      .eq("workspace_id", access.workspace.id);

    return {
      status: "success",
      message: run.engineNote,
      result: {
        generationId: generation.id,
        provider: run.provider,
        model: run.model,
        promptVersion: run.promptVersion,
        brief,
        personaId: persona?.id ?? null,
        pillarId: pillar?.id ?? null,
        content: run.content,
        usage: run.usage,
        claimFindings: run.claimFindings,
        engineNote: run.engineNote,
      },
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Generation failed unexpectedly.";

    await access.supabase
      .from("ai_generations")
      .update({ status: "failed", error: message })
      .eq("id", generation.id)
      .eq("workspace_id", access.workspace.id);

    return {
      status: "error",
      message: `Generation failed: ${message}`,
    };
  }
}

export async function saveGeneratedPostAction(
  input: unknown,
): Promise<SaveDraftResult> {
  const access = await getWorkspaceAccess();
  if (access.status !== "ok") {
    return {
      ok: false,
      error:
        access.status === "unauthenticated"
          ? "Your session has expired. Sign in again."
          : "The workspace is not available.",
    };
  }

  const parsed = generatedPostSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error:
        parsed.error.issues[0]?.message ??
        "The draft is not valid and cannot be saved.",
    };
  }

  const values = parsed.data;
  const workspaceId = access.workspace.id;

  const brain = await getBrandBrain(access.supabase, workspaceId);
  if (brain.status !== "ready" || !brain.profile) {
    return {
      ok: false,
      error:
        brain.status === "missing"
          ? "Apply the Phase 2 migration before saving drafts."
          : "Add a brand profile before saving drafts.",
    };
  }

  const copy =
    values.platform === "linkedin" ? values.body : values.caption;
  const claimFindings = checkClaims({
    text: composeFinalCopy({
      hook: values.hook,
      copy,
      cta: values.cta,
      hashtags: values.hashtags,
    }),
    forbiddenClaims: brain.profile.forbidden_claims,
    proposedClaims: brain.profile.proposed_claims,
    verifiedFacts: brain.profile.verified_facts,
  });

  if (hasClaimBlockers(claimFindings)) {
    return {
      ok: false,
      error:
        "This draft still contains a forbidden claim. Fix the highlighted copy before saving.",
      claimFindings,
    };
  }

  if (values.personaId) {
    const { data } = await access.supabase
      .from("audience_personas")
      .select("id")
      .eq("id", values.personaId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: "The selected persona no longer exists." };
    }
  }

  if (values.pillarId) {
    const { data } = await access.supabase
      .from("content_pillars")
      .select("id")
      .eq("id", values.pillarId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: "The selected pillar no longer exists." };
    }
  }

  if (values.generationId) {
    const { data } = await access.supabase
      .from("ai_generations")
      .select("id")
      .eq("id", values.generationId)
      .eq("workspace_id", workspaceId)
      .maybeSingle();
    if (!data) {
      return { ok: false, error: "The generation record no longer exists." };
    }
  }

  const { data: post, error } = await access.supabase
    .from("posts")
    .insert({
      workspace_id: workspaceId,
      platform: values.platform,
      format: values.format,
      status: "draft",
      title: values.title || null,
      hook: values.hook || null,
      body: values.body || null,
      caption: values.caption || null,
      hashtags: values.hashtags,
      cta: values.cta || null,
      alt_text: values.altText || null,
      image_brief: values.imageBrief || null,
      carousel_slides: values.carouselSlides,
      generation_id: values.generationId,
      pillar_id: values.pillarId,
      persona_id: values.personaId,
      source: "ai",
      version: 1,
      timezone: access.workspace.timezone,
      created_by: access.user.id,
    })
    .select("id")
    .single();

  if (error) {
    return { ok: false, error: `Could not save the draft: ${error.message}` };
  }

  await access.supabase.from("post_versions").insert({
    workspace_id: workspaceId,
    post_id: post.id,
    version: 1,
    snapshot: {
      platform: values.platform,
      format: values.format,
      title: values.title,
      hook: values.hook,
      body: values.body,
      caption: values.caption,
      hashtags: values.hashtags,
      cta: values.cta,
      alt_text: values.altText,
      image_brief: values.imageBrief,
      carousel_slides: values.carouselSlides,
      pillar_id: values.pillarId,
      persona_id: values.personaId,
      source: "ai",
    },
    created_by: access.user.id,
  });

  await audit(access, "post.created_from_generation", "post", post.id, {
    platform: values.platform,
    format: values.format,
    generationId: values.generationId,
  });

  revalidatePath("/generate");
  revalidatePath("/posts");
  revalidatePath("/calendar");
  revalidatePath("/");

  return { ok: true, postId: post.id };
}

"use server";

import { randomUUID } from "node:crypto";

import { revalidatePath } from "next/cache";

import { checkClaims, hasClaimBlockers } from "@/lib/ai/claims";
import { composeFinalCopy } from "@/lib/ai/compose";
import { getBrandBrain } from "@/lib/brand/queries";
import {
  getWorkspaceAccess,
  type AuthorizedWorkspace,
} from "@/lib/auth/context";
import { zonedDateTimeToUtc } from "@/lib/content/calendar";
import {
  ALLOWED_MEDIA_TYPES,
  decisionSchema,
  MAX_MEDIA_BYTES,
  MAX_MEDIA_PER_POST,
  mediaAltSchema,
  mediaRemoveSchema,
  mediaUploadSchema,
  postActionSchema,
  postEditSchema,
  restoreVersionSchema,
  scheduleSchema,
  type AllowedMediaType,
} from "@/lib/content/schemas";
import {
  editableFieldsFromSnapshot,
  parseSnapshot,
  snapshotFromPost,
} from "@/lib/content/snapshots";
import type { Json, PostRow } from "@/lib/database.types";
import { fieldErrorsFrom, type FormState } from "@/lib/form-state";
import { formatDateTime } from "@/lib/format";
import {
  createSupabaseAdminClient,
  isAdminClientAvailable,
} from "@/lib/supabase/admin";

const MEDIA_BUCKET = "post-media";

function stringValue(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
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
  postId: string | null,
  metadata: Json = {},
): Promise<void> {
  await access.supabase.from("audit_log").insert({
    workspace_id: access.workspace.id,
    actor_id: access.user.id,
    action,
    entity_type: "post",
    entity_id: postId,
    metadata,
  });
}

function revalidatePostSurfaces(postId?: string) {
  revalidatePath("/posts");
  if (postId) revalidatePath(`/posts/${postId}`);
  revalidatePath("/calendar");
  revalidatePath("/");
  revalidatePath("/generate");
}

function claimBlockMessage(messages: string[]): string {
  return `This copy contains a forbidden claim: ${messages.join(" ")} Edit the highlighted copy before saving.`;
}

async function loadPost(
  access: AuthorizedWorkspace,
  postId: string,
): Promise<PostRow | null> {
  const { data } = await access.supabase
    .from("posts")
    .select("*")
    .eq("id", postId)
    .eq("workspace_id", access.workspace.id)
    .maybeSingle();

  return data ?? null;
}

/**
 * Adding, replacing or removing an image changes what a reviewer approves.
 * Pending or approved copy is reset to a fresh draft version so an old approval
 * can never be used for different media. Snapshots remain copy-only, so media
 * itself is not rewound by restoring an older version.
 */
async function resetApprovalAfterMediaChange(
  access: AuthorizedWorkspace,
  post: PostRow,
): Promise<boolean> {
  if (!["in_review", "approved", "scheduled"].includes(post.status)) {
    return false;
  }

  const newVersion = post.version + 1;
  const patch = {
    version: newVersion,
    status: "draft" as const,
    approved_version: null,
    approved_at: null,
    approved_by: null,
    scheduled_for: null,
    timezone: access.workspace.timezone,
  };

  const { data: updated } = await access.supabase
    .from("posts")
    .update(patch)
    .eq("id", post.id)
    .eq("workspace_id", access.workspace.id)
    .eq("version", post.version)
    .select("version")
    .maybeSingle();

  if (!updated) return false;

  await access.supabase.from("post_versions").insert({
    workspace_id: access.workspace.id,
    post_id: post.id,
    version: newVersion,
    snapshot: snapshotFromPost({ ...post, ...patch }),
    created_by: access.user.id,
  });

  await audit(access, "post.media_reset_approval", post.id, {
    fromVersion: post.version,
    toVersion: newVersion,
  });

  return true;
}

export async function savePostAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = postEditSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
    title: stringValue(formData, "title"),
    hook: stringValue(formData, "hook"),
    body: stringValue(formData, "body"),
    caption: stringValue(formData, "caption"),
    hashtags: stringValue(formData, "hashtags"),
    cta: stringValue(formData, "cta"),
    altText: stringValue(formData, "altText"),
    imageBrief: stringValue(formData, "imageBrief"),
    carouselSlides: stringValue(formData, "carouselSlides"),
    pillarId: stringValue(formData, "pillarId"),
    personaId: stringValue(formData, "personaId"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the highlighted fields.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const values = parsed.data;
  const post = await loadPost(auth.access, values.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.status === "publishing" || post.status === "published") {
    return {
      status: "error",
      message:
        "Published content is read-only in this phase. Duplicate it into a new draft instead of editing the published record.",
    };
  }

  if (post.version !== values.expectedVersion) {
    return {
      status: "error",
      message:
        "This post changed in another tab. Reload the page before saving so you do not overwrite newer edits.",
    };
  }

  if (values.pillarId) {
    const { data } = await auth.access.supabase
      .from("content_pillars")
      .select("id")
      .eq("id", values.pillarId)
      .eq("workspace_id", auth.access.workspace.id)
      .maybeSingle();
    if (!data) {
      return { status: "error", message: "The selected pillar no longer exists." };
    }
  }

  if (values.personaId) {
    const { data } = await auth.access.supabase
      .from("audience_personas")
      .select("id")
      .eq("id", values.personaId)
      .eq("workspace_id", auth.access.workspace.id)
      .maybeSingle();
    if (!data) {
      return { status: "error", message: "The selected persona no longer exists." };
    }
  }

  const brain = await getBrandBrain(
    auth.access.supabase,
    auth.access.workspace.id,
  );

  if (brain.status === "ready" && brain.profile) {
    const copy = post.platform === "linkedin" ? values.body : values.caption;
    const findings = checkClaims({
      text: [
        composeFinalCopy({
          hook: values.hook,
          copy,
          cta: values.cta,
          hashtags: values.hashtags,
        }),
        values.carouselSlides.join("\n"),
      ]
        .filter(Boolean)
        .join("\n\n"),
      forbiddenClaims: brain.profile.forbidden_claims,
      proposedClaims: brain.profile.proposed_claims,
      verifiedFacts: brain.profile.verified_facts,
    });

    if (hasClaimBlockers(findings)) {
      return {
        status: "error",
        message: claimBlockMessage(
          findings
            .filter((finding) => finding.level === "blocker")
            .map((finding) => finding.message),
        ),
        fieldErrors: {
          [post.platform === "linkedin" ? "body" : "caption"]: [
            "Remove the forbidden claim before saving.",
          ],
        },
      };
    }
  }

  const unchanged =
    post.title === (values.title || null) &&
    post.hook === (values.hook || null) &&
    post.body === (values.body || null) &&
    post.caption === (values.caption || null) &&
    post.cta === (values.cta || null) &&
    post.alt_text === (values.altText || null) &&
    post.image_brief === (values.imageBrief || null) &&
    post.pillar_id === values.pillarId &&
    post.persona_id === values.personaId &&
    post.hashtags.length === values.hashtags.length &&
    post.hashtags.every((tag, index) => tag === values.hashtags[index]) &&
    JSON.stringify(post.carousel_slides) ===
      JSON.stringify(values.carouselSlides);

  if (unchanged) {
    return { status: "success", message: "No changes to save." };
  }

  const newVersion = post.version + 1;
  const patch = {
    title: values.title || null,
    hook: values.hook || null,
    body: values.body || null,
    caption: values.caption || null,
    hashtags: values.hashtags,
    cta: values.cta || null,
    alt_text: values.altText || null,
    image_brief: values.imageBrief || null,
    carousel_slides: values.carouselSlides,
    pillar_id: values.pillarId,
    persona_id: values.personaId,
    version: newVersion,
    status: "draft" as const,
    approved_version: null,
    approved_at: null,
    approved_by: null,
    scheduled_for: null,
    timezone: auth.access.workspace.timezone,
  };

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update(patch)
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .select("version")
    .maybeSingle();

  if (error) {
    return { status: "error", message: `Could not save the post: ${error.message}` };
  }

  if (!updated) {
    return {
      status: "error",
      message:
        "Another change was saved first. Reload the page and reapply your edit.",
    };
  }

  const { error: versionError } = await auth.access.supabase
    .from("post_versions")
    .insert({
      workspace_id: auth.access.workspace.id,
      post_id: post.id,
      version: newVersion,
      snapshot: snapshotFromPost({ ...post, ...patch }),
      created_by: auth.access.user.id,
    });

  await audit(auth.access, "post.updated", post.id, {
    fromVersion: post.version,
    toVersion: newVersion,
    previousStatus: post.status,
  });

  revalidatePostSurfaces(post.id);

  if (versionError) {
    return {
      status: "error",
      message: `The post was saved, but its version snapshot failed: ${versionError.message}`,
    };
  }

  const resetApproval = post.status !== "draft";

  return {
    status: "success",
    message: resetApproval
      ? `Saved as version ${newVersion}. Approval and scheduling were reset because the copy changed.`
      : `Saved as version ${newVersion}. Submit it for review when you are ready.`,
  };
}

export async function submitForReviewAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = postActionSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The request was invalid. Reload and try again." };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.version !== parsed.data.expectedVersion) {
    return {
      status: "error",
      message: "This post changed in another tab. Reload before submitting it.",
    };
  }

  if (!["draft", "rejected", "in_review"].includes(post.status)) {
    return {
      status: "error",
      message:
        post.status === "approved" || post.status === "scheduled"
          ? "This version is already approved. Edit the copy first if it needs another review."
          : "This post is not in a state that can be submitted for review.",
    };
  }

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update({ status: "in_review" })
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .in("status", ["draft", "rejected", "in_review"])
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Could not submit the post: ${error.message}`
        : "The post changed before it could be submitted. Reload and try again.",
    };
  }

  await audit(auth.access, "post.submitted_for_review", post.id, {
    version: post.version,
  });
  revalidatePostSurfaces(post.id);

  return {
    status: "success",
    message: `Version ${post.version} is pending approval.`,
  };
}

export async function approvePostAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = decisionSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
    note: stringValue(formData, "note"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the approval note.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.version !== parsed.data.expectedVersion) {
    return {
      status: "error",
      message: "This post changed in another tab. Reload before approving it.",
    };
  }

  if (post.status !== "in_review") {
    return {
      status: "error",
      message: "Only a post pending approval can be approved.",
    };
  }

  const { error: decisionError } = await auth.access.supabase
    .from("approvals")
    .insert({
      workspace_id: auth.access.workspace.id,
      post_id: post.id,
      version: post.version,
      decision: "approved",
      note: parsed.data.note || null,
      decided_by: auth.access.user.id,
    });

  if (decisionError) {
    return {
      status: "error",
      message: `Could not record the approval: ${decisionError.message}`,
    };
  }

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update({
      status: "approved",
      approved_version: post.version,
      approved_at: new Date().toISOString(),
      approved_by: auth.access.user.id,
      scheduled_for: null,
      timezone: auth.access.workspace.timezone,
    })
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .eq("status", "in_review")
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Approval was recorded but the post could not be updated: ${error.message}`
        : "The post changed before it could be approved. Reload and check its status.",
    };
  }

  await audit(auth.access, "post.approved", post.id, {
    version: post.version,
    note: parsed.data.note || null,
  });
  revalidatePostSurfaces(post.id);

  return {
    status: "success",
    message: `Version ${post.version} approved. It can now be scheduled, but nothing publishes automatically.`,
  };
}

export async function rejectPostAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = decisionSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
    note: stringValue(formData, "note"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the rejection feedback.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.version !== parsed.data.expectedVersion) {
    return {
      status: "error",
      message: "This post changed in another tab. Reload before rejecting it.",
    };
  }

  if (!["in_review", "approved", "scheduled"].includes(post.status)) {
    return {
      status: "error",
      message: "Only a pending or approved post can be rejected.",
    };
  }

  const { error: decisionError } = await auth.access.supabase
    .from("approvals")
    .insert({
      workspace_id: auth.access.workspace.id,
      post_id: post.id,
      version: post.version,
      decision: "rejected",
      note: parsed.data.note || null,
      decided_by: auth.access.user.id,
    });

  if (decisionError) {
    return {
      status: "error",
      message: `Could not record the rejection: ${decisionError.message}`,
    };
  }

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update({
      status: "rejected",
      approved_version: null,
      approved_at: null,
      approved_by: null,
      scheduled_for: null,
    })
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Rejection was recorded but the post could not be updated: ${error.message}`
        : "The post changed before it could be rejected. Reload and try again.",
    };
  }

  await audit(auth.access, "post.rejected", post.id, {
    version: post.version,
    note: parsed.data.note || null,
  });
  revalidatePostSurfaces(post.id);

  return {
    status: "success",
    message: parsed.data.note
      ? "Rejected. The feedback is saved with this version."
      : "Rejected. Edit the copy and submit a new version.",
  };
}

export async function schedulePostAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = scheduleSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
    scheduledFor: stringValue(formData, "scheduledFor"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Choose a valid date and time.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.version !== parsed.data.expectedVersion) {
    return {
      status: "error",
      message: "This post changed in another tab. Reload before scheduling it.",
    };
  }

  if (post.approved_version !== post.version) {
    return {
      status: "error",
      message: "Only the approved version can be scheduled.",
    };
  }

  if (!["approved", "scheduled"].includes(post.status)) {
    return {
      status: "error",
      message: "Approve this version before assigning a scheduled date.",
    };
  }

  const scheduledFor = zonedDateTimeToUtc(
    parsed.data.scheduledFor,
    auth.access.workspace.timezone,
  );

  if (!scheduledFor) {
    return { status: "error", message: "Choose a valid date and time." };
  }

  if (scheduledFor.getTime() <= Date.now()) {
    return {
      status: "error",
      message: "Choose a future date and time for the planned slot.",
    };
  }

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update({
      status: "scheduled",
      scheduled_for: scheduledFor.toISOString(),
      timezone: auth.access.workspace.timezone,
    })
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .eq("approved_version", post.version)
    .in("status", ["approved", "scheduled"])
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Could not schedule the post: ${error.message}`
        : "The post changed before it could be scheduled. Reload and try again.",
    };
  }

  await audit(auth.access, "post.scheduled", post.id, {
    version: post.version,
    scheduledFor: scheduledFor.toISOString(),
  });
  revalidatePostSurfaces(post.id);

  return {
    status: "success",
    message: `Planned for ${formatDateTime(
      scheduledFor.toISOString(),
      auth.access.workspace.timezone,
    )} (${auth.access.workspace.timezone}). Nothing will be published automatically.`,
  };
}

export async function unschedulePostAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = postActionSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The request was invalid. Reload and try again." };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.status !== "scheduled" || post.approved_version !== post.version) {
    return {
      status: "error",
      message: "This post is not a scheduled, approved version.",
    };
  }

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update({ status: "approved", scheduled_for: null })
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .eq("status", "scheduled")
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Could not clear the schedule: ${error.message}`
        : "The post changed before the schedule could be cleared. Reload and try again.",
    };
  }

  await audit(auth.access, "post.unscheduled", post.id, {
    version: post.version,
  });
  revalidatePostSurfaces(post.id);

  return { status: "success", message: "Schedule cleared. The approved version is kept." };
}

export async function restoreVersionAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = restoreVersionSchema.safeParse({
    postId: stringValue(formData, "postId"),
    expectedVersion: stringValue(formData, "expectedVersion"),
    version: stringValue(formData, "version"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The version request was invalid." };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.status === "publishing" || post.status === "published") {
    return {
      status: "error",
      message: "Published content cannot be rewound in this phase.",
    };
  }

  if (post.version !== parsed.data.expectedVersion) {
    return {
      status: "error",
      message: "This post changed in another tab. Reload before restoring a version.",
    };
  }

  const { data: version, error: versionError } = await auth.access.supabase
    .from("post_versions")
    .select("version, snapshot")
    .eq("workspace_id", auth.access.workspace.id)
    .eq("post_id", post.id)
    .eq("version", parsed.data.version)
    .maybeSingle();

  if (versionError) {
    return {
      status: "error",
      message: `Could not load that version: ${versionError.message}`,
    };
  }

  if (!version) {
    return { status: "error", message: "That version no longer exists." };
  }

  const snapshot = parseSnapshot(version.snapshot);
  if (!snapshot) {
    return {
      status: "error",
      message: "This version snapshot is unreadable and was not restored.",
    };
  }

  const newVersion = post.version + 1;
  const patch = {
    ...editableFieldsFromSnapshot(snapshot),
    version: newVersion,
    status: "draft" as const,
    approved_version: null,
    approved_at: null,
    approved_by: null,
    scheduled_for: null,
    timezone: auth.access.workspace.timezone,
  };

  const { data: updated, error } = await auth.access.supabase
    .from("posts")
    .update(patch)
    .eq("id", post.id)
    .eq("workspace_id", auth.access.workspace.id)
    .eq("version", post.version)
    .select("version")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Could not restore the version: ${error.message}`
        : "Another change was saved first. Reload and try again.",
    };
  }

  await auth.access.supabase.from("post_versions").insert({
    workspace_id: auth.access.workspace.id,
    post_id: post.id,
    version: newVersion,
    snapshot: {
      ...snapshot,
      restored_from: version.version,
    } as Json,
    created_by: auth.access.user.id,
  });

  await audit(auth.access, "post.version_restored", post.id, {
    restoredFrom: version.version,
    newVersion,
  });
  revalidatePostSurfaces(post.id);

  return {
    status: "success",
    message: `Restored version ${version.version} as version ${newVersion}. It is a draft again and needs approval before scheduling.`,
  };
}

type ValidatedMedia =
  | { ok: true; mime: AllowedMediaType; extension: string }
  | { ok: false; error: string };

async function validateMediaFile(file: File): Promise<ValidatedMedia> {
  if (file.size <= 0) {
    return { ok: false, error: "The selected file is empty." };
  }

  if (file.size > MAX_MEDIA_BYTES) {
    return { ok: false, error: "Images must be 10 MB or smaller." };
  }

  if (!ALLOWED_MEDIA_TYPES.includes(file.type as AllowedMediaType)) {
    return {
      ok: false,
      error: "Use a JPEG, PNG or WebP image. Other file types are not accepted.",
    };
  }

  const mime = file.type as AllowedMediaType;
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());

  const isJpeg = head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff;
  const isPng =
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47 &&
    head[4] === 0x0d &&
    head[5] === 0x0a &&
    head[6] === 0x1a &&
    head[7] === 0x0a;
  const isWebp =
    String.fromCharCode(...head.slice(0, 4)) === "RIFF" &&
    String.fromCharCode(...head.slice(8, 12)) === "WEBP";

  const matches =
    (mime === "image/jpeg" && isJpeg) ||
    (mime === "image/png" && isPng) ||
    (mime === "image/webp" && isWebp);

  if (!matches) {
    return {
      ok: false,
      error: "The file contents do not match its image type.",
    };
  }

  return {
    ok: true,
    mime,
    extension: mime === "image/jpeg" ? "jpg" : mime === "image/png" ? "png" : "webp",
  };
}

export async function uploadMediaAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = mediaUploadSchema.safeParse({
    postId: stringValue(formData, "postId"),
    altText: stringValue(formData, "altText"),
    replaceMediaId: stringValue(formData, "replaceMediaId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The upload request was invalid." };
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return { status: "error", message: "Choose an image to upload." };
  }

  const validated = await validateMediaFile(file);
  if (!validated.ok) {
    return { status: "error", message: validated.error };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };

  if (post.status === "publishing" || post.status === "published") {
    return {
      status: "error",
      message: "Published content's media is read-only in this phase.",
    };
  }

  if (!isAdminClientAvailable()) {
    return {
      status: "error",
      message:
        "Image storage requires SUPABASE_SERVICE_ROLE_KEY on the server. Ask the workspace owner to finish setup.",
    };
  }

  let position = 0;
  let replacedPath: string | null = null;
  let replacedId: string | null = null;
  let replacedAltText: string | null = null;

  if (parsed.data.replaceMediaId) {
    const { data: existing } = await auth.access.supabase
      .from("post_media")
      .select("id, position, storage_path, alt_text")
      .eq("id", parsed.data.replaceMediaId)
      .eq("post_id", post.id)
      .eq("workspace_id", auth.access.workspace.id)
      .maybeSingle();

    if (!existing) {
      return { status: "error", message: "That media item no longer exists." };
    }

    position = existing.position;
    replacedPath = existing.storage_path;
    replacedId = existing.id;
    replacedAltText = existing.alt_text;
  } else {
    const { data: existing } = await auth.access.supabase
      .from("post_media")
      .select("id, position")
      .eq("post_id", post.id)
      .eq("workspace_id", auth.access.workspace.id)
      .order("position", { ascending: false });

    if ((existing ?? []).length >= MAX_MEDIA_PER_POST) {
      return {
        status: "error",
        message: `A post can have at most ${MAX_MEDIA_PER_POST} images. Remove one first.`,
      };
    }

    position = (existing?.[0]?.position ?? -1) + 1;
  }

  const admin = createSupabaseAdminClient();
  const storagePath = `${auth.access.workspace.id}/${post.id}/${randomUUID()}.${validated.extension}`;

  const { error: uploadError } = await admin.storage
    .from(MEDIA_BUCKET)
    .upload(storagePath, file, {
      contentType: validated.mime,
      cacheControl: "31536000",
      upsert: false,
    });

  if (uploadError) {
    return {
      status: "error",
      message: `Could not upload the image: ${uploadError.message}`,
    };
  }

  const publicUrl = auth.access.supabase.storage
    .from(MEDIA_BUCKET)
    .getPublicUrl(storagePath).data.publicUrl;

  const row = {
    workspace_id: auth.access.workspace.id,
    post_id: post.id,
    storage_path: storagePath,
    public_url: publicUrl,
    mime_type: validated.mime,
    size_bytes: file.size,
    alt_text: parsed.data.altText || replacedAltText || null,
    position,
  };

  const saveError = replacedId
    ? (
        await auth.access.supabase
          .from("post_media")
          .update(row)
          .eq("id", replacedId)
          .eq("workspace_id", auth.access.workspace.id)
          .select("id")
          .maybeSingle()
      ).error
    : (
        await auth.access.supabase
          .from("post_media")
          .insert(row)
          .select("id")
          .single()
      ).error;

  if (saveError) {
    await admin.storage.from(MEDIA_BUCKET).remove([storagePath]);
    return {
      status: "error",
      message: `The image uploaded but could not be attached: ${saveError.message}`,
    };
  }

  if (replacedPath && replacedPath !== storagePath) {
    await admin.storage.from(MEDIA_BUCKET).remove([replacedPath]);
  }

  const approvalReset = await resetApprovalAfterMediaChange(auth.access, post);

  await audit(
    auth.access,
    replacedId ? "post.media_replaced" : "post.media_uploaded",
    post.id,
    { position, mime: validated.mime, size: file.size, approvalReset },
  );
  revalidatePostSurfaces(post.id);

  return {
    status: "success",
    message: `${
      replacedId ? "Image replaced." : "Image uploaded and attached."
    }${
      approvalReset
        ? " Approval and scheduling were reset; submit the new version for review."
        : ""
    }`,
  };
}

export async function updateMediaAltAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = mediaAltSchema.safeParse({
    postId: stringValue(formData, "postId"),
    mediaId: stringValue(formData, "mediaId"),
    altText: stringValue(formData, "altText"),
  });
  if (!parsed.success) {
    return {
      status: "error",
      message: "Check the alt text.",
      fieldErrors: fieldErrorsFrom(parsed.error),
    };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };
  if (post.status === "publishing" || post.status === "published") {
    return { status: "error", message: "Published content's media is read-only." };
  }

  const { data: updated, error } = await auth.access.supabase
    .from("post_media")
    .update({ alt_text: parsed.data.altText || null })
    .eq("id", parsed.data.mediaId)
    .eq("post_id", parsed.data.postId)
    .eq("workspace_id", auth.access.workspace.id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return {
      status: "error",
      message: error
        ? `Could not save the alt text: ${error.message}`
        : "That media item no longer exists.",
    };
  }

  await audit(auth.access, "post.media_alt_updated", parsed.data.postId, {
    mediaId: parsed.data.mediaId,
  });
  revalidatePostSurfaces(parsed.data.postId);

  return { status: "success", message: "Alt text saved." };
}

export async function removeMediaAction(
  _previous: FormState,
  formData: FormData,
): Promise<FormState> {
  const auth = await authorize();
  if (!auth.ok) return auth.state;

  const parsed = mediaRemoveSchema.safeParse({
    postId: stringValue(formData, "postId"),
    mediaId: stringValue(formData, "mediaId"),
  });
  if (!parsed.success) {
    return { status: "error", message: "The remove request was invalid." };
  }

  const post = await loadPost(auth.access, parsed.data.postId);
  if (!post) return { status: "error", message: "This post no longer exists." };
  if (post.status === "publishing" || post.status === "published") {
    return { status: "error", message: "Published content's media is read-only." };
  }

  const { data: media } = await auth.access.supabase
    .from("post_media")
    .select("id, storage_path")
    .eq("id", parsed.data.mediaId)
    .eq("post_id", parsed.data.postId)
    .eq("workspace_id", auth.access.workspace.id)
    .maybeSingle();

  if (!media) {
    return { status: "error", message: "That media item no longer exists." };
  }

  const { data: deleted, error } = await auth.access.supabase
    .from("post_media")
    .delete()
    .eq("id", media.id)
    .eq("workspace_id", auth.access.workspace.id)
    .select("id")
    .maybeSingle();

  if (error || !deleted) {
    return {
      status: "error",
      message: error
        ? `Could not remove the image: ${error.message}`
        : "That media item could not be removed.",
    };
  }

  if (isAdminClientAvailable()) {
    const admin = createSupabaseAdminClient();
    await admin.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
  }

  const approvalReset = await resetApprovalAfterMediaChange(auth.access, post);

  await audit(auth.access, "post.media_removed", parsed.data.postId, {
    mediaId: media.id,
    approvalReset,
  });
  revalidatePostSurfaces(parsed.data.postId);

  return {
    status: "success",
    message: `Image removed.${
      approvalReset
        ? " Approval and scheduling were reset; submit the new version for review."
        : ""
    }`,
  };
}

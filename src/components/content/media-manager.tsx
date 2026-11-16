"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ImagePlus,
  LoaderCircle,
  RefreshCw,
  Trash2,
} from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import {
  removeMediaAction,
  updateMediaAltAction,
  uploadMediaAction,
} from "@/lib/content/actions";
import type { PostMediaView } from "@/lib/content/types";
import { initialFormState, type FormState } from "@/lib/form-state";

function formatBytes(value: number | null): string {
  if (!value) return "";
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

function Feedback({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  return (
    <Alert variant={state.status === "error" ? "destructive" : "default"}>
      {state.status === "error" ? (
        <AlertTriangle />
      ) : (
        <CheckCircle2 className="text-emerald-600" />
      )}
      <AlertDescription>{state.message}</AlertDescription>
    </Alert>
  );
}

function MediaItem({
  postId,
  media,
  canUpload,
  index,
}: {
  postId: string;
  media: PostMediaView;
  canUpload: boolean;
  index: number;
}) {
  const [replaceState, replaceAction, replacePending] = useActionState(
    uploadMediaAction,
    initialFormState,
  );
  const [altState, altAction, altPending] = useActionState(
    updateMediaAltAction,
    initialFormState,
  );
  const [removeState, removeAction, removePending] = useActionState(
    removeMediaAction,
    initialFormState,
  );

  const replaceForm = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (replaceState.status === "success") replaceForm.current?.reset();
  }, [replaceState]);

  return (
    <div className="space-y-3 rounded-lg border border-border/70 bg-muted/20 p-3">
      <div className="flex gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={media.public_url}
          alt={media.alt_text ?? ""}
          className="size-24 shrink-0 rounded-md border object-cover"
        />
        <div className="min-w-0 flex-1 space-y-1 text-sm">
          <p className="font-medium">Image {index + 1}</p>
          <p className="text-xs text-muted-foreground">
            {media.mime_type}
            {media.size_bytes ? ` · ${formatBytes(media.size_bytes)}` : ""}
            {` · position ${media.position + 1}`}
          </p>
          <p className="break-all text-xs text-muted-foreground">
            {media.alt_text || "No alt text yet"}
          </p>
        </div>
      </div>

      <form action={altAction} className="flex flex-wrap items-end gap-2">
        <input type="hidden" name="postId" value={postId} />
        <input type="hidden" name="mediaId" value={media.id} />
        <FormField
          id={`media-alt-${media.id}`}
          label="Alt text"
          className="min-w-[14rem] flex-1"
          error={altState.fieldErrors?.altText}
        >
          <Input
            id={`media-alt-${media.id}`}
            name="altText"
            defaultValue={media.alt_text ?? ""}
            maxLength={300}
            placeholder="Describe the image"
          />
        </FormField>
        <Button type="submit" variant="outline" size="sm" disabled={altPending}>
          {altPending ? <LoaderCircle className="animate-spin" /> : null}
          {altPending ? "Saving…" : "Save alt text"}
        </Button>
      </form>
      <Feedback state={altState} />

      {canUpload ? (
        <div className="space-y-2 border-t pt-3">
          <form
            ref={replaceForm}
            action={replaceAction}
            encType="multipart/form-data"
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="replaceMediaId" value={media.id} />
            <Input
              type="file"
              name="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="max-w-[16rem]"
              aria-label={`Replacement image for image ${index + 1}`}
            />
            <Button
              type="submit"
              variant="outline"
              size="sm"
              disabled={replacePending}
            >
              {replacePending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <RefreshCw />
              )}
              {replacePending ? "Replacing…" : "Replace image"}
            </Button>
          </form>
          <Feedback state={replaceState} />

          <form action={removeAction}>
            <input type="hidden" name="postId" value={postId} />
            <input type="hidden" name="mediaId" value={media.id} />
            <Button
              type="submit"
              variant="destructive"
              size="sm"
              disabled={removePending}
            >
              {removePending ? (
                <LoaderCircle className="animate-spin" />
              ) : (
                <Trash2 />
              )}
              {removePending ? "Removing…" : "Remove image"}
            </Button>
            <Feedback state={removeState} />
          </form>
        </div>
      ) : null}
    </div>
  );
}

function UploadForm({ postId, canUpload }: { postId: string; canUpload: boolean }) {
  const [state, action, pending] = useActionState(
    uploadMediaAction,
    initialFormState,
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state]);

  if (!canUpload) return null;

  return (
    <form ref={formRef} action={action} className="space-y-2">
      <input type="hidden" name="postId" value={postId} />
      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-end">
        <FormField id="media-file" label="Image file" description="JPEG, PNG or WebP up to 10 MB">
          <Input
            id="media-file"
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp"
            required
          />
        </FormField>
        <FormField id="media-upload-alt" label="Alt text (optional)">
          <Input
            id="media-upload-alt"
            name="altText"
            maxLength={300}
            placeholder="Describe the image"
          />
        </FormField>
        <Button type="submit" disabled={pending}>
          {pending ? <LoaderCircle className="animate-spin" /> : <ImagePlus />}
          {pending ? "Uploading…" : "Upload image"}
        </Button>
      </div>
      <Feedback state={state} />
    </form>
  );
}

export function MediaManager({
  postId,
  media,
  canUpload,
  readOnly = false,
}: {
  postId: string;
  media: PostMediaView[];
  canUpload: boolean;
  readOnly?: boolean;
}) {
  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle className="text-base">Media</CardTitle>
        <CardDescription>
          Images are stored in the existing public <code>post-media</code>{" "}
          bucket. Alt text is saved with each image. Media is not published in
          this phase.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <fieldset disabled={readOnly} className="space-y-4">
        {!canUpload && !readOnly ? (
          <Alert variant="destructive">
            <AlertTriangle />
            <AlertTitle>Image storage is not configured</AlertTitle>
            <AlertDescription>
              Add <code>SUPABASE_SERVICE_ROLE_KEY</code> on the server to upload,
              replace or remove images. Existing previews and alt text still
              work.
            </AlertDescription>
          </Alert>
        ) : null}

        <UploadForm postId={postId} canUpload={canUpload} />

        {media.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No images attached yet.
          </p>
        ) : (
          <div className="space-y-3">
            {media.map((item, index) => (
              <MediaItem
                key={item.id}
                postId={postId}
                media={item}
                canUpload={canUpload}
                index={index}
              />
            ))}
          </div>
        )}
        </fieldset>
      </CardContent>
    </Card>
  );
}

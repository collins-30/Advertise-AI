import type { GeneratedContent } from "@/lib/ai/types";

export function copyForPlatform(
  content: Pick<GeneratedContent, "body" | "caption">,
  platform: "linkedin" | "instagram",
): string {
  return (platform === "linkedin" ? content.body : content.caption) ?? "";
}

export function composeFinalCopy({
  hook,
  copy,
  cta,
  hashtags,
}: {
  hook?: string | null;
  copy?: string | null;
  cta?: string | null;
  hashtags?: string[] | null;
}): string {
  return [
    hook?.trim(),
    copy?.trim(),
    cta?.trim(),
    (hashtags ?? []).join(" ").trim(),
  ]
    .filter((part): part is string => Boolean(part))
    .join("\n\n");
}

export function finalCopyForContent(
  content: GeneratedContent,
  platform: "linkedin" | "instagram",
): string {
  return composeFinalCopy({
    hook: content.hook,
    copy: copyForPlatform(content, platform),
    cta: content.cta,
    hashtags: content.hashtags,
  });
}

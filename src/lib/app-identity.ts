/**
 * Application identity.
 *
 * Advertise-AI is the software. It is the marketing assistant used to market a
 * workspace-owned brand and support pilot acquisition. The promoted brand lives
 * in the Brand Brain (`brand_profiles`, `audience_personas`, `content_pillars`),
 * not here.
 *
 * Keeping these apart matters: generated content must promote the brand in the
 * Brand Brain (currently CloseLoop), never Advertise-AI itself.
 */
export const APP_IDENTITY = {
  name: "Advertise-AI",
  tagline: "AI marketing assistant",
  description:
    "Internal marketing assistant for researching agency prospects, creating CloseLoop content and supporting pilot acquisition.",
  /**
   * The slug is a stable legacy identifier required by the Phase 1/2 migrations
   * and the first-login workspace bootstrap. It is not the promoted brand name.
   */
  workspaceSlug: "closeloop",
} as const;

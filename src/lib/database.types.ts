/**
 * Database types.
 *
 * These are written by hand to keep the repository buildable before a Supabase
 * project exists. Once the project is created, regenerate them with:
 *
 *   npx supabase gen types typescript --project-id <id> --schema public \
 *     > src/lib/database.types.ts
 *
 * `Insert`/`Update` are intentionally partial. Server-side validation via Zod is
 * the source of truth for required fields.
 */

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

type Table<Row> = {
  Row: Row;
  Insert: Partial<Row>;
  Update: Partial<Row>;
  Relationships: [];
};

export type WorkspaceRow = {
  id: string;
  name: string;
  slug: string;
  timezone: string;
  daily_publish_cap: number;
  auto_publish: boolean;
  created_at: string;
  updated_at: string;
};

export type WorkspaceMemberRow = {
  workspace_id: string;
  user_id: string;
  role: "owner" | "admin" | "member";
  created_at: string;
};

export type BrandProfileRow = {
  id: string;
  workspace_id: string;
  company_name: string;
  one_liner: string | null;
  description: string | null;
  website_url: string | null;
  positioning: string | null;
  target_market: string | null;
  value_props: string[];
  proof_points: string[];
  verified_facts: string[];
  proposed_claims: string[];
  claim_notes: string | null;
  forbidden_claims: string[];
  tone_keywords: string[];
  emoji_policy: "none" | "sparing" | "free";
  hashtag_policy: string | null;
  primary_cta: string | null;
  booking_url: string | null;
  posting_cadence: Json;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type BrandWritingSampleRow = {
  id: string;
  workspace_id: string;
  platform: string | null;
  title: string | null;
  content: string;
  notes: string | null;
  created_at: string;
};

export type AudiencePersonaRow = {
  id: string;
  workspace_id: string;
  name: string;
  role: string | null;
  company_type: string | null;
  company_size: string | null;
  pain_points: string[];
  desires: string[];
  objections: string[];
  watering_holes: string[];
  buying_triggers: string[];
  is_primary: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ContentPillarRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  percentage: number | null;
  example_topics: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type ContentIdeaRow = {
  id: string;
  workspace_id: string;
  title: string;
  angle: string | null;
  status: "idea" | "approved" | "used" | "archived";
  pillar_id: string | null;
  persona_id: string | null;
  score: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PostStatus =
  | "draft"
  | "in_review"
  | "approved"
  | "scheduled"
  | "publishing"
  | "published"
  | "failed"
  | "needs_reauth"
  | "rejected"
  | "archived";

export type PostRow = {
  id: string;
  workspace_id: string;
  platform: "instagram" | "linkedin";
  format: "single_image" | "carousel" | "text";
  status: PostStatus;
  title: string | null;
  hook: string | null;
  body: string | null;
  caption: string | null;
  hashtags: string[];
  cta: string | null;
  alt_text: string | null;
  image_brief: string | null;
  carousel_slides: Json;
  generation_id: string | null;
  pillar_id: string | null;
  persona_id: string | null;
  source: "ai" | "manual";
  version: number;
  approved_version: number | null;
  approved_at: string | null;
  approved_by: string | null;
  scheduled_for: string | null;
  timezone: string;
  published_at: string | null;
  external_post_id: string | null;
  idempotency_key: string;
  last_error_code: string | null;
  last_error_message: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type PostVersionRow = {
  id: string;
  workspace_id: string;
  post_id: string;
  version: number;
  snapshot: Json;
  created_by: string | null;
  created_at: string;
};

export type PostMediaRow = {
  id: string;
  workspace_id: string;
  post_id: string;
  storage_path: string;
  public_url: string;
  mime_type: string;
  width: number | null;
  height: number | null;
  size_bytes: number | null;
  alt_text: string | null;
  position: number;
  created_at: string;
};

export type ApprovalRow = {
  id: string;
  workspace_id: string;
  post_id: string;
  version: number;
  decision: "approved" | "rejected";
  note: string | null;
  decided_by: string | null;
  created_at: string;
};

export type SocialAccountStatus =
  | "connected"
  | "connected_limited"
  | "needs_reauth"
  | "error"
  | "revoked"
  | "disconnected";

export type SocialAccountRow = {
  id: string;
  workspace_id: string;
  platform: "instagram" | "linkedin";
  external_account_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  account_type: string | null;
  status: SocialAccountStatus;
  token_expires_at: string | null;
  granted_scopes: string[];
  required_scopes: string[];
  missing_scopes: string[];
  publish_capable: boolean;
  capability_checked_at: string | null;
  last_verified_at: string | null;
  last_error_code: string | null;
  last_error_message: string | null;
  metadata: Json;
  connected_at: string | null;
  disconnected_at: string | null;
  created_at: string;
  updated_at: string;
};

export type SocialAccountSecretRow = {
  social_account_id: string;
  workspace_id: string;
  access_token_ciphertext: string;
  refresh_token_ciphertext: string | null;
  key_version: number;
  updated_at: string;
};

export type OAuthStateRow = {
  id: string;
  workspace_id: string;
  user_id: string;
  platform: "instagram" | "linkedin";
  state_hash: string;
  mode: "connect" | "reconnect";
  redirect_after: string | null;
  expires_at: string;
  used_at: string | null;
  created_at: string;
};

export type PublishAttemptRow = {
  id: string;
  workspace_id: string;
  post_id: string;
  social_account_id: string | null;
  attempt_number: number;
  status: "pending" | "succeeded" | "failed" | "skipped";
  request_payload: Json | null;
  response_payload: Json | null;
  external_post_id: string | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
  created_at: string;
};

export type PostMetricRow = {
  id: string;
  workspace_id: string;
  post_id: string;
  platform: "instagram" | "linkedin";
  metric_date: string;
  impressions: number | null;
  reach: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  clicks: number | null;
  raw: Json;
  captured_at: string;
};

export type IcpProfileRow = {
  id: string;
  workspace_id: string;
  name: string;
  description: string | null;
  agency_size: string | null;
  services: string[];
  niches: string[];
  signals: string[];
  disqualifiers: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type LeadStage =
  | "identified"
  | "researching"
  | "qualified"
  | "contacted"
  | "replied"
  | "call_booked"
  | "interviewed"
  | "demo"
  | "pilot"
  | "customer"
  | "not_fit"
  | "archived";

export type LeadRow = {
  id: string;
  workspace_id: string;
  agency_name: string;
  contact_name: string | null;
  role: string | null;
  website: string | null;
  email: string | null;
  linkedin_url: string | null;
  instagram_url: string | null;
  city: string | null;
  country: string | null;
  source: string | null;
  stage: LeadStage;
  fit_score: number | null;
  willingness_to_pay: "unknown" | "no" | "maybe" | "yes" | null;
  notes: string | null;
  next_action_at: string | null;
  last_contacted_at: string | null;
  created_at: string;
  updated_at: string;
};

export type LeadResearchRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  summary: string | null;
  pain_signals: string[];
  opportunities: string[];
  personalization_hooks: string[];
  sources: Json;
  created_at: string;
};

export type LeadActivityRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  type:
    | "note"
    | "outreach_sent"
    | "reply"
    | "call"
    | "interview"
    | "demo"
    | "pilot_start"
    | "feedback";
  channel: string | null;
  summary: string | null;
  occurred_at: string;
  created_at: string;
};

export type OutreachDraftRow = {
  id: string;
  workspace_id: string;
  lead_id: string;
  channel: "email" | "linkedin" | "instagram_dm";
  subject: string | null;
  body: string;
  status: "draft" | "approved" | "sent" | "discarded";
  version: number;
  approved_version: number | null;
  approved_by: string | null;
  approved_at: string | null;
  sent_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AiGenerationRow = {
  id: string;
  workspace_id: string;
  kind: "content" | "outreach" | "research";
  model: string;
  prompt_version: string | null;
  input: Json;
  output: Json | null;
  tokens_input: number | null;
  tokens_output: number | null;
  cost_usd: number | null;
  status: "pending" | "succeeded" | "failed";
  error: string | null;
  created_by: string | null;
  created_at: string;
};

export type AuditLogRow = {
  id: string;
  workspace_id: string;
  actor_id: string | null;
  action: string;
  entity_type: string;
  entity_id: string | null;
  metadata: Json;
  ip: string | null;
  user_agent: string | null;
  created_at: string;
};

export type Database = {
  public: {
    Tables: {
      workspaces: Table<WorkspaceRow>;
      workspace_members: Table<WorkspaceMemberRow>;
      brand_profiles: Table<BrandProfileRow>;
      brand_writing_samples: Table<BrandWritingSampleRow>;
      audience_personas: Table<AudiencePersonaRow>;
      content_pillars: Table<ContentPillarRow>;
      content_ideas: Table<ContentIdeaRow>;
      posts: Table<PostRow>;
      post_versions: Table<PostVersionRow>;
      post_media: Table<PostMediaRow>;
      approvals: Table<ApprovalRow>;
      social_accounts: Table<SocialAccountRow>;
      social_account_secrets: Table<SocialAccountSecretRow>;
      oauth_states: Table<OAuthStateRow>;
      publish_attempts: Table<PublishAttemptRow>;
      post_metrics: Table<PostMetricRow>;
      icp_profiles: Table<IcpProfileRow>;
      leads: Table<LeadRow>;
      lead_research: Table<LeadResearchRow>;
      lead_activities: Table<LeadActivityRow>;
      outreach_drafts: Table<OutreachDraftRow>;
      ai_generations: Table<AiGenerationRow>;
      audit_log: Table<AuditLogRow>;
    };
    Views: Record<string, never>;
    Functions: {
      is_workspace_member: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
      is_workspace_admin: {
        Args: { target_workspace_id: string };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

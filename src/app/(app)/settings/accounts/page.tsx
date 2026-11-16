import type { Metadata } from "next";

import { PhasePlaceholder } from "@/components/app/phase-placeholder";

export const metadata: Metadata = { title: "Connected accounts" };

export default function AccountsSettingsPage() {
  return (
    <PhasePlaceholder
      title="Connected accounts"
      phase="Phase 4"
      description="Official OAuth connections for Instagram and LinkedIn, with verified publishing capability."
      planned={[
        "Connect Instagram through Instagram Login, requesting publish permission explicitly.",
        "Verify the account is a professional account and that publishing was actually granted.",
        "Connect LinkedIn through OIDC plus Share on LinkedIn.",
        "Show account card with avatar, username, granted scopes and token expiry.",
        "Reconnect, disconnect and test-connection actions.",
        "Clear 'connected but limited' state instead of pretending publishing works.",
      ]}
    />
  );
}

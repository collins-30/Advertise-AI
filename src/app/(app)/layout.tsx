import { redirect } from "next/navigation";
import { connection } from "next/server";

import { AccessDenied } from "@/components/app/access-denied";
import { AppShell } from "@/components/app/app-shell";
import { SetupRequired } from "@/components/app/setup-required";
import { getWorkspaceAccess } from "@/lib/auth/context";
import { isAdminClientAvailable } from "@/lib/supabase/admin";

// Entering the authenticated shell is a real auth gate: the layout must know
// whether to redirect, show setup, or render the shell. Internal navigations do
// not re-render this layout; page content streams behind each page's Suspense
// boundary, so only entering the app from outside may block.
export const instant = false;

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  await connection();

  const access = await getWorkspaceAccess();

  if (access.status === "unconfigured") {
    return (
      <SetupRequired
        missing={access.missing}
        serviceRoleConfigured={isAdminClientAvailable()}
      />
    );
  }

  if (access.status === "unauthenticated") {
    redirect("/login");
  }

  if (access.status === "forbidden") {
    return <AccessDenied message={access.message} />;
  }

  return (
    <AppShell
      email={access.user.email ?? "unknown@user"}
      workspaceName={access.workspace.name}
    >
      {children}
    </AppShell>
  );
}

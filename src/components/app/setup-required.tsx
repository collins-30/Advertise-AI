import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const ENV_ITEMS = [
  {
    key: "NEXT_PUBLIC_SUPABASE_URL",
    description: "Supabase project URL (Settings → API).",
  },
  {
    key: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    description: "Supabase anon/publishable key. Safe for the browser.",
  },
  {
    key: "SUPABASE_SERVICE_ROLE_KEY",
    description:
      "Service-role key. Server only — used for workspace bootstrap and token storage.",
  },
];

export function SetupRequired({
  missing,
  serviceRoleConfigured,
}: {
  missing: string[];
  serviceRoleConfigured: boolean;
}) {
  return (
    <div className="flex min-h-svh items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl space-y-6">
        <Logo href={null} />
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Connect Supabase to finish setup
          </h1>
          <p className="text-sm text-muted-foreground">
            The workspace runs, but it has no database or auth provider yet.
            Add the environment variables below to{" "}
            <code className="rounded bg-muted px-1 py-0.5 text-xs">
              .env.local
            </code>{" "}
            and restart the dev server.
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Required configuration</CardTitle>
            <CardDescription>
              Values are read server-side and never sent to the browser, except
              the two public keys Supabase requires.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ENV_ITEMS.map((item) => {
              const isMissing =
                missing.includes(item.key) ||
                (item.key === "SUPABASE_SERVICE_ROLE_KEY" &&
                  !serviceRoleConfigured);

              return (
                <div
                  key={item.key}
                  className="flex items-start justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <code className="text-xs font-medium">{item.key}</code>
                    <p className="text-xs text-muted-foreground">
                      {item.description}
                    </p>
                  </div>
                  <Badge variant={isMissing ? "destructive" : "secondary"}>
                    {isMissing ? "Missing" : "Set"}
                  </Badge>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <div className="flex flex-wrap gap-2">
          <ButtonLink href="/setup">Open setup guide</ButtonLink>
          <ButtonLink variant="outline" href="/login">
            Go to sign in
          </ButtonLink>
        </div>
      </div>
    </div>
  );
}

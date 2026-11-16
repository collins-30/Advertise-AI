import { Logo } from "@/components/brand/logo";
import { ButtonLink } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-svh items-center justify-center px-4">
      <div className="w-full max-w-md space-y-6 text-center">
        <Logo href={null} className="justify-center" />
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            404
          </p>
          <h1 className="text-2xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            That route does not exist or has moved.
          </p>
        </div>
        <ButtonLink href="/">Back to overview</ButtonLink>
      </div>
    </div>
  );
}

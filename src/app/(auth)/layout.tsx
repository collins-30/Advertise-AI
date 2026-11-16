import { Logo } from "@/components/brand/logo";
import { APP_IDENTITY } from "@/lib/app-identity";

const POINTS = [
  "Research agency prospects for CloseLoop's first pilots.",
  "Draft CloseLoop marketing content from the workspace Brand Brain.",
  "Check every claim before a draft can be saved.",
];

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between bg-primary p-10 text-primary-foreground lg:flex">
        <Logo href={null} className="[&>span:last-child]:text-primary-foreground" />
        <div className="max-w-sm space-y-4">
          <h1 className="text-3xl font-semibold leading-tight tracking-tight">
            Marketing that helps CloseLoop win its first pilots.
          </h1>
          <ul className="space-y-2 text-sm text-primary-foreground/75">
            {POINTS.map((point) => (
              <li key={point} className="flex gap-2">
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary-foreground/60" />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-primary-foreground/60">
          Internal workspace · {APP_IDENTITY.name}
        </p>
      </div>
      <div className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 lg:hidden">
            <Logo href={null} />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}

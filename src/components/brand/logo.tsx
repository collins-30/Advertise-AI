import Link from "next/link";

import { APP_IDENTITY } from "@/lib/app-identity";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  showWordmark = true,
}: {
  className?: string;
  href?: string | null;
  showWordmark?: boolean;
}) {
  const content = (
    <span
      className={cn(
        "inline-flex items-center gap-2.5 font-semibold tracking-tight",
        className,
      )}
    >
      <span
        aria-hidden
        className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="size-4"
        >
          <path d="M18.178 8c5.096 0 5.096 8 0 8-5.095 0-7.133-8-12.739-8-4.585 0-4.585 8 0 8 5.606 0 7.644-8 12.74-8z" />
        </svg>
      </span>
      {showWordmark ? <span>{APP_IDENTITY.name}</span> : null}
    </span>
  );

  if (!href) return content;

  return (
    <Link href={href} className="rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-ring">
      {content}
    </Link>
  );
}

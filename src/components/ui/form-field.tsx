import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function FormField({
  id,
  label,
  description,
  error,
  children,
  className,
}: {
  id: string;
  label: string;
  description?: string;
  error?: string[];
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <Label htmlFor={id}>{label}</Label>
        {description ? (
          <span className="text-xs text-muted-foreground">{description}</span>
        ) : null}
      </div>
      {children}
      {error?.[0] ? (
        <p className="text-xs text-destructive">{error[0]}</p>
      ) : null}
    </div>
  );
}

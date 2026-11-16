import Link from "next/link";
import { ArrowRight, Circle, CircleCheck } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export type ChecklistItem = {
  id: string;
  title: string;
  description: string;
  href: string;
  cta: string;
  done: boolean;
};

export function SetupChecklist({ items }: { items: ChecklistItem[] }) {
  const completed = items.filter((item) => item.done).length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-base">Workspace setup</CardTitle>
            <CardDescription>
              Finish these steps to make the assistant genuinely useful.
            </CardDescription>
          </div>
          <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">
            {completed} of {items.length}
          </span>
        </div>
      </CardHeader>
      <CardContent className="divide-y">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 py-3 first:pt-0 last:pb-0"
          >
            {item.done ? (
              <CircleCheck className="mt-0.5 size-4 shrink-0 text-emerald-600" />
            ) : (
              <Circle className="mt-0.5 size-4 shrink-0 text-muted-foreground/50" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{item.title}</p>
              <p className="text-xs text-muted-foreground">{item.description}</p>
            </div>
            {!item.done ? (
              <Link
                href={item.href}
                className="mt-0.5 inline-flex shrink-0 items-center gap-1 text-xs font-medium text-foreground underline-offset-4 hover:underline"
              >
                {item.cta}
                <ArrowRight className="size-3" />
              </Link>
            ) : null}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

import { CircleDot } from "lucide-react";

import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

/**
 * Explicit placeholder for a feature that has not been implemented yet.
 * It never pretends to be functional and never shows fabricated data.
 */
export function PhasePlaceholder({
  title,
  description,
  phase,
  planned,
}: {
  title: string;
  description: string;
  phase: string;
  planned: string[];
}) {
  return (
    <div className="space-y-6">
      <PageHeader
        title={title}
        description={description}
        eyebrow="Not built yet"
        actions={<Badge variant="outline">{phase}</Badge>}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planned in {phase}</CardTitle>
          <CardDescription>
            This route exists so navigation is complete. Nothing on this page is
            connected to an API or database yet, and no sample data is shown.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2.5 text-sm">
            {planned.map((item) => (
              <li key={item} className="flex gap-2.5">
                <CircleDot className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}

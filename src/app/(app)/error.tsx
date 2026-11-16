"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();

  useEffect(() => {
    // Server-side details are logged there; this keeps a client trail in dev.
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4">
      <Alert variant="destructive">
        <AlertTitle>Something went wrong</AlertTitle>
        <AlertDescription>
          <p>
            The page could not be loaded. This is usually a temporary database or
            network problem.
          </p>
          {error.digest ? (
            <p className="mt-2 text-xs opacity-80">Reference: {error.digest}</p>
          ) : null}
        </AlertDescription>
      </Alert>
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" onClick={() => router.push("/")}>
          Back to overview
        </Button>
      </div>
    </div>
  );
}

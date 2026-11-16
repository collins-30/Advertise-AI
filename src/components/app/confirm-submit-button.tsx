"use client";

import { Button } from "@/components/ui/button";

export function ConfirmSubmitButton({
  children,
  message,
}: {
  children: React.ReactNode;
  message: string;
}) {
  return (
    <Button
      type="submit"
      variant="ghost"
      size="sm"
      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
      onClick={(event) => {
        if (!window.confirm(message)) {
          event.preventDefault();
        }
      }}
    >
      {children}
    </Button>
  );
}

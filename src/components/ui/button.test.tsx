// @vitest-environment jsdom

import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import type { ComponentProps, ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { Button, ButtonLink } from "@/components/ui/button";

vi.mock("next/link", () => ({
  default: ({
    href,
    children,
    ...props
  }: Omit<ComponentProps<"a">, "href"> & {
    href: string | { pathname?: string };
    children: ReactNode;
  }) => (
    <a href={typeof href === "string" ? href : (href.pathname ?? "")} {...props}>
      {children}
    </a>
  ),
}));

describe("Button", () => {
  it("renders a native button for actions", () => {
    render(<Button type="submit">Save</Button>);

    const button = screen.getByRole("button", { name: "Save" });
    expect(button.tagName).toBe("BUTTON");
    expect(button).toHaveAttribute("type", "submit");
  });

  it("derives nativeButton=false for a non-button render target", () => {
    render(
      <Button render={<span />}>
        Action
      </Button>,
    );

    // A non-native render target gets button semantics instead of a native type.
    const button = screen.getByRole("button", { name: "Action" });
    expect(button.tagName).toBe("SPAN");
    expect(button).not.toHaveAttribute("type");
  });
});

describe("ButtonLink", () => {
  it("renders a real anchor with button styling and link semantics", () => {
    render(<ButtonLink href="/generate">Generate</ButtonLink>);

    const link = screen.getByRole("link", { name: "Generate" });
    expect(link.tagName).toBe("A");
    expect(link).toHaveAttribute("href", "/generate");
    expect(link).not.toHaveAttribute("role", "button");
    expect(link.className).toContain("inline-flex");
  });

  it("keeps variant and size classes", () => {
    render(
      <ButtonLink href="/posts" variant="outline" size="sm">
        View all
      </ButtonLink>,
    );

    const link = screen.getByRole("link", { name: "View all" });
    expect(link.className).toContain("border-border");
    expect(link.className).toContain("h-7");
  });
});

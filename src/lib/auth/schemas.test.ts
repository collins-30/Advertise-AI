import { describe, expect, it } from "vitest";

import {
  magicLinkSchema,
  signInSchema,
  signUpSchema,
} from "@/lib/auth/schemas";

describe("signInSchema", () => {
  it("accepts a valid email and password", () => {
    const result = signInSchema.safeParse({
      email: "owner@closeloop.test",
      password: "correct-horse",
    });

    expect(result.success).toBe(true);
  });

  it("trims surrounding whitespace from the email", () => {
    const result = signInSchema.safeParse({
      email: "  owner@closeloop.test  ",
      password: "correct-horse",
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe("owner@closeloop.test");
    }
  });

  it("rejects invalid emails", () => {
    const result = signInSchema.safeParse({
      email: "not-an-email",
      password: "correct-horse",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0]?.path).toEqual(["email"]);
    }
  });

  it("requires a password", () => {
    const result = signInSchema.safeParse({
      email: "owner@closeloop.test",
      password: "",
    });

    expect(result.success).toBe(false);
  });
});

describe("signUpSchema", () => {
  const valid = {
    email: "owner@closeloop.test",
    password: "long-enough-password",
    confirmPassword: "long-enough-password",
  };

  it("accepts matching passwords", () => {
    expect(signUpSchema.safeParse(valid).success).toBe(true);
  });

  it("rejects passwords under eight characters", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      password: "short",
      confirmPassword: "short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map((issue) => issue.path[0]);
      expect(paths).toContain("password");
    }
  });

  it("rejects a mismatch and points at confirmPassword", () => {
    const result = signUpSchema.safeParse({
      ...valid,
      confirmPassword: "different-password",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const mismatch = result.error.issues.find(
        (issue) => issue.path[0] === "confirmPassword",
      );
      expect(mismatch?.message).toBe("Passwords do not match");
    }
  });
});

describe("magicLinkSchema", () => {
  it("requires an email", () => {
    expect(magicLinkSchema.safeParse({ email: "" }).success).toBe(false);
    expect(
      magicLinkSchema.safeParse({ email: "owner@closeloop.test" }).success,
    ).toBe(true);
  });
});

export type AuthFormStatus = "idle" | "error" | "success";

export type AuthFormState = {
  status: AuthFormStatus;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export const initialAuthState: AuthFormState = { status: "idle" };

export type AuthMode = "password" | "magic-link";

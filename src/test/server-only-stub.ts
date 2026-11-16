// Test-only stand-in for the `server-only` package, which throws when imported
// outside a React Server Component environment. Vitest runs in plain Node, so
// the guard is aliased to this empty module in vitest.config.mts.
export {};

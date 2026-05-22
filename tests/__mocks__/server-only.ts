// Mock for server-only package in test environment.
// In production Next.js, this package throws if imported on the client side.
// In tests (Vitest/Node), we simply export nothing — the guard is a no-op.
export {};

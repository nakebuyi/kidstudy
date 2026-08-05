import { afterEach, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";

// Load .env into process.env for tests (e.g. JWT_SECRET, DATABASE_URL).
// dotenv does not override already-set variables, so CI/env-injected vars win.
import { config } from "dotenv";
config();

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
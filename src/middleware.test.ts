import { describe, it, expect, vi, beforeEach } from "vitest";
import type { NextRequest } from "next/server";

// Mock next/server before middleware imports
vi.mock("next/server", () => {
  const redirect = vi.fn((url: string | URL) => ({
    type: "redirect",
    url: String(url),
  }));
  const next = vi.fn(() => ({ type: "next" }));
  return {
    NextResponse: { redirect, next },
    next,
    redirect,
  };
});

// Mock @/lib/auth — auth() wraps a callback; we make it return the raw callback
vi.mock("@/lib/auth", () => ({
  auth: vi.fn((cb: (req: unknown) => unknown) => cb),
}));

// Import middleware AFTER mocks
import middleware from "./middleware";

beforeEach(() => {
  vi.clearAllMocks();
});

function mockReq(overrides: Record<string, unknown>): NextRequest {
  return overrides as unknown as NextRequest;
}

describe("middleware wiring", () => {
  it("redirects unauthenticated user to /login", async () => {
    const req = mockReq({
      auth: null,
      nextUrl: { pathname: "/parent" },
      url: "https://example.com/parent",
    });

    const result = (await middleware(req, null as never)) as { type: string; url: string };
    expect(result.type).toBe("redirect");
    expect(result.url).toContain("/login");
  });

  it("redirects logged-in parent on /dashboard to /parent", async () => {
    const req = mockReq({
      auth: { user: { id: "p1" }, role: "parent" },
      nextUrl: { pathname: "/dashboard" },
      url: "https://example.com/dashboard",
    });

    const result = (await middleware(req, null as never)) as { type: string; url: string };
    expect(result.type).toBe("redirect");
    expect(result.url).toContain("/parent");
  });

  it("allows child on /dashboard", async () => {
    const req = mockReq({
      auth: { user: { id: "c1" }, role: "child" },
      nextUrl: { pathname: "/dashboard" },
      url: "https://example.com/dashboard",
    });

    const result = (await middleware(req, null as never)) as { type: string; url: string };
    expect(result.type).toBe("next");
  });
});
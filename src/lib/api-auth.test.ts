import { describe, it, expect } from "vitest";
import { getUserFromRequest } from "./api-auth";
import { signToken } from "./jwt";
import { NextRequest } from "next/server";

describe("getUserFromRequest", () => {
  it("returns user for valid Bearer token", async () => {
    const token = await signToken({ userId: "user-1", role: "PARENT" });
    const req = new NextRequest("http://localhost/api/children", {
      headers: { Authorization: `Bearer ${token}` },
    });
    const user = await getUserFromRequest(req);
    expect(user).not.toBeNull();
    expect(user!.userId).toBe("user-1");
    expect(user!.role).toBe("PARENT");
  });

  it("returns null when no Authorization header", async () => {
    const req = new NextRequest("http://localhost/api/children");
    const user = await getUserFromRequest(req);
    expect(user).toBeNull();
  });

  it("returns null for invalid token", async () => {
    const req = new NextRequest("http://localhost/api/children", {
      headers: { Authorization: "Bearer invalid.token" },
    });
    const user = await getUserFromRequest(req);
    expect(user).toBeNull();
  });
});

import { describe, it, expect } from "vitest";
import { getUserFromRequest, sessionFromRequest } from "./api-auth";
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

describe("sessionFromRequest", () => {
  function reqWithHeaders(headers: Record<string, string>): Request {
    return new Request("http://localhost/api/children", { headers });
  }

  it("returns null when x-user-id is missing", () => {
    expect(sessionFromRequest(reqWithHeaders({ "x-user-role": "PARENT" }))).toBeNull();
  });

  it("returns null when no auth headers are present", () => {
    expect(sessionFromRequest(reqWithHeaders({}))).toBeNull();
  });

  it("builds a parent session with lowercased role and null currentChildId", () => {
    const session = sessionFromRequest(
      reqWithHeaders({ "x-user-id": "p1", "x-user-role": "PARENT" })
    );
    expect(session).not.toBeNull();
    expect(session!.user.id).toBe("p1");
    expect(session!.role).toBe("parent");
    expect(session!.currentChildId).toBeNull();
  });

  it("builds a child session with currentChildId set to userId", () => {
    const session = sessionFromRequest(
      reqWithHeaders({ "x-user-id": "c1", "x-user-role": "CHILD" })
    );
    expect(session).not.toBeNull();
    expect(session!.user.id).toBe("c1");
    expect(session!.role).toBe("child");
    expect(session!.currentChildId).toBe("c1");
  });

  it("normalizes lowercase role values too", () => {
    const session = sessionFromRequest(
      reqWithHeaders({ "x-user-id": "p1", "x-user-role": "parent" })
    );
    expect(session!.role).toBe("parent");
    expect(session!.currentChildId).toBeNull();
  });

  it("defaults role to empty string when x-user-role is absent", () => {
    const session = sessionFromRequest(reqWithHeaders({ "x-user-id": "p1" }));
    expect(session!.role).toBe("");
    expect(session!.currentChildId).toBeNull();
  });
});

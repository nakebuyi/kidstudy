import { describe, it, expect } from "vitest";
import { signToken, verifyToken } from "./jwt";

describe("signToken", () => {
  it("returns a string token", async () => {
    const token = await signToken({ userId: "user-1", role: "PARENT" });
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT has 3 parts
  });
});

describe("verifyToken", () => {
  it("returns payload for a valid token", async () => {
    const token = await signToken({ userId: "user-1", role: "PARENT" });
    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload!.userId).toBe("user-1");
    expect(payload!.role).toBe("PARENT");
  });

  it("returns null for an invalid token", async () => {
    const payload = await verifyToken("invalid.token.here");
    expect(payload).toBeNull();
  });

  it("returns null for an expired token", async () => {
    // Use a token with exp in the past
    const payload = await verifyToken(
      "eyJhbGciOiJIUzI1NiJ9.eyJ1c2VySWQiOiJ0ZXN0Iiwicm9sZSI6IlBBUkVOVCIsImV4cCI6MX0.abc"
    );
    expect(payload).toBeNull();
  });
});

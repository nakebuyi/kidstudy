import { describe, it, expect, beforeAll } from "vitest";
import { login, register } from "./auth";
import { prisma } from "./prisma";
import bcrypt from "bcryptjs";

beforeAll(async () => {
  // Clean up test user
  await prisma.parent.deleteMany({ where: { username: "testauthuser" } });
});

describe("register", () => {
  it("creates a new parent and returns success", async () => {
    const result = await register("testauthuser", "password123", "测试");
    expect(result.success).toBe(true);
  });

  it("rejects duplicate username", async () => {
    const result = await register("testauthuser", "password123");
    expect(result.success).toBe(false);
    expect(result.error).toContain("已被注册");
  });
});

describe("login", () => {
  it("returns token and user for valid credentials", async () => {
    const result = await login("testauthuser", "password123");
    expect(result).not.toBeNull();
    expect(result!.token).toBeTruthy();
    expect(result!.user.username).toBe("testauthuser");
    expect(result!.user.role).toBe("PARENT");
  });

  it("returns null for wrong password", async () => {
    const result = await login("testauthuser", "wrongpassword");
    expect(result).toBeNull();
  });

  it("returns null for nonexistent user", async () => {
    const result = await login("noone", "password123");
    expect(result).toBeNull();
  });
});

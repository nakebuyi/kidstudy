import { describe, it, expect, vi, beforeEach } from "vitest";
import { getAuthorizedChild } from "./child-access";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: { findUnique: vi.fn(), findFirst: vi.fn(), update: vi.fn() },
    checkInRecord: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    checkInTask: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import type { Mock } from "vitest";

const child = prisma.child as unknown as {
  findUnique: Mock;
  findFirst: Mock;
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("getAuthorizedChild", () => {
  it("returns null for null session", async () => {
    expect(await getAuthorizedChild(null, "c1")).toBeNull();
    expect(child.findFirst).not.toHaveBeenCalled();
    expect(child.findUnique).not.toHaveBeenCalled();
  });

  it("returns null when session has no user.id", async () => {
    expect(await getAuthorizedChild({ user: {} }, "c1")).toBeNull();
    expect(child.findFirst).not.toHaveBeenCalled();
  });

  it("returns null for child session with mismatched currentChildId", async () => {
    const session = {
      user: { id: "account-1" },
      role: "child",
      currentChildId: "c2",
    };
    expect(await getAuthorizedChild(session, "c1")).toBeNull();
    expect(child.findUnique).not.toHaveBeenCalled();
  });

  it("calls findUnique for child session with matching currentChildId", async () => {
    const session = {
      user: { id: "account-1" },
      role: "child",
      currentChildId: "c1",
    };
    const expected = { id: "c1", name: "小明" };
    child.findUnique.mockResolvedValue(expected);

    const result = await getAuthorizedChild(session, "c1");
    expect(result).toBe(expected);
    expect(child.findUnique).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });

  it("calls findFirst with parentId for parent (no role) session", async () => {
    const session = {
      user: { id: "parent-1" },
    };
    const expected = { id: "c1", name: "小明", parentId: "parent-1" };
    child.findFirst.mockResolvedValue(expected);

    const result = await getAuthorizedChild(session, "c1");
    expect(result).toBe(expected);
    expect(child.findFirst).toHaveBeenCalledWith({
      where: { id: "c1", parentId: "parent-1" },
    });
  });
});
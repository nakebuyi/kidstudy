/// <vitest-environment node>

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

// Mock auth
const mockAuth = vi.fn();
vi.mock("@/lib/auth", () => ({
  auth: () => mockAuth(),
}));

// Mock prisma
const mockChildFindFirst = vi.fn();
const mockChildDelete = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: {
      findFirst: (...args: unknown[]) => mockChildFindFirst(...args),
      delete: (...args: unknown[]) => mockChildDelete(...args),
    },
  },
}));

function deleteReq(childId: string): Request {
  return new Request(`http://localhost/api/children/${childId}`, {
    method: "DELETE",
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("DELETE /api/children/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    mockAuth.mockResolvedValue(null);
    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
    expect(mockChildFindFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when role is child", async () => {
    mockAuth.mockResolvedValue({ user: { id: "a1" }, role: "child" });
    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when child does not exist", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue(null);
    const res = await DELETE(deleteReq("nonexistent"), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("孩子不存在");
  });

  it("returns 404 when child belongs to another parent", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue(null); // findFirst with parentId filter returns null
    const res = await DELETE(deleteReq("c2"), {
      params: Promise.resolve({ id: "c2" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 204 and deletes child on success", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue({
      id: "c1",
      parentId: "p1",
      name: "小明",
      avatar: "👦",
      points: 100,
      streak: 5,
      maxStreak: 10,
      totalCheckIns: 3,
      pet: "{}",
      createdAt: new Date(),
    });
    mockChildDelete.mockResolvedValue({ id: "c1" });

    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(204);
    expect(mockChildFindFirst).toHaveBeenCalledWith({
      where: { id: "c1", parentId: "p1" },
    });
    expect(mockChildDelete).toHaveBeenCalledWith({
      where: { id: "c1" },
    });
  });

  it("returns 500 when prisma delete throws", async () => {
    mockAuth.mockResolvedValue({ user: { id: "p1" }, role: "parent" });
    mockChildFindFirst.mockResolvedValue({
      id: "c1",
      parentId: "p1",
      name: "小明",
      avatar: "👦",
      points: 0,
      streak: 0,
      maxStreak: 0,
      totalCheckIns: 0,
      pet: "{}",
      createdAt: new Date(),
    });
    mockChildDelete.mockRejectedValue(new Error("DB error"));

    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("删除失败");
  });
});

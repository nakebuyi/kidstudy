/// <vitest-environment node>

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "./route";

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

function deleteReq(
  childId: string,
  auth?: { id: string; role: string }
): Request {
  const headers: Record<string, string> = {};
  if (auth) {
    headers["x-user-id"] = auth.id;
    headers["x-user-role"] = auth.role;
  }
  return new Request(`http://localhost/api/children/${childId}`, {
    method: "DELETE",
    headers,
  });
}

beforeEach(() => {
  vi.resetAllMocks();
});

describe("DELETE /api/children/[id]", () => {
  it("returns 401 when not authenticated", async () => {
    const res = await DELETE(deleteReq("c1"), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(401);
    expect(mockChildFindFirst).not.toHaveBeenCalled();
  });

  it("returns 403 when role is child", async () => {
    const res = await DELETE(deleteReq("c1", { id: "a1", role: "CHILD" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(403);
  });

  it("returns 404 when child does not exist", async () => {
    mockChildFindFirst.mockResolvedValue(null);
    const res = await DELETE(deleteReq("nonexistent", { id: "p1", role: "PARENT" }), {
      params: Promise.resolve({ id: "nonexistent" }),
    });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("孩子不存在");
  });

  it("returns 404 when child belongs to another parent", async () => {
    mockChildFindFirst.mockResolvedValue(null); // findFirst with parentId filter returns null
    const res = await DELETE(deleteReq("c2", { id: "p1", role: "PARENT" }), {
      params: Promise.resolve({ id: "c2" }),
    });
    expect(res.status).toBe(404);
  });

  it("returns 204 and deletes child on success", async () => {
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

    const res = await DELETE(deleteReq("c1", { id: "p1", role: "PARENT" }), {
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

    const res = await DELETE(deleteReq("c1", { id: "p1", role: "PARENT" }), {
      params: Promise.resolve({ id: "c1" }),
    });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("删除失败");
  });
});

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "./route";

// Mock child-access
const mockGetAuthorizedChild = vi.fn();
vi.mock("@/lib/child-access", () => ({
  getAuthorizedChild: (session: unknown, childId: string) =>
    mockGetAuthorizedChild(session, childId),
}));

// Mock prisma
const mockFindMany = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    learningContent: { findMany: (...args: unknown[]) => mockFindMany(...args) },
  },
}));

import { prisma } from "@/lib/prisma";

const learningContent = prisma.learningContent as unknown as {
  findMany: ReturnType<typeof vi.fn>;
};

const AUTH_HEADERS: Record<string, string> = {
  "x-user-id": "p1",
  "x-user-role": "PARENT",
};

function makeReq(childId: string, date?: string, auth: Record<string, string> = AUTH_HEADERS): Request {
  const qs = new URLSearchParams({ childId });
  if (date) qs.set("date", date);
  return new Request(`http://localhost/api/learning/literacy?${qs}`, {
    headers: auth,
  });
}

const sampleRow = {
  id: "l1",
  subject: "literacy",
  level: 1,
  order: 1,
  data: JSON.stringify({ id: "l1", char: "一", level: 1, order: 1 }),
};

beforeEach(() => {
  vi.resetAllMocks();
});

describe("GET /api/learning/[subject]", () => {
  it("returns 401 without session", async () => {
    const res = await GET(makeReq("c1", undefined, {}), { params: Promise.resolve({ subject: "literacy" }) });
    expect(res.status).toBe(401);
  });

  it("returns 400 for unknown subject", async () => {
    const res = await GET(makeReq("c1"), { params: Promise.resolve({ subject: "science" }) });
    expect(res.status).toBe(400);
  });

  it("returns 400 when childId is missing", async () => {
    const res = await GET(new Request("http://localhost/api/learning/literacy", { headers: AUTH_HEADERS }), {
      params: Promise.resolve({ subject: "literacy" }),
    });
    expect(res.status).toBe(400);
  });

  it("returns 404 when child is not authorized", async () => {
    mockGetAuthorizedChild.mockResolvedValue(null);
    const res = await GET(makeReq("c1"), { params: Promise.resolve({ subject: "literacy" }) });
    expect(res.status).toBe(404);
  });

  it("returns 20 items for a full pool", async () => {
    mockGetAuthorizedChild.mockResolvedValue({ id: "c1" });
    // 30 rows of literacy content
    const rows = Array.from({ length: 30 }, (_, i) => ({
      ...sampleRow,
      id: `l${i + 1}`,
      order: i + 1,
      data: JSON.stringify({ id: `l${i + 1}`, char: `字${i + 1}`, level: 1, order: i + 1 }),
    }));
    mockFindMany.mockResolvedValue(rows);

    const res = await GET(makeReq("c1", "2026-08-03"), {
      params: Promise.resolve({ subject: "literacy" }),
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subject).toBe("literacy");
    expect(body.date).toBe("2026-08-03");
    expect(body.count).toBe(20);
    expect(body.items).toHaveLength(20);
    // Items are the parsed data objects with original fields
    expect(body.items[0]).toHaveProperty("char");
  });

  it("returns all items when pool is smaller than 20", async () => {
    mockGetAuthorizedChild.mockResolvedValue({ id: "c1" });
    const rows = Array.from({ length: 3 }, (_, i) => ({
      ...sampleRow,
      id: `po${i + 1}`,
      order: i + 1,
      data: JSON.stringify({ id: `po${i + 1}`, title: `诗${i + 1}`, level: 1, order: i + 1 }),
    }));
    mockFindMany.mockResolvedValue(rows);

    const res = await GET(makeReq("c1", "2026-08-03"), {
      params: Promise.resolve({ subject: "poetry" }),
    });
    const body = await res.json();
    expect(body.count).toBe(3);
    expect(body.items).toHaveLength(3);
  });

  it("queries with stable orderBy", async () => {
    mockGetAuthorizedChild.mockResolvedValue({ id: "c1" });
    mockFindMany.mockResolvedValue([]);

    await GET(makeReq("c1"), { params: Promise.resolve({ subject: "math" }) });
    expect(mockFindMany).toHaveBeenCalledWith({
      where: { subject: "math" },
      orderBy: { order: "asc" },
    });
  });
});

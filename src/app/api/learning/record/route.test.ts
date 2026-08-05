import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "./route";

// Mock child-access
const mockGetAuthorizedChild = vi.fn();
vi.mock("@/lib/child-access", () => ({
  getAuthorizedChild: (session: unknown, childId: string) =>
    mockGetAuthorizedChild(session, childId),
}));

// Mock prisma
const mockFindMany = vi.fn();
const mockCreate = vi.fn();
vi.mock("@/lib/prisma", () => ({
  prisma: {
    learningRecord: {
      findMany: (...args: unknown[]) => mockFindMany(...args),
      create: (...args: unknown[]) => mockCreate(...args),
    },
    learningContent: { findMany: () => Promise.resolve([]) },
  },
}));

import { prisma } from "@/lib/prisma";
const learningRecord = prisma.learningRecord as unknown as {
  findMany: ReturnType<typeof vi.fn>;
  create: ReturnType<typeof vi.fn>;
};

beforeEach(() => {
  vi.resetAllMocks();
});

const AUTH_HEADERS: Record<string, string> = {
  "x-user-id": "p1",
  "x-user-role": "PARENT",
};

function getReq(
  childId?: string,
  subject?: string,
  date?: string,
  auth: Record<string, string> = AUTH_HEADERS
): Request {
  const qs = new URLSearchParams();
  if (childId) qs.set("childId", childId);
  if (subject) qs.set("subject", subject);
  if (date) qs.set("date", date);
  return new Request(`http://localhost/api/learning/record?${qs}`, {
    headers: auth,
  });
}

function postReq(
  body: unknown,
  auth: Record<string, string> = AUTH_HEADERS
): Request {
  return new Request("http://localhost/api/learning/record", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...auth },
    body: JSON.stringify(body),
  });
}

describe("GET /api/learning/record", () => {
  it("returns 401 without session", async () => {
    const res = await GET(getReq("c1", "literacy", undefined, {}));
    expect(res.status).toBe(401);
  });

  it("returns 400 when subject missing", async () => {
    const res = await GET(getReq("c1"));
    expect(res.status).toBe(400);
  });

  it("returns 400 when childId missing", async () => {
    const res = await GET(getReq(undefined, "literacy"));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid subject", async () => {
    const res = await GET(getReq("c1", "science"));
    expect(res.status).toBe(400);
  });

  it("returns 404 when child not authorized", async () => {
    mockGetAuthorizedChild.mockResolvedValue(null);
    const res = await GET(getReq("c1", "literacy"));
    expect(res.status).toBe(404);
  });

  it("returns results for a valid request", async () => {
    mockGetAuthorizedChild.mockResolvedValue({ id: "c1" });
    mockFindMany.mockResolvedValue([
      { id: "r1", charId: "l1", score: 1, createdAt: new Date() },
    ]);

    const res = await GET(getReq("c1", "literacy", "2026-08-03"));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.subject).toBe("literacy");
    expect(body.date).toBe("2026-08-03");
    expect(body.total).toBe(1);
    expect(body.correctCount).toBe(1);
    expect(body.items).toHaveLength(1);

    expect(mockFindMany).toHaveBeenCalledWith({
      where: { childId: "c1", subject: "literacy", date: "2026-08-03" },
      orderBy: { createdAt: "asc" },
    });
  });
});

describe("POST /api/learning/record", () => {
  it("returns 401 without session", async () => {
    const res = await POST(postReq({ childId: "c1", subject: "literacy", charId: "l1", correct: true }, {}));
    expect(res.status).toBe(401);
  });

  it("returns 400 when fields missing", async () => {
    const res = await POST(postReq({ childId: "c1", correct: true }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when correct is not boolean", async () => {
    const res = await POST(postReq({ childId: "c1", subject: "literacy", charId: "l1", correct: "yes" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid subject", async () => {
    const res = await POST(postReq({ childId: "c1", subject: "science", charId: "x1", correct: true }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when child not authorized", async () => {
    mockGetAuthorizedChild.mockResolvedValue(null);
    const res = await POST(postReq({ childId: "c1", subject: "literacy", charId: "l1", correct: true }));
    expect(res.status).toBe(404);
  });

  it("returns 201 and creates a record for correct: true", async () => {
    mockGetAuthorizedChild.mockResolvedValue({ id: "c1" });
    mockCreate.mockResolvedValue({ id: "r1" });

    const res = await POST(postReq({ childId: "c1", subject: "english", charId: "e1", correct: true }));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.record).toEqual({ id: "r1" });
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        childId: "c1",
        subject: "english",
        charId: "e1",
        type: "test",
        score: 1,
        accuracy: 100,
        date: expect.any(String),
      },
    });
  });

  it("creates score 0 / accuracy 0 for correct: false", async () => {
    mockGetAuthorizedChild.mockResolvedValue({ id: "c1" });
    mockCreate.mockResolvedValue({ id: "r2" });

    await POST(postReq({ childId: "c1", subject: "math", charId: "m1", correct: false }));
    expect(mockCreate).toHaveBeenCalledWith({
      data: {
        childId: "c1",
        subject: "math",
        charId: "m1",
        type: "test",
        score: 0,
        accuracy: 0,
        date: expect.any(String),
      },
    });
  });
});

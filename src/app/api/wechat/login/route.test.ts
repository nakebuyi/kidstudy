import { describe, it, expect, vi, beforeAll } from "vitest";
import { POST } from "./route";

// Mock the WeChat API call
const mockFetch = vi.fn();

beforeAll(() => {
  process.env.WECHAT_APPID = "test-appid";
  process.env.WECHAT_SECRET = "test-secret";
  process.env.JWT_SECRET = "test-jwt-secret";
});

describe("POST /api/wechat/login", () => {
  it("returns 400 when code is missing", async () => {
    const req = new Request("http://localhost/api/wechat/login", {
      method: "POST",
      body: JSON.stringify({}),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  it("returns 400 when code is empty string", async () => {
    const req = new Request("http://localhost/api/wechat/login", {
      method: "POST",
      body: JSON.stringify({ code: "" }),
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

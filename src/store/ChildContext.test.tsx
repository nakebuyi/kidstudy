/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor, act } from "@testing-library/react";
import { ChildProvider, useChild } from "./ChildContext";

const mockSetCurrentChildId = vi.fn();
const mockUseAuth = vi.fn();

vi.mock("@/store/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

// Shared child data for fetch responses
const mockChildData = {
  id: "c1", name: "小明", avatar: "👦", points: 10,
  streak: 2, maxStreak: 5, totalCheckIns: 3, pet: "{}",
};

const AUTH_HEADERS = { Authorization: "Bearer tok" };

// fetch mock that routes: /api/children (no query) -> list, /api/children?id= -> single child
function mockFetch(childData: unknown, listData?: unknown) {
  vi.mocked(globalThis.fetch).mockImplementation(((url: string) => {
    if ((url as string).includes("?id=")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(childData),
      } as Response);
    }
    return Promise.resolve({
      ok: true,
      json: () => Promise.resolve(listData ?? childData),
    } as Response);
  }) as typeof fetch);
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
  mockUseAuth.mockReturnValue({
    user: { id: "p1", role: "PARENT", currentChildId: "c1" },
    token: "tok",
    setCurrentChildId: mockSetCurrentChildId,
  });
});

describe("ChildContext - parent", () => {
  const wrapper = ChildProvider;

  it("fetches children list and current child for parent", async () => {
    // Both fetchChildren and fetchChild return the same data
    mockFetch(mockChildData, [mockChildData]);

    const { result } = renderHook(() => useChild(), { wrapper });

    await waitFor(() => {
      expect(result.current.children.length).toBeGreaterThan(0);
    });
    expect(result.current.children).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "小明" })])
    );
    expect(result.current.child).toEqual(expect.objectContaining({ name: "小明" }));
  });

  it("setCurrentChild calls setCurrentChildId and fetches new child", async () => {
    mockFetch(mockChildData, [mockChildData]);

    const { result } = renderHook(() => useChild(), { wrapper });

    await result.current.setCurrentChild("c2");

    expect(mockSetCurrentChildId).toHaveBeenCalledWith("c2");
  });
});

describe("ChildContext - child", () => {
  const wrapper = ChildProvider;

  it("fetches only own record, children empty", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "account-1", role: "CHILD", currentChildId: "c1" },
      token: "tok",
      setCurrentChildId: mockSetCurrentChildId,
    });

    mockFetch(mockChildData);

    const { result } = renderHook(() => useChild(), { wrapper });

    await waitFor(() => {
      expect(result.current.child).toBeTruthy();
    });
    expect(result.current.child).toEqual(expect.objectContaining({ name: "小明" }));
    expect(result.current.children).toEqual([]);
  });

  it("setCurrentChild is a no-op for child", async () => {
    mockUseAuth.mockReturnValue({
      user: { id: "account-1", role: "CHILD", currentChildId: "c1" },
      token: "tok",
      setCurrentChildId: mockSetCurrentChildId,
    });

    mockFetch(mockChildData);

    const { result } = renderHook(() => useChild(), { wrapper });

    await result.current.setCurrentChild("c2");

    expect(mockSetCurrentChildId).not.toHaveBeenCalled();
  });
});

describe("removeChild", () => {
  const wrapper = ChildProvider;

  it("removes child from list and switches to first remaining child when current is deleted", async () => {
    const initialList = [
      { id: "c1", name: "小明", avatar: "👦", points: 10, streak: 2, pet: "{}" },
      { id: "c2", name: "小红", avatar: "👧", points: 20, streak: 3, pet: "{}" },
    ];
    const afterDeleteList = [
      { id: "c2", name: "小红", avatar: "👧", points: 20, streak: 3, pet: "{}" },
    ];

    let deleted = false;
    vi.mocked(globalThis.fetch).mockImplementation((((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        deleted = true;
        return Promise.resolve({ ok: true, status: 204 } as Response);
      }
      const u = url as string;
      if (u.includes("?id=")) {
        const id = u.split("?id=")[1];
        const list = deleted ? afterDeleteList : initialList;
        const found = list.find((c: any) => c.id === id);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(found ?? null),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(deleted ? afterDeleteList : initialList),
      } as Response);
    }) as typeof fetch));

    const { result } = renderHook(() => useChild(), { wrapper });

    await waitFor(() => {
      expect(result.current.children).toHaveLength(2);
    });

    await act(async () => {
      await result.current.removeChild("c1");
    });

    expect(globalThis.fetch).toHaveBeenCalledWith("/api/children/c1", {
      method: "DELETE",
      headers: AUTH_HEADERS,
    });
    expect(result.current.children).toHaveLength(1);
    expect(result.current.children[0].id).toBe("c2");
  });

  it("sets child to null when deleting the only child", async () => {
    const initialList = [
      { id: "c1", name: "小明", avatar: "👦", points: 10, streak: 2, pet: "{}" },
    ];

    let deleted = false;
    vi.mocked(globalThis.fetch).mockImplementation((((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        deleted = true;
        return Promise.resolve({ ok: true, status: 204 } as Response);
      }
      const u = url as string;
      if (u.includes("?id=")) {
        const id = u.split("?id=")[1];
        const list = deleted ? [] : initialList;
        const found = list.find((c: any) => c.id === id);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(found ?? null),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(deleted ? [] : initialList),
      } as Response);
    }) as typeof fetch));

    const { result } = renderHook(() => useChild(), { wrapper });

    await waitFor(() => {
      expect(result.current.children).toHaveLength(1);
    });

    await act(async () => {
      await result.current.removeChild("c1");
    });

    expect(result.current.children).toHaveLength(0);
    expect(result.current.child).toBeNull();
    expect(mockSetCurrentChildId).toHaveBeenCalledWith(null);
  });

  it("throws and does not modify state when DELETE fails", async () => {
    const initialList = [
      { id: "c1", name: "小明", avatar: "👦", points: 10, streak: 2, pet: "{}" },
    ];

    vi.mocked(globalThis.fetch).mockImplementation((((url: string, opts?: RequestInit) => {
      if (opts?.method === "DELETE") {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: () => Promise.resolve({ error: "服务器内部错误" }),
        } as Response);
      }
      const u = url as string;
      if (u.includes("?id=")) {
        const id = u.split("?id=")[1];
        const found = initialList.find((c: any) => c.id === id);
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(found ?? null),
        } as Response);
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(initialList),
      } as Response);
    }) as typeof fetch));

    const { result } = renderHook(() => useChild(), { wrapper });

    await waitFor(() => {
      expect(result.current.children).toHaveLength(1);
    });

    await act(async () => {
      await expect(result.current.removeChild("c1")).rejects.toThrow("服务器内部错误");
    });

    // Children list should remain unchanged
    expect(result.current.children).toHaveLength(1);
    expect(result.current.children[0].id).toBe("c1");
  });
});

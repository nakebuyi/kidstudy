/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { ChildProvider, useChild } from "./ChildContext";

const mockUpdate = vi.fn();
const mockUseSession = vi.fn();

vi.mock("next-auth/react", () => ({
  useSession: () => mockUseSession(),
}));

// Shared child data for fetch responses
const mockChildData = {
  id: "c1", name: "小明", avatar: "👦", points: 10,
  streak: 2, maxStreak: 5, totalCheckIns: 3, pet: "{}",
};

// fetch mock that routes: /api/children (no query) → list, /api/children?id= → single child
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
});

describe("ChildContext — parent", () => {
  const wrapper = ChildProvider;

  it("fetches children list and current child for parent", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "p1" }, role: "parent", currentChildId: "c1" },
      status: "authenticated",
      update: mockUpdate,
    });

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

  it("setCurrentChild calls update and fetches new child", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "p1" }, role: "parent", currentChildId: "c1" },
      status: "authenticated",
      update: mockUpdate,
    });

    mockFetch(mockChildData, [mockChildData]);

    const { result } = renderHook(() => useChild(), { wrapper });

    await result.current.setCurrentChild("c2");

    expect(mockUpdate).toHaveBeenCalledWith({ currentChildId: "c2" });
  });
});

describe("ChildContext — child", () => {
  const wrapper = ChildProvider;

  it("fetches only own record, children empty", async () => {
    mockUseSession.mockReturnValue({
      data: { user: { id: "account-1" }, role: "child", currentChildId: "c1" },
      status: "authenticated",
      update: mockUpdate,
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
    mockUseSession.mockReturnValue({
      data: { user: { id: "account-1" }, role: "child", currentChildId: "c1" },
      status: "authenticated",
      update: mockUpdate,
    });

    mockFetch(mockChildData);

    const { result } = renderHook(() => useChild(), { wrapper });

    await result.current.setCurrentChild("c2");

    expect(mockUpdate).not.toHaveBeenCalled();
  });
});
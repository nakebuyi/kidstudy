import { describe, it, expect, vi, beforeEach } from "vitest";
import { getPetEmoji, getPetName, POINTS, awardPoints, spendPoints } from "./points";

// Mock @/lib/prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: { update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    checkInRecord: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    checkInTask: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import type { Mock } from "vitest";

const child = prisma.child as unknown as {
  update: Mock;
  findUnique: Mock;
  findFirst: Mock;
};

beforeEach(() => {
  vi.resetAllMocks();
});

// ── Pure functions ──

describe("POINTS", () => {
  it("has correct values", () => {
    expect(POINTS).toEqual({
      CHECK_IN: 10,
      CHECK_IN_BONUS: 10,
      STREAK_7: 50,
      LEARN_NEW: 5,
      GAME_COMPLETE_MIN: 5,
      GAME_COMPLETE_MAX: 20,
    });
  });
});

describe("getPetEmoji", () => {
  it("returns correct emoji for cat moods", () => {
    expect(getPetEmoji({ type: "cat", mood: "happy" })).toBe("😸");
    expect(getPetEmoji({ type: "cat", mood: "normal" })).toBe("🐱");
    expect(getPetEmoji({ type: "cat", mood: "sad" })).toBe("😿");
  });

  it("returns correct emoji for dog moods", () => {
    expect(getPetEmoji({ type: "dog", mood: "happy" })).toBe("🐶");
    expect(getPetEmoji({ type: "dog", mood: "normal" })).toBe("🐕");
    expect(getPetEmoji({ type: "dog", mood: "sad" })).toBe("😔");
  });

  it("returns correct emoji for rabbit moods", () => {
    expect(getPetEmoji({ type: "rabbit", mood: "happy" })).toBe("🐰");
    expect(getPetEmoji({ type: "rabbit", mood: "normal" })).toBe("🐇");
    expect(getPetEmoji({ type: "rabbit", mood: "sad" })).toBe("😢");
  });

  it("falls back to 🐱 for unknown type", () => {
    expect(getPetEmoji({ type: "dragon", mood: "happy" })).toBe("🐱");
  });

  it("falls back to 🐱 for unknown mood", () => {
    expect(getPetEmoji({ type: "cat", mood: "angry" })).toBe("🐱");
  });
});

describe("getPetName", () => {
  it("returns 小猫 for cat", () => {
    expect(getPetName({ type: "cat" })).toBe("小猫");
  });

  it("returns 小狗 for dog", () => {
    expect(getPetName({ type: "dog" })).toBe("小狗");
  });

  it("returns 小兔子 for rabbit", () => {
    expect(getPetName({ type: "rabbit" })).toBe("小兔子");
  });

  it("falls back to 小宠物 for unknown type", () => {
    expect(getPetName({ type: "dragon" })).toBe("小宠物");
  });
});

// ── DB functions ──

describe("awardPoints", () => {
  it("returns 0 without calling DB when amount <= 0", async () => {
    expect(await awardPoints("c1", 0, "test")).toBe(0);
    expect(child.update).not.toHaveBeenCalled();

    expect(await awardPoints("c1", -5, "test")).toBe(0);
    expect(child.update).not.toHaveBeenCalled();
  });

  it("calls update with increment and returns new points", async () => {
    child.update.mockResolvedValue({ points: 50 });
    const result = await awardPoints("c1", 10, "test");
    expect(result).toBe(50);
    expect(child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { points: { increment: 10 } },
    });
  });
});

describe("spendPoints", () => {
  it("returns error when child not found", async () => {
    child.findUnique.mockResolvedValue(null);
    const result = await spendPoints("c1", 10, "test");
    expect(result).toEqual({ success: false, balance: 0, error: "孩子不存在" });
    expect(child.update).not.toHaveBeenCalled();
  });

  it("returns error when insufficient points", async () => {
    child.findUnique.mockResolvedValue({ id: "c1", points: 5 });
    const result = await spendPoints("c1", 10, "test");
    expect(result).toEqual({ success: false, balance: 5, error: "积分不足" });
    expect(child.update).not.toHaveBeenCalled();
  });

  it("decrements points and returns success", async () => {
    child.findUnique.mockResolvedValue({ id: "c1", points: 20 });
    child.update.mockResolvedValue({ id: "c1", points: 10 });
    const result = await spendPoints("c1", 10, "test");
    expect(result).toEqual({ success: true, balance: 10 });
    expect(child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { points: { decrement: 10 } },
    });
  });
});
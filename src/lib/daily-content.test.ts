import { describe, it, expect } from "vitest";
import {
  hashStringToInt,
  mulberry32,
  seededShuffle,
  getDailyContent,
} from "./daily-content";

describe("hashStringToInt", () => {
  it("is deterministic for the same input", () => {
    expect(hashStringToInt("2026-08-03:literacy")).toBe(
      hashStringToInt("2026-08-03:literacy")
    );
  });

  it("differs for different inputs", () => {
    const a = hashStringToInt("2026-08-03:literacy");
    const b = hashStringToInt("2026-08-04:literacy");
    const c = hashStringToInt("2026-08-03:math");
    expect(a).not.toBe(b);
    expect(a).not.toBe(c);
  });

  it("returns unsigned 32-bit integers", () => {
    const h = hashStringToInt("anything");
    expect(h).toBeGreaterThanOrEqual(0);
    expect(h).toBeLessThan(2 ** 32);
  });
});

describe("mulberry32", () => {
  it("produces the same sequence for the same seed", () => {
    const a = mulberry32(123);
    const b = mulberry32(123);
    const seqA = [a(), a(), a(), a()];
    const seqB = [b(), b(), b(), b()];
    expect(seqA).toEqual(seqB);
  });

  it("produces values in [0, 1)", () => {
    const r = mulberry32(42);
    for (let i = 0; i < 100; i++) {
      const v = r();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });

  it("produces different sequences for different seeds", () => {
    const a = mulberry32(1);
    const b = mulberry32(2);
    expect(a()).not.toBe(b());
  });
});

describe("seededShuffle", () => {
  it("returns a permutation of the input", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }];
    const result = seededShuffle(items, "seed");
    expect(result).toHaveLength(items.length);
    for (const item of items) {
      expect(result).toContain(item);
    }
  });

  it("does not mutate the input array", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const copy = [...items];
    seededShuffle(items, "seed");
    expect(items).toEqual(copy);
  });

  it("is deterministic for the same seed", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
    expect(seededShuffle(items, "x").map((i) => i.id)).toEqual(
      seededShuffle(items, "x").map((i) => i.id)
    );
  });
});

describe("getDailyContent", () => {
  const pool = Array.from({ length: 200 }, (_, i) => ({ id: `i${i}`, n: i }));

  it("returns exactly 20 items for a 200-item pool", () => {
    const result = getDailyContent("literacy", pool, "2026-08-03");
    expect(result).toHaveLength(20);
  });

  it("returns identical set for same (subject, date)", () => {
    const a = getDailyContent("literacy", pool, "2026-08-03").map((i) => i.id);
    const b = getDailyContent("literacy", pool, "2026-08-03").map((i) => i.id);
    expect(a).toEqual(b);
  });

  it("returns different set for different date", () => {
    const a = getDailyContent("literacy", pool, "2026-08-03").map((i) => i.id);
    const b = getDailyContent("literacy", pool, "2026-08-04").map((i) => i.id);
    expect(a).not.toEqual(b);
  });

  it("returns different set for different subject same date", () => {
    const a = getDailyContent("literacy", pool, "2026-08-03").map((i) => i.id);
    const b = getDailyContent("math", pool, "2026-08-03").map((i) => i.id);
    expect(a).not.toEqual(b);
  });

  it("does not mutate the input pool", () => {
    const copy = [...pool];
    getDailyContent("literacy", pool, "2026-08-03");
    expect(pool).toEqual(copy);
  });

  it("returns all items when pool is smaller than count", () => {
    const small = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = getDailyContent("poetry", small, "2026-08-03", 20);
    expect(result).toHaveLength(3);
  });

  it("respects a custom count", () => {
    const result = getDailyContent("literacy", pool, "2026-08-03", 5);
    expect(result).toHaveLength(5);
  });
});

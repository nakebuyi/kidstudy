import { describe, it, expect } from "vitest";
import {
  getLiteracyContent,
  getLiteracyByLevel,
  getLiteracyById,
  getPinyinContent,
  getEnglishContent,
  getMathContent,
  getMathByLevel,
  getPoetryContent,
  getPoetryByLevel,
  getRandomItems,
  getNextContent,
} from "./content";

describe("getLiteracyContent", () => {
  it("returns non-empty array", () => {
    const content = getLiteracyContent();
    expect(content.length).toBeGreaterThan(0);
  });

  it("items have id, char, level, order", () => {
    for (const item of getLiteracyContent()) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("char");
      expect(item).toHaveProperty("level");
      expect(item).toHaveProperty("order");
    }
  });
});

describe("getLiteracyByLevel", () => {
  it("returns only items of the given level", () => {
    const level1 = getLiteracyByLevel(1);
    expect(level1.length).toBeGreaterThan(0);
    for (const item of level1) {
      expect(item.level).toBe(1);
    }
  });
});

describe("getLiteracyById", () => {
  it("returns item for known id", () => {
    const item = getLiteracyById("l1");
    expect(item).toBeDefined();
    expect(item!.id).toBe("l1");
  });

  it("returns undefined for unknown id", () => {
    expect(getLiteracyById("nonexistent")).toBeUndefined();
  });
});

describe("getPinyinContent", () => {
  it("returns non-empty array", () => {
    expect(getPinyinContent().length).toBeGreaterThan(0);
  });
});

describe("getEnglishContent", () => {
  it("returns non-empty array", () => {
    expect(getEnglishContent().length).toBeGreaterThan(0);
  });
});

describe("getMathContent", () => {
  it("returns non-empty array", () => {
    expect(getMathContent().length).toBeGreaterThan(0);
  });
});

describe("getMathByLevel", () => {
  it("filters by level", () => {
    const all = getMathContent();
    const level1 = getMathByLevel(1);
    expect(level1.length).toBeGreaterThan(0);
    expect(level1).toEqual(all.filter((m: { level: number }) => m.level === 1));
  });

  it("returns empty array for unmatched level", () => {
    expect(getMathByLevel(99)).toEqual([]);
  });
});

describe("getPoetryContent", () => {
  it("returns non-empty array", () => {
    expect(getPoetryContent().length).toBeGreaterThan(0);
  });
});

// 每日抽取 20 个要求各科内容池 ≥ 20，且达到扩充目标规模
describe("content pool sizes (daily 20-selection prerequisite)", () => {
  it("literacy pool has >= 200 items", () => {
    expect(getLiteracyContent().length).toBeGreaterThanOrEqual(200);
  });

  it("pinyin pool has the full 63", () => {
    expect(getPinyinContent().length).toBeGreaterThanOrEqual(63);
  });

  it("english pool has >= 150 items", () => {
    expect(getEnglishContent().length).toBeGreaterThanOrEqual(150);
  });

  it("math pool has >= 200 items", () => {
    expect(getMathContent().length).toBeGreaterThanOrEqual(200);
  });

  it("poetry pool has >= 20 items", () => {
    expect(getPoetryContent().length).toBeGreaterThanOrEqual(20);
  });
});

describe("getPoetryByLevel", () => {
  it("filters by level", () => {
    const all = getPoetryContent();
    const level1 = getPoetryByLevel(1);
    expect(level1.length).toBeGreaterThan(0);
    expect(level1).toEqual(all.filter((p: { level: number }) => p.level === 1));
  });

  it("returns empty array for unmatched level", () => {
    expect(getPoetryByLevel(99)).toEqual([]);
  });
});

describe("getRandomItems", () => {
  it("returns exactly count items", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }, { id: "d" }, { id: "e" }];
    expect(getRandomItems(items, 3).length).toBe(3);
  });

  it("returns all items when count >= length", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const result = getRandomItems(items, 5);
    expect(result.length).toBe(3);
    // All items from input are present
    for (const item of items) {
      expect(result).toContain(item);
    }
  });

  it("does not mutate the input array", () => {
    const items = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const copy = [...items];
    getRandomItems(items, 2);
    expect(items).toEqual(copy);
  });
});

describe("getNextContent", () => {
  it("returns first item whose id is not in learnedIds", () => {
    const items = [
      { id: "a", order: 2 },
      { id: "b", order: 1 },
    ] as const;
    // 'a' is learned, so 'b' should be next
    expect(getNextContent([...items], ["a"])).toEqual(items[1]);
  });

  it("follows array order, not order field", () => {
    const items = [
      { id: "a", order: 2 },
      { id: "b", order: 1 },
    ] as const;
    expect(getNextContent([...items], [])).toEqual(items[0]);
  });

  it("returns undefined when all are learned", () => {
    const items = [{ id: "a", order: 1 }, { id: "b", order: 2 }];
    expect(getNextContent(items, ["a", "b"])).toBeUndefined();
  });
});
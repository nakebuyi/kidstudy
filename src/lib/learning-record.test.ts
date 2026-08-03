import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  recordQuizAnswer,
  getItemPrompt,
  getCorrectAnswer,
  getSubjectResults,
} from "./learning-record";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    learningRecord: { create: vi.fn(), findMany: vi.fn() },
    learningContent: { findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import type { Mock } from "vitest";

const learningRecord = prisma.learningRecord as unknown as {
  create: Mock;
  findMany: Mock;
};
const learningContent = prisma.learningContent as unknown as { findMany: Mock };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-02T16:30:00.000Z")); // 北京 8/3 00:30
});

afterEach(() => {
  vi.useRealTimers();
});

describe("recordQuizAnswer", () => {
  it("creates a test record with correct=true (score 1, accuracy 100, Beijing date)", async () => {
    learningRecord.create.mockResolvedValue({ id: "r1" });
    await recordQuizAnswer({ childId: "c1", subject: "literacy", charId: "l1", correct: true });
    expect(learningRecord.create).toHaveBeenCalledWith({
      data: {
        childId: "c1",
        subject: "literacy",
        charId: "l1",
        type: "test",
        score: 1,
        accuracy: 100,
        date: "2026-08-03",
      },
    });
  });

  it("creates with correct=false (score 0, accuracy 0)", async () => {
    learningRecord.create.mockResolvedValue({ id: "r2" });
    await recordQuizAnswer({ childId: "c1", subject: "math", charId: "m1", correct: false });
    expect(learningRecord.create).toHaveBeenCalledWith({
      data: {
        childId: "c1",
        subject: "math",
        charId: "m1",
        type: "test",
        score: 0,
        accuracy: 0,
        date: "2026-08-03",
      },
    });
  });

  it("accepts an explicit date override", async () => {
    learningRecord.create.mockResolvedValue({ id: "r3" });
    await recordQuizAnswer({ childId: "c1", subject: "poetry", charId: "po1", correct: true }, "2026-08-04");
    expect(learningRecord.create).toHaveBeenCalledWith({
      data: {
        childId: "c1",
        subject: "poetry",
        charId: "po1",
        type: "test",
        score: 1,
        accuracy: 100,
        date: "2026-08-04",
      },
    });
  });
});

describe("getItemPrompt", () => {
  it("extracts the right prompt per subject", () => {
    expect(getItemPrompt("literacy", { char: "一" })).toBe("一");
    expect(getItemPrompt("pinyin", { pinyin: "b" })).toBe("b");
    expect(getItemPrompt("english", { word: "apple" })).toBe("apple");
    expect(getItemPrompt("math", { question: "1 + 1 = ?" })).toBe("1 + 1 = ?");
    expect(getItemPrompt("poetry", { title: "咏鹅" })).toBe("咏鹅");
  });

  it("falls back to id when data missing", () => {
    expect(getItemPrompt("literacy", {})).toBe("");
    expect(getItemPrompt("unknown", { id: "x1" })).toBe("x1");
  });
});

describe("getCorrectAnswer", () => {
  it("derives the correct answer for literacy/pinyin/english/math", () => {
    expect(getCorrectAnswer("literacy", { char: "一" })).toBe("一");
    expect(getCorrectAnswer("pinyin", { pinyin: "b" })).toBe("b");
    expect(getCorrectAnswer("english", { word: "apple" })).toBe("apple");
    expect(getCorrectAnswer("math", { answer: 5 })).toBe("5");
  });

  it("returns undefined for poetry (blank char randomized at runtime)", () => {
    expect(getCorrectAnswer("poetry", { title: "咏鹅" })).toBeUndefined();
  });
});

describe("getSubjectResults", () => {
  it("queries by childId+subject+date ascending, de-dupes by charId, joins content", async () => {
    const now = new Date();
    learningRecord.findMany.mockResolvedValue([
      { id: "r1", charId: "l1", score: 1, createdAt: new Date(now.getTime() + 1000) },
      { id: "r2", charId: "l2", score: 0, createdAt: new Date(now.getTime() + 2000) },
      // duplicate charId l1, later answer wins
      { id: "r3", charId: "l1", score: 0, createdAt: new Date(now.getTime() + 3000) },
    ]);
    learningContent.findMany.mockResolvedValue([
      { id: "l1", data: JSON.stringify({ char: "一" }) },
      { id: "l2", data: JSON.stringify({ char: "二" }) },
    ]);

    const result = await getSubjectResults("c1", "literacy", "2026-08-03");

    expect(learningRecord.findMany).toHaveBeenCalledWith({
      where: { childId: "c1", subject: "literacy", date: "2026-08-03" },
      orderBy: { createdAt: "asc" },
    });
    expect(result.subject).toBe("literacy");
    expect(result.date).toBe("2026-08-03");
    expect(result.total).toBe(2);
    expect(result.correctCount).toBe(0); // l1 latest = wrong, l2 wrong

    // l1 uses the latest (r3) → wrong; order ascending by answer time
    const l1 = result.items.find((i) => i.charId === "l1");
    expect(l1?.correct).toBe(false);
    expect(l1?.prompt).toBe("一");
    expect(l1?.correctAnswer).toBe("一");

    const l2 = result.items.find((i) => i.charId === "l2");
    expect(l2?.correct).toBe(false);
    expect(l2?.prompt).toBe("二");
    expect(l2?.correctAnswer).toBe("二");
  });

  it("returns empty items when no records", async () => {
    learningRecord.findMany.mockResolvedValue([]);
    learningContent.findMany.mockResolvedValue([]);
    const result = await getSubjectResults("c1", "math", "2026-08-03");
    expect(result.total).toBe(0);
    expect(result.correctCount).toBe(0);
    expect(result.items).toEqual([]);
  });
});

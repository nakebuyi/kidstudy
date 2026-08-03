import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { getOrCreateTodayRecord, completeTask, getTodayStatus } from "./checkin";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    child: { update: vi.fn(), findUnique: vi.fn(), findFirst: vi.fn() },
    checkInRecord: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    checkInTask: { findFirst: vi.fn(), update: vi.fn(), findMany: vi.fn() },
  },
}));

import { prisma } from "@/lib/prisma";
import type { Mock } from "vitest";

const child = prisma.child as unknown as { update: Mock };
const record = prisma.checkInRecord as unknown as {
  findUnique: Mock;
  create: Mock;
  update: Mock;
};
const task = prisma.checkInTask as unknown as {
  findFirst: Mock;
  update: Mock;
  findMany: Mock;
};

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-08-02T00:00:00.000Z"));
});

afterEach(() => {
  vi.useRealTimers();
});

describe("getOrCreateTodayRecord", () => {
  it("creates record with 5 tasks when none exists", async () => {
    record.findUnique.mockResolvedValue(null);
    const created = { id: "r1", childId: "c1", date: "2026-08-02", allCompleted: false, bonusEarned: false, tasks: [] };
    record.create.mockResolvedValue(created);

    const result = await getOrCreateTodayRecord("c1");
    expect(result).toBe(created);
    expect(record.findUnique).toHaveBeenCalledWith({
      where: { childId_date: { childId: "c1", date: "2026-08-02" } },
      include: { tasks: true },
    });
    expect(record.create).toHaveBeenCalledTimes(1);
    const createCall = record.create.mock.calls[0][0];
    expect(createCall.data.childId).toBe("c1");
    expect(createCall.data.date).toBe("2026-08-02");
    expect(createCall.data.tasks.create).toHaveLength(5);
    expect(createCall.include).toEqual({ tasks: true });

    // Verify deterministic taskType selection
    const tasks = createCall.data.tasks.create as Array<{ subject: string; taskType: string; completed: boolean; pointsEarned: number }>;
    const subjects = tasks.map((t) => t.subject);
    expect(subjects).toEqual(["literacy", "pinyin", "english", "math", "poetry"]);
    const taskTypes = tasks.map((t) => t.taskType);
    expect(taskTypes).toEqual([
      "书写练习2个字",
      "声调练习",
      "单词配对",
      "应用题挑战",
      "诗词填空",
    ]);
    for (const t of tasks) {
      expect(t.completed).toBe(false);
      expect(t.pointsEarned).toBe(0);
    }
  });

  it("returns existing record without creating", async () => {
    const existing = { id: "r1", childId: "c1", date: "2026-08-02", allCompleted: false, bonusEarned: false, tasks: [] };
    record.findUnique.mockResolvedValue(existing);
    const result = await getOrCreateTodayRecord("c1");
    expect(result).toBe(existing);
    expect(record.create).not.toHaveBeenCalled();
  });
});

describe("completeTask", () => {
  it("throws when task not found", async () => {
    task.findFirst.mockResolvedValue(null);
    await expect(completeTask("c1", "t1")).rejects.toThrow("任务不存在");
  });

  it("throws when task already completed", async () => {
    task.findFirst.mockResolvedValue({ id: "t1", completed: true });
    await expect(completeTask("c1", "t1")).rejects.toThrow("任务已完成");
  });

  it("completes last task and awards bonus", async () => {
    task.findFirst.mockResolvedValue({
      id: "t1",
      recordId: "r1",
      record: { childId: "c1" },
      completed: false,
    });
    task.update.mockResolvedValue({});
    // All 5 tasks completed (the just-completed t1 + 4 already completed)
    task.findMany.mockResolvedValue([
      { id: "t1", completed: true },
      { id: "t2", completed: true },
      { id: "t3", completed: true },
      { id: "t4", completed: true },
      { id: "t5", completed: true },
    ]);
    child.update.mockResolvedValue({});

    const result = await completeTask("c1", "t1");
    expect(result).toEqual({ pointsEarned: 10, allCompleted: true });

    // Updates task
    expect(task.update).toHaveBeenCalledWith({
      where: { id: "t1" },
      data: { completed: true, pointsEarned: 10, completedAt: expect.any(Date) as Date },
    });

    // Updates record with bonus
    expect(record.update).toHaveBeenCalledWith({
      where: { id: "r1" },
      data: { allCompleted: true, bonusEarned: true },
    });

    // Awards 10 points + 10 bonus = 20
    expect(child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { points: { increment: 20 } },
    });
  });

  it("completes non-last task without bonus", async () => {
    task.findFirst.mockResolvedValue({
      id: "t1",
      recordId: "r1",
      record: { childId: "c1" },
      completed: false,
    });
    task.update.mockResolvedValue({});
    // Only 3 of 5 completed
    task.findMany.mockResolvedValue([
      { id: "t1", completed: true },
      { id: "t2", completed: true },
      { id: "t3", completed: true },
      { id: "t4", completed: false },
      { id: "t5", completed: false },
    ]);
    child.update.mockResolvedValue({});

    const result = await completeTask("c1", "t1");
    expect(result).toEqual({ pointsEarned: 10, allCompleted: false });

    // Does NOT update record
    expect(record.update).not.toHaveBeenCalled();

    // Awards only 10 points
    expect(child.update).toHaveBeenCalledWith({
      where: { id: "c1" },
      data: { points: { increment: 10 } },
    });
  });
});

describe("getTodayStatus", () => {
  it("returns status with correct counts", async () => {
    record.findUnique.mockResolvedValue({
      id: "r1",
      date: "2026-08-02",
      allCompleted: false,
      bonusEarned: false,
      tasks: [
        { id: "t1", completed: true },
        { id: "t2", completed: true },
        { id: "t3", completed: true },
        { id: "t4", completed: false },
        { id: "t5", completed: false },
      ],
    });

    const result = await getTodayStatus("c1");
    expect(result.completedCount).toBe(3);
    expect(result.totalCount).toBe(5);
    expect(result.allCompleted).toBe(false);
    expect(result.bonusEarned).toBe(false);
    expect(result.date).toBe("2026-08-02");
  });
});
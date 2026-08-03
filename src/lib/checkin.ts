import { prisma } from "./prisma";
import { getChinaDateStr } from "./checkin-date";

const subjects = ["literacy", "pinyin", "english", "math", "poetry"];

const taskTypes: Record<string, string[]> = {
  literacy: ["认读3个新字", "书写练习2个字", "字词配对"],
  pinyin: ["拼读3个音节", "声调练习", "听音辨音"],
  english: ["学习3个新单词", "跟读练习", "单词配对"],
  math: ["完成10道口算", "应用题挑战", "数数练习"],
  poetry: ["朗读1首古诗", "诗词填空", "诗句配对"],
};

function getTodayDate(): string {
  // 北京时间日期（UTC+8），确保每日重置发生在北京午夜而非早上 8 点
  return getChinaDateStr();
}

function hashDate(date: string, subject: string): number {
  let hash = 0;
  const str = date + subject;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export async function getOrCreateTodayRecord(childId: string) {
  const date = getTodayDate();

  let record = await prisma.checkInRecord.findUnique({
    where: { childId_date: { childId, date } },
    include: { tasks: true },
  });

  if (record) return record;

  record = await prisma.checkInRecord.create({
    data: {
      childId,
      date,
      tasks: {
        create: subjects.map((subject) => {
          const types = taskTypes[subject];
          const typeIndex = hashDate(date, subject) % types.length;
          return {
            subject,
            taskType: types[typeIndex],
            completed: false,
            pointsEarned: 0,
          };
        }),
      },
    },
    include: { tasks: true },
  });

  return record;
}

export async function completeTask(childId: string, taskId: string) {
  const task = await prisma.checkInTask.findFirst({
    where: { id: taskId, record: { childId } },
    include: { record: true },
  });

  if (!task) throw new Error("任务不存在");
  if (task.completed) throw new Error("任务已完成");

  const pointsEarned = 10;

  await prisma.checkInTask.update({
    where: { id: taskId },
    data: { completed: true, pointsEarned, completedAt: new Date() },
  });

  // Check if all tasks completed
  const allTasks = await prisma.checkInTask.findMany({
    where: { recordId: task.recordId },
  });

  const allCompleted = allTasks.every((t) => t.id === taskId || t.completed);

  if (allCompleted) {
    await prisma.checkInRecord.update({
      where: { id: task.recordId },
      data: { allCompleted: true, bonusEarned: true },
    });

    // Award bonus points
    await prisma.child.update({
      where: { id: childId },
      data: { points: { increment: pointsEarned + 10 } }, // 10 per task + 10 bonus
    });
  } else {
    await prisma.child.update({
      where: { id: childId },
      data: { points: { increment: pointsEarned } },
    });
  }

  return { pointsEarned, allCompleted };
}

export async function getTodayStatus(childId: string) {
  const record = await getOrCreateTodayRecord(childId);
  const completedCount = record.tasks.filter((t) => t.completed).length;
  return {
    date: record.date,
    tasks: record.tasks,
    completedCount,
    totalCount: 5,
    allCompleted: record.allCompleted,
    bonusEarned: record.bonusEarned,
  };
}
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ error: "请指定孩子" }, { status: 400 });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  // Today's check-in status
  const today = new Date().toISOString().slice(0, 10);
  const todayRecord = await prisma.checkInRecord.findUnique({
    where: { childId_date: { childId, date: today } },
    include: { tasks: true },
  });

  // This week's records (last 7 days)
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekStart = weekAgo.toISOString().slice(0, 10);

  const weekRecords = await prisma.checkInRecord.findMany({
    where: {
      childId,
      date: { gte: weekStart },
    },
    include: { tasks: true },
    orderBy: { date: "asc" },
  });

  // Learning records this week
  const learningRecords = await prisma.learningRecord.findMany({
    where: {
      childId,
      createdAt: { gte: weekAgo },
    },
    orderBy: { createdAt: "desc" },
  });

  // Subject progress from check-in tasks
  const subjectProgress: Record<string, { completed: number; total: number }> = {
    literacy: { completed: 0, total: 0 },
    pinyin: { completed: 0, total: 0 },
    english: { completed: 0, total: 0 },
    math: { completed: 0, total: 0 },
    poetry: { completed: 0, total: 0 },
  };

  weekRecords.forEach((r) => {
    r.tasks.forEach((t) => {
      if (subjectProgress[t.subject]) {
        subjectProgress[t.subject].total++;
        if (t.completed) subjectProgress[t.subject].completed++;
      }
    });
  });

  // Daily completion trend
  const dailyTrend = weekRecords.map((r) => ({
    date: r.date,
    completed: r.tasks.filter((t) => t.completed).length,
    total: r.tasks.length,
    allCompleted: r.allCompleted,
  }));

  // Weak subject alert
  const weakSubjects = Object.entries(subjectProgress)
    .filter(([, p]) => p.total > 0 && p.completed / p.total < 0.5)
    .map(([subject]) => subject);

  return NextResponse.json({
    child,
    today: todayRecord
      ? {
          date: todayRecord.date,
          completedCount: todayRecord.tasks.filter((t) => t.completed).length,
          totalCount: todayRecord.tasks.length,
          allCompleted: todayRecord.allCompleted,
          bonusEarned: todayRecord.bonusEarned,
        }
      : null,
    week: {
      subjectProgress,
      dailyTrend,
      weakSubjects,
      totalLearningRecords: learningRecords.length,
    },
  });
}
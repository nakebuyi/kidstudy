import { sessionFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { getAuthorizedChild } from "@/lib/child-access";
import { getDailyContent } from "@/lib/daily-content";
import { getChinaDateStr } from "@/lib/checkin-date";
import { NextResponse } from "next/server";
import type { Subject } from "@/types";

const VALID_SUBJECTS: Subject[] = ["literacy", "pinyin", "english", "math", "poetry"];

/**
 * GET /api/learning/[subject]?childId=...&date=...
 *
 * 返回某科目某日抽取的 20 个学习内容（确定性，同一天内一致）。
 * date 可选，默认北京时间今天（与打卡重置一致）。
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ subject: string }> }
) {
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { subject } = await params;
  if (!VALID_SUBJECTS.includes(subject as Subject)) {
    return NextResponse.json({ error: "未知科目" }, { status: 400 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  if (!childId) {
    return NextResponse.json({ error: "请指定孩子" }, { status: 400 });
  }

  // Role-aware: parent owns child, or child acts on own record
  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const date = searchParams.get("date") ?? getChinaDateStr();

  const rows = await prisma.learningContent.findMany({
    where: { subject },
    orderBy: { order: "asc" }, // 稳定输入，保证确定性洗牌结果稳定
  });

  const allItems = rows.map((r) => JSON.parse(r.data) as any);
  const items = getDailyContent(subject as Subject, allItems, date, 20);

  return NextResponse.json({ subject, date, count: items.length, items });
}

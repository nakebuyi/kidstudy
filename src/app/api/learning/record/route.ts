import { auth } from "@/lib/auth";
import { getAuthorizedChild } from "@/lib/child-access";
import {
  recordQuizAnswer,
  getSubjectResults,
  VALID_SUBJECTS,
} from "@/lib/learning-record";
import { getChinaDateStr } from "@/lib/checkin-date";
import { NextResponse } from "next/server";
import type { Subject } from "@/types";

/**
 * GET /api/learning/record?childId=&subject=&date=
 * 返回某科目某日的答题对错结果。
 */
export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");
  const subject = searchParams.get("subject");

  if (!childId || !subject) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  if (!VALID_SUBJECTS.includes(subject as Subject)) {
    return NextResponse.json({ error: "未知科目" }, { status: 400 });
  }

  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const date = searchParams.get("date") ?? getChinaDateStr();
  return NextResponse.json(await getSubjectResults(childId, subject, date));
}

/**
 * POST /api/learning/record  body { childId, subject, charId, correct }
 * 实时记录一道测试题的作答对错。
 */
export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const childId = body?.childId;
  const subject = body?.subject;
  const charId = body?.charId;
  const correct = body?.correct;

  if (!childId || !subject || !charId) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  if (typeof correct !== "boolean") {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }
  if (!VALID_SUBJECTS.includes(subject as Subject)) {
    return NextResponse.json({ error: "未知科目" }, { status: 400 });
  }

  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const record = await recordQuizAnswer({ childId, subject, charId, correct });
  return NextResponse.json({ record }, { status: 201 });
}

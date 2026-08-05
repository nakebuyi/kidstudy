import { sessionFromRequest } from "@/lib/api-auth";
import { getOrCreateTodayRecord, completeTask, getTodayStatus } from "@/lib/checkin";
import { getAuthorizedChild } from "@/lib/child-access";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("childId");

  if (!childId) {
    return NextResponse.json({ error: "请指定孩子" }, { status: 400 });
  }

  // Verify the session may access this child (parent owns it, or child's own record)
  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const status = await getTodayStatus(childId);
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { childId, taskId } = await req.json();

  if (!childId || !taskId) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  // Verify the session may access this child (parent owns it, or child's own record)
  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  try {
    const result = await completeTask(childId, taskId);
    return NextResponse.json(result);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
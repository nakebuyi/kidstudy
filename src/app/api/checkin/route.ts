import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getOrCreateTodayRecord, completeTask, getTodayStatus } from "@/lib/checkin";
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

  // Verify child belongs to this parent
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const status = await getTodayStatus(childId);
  return NextResponse.json(status);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { childId, taskId } = await req.json();

  if (!childId || !taskId) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  // Verify child belongs to this parent
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
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
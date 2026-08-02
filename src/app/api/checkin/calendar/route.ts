import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthorizedChild } from "@/lib/child-access";
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

  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const records = await prisma.checkInRecord.findMany({
    where: { childId, allCompleted: true },
    select: { date: true },
    orderBy: { date: "asc" },
  });

  return NextResponse.json({ dates: records.map((r) => r.date) });
}
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const childId = searchParams.get("id");

  if (childId) {
    const child = await prisma.child.findFirst({
      where: { id: childId, parentId: session.user.id },
    });
    if (!child) {
      return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
    }
    return NextResponse.json(child);
  }

  const children = await prisma.child.findMany({
    where: { parentId: session.user.id },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json(children);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { name } = await req.json();
  if (!name || !name.trim()) {
    return NextResponse.json({ error: "孩子姓名不能为空" }, { status: 400 });
  }

  const child = await prisma.child.create({
    data: {
      parentId: session.user.id,
      name: name.trim(),
      avatar: "👦",
      pet: JSON.stringify({ type: "cat", name: "小咪", level: 1, mood: "normal" }),
    },
  });

  return NextResponse.json(child, { status: 201 });
}
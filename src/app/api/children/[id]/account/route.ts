import { sessionFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";

// POST - Create child login account
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = sessionFromRequest(req);
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const { id: childId } = await params;

  // Verify child belongs to this parent
  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const { username: rawUsername, password, nickname } = await req.json();
  const username = rawUsername?.trim();

  if (!username || !password || !nickname) {
    return NextResponse.json({ error: "用户名、密码和昵称不能为空" }, { status: 400 });
  }

  if (password.length < 6) {
    return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
  }

  // Check username uniqueness (both Parent and ChildAccount)
  const existingParent = await prisma.parent.findUnique({ where: { username } });
  const existingChild = await prisma.childAccount.findUnique({ where: { username } });
  if (existingParent || existingChild) {
    return NextResponse.json({ error: "用户名已被使用" }, { status: 400 });
  }

  // Check if child already has an account
  const existing = await prisma.childAccount.findUnique({ where: { childId } });
  if (existing) {
    return NextResponse.json({ error: "该孩子已有登录账号" }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const account = await prisma.childAccount.create({
    data: {
      childId,
      username,
      passwordHash,
      nickname: nickname.trim(),
    },
  });

  return NextResponse.json({ id: account.id, username: account.username, nickname: account.nickname }, { status: 201 });
}

// DELETE - Remove child login account
export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = sessionFromRequest(req);
  if (!session || session.role !== "parent") {
    return NextResponse.json({ error: "无权操作" }, { status: 403 });
  }

  const { id: childId } = await params;

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  await prisma.childAccount.deleteMany({ where: { childId } });
  return NextResponse.json({ success: true });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { username, password, nickname } = await req.json();

    if (!username || !password) {
      return NextResponse.json({ error: "用户名和密码不能为空" }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "密码至少6位" }, { status: 400 });
    }

    const existing = await prisma.parent.findUnique({ where: { username } });
    if (existing) {
      return NextResponse.json({ error: "用户名已被注册" }, { status: 400 });
    }

    // Also check ChildAccount for username collision
    const existingChild = await prisma.childAccount.findUnique({ where: { username } });
    if (existingChild) {
      return NextResponse.json({ error: "用户名已被注册" }, { status: 400 });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await prisma.parent.create({
      data: {
        username,
        passwordHash,
        nickname: (nickname || "").trim() || username,  // NEW: default to username
      },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "注册失败" }, { status: 500 });
  }
}
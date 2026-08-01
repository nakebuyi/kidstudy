import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { childId, dailyGoal, screenTimeLimit, eyeCareInterval, eyeCareBreak } = await req.json();

  if (!childId) {
    return NextResponse.json({ error: "请指定孩子" }, { status: 400 });
  }

  const child = await prisma.child.findFirst({
    where: { id: childId, parentId: session.user.id },
  });
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  // Store settings in pet JSON field (extend pet to include settings)
  const pet = JSON.parse(child.pet);
  pet.settings = {
    dailyGoal: dailyGoal ?? 5,
    screenTimeLimit: screenTimeLimit ?? 60,
    eyeCareInterval: eyeCareInterval ?? 20,
    eyeCareBreak: eyeCareBreak ?? 5,
  };

  await prisma.child.update({
    where: { id: childId },
    data: { pet: JSON.stringify(pet) },
  });

  return NextResponse.json({ success: true });
}
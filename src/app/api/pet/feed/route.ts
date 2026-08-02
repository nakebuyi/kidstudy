import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getAuthorizedChild } from "@/lib/child-access";
import { spendPoints } from "@/lib/points";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { childId, cost } = await req.json();
  if (!childId || !cost) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const result = await spendPoints(childId, cost, "喂养宠物");
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  // Update pet mood to happy
  const pet = JSON.parse(child.pet);
  pet.mood = "happy";
  // Small chance to level up
  if (Math.random() < 0.3 && pet.level < 10) {
    pet.level += 1;
  }

  await prisma.child.update({
    where: { id: childId },
    data: { pet: JSON.stringify(pet) },
  });

  return NextResponse.json({ success: true, balance: result.balance, pet });
}
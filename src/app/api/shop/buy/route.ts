import { auth } from "@/lib/auth";
import { getAuthorizedChild } from "@/lib/child-access";
import { spendPoints } from "@/lib/points";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }

  const { childId, itemId, price } = await req.json();
  if (!childId || !itemId || !price) {
    return NextResponse.json({ error: "参数不完整" }, { status: 400 });
  }

  const child = await getAuthorizedChild(session, childId);
  if (!child) {
    return NextResponse.json({ error: "孩子不存在" }, { status: 404 });
  }

  const result = await spendPoints(childId, price, `购买商品 ${itemId}`);
  if (!result.success) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, balance: result.balance });
}
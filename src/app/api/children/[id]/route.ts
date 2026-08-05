import { sessionFromRequest } from "@/lib/api-auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = sessionFromRequest(req);
  if (!session) {
    return NextResponse.json({ error: "未登录" }, { status: 401 });
  }
  if (session.role !== "parent") {
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

  try {
    await prisma.child.delete({ where: { id: childId } });
    return new NextResponse(null, { status: 204 });
  } catch {
    return NextResponse.json({ error: "删除失败" }, { status: 500 });
  }
}

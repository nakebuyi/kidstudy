import bcrypt from "bcryptjs";
import { prisma } from "./prisma";
import { signToken } from "./jwt";

export interface AuthUser {
  id: string;
  username: string;
  nickname: string;
  role: "PARENT" | "CHILD";
  currentChildId?: string | null;
}

export async function login(
  username: string,
  password: string
): Promise<{ token: string; user: AuthUser } | null> {
  // 1. Try Parent
  const parent = await prisma.parent.findUnique({
    where: { username },
    include: { children: { take: 1, orderBy: { createdAt: "desc" } } },
  });

  if (parent) {
    const isValid = await bcrypt.compare(password, parent.passwordHash);
    if (!isValid) return null;
    const token = await signToken({ userId: parent.id, role: "PARENT" });
    return {
      token,
      user: {
        id: parent.id,
        username: parent.username,
        nickname: parent.nickname || parent.username,
        role: "PARENT",
        currentChildId: parent.children[0]?.id || null,
      },
    };
  }

  // 2. Try ChildAccount
  const childAccount = await prisma.childAccount.findUnique({
    where: { username },
    include: { child: true },
  });

  if (childAccount) {
    const isValid = await bcrypt.compare(password, childAccount.passwordHash);
    if (!isValid) return null;
    const token = await signToken({ userId: childAccount.childId, role: "CHILD" });
    return {
      token,
      user: {
        id: childAccount.childId,
        username: childAccount.child.name,
        nickname: childAccount.nickname,
        role: "CHILD",
        currentChildId: childAccount.childId,
      },
    };
  }

  return null;
}

export async function register(
  username: string,
  password: string,
  nickname?: string
): Promise<{ success: boolean; error?: string }> {
  if (!username || !password) {
    return { success: false, error: "用户名和密码不能为空" };
  }

  if (password.length < 6) {
    return { success: false, error: "密码至少6位" };
  }

  const existingParent = await prisma.parent.findUnique({ where: { username } });
  if (existingParent) {
    return { success: false, error: "用户名已被注册" };
  }

  const existingChild = await prisma.childAccount.findUnique({ where: { username } });
  if (existingChild) {
    return { success: false, error: "用户名已被注册" };
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.parent.create({
    data: {
      username,
      passwordHash,
      nickname: (nickname || "").trim() || username,
    },
  });

  return { success: true };
}

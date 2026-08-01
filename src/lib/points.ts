import { prisma } from "./prisma";

// Points constants
export const POINTS = {
  CHECK_IN: 10,
  CHECK_IN_BONUS: 10,
  STREAK_7: 50,
  LEARN_NEW: 5,
  GAME_COMPLETE_MIN: 5,
  GAME_COMPLETE_MAX: 20,
} as const;

export async function awardPoints(
  childId: string,
  amount: number,
  reason: string
): Promise<number> {
  if (amount <= 0) return 0;

  const child = await prisma.child.update({
    where: { id: childId },
    data: { points: { increment: amount } },
  });

  return child.points;
}

export async function spendPoints(
  childId: string,
  amount: number,
  reason: string
): Promise<{ success: boolean; balance: number; error?: string }> {
  const child = await prisma.child.findUnique({ where: { id: childId } });
  if (!child) return { success: false, balance: 0, error: "孩子不存在" };
  if (child.points < amount) return { success: false, balance: child.points, error: "积分不足" };

  const updated = await prisma.child.update({
    where: { id: childId },
    data: { points: { decrement: amount } },
  });

  return { success: true, balance: updated.points };
}

export function getPetEmoji(pet: { type: string; mood: string }): string {
  const emojis: Record<string, Record<string, string>> = {
    cat: { happy: "😸", normal: "🐱", sad: "😿" },
    dog: { happy: "🐶", normal: "🐕", sad: "😔" },
    rabbit: { happy: "🐰", normal: "🐇", sad: "😢" },
  };
  return emojis[pet.type]?.[pet.mood] ?? "🐱";
}

export function getPetName(pet: { type: string }): string {
  const names: Record<string, string> = {
    cat: "小猫",
    dog: "小狗",
    rabbit: "小兔子",
  };
  return names[pet.type] ?? "小宠物";
}
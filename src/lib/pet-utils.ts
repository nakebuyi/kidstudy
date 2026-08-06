/**
 * Client-safe pet utility functions (no Prisma dependency).
 * Split from points.ts to avoid bundling Node.js native modules in browser code.
 */

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
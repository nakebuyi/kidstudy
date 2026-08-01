import type { LiteracyContent } from "@/types";
import literacyData from "@/../content/literacy.json";
import pinyinData from "@/../content/pinyin.json";
import englishData from "@/../content/english.json";
import mathData from "@/../content/math.json";
import poetryData from "@/../content/poetry.json";

export function getLiteracyContent(): LiteracyContent[] {
  return literacyData as LiteracyContent[];
}

export function getLiteracyByLevel(level: 1 | 2 | 3): LiteracyContent[] {
  return (literacyData as LiteracyContent[]).filter((c) => c.level === level);
}

export function getLiteracyById(id: string): LiteracyContent | undefined {
  return (literacyData as LiteracyContent[]).find((c) => c.id === id);
}

export function getPinyinContent() {
  return pinyinData;
}

export function getEnglishContent() {
  return englishData;
}

export function getMathContent() {
  return mathData;
}

export function getMathByLevel(level: number) {
  return (mathData as any[]).filter((m) => m.level === level);
}

export function getPoetryContent() {
  return poetryData;
}

export function getPoetryByLevel(level: number) {
  return (poetryData as any[]).filter((p) => p.level === level);
}

export function getRandomItems<T>(items: T[], count: number): T[] {
  const shuffled = [...items].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

export function getNextContent<T extends { order: number }>(
  items: T[],
  learnedIds: string[]
): T | undefined {
  return items.find((item: any) => !learnedIds.includes(item.id));
}
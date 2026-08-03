import type { Subject } from "@/types";

/**
 * 每日学习内容确定性抽取
 *
 * 需求：每日各科随机抽取 20 个作为当日打卡测试题。同一天同一科目
 * 必须保持一致（孩子刷新页面不换题），不同日期不同题目。
 *
 * 实现：用 (date, subject) 做种子的确定性洗牌，取前 count 个。
 * 不依赖 Math.random()（非确定性），不落库（纯计算，天然一致）。
 */

/** FNV-1a 32-bit 字符串哈希 → 无符号整数。跨运行确定性。 */
export function hashStringToInt(str: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** mulberry32 PRNG：同种子产生同序列，值域 [0, 1)。 */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** 以字符串为种子的确定性 Fisher–Yates 洗牌。不修改原数组。 */
export function seededShuffle<T>(items: readonly T[], seedStr: string): T[] {
  const arr = [...items];
  const rand = mulberry32(hashStringToInt(seedStr));
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * 确定性抽取某科目某日的 count 个内容。
 *
 * 种子为 `${date}:${subject}`，因此所有孩子同一天看到相同题目。
 * 如需按孩子区分，在种子后追加 `:${childId}` 即可。
 */
export function getDailyContent<T extends { id: string }>(
  subject: Subject,
  allItems: T[],
  date: string, // 北京时间日期字符串 YYYY-MM-DD
  count = 20
): T[] {
  return seededShuffle(allItems, `${date}:${subject}`).slice(0, count);
}

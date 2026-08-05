import Taro from "@tarojs/taro";
import { api } from "../services/api";

const CACHE_PREFIX = "lc_";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

/**
 * Cache-first strategy for learning content.
 * 1. Return fresh cache (within 7 days)
 * 2. Fetch from API and update cache
 * 3. If offline, return stale cache as fallback
 * 4. If no cache at all, throw
 */
export async function getLearningContent<T>(
  subject: string,
  level: number,
): Promise<T> {
  const cacheKey = `${CACHE_PREFIX}${subject}_${level}`;

  // 1. Try fresh cache
  try {
    const cached = Taro.getStorageSync(cacheKey);
    if (cached) {
      const entry = JSON.parse(cached) as CacheEntry<T>;
      if (Date.now() - entry.timestamp < CACHE_TTL) {
        return entry.data;
      }
    }
  } catch {
    // Cache read failed — continue to fetch
  }

  // 2. Fetch from API
  try {
    const data = (await api.getLearningContent(subject, undefined, level)) as T;
    const entry: CacheEntry<T> = { data, timestamp: Date.now() };
    try {
      Taro.setStorageSync(cacheKey, JSON.stringify(entry));
    } catch {
      // Storage full or unavailable — silently skip cache write
    }
    return data;
  } catch {
    // 3. Return stale cache as fallback (offline)
    try {
      const cached = Taro.getStorageSync(cacheKey);
      if (cached) {
        const entry = JSON.parse(cached) as CacheEntry<T>;
        return entry.data;
      }
    } catch {
      // No cache available
    }
    throw new Error("内容加载失败，请检查网络后重试");
  }
}

/**
 * Manually clear all cached content for a subject.
 */
export function clearSubjectCache(subject: string): void {
  try {
    const keys = Taro.getStorageInfoSync().keys;
    const prefix = `${CACHE_PREFIX}${subject}_`;
    keys
      .filter((k) => k.startsWith(prefix))
      .forEach((k) => Taro.removeStorageSync(k));
  } catch {
    // Silently fail
  }
}

/**
 * Clear all learning content cache.
 */
export function clearAllCache(): void {
  try {
    const keys = Taro.getStorageInfoSync().keys;
    keys
      .filter((k) => k.startsWith(CACHE_PREFIX))
      .forEach((k) => Taro.removeStorageSync(k));
  } catch {
    // Silently fail
  }
}
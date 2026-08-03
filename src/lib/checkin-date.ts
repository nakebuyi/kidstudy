/**
 * 打卡日期工具
 *
 * 打卡记录以 `YYYY-MM-DD` 字符串按天存储，但 `toISOString()` 返回 UTC 日期。
 * 本平台面向中国儿童（UTC+8），若用 UTC 日期，北京时间凌晨 0:00~8:00 之间
 * 会算到前一天，导致"每日重置"发生在早上 8 点而非午夜。
 *
 * 统一使用北京时间（Asia/Shanghai）计算打卡日期。
 */

const CHINA_OFFSET_MS = 8 * 60 * 60 * 1000; // UTC+8

/**
 * 返回给定时间（默认当前时间）对应的北京时间日期字符串 YYYY-MM-DD。
 */
export function getChinaDateStr(date: Date = new Date()): string {
  return new Date(date.getTime() + CHINA_OFFSET_MS).toISOString().slice(0, 10);
}

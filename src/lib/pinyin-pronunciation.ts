/**
 * 拼音 → 中文呼读音映射
 *
 * 浏览器 TTS 对单个拉丁字母（如 "b"）会按英文字母名朗读（"bee"），
 * 而不是拼音发音。此映射将每个拼音映射到其标准呼读音汉字，
 * 朗读时使用该汉字以获得正确的拼音发音。
 *
 * 参考：小学语文拼音教学标准呼读音。
 */

// 声母呼读音（23 个）
const INITIALS: Record<string, string> = {
  b: "玻",
  p: "坡",
  m: "摸",
  f: "佛",
  d: "得",
  t: "特",
  n: "讷",
  l: "勒",
  g: "哥",
  k: "科",
  h: "喝",
  j: "基",
  q: "欺",
  x: "希",
  zh: "知",
  ch: "吃",
  sh: "诗",
  r: "日",
  z: "资",
  c: "雌",
  s: "思",
  y: "衣",
  w: "乌",
};

// 韵母呼读音（24 个）
const FINALS: Record<string, string> = {
  a: "啊",
  o: "哦",
  e: "鹅",
  i: "衣",
  u: "乌",
  ü: "迂",
  ai: "爱",
  ei: "诶",
  ui: "威",
  ao: "奥",
  ou: "欧",
  iu: "优",
  ie: "耶",
  üe: "约",
  er: "儿",
  an: "安",
  en: "恩",
  in: "因",
  un: "温",
  ün: "晕",
  ang: "昂",
  eng: "鞥",
  ing: "英",
  ong: "轰",
};

// 整体认读音节（16 个）
const WHOLE_SYLLABLES: Record<string, string> = {
  zhi: "知",
  chi: "吃",
  shi: "诗",
  ri: "日",
  zi: "资",
  ci: "雌",
  si: "思",
  yi: "衣",
  wu: "乌",
  yu: "迂",
  ye: "耶",
  yue: "约",
  yuan: "冤",
  yin: "因",
  yun: "晕",
  ying: "英",
};

const ALL = { ...INITIALS, ...FINALS, ...WHOLE_SYLLABLES };

/**
 * 返回拼音对应的中文呼读音（用于朗读）。
 * 若未收录则原样返回拼音本身。
 */
export function getPinyinSpeechText(pinyin: string): string {
  return ALL[pinyin] ?? pinyin;
}

export { INITIALS, FINALS, WHOLE_SYLLABLES };

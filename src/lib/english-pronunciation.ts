/**
 * 英语单词 → 中文音译回退
 *
 * 有些浏览器（尤其只有中文语音的移动环境）对英文单词整词朗读会静音，
 * 但朗读中文字符总能出声（拼音模块已验证这一机制）。此表把英语单词
 * 映射为贴近其发音的中文音译，用于朗读回退，保证孩子能听到近似读音。
 *
 * 当浏览器存在英文语音时，仍会优先使用原生英文语音朗读（见 useSpeech）。
 */

export const ENGLISH_FALLBACKS: Record<string, string> = {
  apple: "爱普",
  banana: "波那那",
  cat: "凯特",
  dog: "道格",
  red: "瑞德",
  blue: "布鲁",
  one: "万",
  two: "图",
  eye: "爱",
  hand: "汉德",
  mom: "妈妈",
  dad: "爸爸",
  sun: "太阳",
  moon: "月亮",
  water: "沃特",
  big: "比格",
  small: "斯莫",
  happy: "哈皮",
  run: "软",
  eat: "伊特",
};

/** 返回单词对应的中文音译；未收录则原样返回单词本身。 */
export function getEnglishSpeechText(word: string): string {
  return ENGLISH_FALLBACKS[word.toLowerCase()] ?? word;
}

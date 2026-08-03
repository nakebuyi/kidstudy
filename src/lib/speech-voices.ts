/**
 * 语音选择工具
 *
 * 浏览器 Web Speech API 的行为：当 utterance.lang 指定的语言在
 * speechSynthesis.getVoices() 中没有匹配语音时，Chrome 会静默不发声
 * （尤其英文 en-US 在只有中文语音的环境下常见）。
 *
 * 解决方式：不依赖 lang 隐式匹配，而是从可用语音列表中显式挑选最合适的
 * voice 并设置 utterance.voice。
 */

export interface SpeechVoiceLike {
  lang: string;
  default: boolean;
}

/**
 * 从可用语音中为指定语言挑选最合适的一个。
 *
 * 优先级：
 * 1. 精确匹配（lang 完全一致，大小写不敏感）
 * 2. 语言前缀匹配（如 "en-US" 匹配 "en-GB"）
 * 3. 浏览器默认语音
 * 4. 列表第一个
 *
 * 无可用语音时返回 null（调用方仍会尝试用 lang 播放）。
 */
export function selectVoice<T extends SpeechVoiceLike>(
  voices: T[],
  lang: string
): T | null {
  if (!voices.length) return null;

  const target = lang.toLowerCase();

  const exact = voices.find((v) => v.lang.toLowerCase() === target);
  if (exact) return exact;

  const prefix = target.split("-")[0];
  const prefixed = voices.find((v) =>
    v.lang.toLowerCase().startsWith(prefix)
  );
  if (prefixed) return prefixed;

  return voices.find((v) => v.default) ?? voices[0];
}

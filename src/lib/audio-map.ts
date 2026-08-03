export type AudioMap = Record<string, Record<string, string>>;

/**
 * 在音频映射中按 kind 查找文本对应的 slug。
 *
 * 先查单数键（拼音 map 的 "pinyin"/"char"），再回退复数键
 * （英语 map 的 "words"/"sentences"，与组件调用 kind "word"/"sentence" 对应）。
 */
export function resolveAudioSlug(
  map: AudioMap,
  kind: string,
  text: string
): string | undefined {
  return (map[kind] ?? map[kind + "s"])?.[text];
}

import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "fs";
import pinyinAudioMap from "@/lib/data/pinyin-audio-map.json";
import pinyinData from "@/../content/pinyin.json";

const map = pinyinAudioMap as {
  pinyin: Record<string, string>;
  char: Record<string, string>;
};
const items = pinyinData as Array<{
  id: string;
  pinyin: string;
  examples: string[];
}>;

describe("pinyin-audio-map", () => {
  it("covers every pinyin syllable", () => {
    for (const item of items) {
      expect(map.pinyin[item.pinyin], `缺少拼音音频: ${item.pinyin}`).toBeTruthy();
    }
    expect(Object.keys(map.pinyin).length).toBe(items.length);
  });

  it("covers every example character", () => {
    const uniqueChars = [...new Set(items.flatMap((i) => i.examples))];
    for (const c of uniqueChars) {
      expect(map.char[c], `缺少例字音频: ${c}`).toBeTruthy();
    }
    expect(Object.keys(map.char).length).toBe(uniqueChars.length);
  });

  it("every mapped slug has a real audio file >500B", () => {
    for (const [kind, list] of Object.entries(map)) {
      for (const slug of Object.values(list)) {
        const p = `public/audio/zh/${kind}/${slug}.mp3`;
        expect(existsSync(p), `缺失文件 ${p}`).toBe(true);
        expect(statSync(p).size, `${p} 文件过小`).toBeGreaterThan(500);
      }
    }
  });
});

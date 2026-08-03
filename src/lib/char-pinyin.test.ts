import { describe, it, expect } from "vitest";
import { CHAR_PINYIN, getCharPinyin } from "./char-pinyin";
import pinyinData from "../../content/pinyin.json";
import literacyData from "@/../content/literacy.json";

const items = pinyinData as Array<{
  pinyin: string;
  type: string;
  examples: string[];
}>;

describe("char-pinyin", () => {
  it("covers every example character, no more no less", () => {
    const chars = [...new Set(items.flatMap((i) => i.examples))];
    for (const c of chars) {
      expect(CHAR_PINYIN[c], `缺少拼音: ${c}`).toBeTruthy();
    }
    expect(Object.keys(CHAR_PINYIN).length).toBe(chars.length);
  });

  it("every initial example pinyin starts with the initial", () => {
    for (const item of items) {
      if (item.type !== "initial") continue;
      for (const ex of item.examples) {
        expect(
          CHAR_PINYIN[ex].startsWith(item.pinyin),
          `${ex}=${CHAR_PINYIN[ex]} 应以 ${item.pinyin} 开头`
        ).toBe(true);
      }
    }
  });

  it("getCharPinyin falls back to the char itself", () => {
    expect(getCharPinyin("甲")).toBe("甲");
  });

  it("matches literacy.json pinyin for overlapping chars (except documented 发)", () => {
    const litMap: Record<string, string> = {};
    for (const item of literacyData as Array<{ char: string; pinyin: string }>) {
      litMap[item.char] = item.pinyin;
    }
    const exceptions: Record<string, string> = { 发: "fā" }; // 识字模块为 fà(头发)，拼音模块按 fā(出发) 标注以匹配朗读
    for (const [char, pinyin] of Object.entries(CHAR_PINYIN)) {
      if (litMap[char] && exceptions[char] === undefined) {
        expect(pinyin, `${char} 拼音 ${pinyin} 与识字模块 ${litMap[char]} 不一致`).toBe(litMap[char]);
      }
    }
  });
});

import { describe, it, expect } from "vitest";
import { CHAR_PINYIN, getCharPinyin } from "./char-pinyin";
import pinyinData from "@/../content/pinyin.json";

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
});

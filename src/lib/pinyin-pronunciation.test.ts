import { describe, it, expect } from "vitest";
import { getPinyinSpeechText, INITIALS, FINALS, WHOLE_SYLLABLES } from "./pinyin-pronunciation";

describe("getPinyinSpeechText", () => {
  it("maps initials to Chinese 呼读音", () => {
    expect(getPinyinSpeechText("b")).toBe("玻");
    expect(getPinyinSpeechText("p")).toBe("坡");
    expect(getPinyinSpeechText("m")).toBe("摸");
    expect(getPinyinSpeechText("d")).toBe("得");
    expect(getPinyinSpeechText("zhi")).toBe("知");
  });

  it("maps finals to Chinese 呼读音", () => {
    expect(getPinyinSpeechText("a")).toBe("啊");
    expect(getPinyinSpeechText("ü")).toBe("迂");
    expect(getPinyinSpeechText("ai")).toBe("爱");
    expect(getPinyinSpeechText("eng")).toBe("鞥");
  });

  it("maps whole syllables to Chinese 呼读音", () => {
    expect(getPinyinSpeechText("yi")).toBe("衣");
    expect(getPinyinSpeechText("wu")).toBe("乌");
    expect(getPinyinSpeechText("ying")).toBe("英");
  });

  it("returns unknown pinyin unchanged", () => {
    expect(getPinyinSpeechText("xyz")).toBe("xyz");
  });

  it("returns non-letter input unchanged", () => {
    expect(getPinyinSpeechText("")).toBe("");
  });
});

describe("mapping tables", () => {
  it("has 23 initials", () => {
    expect(Object.keys(INITIALS)).toHaveLength(23);
  });

  it("has 24 finals", () => {
    expect(Object.keys(FINALS)).toHaveLength(24);
  });

  it("has 16 whole syllables", () => {
    expect(Object.keys(WHOLE_SYLLABLES)).toHaveLength(16);
  });
});
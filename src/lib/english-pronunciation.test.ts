import { describe, it, expect } from "vitest";
import { getEnglishSpeechText, ENGLISH_FALLBACKS } from "./english-pronunciation";

describe("getEnglishSpeechText", () => {
  it("returns a Chinese phonetic fallback for a known word", () => {
    expect(getEnglishSpeechText("apple")).toBe("爱普");
  });

  it("returns unknown words unchanged", () => {
    expect(getEnglishSpeechText("xyzzy")).toBe("xyzzy");
  });

  it("covers all words in the content", () => {
    // 20 words from content/english.json
    const words = ["apple","banana","cat","dog","red","blue","one","two","eye","hand","mom","dad","sun","moon","water","big","small","happy","run","eat"];
    for (const w of words) {
      const fallback = getEnglishSpeechText(w);
      expect(fallback).not.toBe(w);
      expect(fallback.length).toBeGreaterThan(0);
    }
  });
});

describe("ENGLISH_FALLBACKS table", () => {
  it("has an entry for every content word", () => {
    expect(Object.keys(ENGLISH_FALLBACKS)).toHaveLength(20);
  });
});

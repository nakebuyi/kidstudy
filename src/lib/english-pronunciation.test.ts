import { describe, it, expect } from "vitest";
import { getEnglishSpeechText, ENGLISH_FALLBACKS } from "./english-pronunciation";
import englishData from "@/../content/english.json";

interface EnglishItem {
  word: string;
}

describe("getEnglishSpeechText", () => {
  it("returns a Chinese phonetic fallback for a known word", () => {
    expect(getEnglishSpeechText("apple")).toBe("爱普");
  });

  it("returns unknown words unchanged", () => {
    expect(getEnglishSpeechText("xyzzy")).toBe("xyzzy");
  });

  it("covers every word in the content JSON", () => {
    const words = (englishData as EnglishItem[]).map((w) => w.word);
    expect(words.length).toBeGreaterThanOrEqual(150);
    for (const w of words) {
      const fallback = getEnglishSpeechText(w);
      expect(fallback).not.toBe(w);
      expect(fallback.length).toBeGreaterThan(0);
    }
  });
});

describe("ENGLISH_FALLBACKS table", () => {
  it("has a fallback for every content word", () => {
    const words = (englishData as EnglishItem[]).map((w) => w.word.toLowerCase());
    for (const w of words) {
      expect(ENGLISH_FALLBACKS[w]).toBeDefined();
    }
  });

  it("is in sync with content count", () => {
    const words = (englishData as EnglishItem[]).map((w) => w.word.toLowerCase());
    expect(Object.keys(ENGLISH_FALLBACKS).length).toBeGreaterThanOrEqual(words.length);
  });
});

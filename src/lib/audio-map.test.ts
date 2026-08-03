import { describe, it, expect } from "vitest";
import { resolveAudioSlug } from "./audio-map";

describe("resolveAudioSlug", () => {
  const map = {
    pinyin: { b: "slug-b" },
    char: { 爸: "slug-ba" },
    words: { apple: "slug-apple" },
    sentences: { "I like it.": "slug-s" },
  };

  it("finds a slug in a singular-key section (pinyin)", () => {
    expect(resolveAudioSlug(map, "pinyin", "b")).toBe("slug-b");
  });

  it("finds a slug in a plural-key section (english word)", () => {
    expect(resolveAudioSlug(map, "word", "apple")).toBe("slug-apple");
  });

  it("finds a slug in a plural-key section (english sentence)", () => {
    expect(resolveAudioSlug(map, "sentence", "I like it.")).toBe("slug-s");
  });

  it("returns undefined for a text missing from the section", () => {
    expect(resolveAudioSlug(map, "pinyin", "zzz")).toBeUndefined();
  });

  it("returns undefined when the kind section does not exist", () => {
    expect(resolveAudioSlug(map, "math", "1")).toBeUndefined();
  });
});

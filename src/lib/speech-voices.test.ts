import { describe, it, expect } from "vitest";
import { selectVoice } from "./speech-voices";

describe("selectVoice", () => {
  it("returns null when no voices are available", () => {
    expect(selectVoice([], "en-US")).toBeNull();
  });

  it("prefers an exact language match", () => {
    const voices = [
      { lang: "zh-CN", default: true },
      { lang: "en-US", default: false },
    ];
    expect(selectVoice(voices, "en-US")?.lang).toBe("en-US");
  });

  it("matches by language prefix when exact match is absent", () => {
    const voices = [
      { lang: "zh-CN", default: true },
      { lang: "en-GB", default: false },
    ];
    expect(selectVoice(voices, "en-US")?.lang).toBe("en-GB");
  });

  it("falls back to the default voice", () => {
    const voices = [
      { lang: "zh-CN", default: true },
      { lang: "fr-FR", default: false },
    ];
    expect(selectVoice(voices, "en-US")?.lang).toBe("zh-CN");
  });

  it("falls back to the first voice when no default exists", () => {
    const voices = [
      { lang: "fr-FR", default: false },
      { lang: "de-DE", default: false },
    ];
    expect(selectVoice(voices, "en-US")?.lang).toBe("fr-FR");
  });

  it("matches case-insensitively", () => {
    const voices = [{ lang: "EN-us", default: true }];
    expect(selectVoice(voices, "en-US")?.lang).toBe("EN-us");
  });
});

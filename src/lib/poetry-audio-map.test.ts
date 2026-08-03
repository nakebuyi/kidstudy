import { describe, it, expect } from "vitest";
import { existsSync, statSync } from "fs";
import poetryAudioMap from "@/lib/data/poetry-audio-map.json";
import poetryData from "@/../content/poetry.json";

const map = poetryAudioMap as { poetry: Record<string, string> };
const items = poetryData as Array<{ id: string; content: string }>;

describe("poetry-audio-map", () => {
  it("covers every poem content", () => {
    for (const item of items) {
      expect(map.poetry[item.content], `缺少音频: ${item.id}`).toBeTruthy();
    }
    expect(Object.keys(map.poetry).length).toBe(
      new Set(items.map((i) => i.content)).size,
    );
  });

  it("every slug has a real audio file >500B", () => {
    for (const slug of Object.values(map.poetry)) {
      const p = `public/audio/zh/poetry/${slug}.mp3`;
      expect(existsSync(p), `缺失文件 ${p}`).toBe(true);
      expect(statSync(p).size, `${p} 文件过小`).toBeGreaterThan(500);
    }
  });
});

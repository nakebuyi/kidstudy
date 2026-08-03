/// @vitest-environment jsdom

import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SpeakAudio } from "./SpeakAudio";
import pinyinAudioMap from "@/lib/data/pinyin-audio-map.json";
import poetryAudioMap from "@/lib/data/poetry-audio-map.json";

// jsdom 没有 HTMLMediaElement.play 的真实实现
beforeEach(() => {
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockResolvedValue(undefined),
  });
});

describe("SpeakAudio", () => {
  it("renders nothing when the text is not in the map", () => {
    const { container } = render(
      <SpeakAudio text="zzz-no-such" kind="pinyin" dir="zh" map={pinyinAudioMap} />
    );
    expect(container.innerHTML).toBe("");
  });

  it("plays audio on click for a known pinyin", () => {
    render(<SpeakAudio text="b" kind="pinyin" dir="zh" map={pinyinAudioMap} />);
    const btn = screen.getByRole("button", { name: /朗读/ });
    fireEvent.click(btn);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });

  it("plays a poem audio for a known content", () => {
    const poemContent = Object.keys(poetryAudioMap.poetry)[0];
    render(<SpeakAudio text={poemContent} kind="poetry" dir="zh" map={poetryAudioMap} />);
    const btn = screen.getByRole("button", { name: /朗读/ });
    fireEvent.click(btn);
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
  });
});

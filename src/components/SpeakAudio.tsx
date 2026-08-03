"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import englishAudioMap from "@/lib/data/english-audio-map.json";
import { resolveAudioSlug } from "@/lib/audio-map";
import type { AudioMap } from "@/lib/audio-map";

const defaultMap = englishAudioMap as AudioMap;

/**
 * 预生成音频播放按钮 —— 播放 public/audio/ 下的 MP3，不依赖浏览器 TTS
 * （speechSynthesis 在某些设备上静默失败）。100% 可靠。
 *
 * 英语：<SpeakAudio text={word} kind="word" />
 *        → /audio/en/word/{slug}.mp3（默认 dir="en"、map=英语 map，兼容旧调用）
 * 拼音：<SpeakAudio text="b" kind="pinyin" dir="zh" map={pinyinAudioMap} />
 *        → /audio/zh/pinyin/{slug}.mp3
 */
export function SpeakAudio({
  text,
  kind,
  className,
  dir = "en",
  map = defaultMap,
}: {
  text: string;
  kind: "word" | "sentence" | "pinyin" | "char" | "poetry";
  className?: string;
  dir?: string;
  map?: AudioMap;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const slug = resolveAudioSlug(map, kind, text);
  if (!slug) return null;

  const src = `/audio/${dir}/${kind}/${slug}.mp3`;

  const play = () => {
    // 复用同一个 audio 元素，避免并发
    if (!audioRef.current) {
      audioRef.current = new Audio(src);
      audioRef.current.onended = () => setSpeaking(false);
      audioRef.current.onerror = () => setSpeaking(false);
    } else {
      audioRef.current.src = src;
    }
    audioRef.current.currentTime = 0;
    audioRef.current
      .play()
      .then(() => setSpeaking(true))
      .catch(() => setSpeaking(false));
  };

  return (
    <Button
      variant="outline"
      size="sm"
      className={`gap-1 ${className ?? ""}`}
      onClick={play}
      disabled={speaking}
    >
      <Volume2 className={`w-4 h-4 ${speaking ? "animate-pulse" : ""}`} />
      {speaking ? "播放中..." : "朗读"}
    </Button>
  );
}

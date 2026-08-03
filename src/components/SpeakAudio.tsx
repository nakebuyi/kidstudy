"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Volume2 } from "lucide-react";
import englishAudioMap from "@/lib/data/english-audio-map.json";

type AudioMap = {
  words: Record<string, string>;
  sentences: Record<string, string>;
};

const map = englishAudioMap as AudioMap;

/**
 * 预生成音频播放按钮 —— 英语单词/例句专用。
 *
 * 用 <audio> 播放 public/audio/en/ 下的 MP3，不依赖浏览器 TTS
 * （speechSynthesis 在某些设备上对英文静默失败）。100% 可靠。
 */
export function SpeakAudio({
  text,
  kind,
  className,
}: {
  text: string;
  kind: "word" | "sentence";
  className?: string;
}) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [speaking, setSpeaking] = useState(false);

  const slug = kind === "word" ? map.words[text] : map.sentences[text];
  if (!slug) return null;

  const src = `/audio/en/${kind}/${slug}.mp3`;

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

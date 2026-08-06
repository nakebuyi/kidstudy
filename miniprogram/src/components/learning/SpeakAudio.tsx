import { useEffect, useRef, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./SpeakAudio.scss";

export type AudioMap = Record<string, Record<string, string>>;

function resolveSlug(map: AudioMap, kind: string, text: string): string | undefined {
  return (map[kind] ?? map[kind + "s"])?.[text];
}

interface SpeakAudioProps {
  text: string;
  kind: "word" | "sentence" | "pinyin" | "char" | "poetry";
  dir?: string;
  map?: AudioMap;
}

export function SpeakAudio({
  text,
  kind,
  dir = "en",
  map,
}: SpeakAudioProps) {
  const [speaking, setSpeaking] = useState(false);
  const audioRef = useRef<Taro.InnerAudioContext | null>(null);

  if (!map) return null;
  const slug = resolveSlug(map, kind, text);
  if (!slug) return null;

  const src = `https://kidstudy.zhangwenguang.com/audio/${dir}/${kind}/${slug}.mp3`;

  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.destroy();
        audioRef.current = null;
      }
    };
  }, []);

  const handlePlay = () => {
    if (speaking) return;
    try {
      if (!audioRef.current) {
        audioRef.current = Taro.createInnerAudioContext();
        audioRef.current.onEnded(() => setSpeaking(false));
        audioRef.current.onError(() => setSpeaking(false));
      }
      audioRef.current.src = src;
      audioRef.current.play();
      setSpeaking(true);
    } catch {
      setSpeaking(false);
    }
  };

  return (
    <View className="speak-audio" onClick={handlePlay}>
      <Text className="speak-audio-icon">{speaking ? "🔊" : "🔈"}</Text>
      <Text className="speak-audio-text">{speaking ? "播放中..." : "朗读"}</Text>
    </View>
  );
}

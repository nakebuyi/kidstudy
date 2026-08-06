import { View, Text } from "@tarojs/components";
import "./PetDisplay.scss";

const PET_EMOJI: Record<string, string> = {
  cat: "🐱", dog: "🐶", rabbit: "🐰",
};

const PET_NAMES: Record<string, string> = {
  cat: "猫咪", dog: "小狗", rabbit: "小兔",
};

const MOOD_MAP: Record<string, string> = {
  happy: "开心", normal: "正常", sad: "难过",
};

interface PetDisplayProps {
  type: string;
  name: string;
  level: number;
  mood: string;
}

export function PetDisplay({ type, name, level, mood }: PetDisplayProps) {
  return (
    <View className="pet-display">
      <Text className="pet-display-emoji">{PET_EMOJI[type] ?? "🐱"}</Text>
      <Text className="pet-display-name">{name}</Text>
      <View className="pet-display-tags">
        <View className="pet-display-tag">
          <Text>{PET_NAMES[type] ?? "宠物"}</Text>
        </View>
        <View className="pet-display-tag">
          <Text>Lv.{level}</Text>
        </View>
        <View className={`pet-display-tag pet-mood-${mood}`}>
          <Text>{MOOD_MAP[mood] ?? "正常"}</Text>
        </View>
      </View>
    </View>
  );
}

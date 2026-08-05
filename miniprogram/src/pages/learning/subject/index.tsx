import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import "./index.scss";

const SUBJECT_META: Record<string, { name: string; emoji: string; color: string }> = {
  literacy: { name: "识字", emoji: "📖", color: "#F59E0B" },
  pinyin: { name: "拼音", emoji: "🔤", color: "#0EA5E9" },
  english: { name: "英语", emoji: "🌍", color: "#10B981" },
  math: { name: "算术", emoji: "🧮", color: "#A855F7" },
  poetry: { name: "古诗词", emoji: "📜", color: "#DC2626" },
};

export default function Subject() {
  const { subject } = Taro.getCurrentInstance().router?.params || {};
  const meta = SUBJECT_META[subject as string];

  if (!meta) {
    return (
      <View className="subject-page">
        <Text className="subject-placeholder-text">未知科目</Text>
      </View>
    );
  }

  return (
    <View className="subject-page">
      {/* Header */}
      <View className="subject-header">
        <Text className="subject-header-emoji">{meta.emoji}</Text>
        <Text className="subject-header-name">{meta.name}</Text>
      </View>

      {/* Placeholder — learning content will be built in Phase 5 */}
      <View className="subject-placeholder">
        <Text className="subject-placeholder-emoji">🚧</Text>
        <Text className="subject-placeholder-text">{meta.name}学习内容即将上线</Text>
        <Text className="subject-placeholder-hint">正在努力建设中...</Text>
      </View>
    </View>
  );
}
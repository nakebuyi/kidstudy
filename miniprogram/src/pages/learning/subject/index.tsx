import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";

export default function Subject() {
  const { subject } = Taro.getCurrentInstance().router?.params || {};
  const names: Record<string, string> = {
    literacy: "识字", pinyin: "拼音", english: "英语", math: "算术", poetry: "古诗词",
  };

  return (
    <View className="p-4">
      <Text className="text-xl font-bold">{names[subject as string] || "学习"}</Text>
      <Text className="text-gray-500 mt-4 block">即将上线...</Text>
    </View>
  );
}
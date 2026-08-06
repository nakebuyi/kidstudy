import { View, Text } from "@tarojs/components";
import "./SubjectCard.scss";

interface SubjectCardProps {
  subject: string;
  name: string;
  emoji: string;
  bg: string;
  onClick: () => void;
}

export function SubjectCard({ name, emoji, bg, onClick }: SubjectCardProps) {
  return (
    <View
      className="subject-card"
      style={{ backgroundColor: bg }}
      onClick={onClick}
    >
      <Text className="subject-card-emoji">{emoji}</Text>
      <Text className="subject-card-name">{name}</Text>
    </View>
  );
}

import { View, Text } from "@tarojs/components";
import "./BadgesDisplay.scss";

interface BadgeDef {
  id: string;
  name: string;
  icon: string;
  description: string;
  check: (stats: Stats) => boolean;
}

interface Stats {
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
}

const BADGES: BadgeDef[] = [
  { id: "first_checkin", name: "初次打卡", icon: "🌟", description: "完成第一次打卡", check: (s) => s.totalCheckIns >= 1 },
  { id: "streak_3", name: "连续3天", icon: "🔥", description: "连续打卡3天", check: (s) => s.streak >= 3 },
  { id: "streak_7", name: "周冠军", icon: "👑", description: "连续打卡7天", check: (s) => s.streak >= 7 },
  { id: "streak_30", name: "月度之星", icon: "🏆", description: "连续打卡30天", check: (s) => s.maxStreak >= 30 },
  { id: "points_100", name: "积分达人", icon: "💰", description: "累计获得100积分", check: (s) => s.points >= 100 },
  { id: "points_500", name: "积分富豪", icon: "💎", description: "累计获得500积分", check: (s) => s.points >= 500 },
  { id: "checkin_10", name: "坚持10天", icon: "📅", description: "累计打卡10天", check: (s) => s.totalCheckIns >= 10 },
  { id: "checkin_50", name: "坚持50天", icon: "🎖️", description: "累计打卡50天", check: (s) => s.totalCheckIns >= 50 },
];

interface BadgesDisplayProps {
  points: number;
  streak: number;
  maxStreak: number;
  totalCheckIns: number;
}

export function BadgesDisplay({ points, streak, maxStreak, totalCheckIns }: BadgesDisplayProps) {
  const stats: Stats = { points, streak, maxStreak, totalCheckIns };
  const earned = BADGES.filter((b) => b.check(stats));
  const locked = BADGES.filter((b) => !b.check(stats));

  return (
    <View className="badges-display">
      <Text className="badges-display-title">🏅 成就徽章</Text>

      {earned.length > 0 && (
        <View className="badges-display-list">
          {earned.map((b) => (
            <View key={b.id} className="badges-display-item">
              <Text className="badges-display-icon">{b.icon}</Text>
              <Text className="badges-display-name">{b.name}</Text>
            </View>
          ))}
        </View>
      )}

      {locked.length > 0 && (
        <View className="badges-display-list">
          {locked.slice(0, 6).map((b) => (
            <View key={b.id} className="badges-display-item badges-display-item-locked">
              <Text className="badges-display-icon badges-display-icon-locked">{b.icon}</Text>
              <Text className="badges-display-name badges-display-name-locked">{b.name}</Text>
            </View>
          ))}
        </View>
      )}

      {earned.length === 0 && locked.length === 0 && (
        <Text className="badges-display-empty">开始学习，解锁徽章！</Text>
      )}
    </View>
  );
}
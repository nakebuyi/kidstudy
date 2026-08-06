import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import Taro from "@tarojs/taro";
import { api, ChildData } from "../../../services/api";
import { SubjectCard } from "../../../components/dashboard/SubjectCard";
import { BadgesDisplay } from "../../../components/dashboard/BadgesDisplay";
import "./index.scss";

const SUBJECTS = [
  { key: "literacy", name: "识字", emoji: "📖", bg: "#FFF8E1" },
  { key: "pinyin", name: "拼音", emoji: "🔤", bg: "#E1F5FE" },
  { key: "english", name: "英语", emoji: "🌍", bg: "#E8F5E9" },
  { key: "math", name: "算术", emoji: "🧮", bg: "#F3E5F5" },
  { key: "poetry", name: "古诗", emoji: "📜", bg: "#FFEBEE" },
];

const MOOD_MAP: Record<string, string> = {
  happy: "开心",
  normal: "正常",
  sad: "难过",
};

const PET_EMOJI: Record<string, string> = {
  cat: "🐱",
  dog: "🐶",
  rabbit: "🐰",
};

interface PetData {
  type?: string;
  name?: string;
  level?: number;
  mood?: string;
}

export default function Dashboard() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const children = await api.getChildren();
        if (children && children.length > 0) {
          setChild(children[0]);
        }
      } catch (err: any) {
        // Only show toast for non-auth errors (auth errors are handled by request())
        if (err.message !== "登录已过期") {
          Taro.showToast({ title: "加载失败", icon: "none", duration: 2000 });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // --- Loading ---
  if (loading) {
    return (
      <View className="dashboard-loading">
        <Text className="dashboard-loading-text">加载中...</Text>
      </View>
    );
  }

  // --- Empty: no child ---
  if (!child) {
    return (
      <View className="dashboard-empty">
        <Text className="dashboard-empty-text">还没有添加孩子</Text>
        <View
          className="dashboard-empty-btn"
          onClick={() => {
            Taro.showToast({ title: "请切换到家长模式添加孩子", icon: "none", duration: 2000 });
          }}
        >
          <Text>去添加</Text>
        </View>
      </View>
    );
  }

  // --- Normal ---
  let pet: PetData = { type: "cat", name: "小咪", level: 1, mood: "normal" };
  try {
    if (child.pet) {
      pet = JSON.parse(child.pet);
    }
  } catch {
    // Use defaults
  }

  return (
    <View className="dashboard">
      {/* Welcome */}
      <View className="dashboard-welcome">
        <Text className="dashboard-welcome-name">{child.name}，早上好！</Text>
        <Text className="dashboard-welcome-hint">今天也要加油哦~</Text>
      </View>

      {/* Stats */}
      <View className="dashboard-stats">
        <View className="dashboard-stat-card">
          <Text className="dashboard-stat-label">积分</Text>
          <Text className="dashboard-stat-value points">{child.points}</Text>
        </View>
        <View className="dashboard-stat-card">
          <Text className="dashboard-stat-label">连续打卡</Text>
          <Text className="dashboard-stat-value streak">{child.streak}天</Text>
        </View>
      </View>

      {/* Pet */}
      <View className="dashboard-pet-card">
        <Text className="dashboard-pet-emoji">
          {PET_EMOJI[pet.type || "cat"] || "🐱"}
        </Text>
        <View className="dashboard-pet-info">
          <Text className="dashboard-pet-name">{pet.name || "小宠物"}</Text>
          <Text className="dashboard-pet-level">Lv.{pet.level || 1}</Text>
          <Text className={`dashboard-pet-mood ${pet.mood || "normal"}`}>
            {MOOD_MAP[pet.mood || "normal"] || "正常"}
          </Text>
        </View>
      </View>

      {/* Calendar entry */}
      <View
        className="dashboard-calendar-entry"
        onClick={() => Taro.navigateTo({ url: "/pages/learning/calendar/index" })}
      >
        <Text className="dashboard-calendar-entry-text">📅 打卡日历 ›</Text>
      </View>

      {/* Subject entries */}
      <View className="dashboard-subjects">
        {SUBJECTS.map((item) => (
          <SubjectCard
            key={item.key}
            subject={item.key}
            name={item.name}
            emoji={item.emoji}
            bg={item.bg}
            onClick={() => {
              Taro.navigateTo({
                url: `/pages/learning/subject/index?subject=${item.key}`,
              });
            }}
          />
        ))}
      </View>

      <BadgesDisplay
        points={child.points}
        streak={child.streak}
        maxStreak={child.maxStreak}
        totalCheckIns={child.totalCheckIns}
      />
    </View>
  );
}

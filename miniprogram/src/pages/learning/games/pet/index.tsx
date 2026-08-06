import { useEffect, useState } from "react";
import { View, Text } from "@tarojs/components";
import { api, ChildData } from "../../../../services/api";
import { PetDisplay } from "../../../../components/games/PetDisplay";
import { ContentCard } from "../../../../components/learning";
import "./index.scss";

const FOOD_ITEMS = [
  { name: "🐟 小鱼干", cost: 5, desc: "美味的小鱼干" },
  { name: "🥩 肉骨头", cost: 10, desc: "营养丰富的肉骨头" },
  { name: "🍰 宠物蛋糕", cost: 20, desc: "豪华宠物蛋糕" },
];

export default function Pet() {
  const [child, setChild] = useState<ChildData | null>(null);
  const [loading, setLoading] = useState(true);
  const [feeding, setFeeding] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadChild();
  }, []);

  async function loadChild() {
    try {
      const children = await api.getChildren();
      if (children?.length > 0) setChild(children[0]);
    } catch {
      // handled by request()
    } finally {
      setLoading(false);
    }
  }

  async function handleFeed(food: (typeof FOOD_ITEMS)[0]) {
    setFeeding(food.name);
    setMessage("");
    try {
      await api.feedPet();
      setMessage(`喂养成功！消耗 ${food.cost} 积分`);
      await loadChild();
    } catch {
      setMessage("喂养失败，请重试");
    } finally {
      setFeeding(null);
    }
  }

  if (loading) {
    return (
      <View className="page-loading">
        <Text className="page-loading-text">加载中...</Text>
      </View>
    );
  }

  if (!child) {
    return (
      <View className="page-empty">
        <Text className="page-empty-text">还没有添加孩子</Text>
      </View>
    );
  }

  let pet: any = { type: "cat", name: "小咪", level: 1, mood: "normal" };
  try {
    if (child.pet) pet = JSON.parse(child.pet);
  } catch { /* use defaults */ }

  return (
    <View className="pet-page">
      {/* Pet Display */}
      <ContentCard>
        <PetDisplay
          type={pet.type ?? "cat"}
          name={pet.name ?? "小咪"}
          level={pet.level ?? 1}
          mood={pet.mood ?? "normal"}
        />
      </ContentCard>

      {/* Stats */}
      <ContentCard>
        <Text className="section-title">📊 宠物状态</Text>
        <View className="pet-stat-row">
          <Text className="pet-stat-label">等级</Text>
          <Text className="pet-stat-value">{pet.level ?? 1} / 10</Text>
        </View>
        <View className="pet-stat-bar">
          <View
            className="pet-stat-bar-fill"
            style={{ width: `${((pet.level ?? 1) / 10) * 100}%` }}
          />
        </View>
        <Text className="pet-stat-hint">坚持学习，让宠物和你一起成长！</Text>
      </ContentCard>

      {/* Feed */}
      <ContentCard>
        <Text className="section-title">🍽️ 喂养宠物</Text>
        {message && (
          <View className="pet-message">
            <Text>{message}</Text>
          </View>
        )}
        <View className="pet-food-grid">
          {FOOD_ITEMS.map((food) => (
            <View
              key={food.name}
              className={`pet-food-item ${
                child.points < food.cost || feeding === food.name ? "pet-food-disabled" : ""
              }`}
              onClick={() => {
                if (child.points >= food.cost && !feeding) handleFeed(food);
              }}
            >
              <Text className="pet-food-name">{food.name}</Text>
              <Text className="pet-food-desc">{food.desc}</Text>
              <Text className="pet-food-cost">
                {feeding === food.name ? "喂养中..." : `🌟 ${food.cost}${child.points < food.cost ? " (积分不足)" : ""}`}
              </Text>
            </View>
          ))}
        </View>
        <Text className="pet-points">当前积分：🌟 {child.points}</Text>
      </ContentCard>
    </View>
  );
}
